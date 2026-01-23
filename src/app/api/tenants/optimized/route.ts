import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/tenants/optimized - Get all tenants with SQL-optimized rent calculations
 * This endpoint uses pure SQL for rent calculations instead of N+1 queries
 * Used for parallel testing and performance comparison with the original endpoint
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // Get basic tenant data with aggregations (same as original)
    const result = await db.execute({
      sql: `SELECT
              t.*,
              COUNT(DISTINCT CASE WHEN tr.is_active = 1 THEN tr.id END) as active_rooms_count,
              GROUP_CONCAT(DISTINCT CASE WHEN tr.is_active = 1 THEN r.code END) as room_codes,
              GROUP_CONCAT(DISTINCT CASE WHEN tr.is_active = 1 THEN r.id END) as room_ids,
              GROUP_CONCAT(DISTINCT CASE WHEN tr.is_active = 1 THEN r.monthly_rent END) as room_rents,
              COALESCE(SUM(CASE WHEN tr.is_active = 1 THEN r.monthly_rent ELSE 0 END), 0) as monthly_rent,
              COALESCE(SUM(DISTINCT sd.amount *
                CASE
                  WHEN sd.transaction_type = 'deposit' THEN 1
                  WHEN sd.transaction_type = 'refund' THEN -1
                  WHEN sd.transaction_type = 'used_for_rent' THEN -1
                  ELSE 0
                END
              ), 0) as security_deposit_balance,
              COALESCE((
                SELECT SUM(amount) FROM tenant_ledger WHERE tenant_id = t.id
              ), 0) as total_credits,
              COALESCE((
                SELECT SUM(rent_amount) FROM rent_payments WHERE tenant_id = t.id
              ), 0) as total_rent_paid,
              (
                SELECT for_period FROM rent_payments
                WHERE tenant_id = t.id
                ORDER BY for_period DESC
                LIMIT 1
              ) as last_paid_period
            FROM tenants t
            LEFT JOIN tenant_rooms tr ON t.id = tr.tenant_id
            LEFT JOIN rooms r ON tr.room_id = r.id
            LEFT JOIN security_deposits sd ON t.id = sd.tenant_id
            WHERE t.is_active = 1
            GROUP BY t.id
            ORDER BY t.name`,
      args: [],
    });

    // Calculate rent using SQL for all tenants
    const tenants = await Promise.all(
      result.rows.map(async (tenant: any) => {
        const ledgerTotal = Number(tenant.total_credits || 0);
        const paymentsTotal = Number(tenant.total_rent_paid || 0);
        const balance = ledgerTotal - paymentsTotal;

        // SQL-optimized rent calculation
        const rentCalculation = await calculateTotalRentOwedSQL(tenant.id, db);
        const unpaidRentCalculation = await calculateUnpaidRentSQL(tenant.id, db);

        // Format last paid period (YYYY-MM to MMM-YY)
        let lastPaidMonth = "Never";
        if (tenant.last_paid_period) {
          const [year, month] = tenant.last_paid_period.split("-");
          const date = new Date(parseInt(year), parseInt(month) - 1);
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          lastPaidMonth = `${monthNames[date.getMonth()]}-${year.substring(2)}`;
        }

        // Calculate financial metrics
        const netBalance = rentCalculation.totalRentOwed - ledgerTotal;

        return {
          ...tenant,
          monthly_rent: Number(tenant.monthly_rent || 0),
          credit_balance: balance > 0 ? balance : 0,
          total_rent_due: unpaidRentCalculation.totalUnpaidRent,
          net_balance: netBalance,
          total_dues: Math.max(0, netBalance),
          last_paid_month: lastPaidMonth,
          // Debug info
          _debug: {
            totalMonths: rentCalculation.totalMonths,
            unpaidMonths: unpaidRentCalculation.unpaidMonths,
            calculationMethod: 'sql',
          }
        };
      })
    );

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    return NextResponse.json({
      tenants,
      _metadata: {
        count: tenants.length,
        executionTimeMs: executionTime,
        calculationMethod: 'sql-optimized',
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error("Error fetching optimized tenants:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenants" },
      { status: 500 }
    );
  }
}

/**
 * Calculate total rent owed using pure SQL
 * Replicates calculateTotalRentOwed() but in SQL
 */
async function calculateTotalRentOwedSQL(tenantId: string, db: any) {
  try {
    const result = await db.execute({
      sql: `
        WITH RECURSIVE
          -- Get tenant's active rooms
          tenant_rooms_data AS (
            SELECT
              tr.room_id,
              tr.move_in_date,
              COALESCE(tr.move_out_date, DATE('now')) as move_out_date
            FROM tenant_rooms tr
            WHERE tr.tenant_id = ?
              AND tr.is_active = 1
          ),

          -- Generate all months from move-in to today for each room
          months AS (
            SELECT
              room_id,
              DATE(SUBSTR(move_in_date, 1, 7) || '-01') as period_date,
              move_in_date,
              move_out_date
            FROM tenant_rooms_data

            UNION ALL

            SELECT
              m.room_id,
              DATE(m.period_date, '+1 month') as period_date,
              m.move_in_date,
              m.move_out_date
            FROM months m
            WHERE DATE(m.period_date, '+1 month') <= DATE(SUBSTR(m.move_out_date, 1, 7) || '-01')
          ),

          -- Get rent for each period considering rent updates
          period_rents AS (
            SELECT
              m.room_id,
              m.period_date,
              STRFTIME('%Y-%m', m.period_date) as period,
              -- Get the most recent rent update effective before or during this period
              COALESCE(
                (SELECT ru.new_rent
                 FROM rent_updates ru
                 WHERE ru.room_id = m.room_id
                   AND ru.effective_from <= m.period_date
                 ORDER BY ru.effective_from DESC
                 LIMIT 1),
                -- If no rent update found, get the old_rent from earliest update
                (SELECT ru.old_rent
                 FROM rent_updates ru
                 WHERE ru.room_id = m.room_id
                 ORDER BY ru.effective_from ASC
                 LIMIT 1),
                -- Final fallback: current monthly_rent from rooms table
                (SELECT r.monthly_rent FROM rooms r WHERE r.id = m.room_id)
              ) as rent_amount
            FROM months m
          )

        -- Sum all period rents
        SELECT
          COALESCE(SUM(rent_amount), 0) as total_rent_owed,
          COUNT(*) as total_months
        FROM period_rents
      `,
      args: [tenantId],
    });

    if (result.rows.length > 0) {
      return {
        totalRentOwed: Number(result.rows[0].total_rent_owed || 0),
        totalMonths: Number(result.rows[0].total_months || 0),
      };
    }

    return { totalRentOwed: 0, totalMonths: 0 };
  } catch (error) {
    console.error(`Error calculating total rent owed for tenant ${tenantId}:`, error);
    return { totalRentOwed: 0, totalMonths: 0 };
  }
}

/**
 * Calculate unpaid rent using pure SQL
 * Replicates calculateUnpaidRent() but in SQL
 */
async function calculateUnpaidRentSQL(tenantId: string, db: any) {
  try {
    const result = await db.execute({
      sql: `
        WITH RECURSIVE
          -- Get tenant's active rooms
          tenant_rooms_data AS (
            SELECT
              tr.room_id,
              tr.move_in_date,
              COALESCE(tr.move_out_date, DATE('now')) as move_out_date
            FROM tenant_rooms tr
            WHERE tr.tenant_id = ?
              AND tr.is_active = 1
          ),

          -- Generate all months from move-in to today for each room
          months AS (
            SELECT
              room_id,
              DATE(SUBSTR(move_in_date, 1, 7) || '-01') as period_date,
              move_in_date,
              move_out_date
            FROM tenant_rooms_data

            UNION ALL

            SELECT
              m.room_id,
              DATE(m.period_date, '+1 month') as period_date,
              m.move_in_date,
              m.move_out_date
            FROM months m
            WHERE DATE(m.period_date, '+1 month') <= DATE(SUBSTR(m.move_out_date, 1, 7) || '-01')
          ),

          -- Get rent for each period considering rent updates
          period_rents AS (
            SELECT
              m.room_id,
              STRFTIME('%Y-%m', m.period_date) as period,
              COALESCE(
                (SELECT ru.new_rent
                 FROM rent_updates ru
                 WHERE ru.room_id = m.room_id
                   AND ru.effective_from <= m.period_date
                 ORDER BY ru.effective_from DESC
                 LIMIT 1),
                (SELECT ru.old_rent
                 FROM rent_updates ru
                 WHERE ru.room_id = m.room_id
                 ORDER BY ru.effective_from ASC
                 LIMIT 1),
                (SELECT r.monthly_rent FROM rooms r WHERE r.id = m.room_id)
              ) as rent_amount
            FROM months m
          ),

          -- Get all paid periods for this tenant
          paid_periods AS (
            SELECT DISTINCT for_period
            FROM rent_payments
            WHERE tenant_id = ?
          )

        -- Sum only UNPAID period rents
        SELECT
          COALESCE(SUM(pr.rent_amount), 0) as total_unpaid_rent,
          COUNT(*) as unpaid_months
        FROM period_rents pr
        WHERE pr.period NOT IN (SELECT for_period FROM paid_periods)
      `,
      args: [tenantId, tenantId],
    });

    if (result.rows.length > 0) {
      return {
        totalUnpaidRent: Number(result.rows[0].total_unpaid_rent || 0),
        unpaidMonths: Number(result.rows[0].unpaid_months || 0),
      };
    }

    return { totalUnpaidRent: 0, unpaidMonths: 0 };
  } catch (error) {
    console.error(`Error calculating unpaid rent for tenant ${tenantId}:`, error);
    return { totalUnpaidRent: 0, unpaidMonths: 0 };
  }
}
