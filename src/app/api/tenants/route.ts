import { NextRequest, NextResponse } from "next/server";
import { db, generateId, getCurrentDateTime } from "@/lib/db";
// OLD: TypeScript-based calculation (N+1 queries - slow)
// import { calculateTotalRentOwed, calculateUnpaidRent } from "@/lib/rent-calculator";

// POST /api/tenants - Create a new tenant
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, address, openingBalance, securityDeposit } = body;

    // Validation
    if (!name || !phone) {
      return NextResponse.json(
        { error: "Name and phone are required" },
        { status: 400 }
      );
    }

    // Check if phone already exists
    const existingTenant = await db.execute({
      sql: "SELECT id FROM tenants WHERE phone = ?",
      args: [phone],
    });

    if (existingTenant.rows.length > 0) {
      return NextResponse.json(
        { error: `Tenant with phone ${phone} already exists` },
        { status: 409 }
      );
    }

    // Start transaction by creating tenant first
    const tenantId = generateId();
    const now = getCurrentDateTime();

    await db.execute({
      sql: `INSERT INTO tenants (id, name, phone, address, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, ?, ?)`,
      args: [tenantId, name, phone, address || null, now, now],
    });

    // Add opening balance if provided (can be positive or negative)
    if (openingBalance && openingBalance !== 0) {
      const ledgerId = generateId();
      await db.execute({
        sql: `INSERT INTO tenant_ledger (id, tenant_id, transaction_date, type, amount, description, created_at)
              VALUES (?, ?, ?, 'opening_balance', ?, 'Opening balance', ?)`,
        args: [ledgerId, tenantId, now.split(' ')[0], openingBalance, now],
      });
    }

    // Add security deposit if provided
    if (securityDeposit && securityDeposit > 0) {
      const depositId = generateId();
      await db.execute({
        sql: `INSERT INTO security_deposits (id, tenant_id, transaction_type, amount, transaction_date, notes, created_at)
              VALUES (?, ?, 'deposit', ?, ?, 'Initial security deposit', ?)`,
        args: [depositId, tenantId, securityDeposit, now.split(' ')[0], now],
      });
    }

    // Fetch the created tenant with balances
    const tenant = await db.execute({
      sql: `SELECT
              t.*,
              COALESCE(SUM(sd.amount *
                CASE
                  WHEN sd.transaction_type = 'deposit' THEN 1
                  WHEN sd.transaction_type = 'refund' THEN -1
                  WHEN sd.transaction_type = 'used_for_rent' THEN -1
                  ELSE 0
                END
              ), 0) as security_deposit_balance,
              COALESCE(SUM(tl.amount), 0) as ledger_balance
            FROM tenants t
            LEFT JOIN security_deposits sd ON t.id = sd.tenant_id
            LEFT JOIN tenant_ledger tl ON t.id = tl.tenant_id
            WHERE t.id = ?
            GROUP BY t.id`,
      args: [tenantId],
    });

    return NextResponse.json(
      {
        message: "Tenant created successfully",
        tenant: tenant.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating tenant:", error);
    return NextResponse.json(
      { error: "Failed to create tenant" },
      { status: 500 }
    );
  }
}

/**
 * Calculate total rent owed using pure SQL (OPTIMIZED)
 * Replaces calculateTotalRentOwed() - uses ~2 queries instead of N+1
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
      return Number(result.rows[0].total_rent_owed || 0);
    }

    return 0;
  } catch (error) {
    console.error(`Error calculating total rent owed for tenant ${tenantId}:`, error);
    return 0;
  }
}

/**
 * Calculate unpaid rent using pure SQL (OPTIMIZED)
 * Replaces calculateUnpaidRent() - uses ~2 queries instead of N+1
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
      return Number(result.rows[0].total_unpaid_rent || 0);
    }

    return 0;
  } catch (error) {
    console.error(`Error calculating unpaid rent for tenant ${tenantId}:`, error);
    return 0;
  }
}

// GET /api/tenants - Get all tenants
export async function GET() {
  try {
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

    // Format the data with proper calculations
    const tenants = await Promise.all(
      result.rows.map(async (tenant: any) => {
        const ledgerTotal = Number(tenant.total_credits || 0);
        const paymentsTotal = Number(tenant.total_rent_paid || 0);
        const balance = ledgerTotal - paymentsTotal;

        // Calculate total rent owed using SQL-optimized calculation
        const totalRentOwed = await calculateTotalRentOwedSQL(tenant.id, db);
        // OLD (commented out - slow N+1 queries):
        // const totalRentOwed = await calculateTotalRentOwed(tenant.id, db);

        // Calculate unpaid rent using SQL-optimized calculation
        const totalRentDue = await calculateUnpaidRentSQL(tenant.id, db);
        // OLD (commented out - slow N+1 queries):
        // const totalRentDue = await calculateUnpaidRent(tenant.id, db);

        // Format last paid period (YYYY-MM to MMM-YY)
        let lastPaidMonth = "Never";
        if (tenant.last_paid_period) {
          const [year, month] = tenant.last_paid_period.split("-");
          const date = new Date(parseInt(year), parseInt(month) - 1);
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          lastPaidMonth = `${monthNames[date.getMonth()]}-${year.substring(2)}`;
        }

        // Calculate financial metrics
        const netBalance = totalRentOwed - ledgerTotal; // After credits

        return {
          ...tenant,
          monthly_rent: Number(tenant.monthly_rent || 0),
          credit_balance: balance > 0 ? balance : 0,
          total_rent_due: totalRentDue, // NEW: Unpaid rent ignoring credits
          net_balance: netBalance, // NEW: Actual balance after credits (can be negative)
          total_dues: Math.max(0, netBalance), // DEPRECATED: Keeping for compatibility
          last_paid_month: lastPaidMonth,
        };
      })
    );

    return NextResponse.json({
      tenants,
    });
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenants" },
      { status: 500 }
    );
  }
}
