import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateTotalRentOwed, calculateUnpaidRent, getRentForPeriod } from "@/lib/rent-calculator";

// GET /api/tenants/[id] - Get tenant details with financial information
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get tenant basic info
    const tenant = await db.execute({
      sql: "SELECT * FROM tenants WHERE id = ?",
      args: [id],
    });

    if (tenant.rows.length === 0) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    // Get allocated rooms with monthly rent
    const rooms = await db.execute({
      sql: `SELECT
              r.id,
              r.code,
              r.name,
              r.monthly_rent,
              tr.move_in_date,
              tr.is_active
            FROM tenant_rooms tr
            JOIN rooms r ON tr.room_id = r.id
            WHERE tr.tenant_id = ? AND tr.is_active = 1`,
      args: [id],
    });

    // Calculate total monthly rent (current rent)
    const monthlyRent = rooms.rows.reduce((sum, room) => sum + Number(room.monthly_rent), 0);

    // Find the next unpaid period to show expected rent for that month
    let nextUnpaidPeriod: string | null = null;

    if (rooms.rows.length > 0) {
      // Get already paid periods
      const paidPeriodsResult = await db.execute({
        sql: `SELECT for_period FROM rent_payments WHERE tenant_id = ? ORDER BY for_period`,
        args: [id],
      });

      const paidPeriods = new Set(paidPeriodsResult.rows.map(row => row.for_period as string));

      // Find earliest move-in date
      const earliestMoveIn = rooms.rows.reduce((earliest: Date | null, room: any) => {
        const moveInDate = new Date(room.move_in_date as string);
        return !earliest || moveInDate < earliest ? moveInDate : earliest;
      }, null);

      if (earliestMoveIn) {
        // Generate periods from move-in to current month to find next unpaid
        const currentDate = new Date();
        let date = new Date(earliestMoveIn.getFullYear(), earliestMoveIn.getMonth(), 1);

        while (date <= currentDate) {
          const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!paidPeriods.has(period)) {
            nextUnpaidPeriod = period;
            break;
          }
          date.setMonth(date.getMonth() + 1);
        }
      }
    }

    // Enhance room data with expected rent for next unpaid period
    const roomsWithExpectedRent = await Promise.all(
      rooms.rows.map(async (room: any) => {
        let expectedRent = Number(room.monthly_rent); // Default to current rent

        if (nextUnpaidPeriod) {
          // Get historical rent for this room for the next unpaid period
          expectedRent = await getRentForPeriod(room.id as string, nextUnpaidPeriod, db);
        }

        return {
          id: room.id,
          code: room.code,
          name: room.name,
          currentRent: Number(room.monthly_rent),
          expectedRent: expectedRent,
          moveInDate: room.move_in_date,
          isActive: room.is_active,
        };
      })
    );

    // Get security deposit balance
    const depositBalance = await db.execute({
      sql: `SELECT COALESCE(SUM(
              CASE
                WHEN transaction_type = 'deposit' THEN amount
                WHEN transaction_type = 'refund' THEN -amount
                WHEN transaction_type = 'used_for_rent' THEN -amount
                ELSE 0
              END
            ), 0) as balance
            FROM security_deposits
            WHERE tenant_id = ?`,
      args: [id],
    });

    // Get credit balance (ledger total - rent payments applied)
    const creditBalance = await db.execute({
      sql: `SELECT
              COALESCE(SUM(tl.amount), 0) as ledger_total,
              COALESCE((SELECT SUM(rent_amount) FROM rent_payments WHERE tenant_id = ?), 0) as payments_total
            FROM tenant_ledger tl
            WHERE tl.tenant_id = ?`,
      args: [id, id],
    });

    const ledgerTotal = Number(creditBalance.rows[0].ledger_total);
    const paymentsTotal = Number(creditBalance.rows[0].payments_total);
    const actualCreditBalance = ledgerTotal - paymentsTotal;

    // Get total rent paid
    const totalRentPaid = await db.execute({
      sql: `SELECT COALESCE(SUM(rent_amount), 0) as total
            FROM rent_payments
            WHERE tenant_id = ?`,
      args: [id],
    });

    // Get last paid month
    const lastPayment = await db.execute({
      sql: `SELECT for_period, paid_at
            FROM rent_payments
            WHERE tenant_id = ?
            ORDER BY for_period DESC
            LIMIT 1`,
      args: [id],
    });

    const lastPaidMonth = lastPayment.rows.length > 0
      ? formatPeriod(lastPayment.rows[0].for_period as string)
      : null;

    // Calculate total rent owed using rent update history
    // This will use the correct rent for each month based on effective dates
    const totalRentOwed = await calculateTotalRentOwed(id, db);

    // Calculate unpaid rent (excluding paid periods)
    const totalRentDue = await calculateUnpaidRent(id, db);

    // Calculate financial metrics
    // 1. totalRentDue = Unpaid rent only (periods not marked as paid)
    // 2. netBalance = What tenant actually owes after applying credits
    //    - Positive = tenant owes money
    //    - Negative = tenant has excess credit
    const netBalance = totalRentOwed - ledgerTotal; // After credits
    const totalDues = Math.max(0, netBalance); // For backward compatibility

    const tenantDetails = {
      ...tenant.rows[0],
      rooms: roomsWithExpectedRent,
      monthlyRent,
      securityDeposit: Number(depositBalance.rows[0].balance),
      creditBalance: actualCreditBalance,
      totalRentDue, // NEW: Unpaid rent ignoring credits
      netBalance, // NEW: Actual balance after credits (can be negative)
      totalDues, // DEPRECATED: Keeping for compatibility
      lastPaidMonth,
      nextUnpaidPeriod: nextUnpaidPeriod ? formatPeriod(nextUnpaidPeriod) : null,
      nextUnpaidPeriodRaw: nextUnpaidPeriod,
    };

    return NextResponse.json({ tenant: tenantDetails });
  } catch (error) {
    console.error("Error fetching tenant details:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenant details" },
      { status: 500 }
    );
  }
}

// Helper function to format YYYY-MM to MMM-YY
function formatPeriod(period: string): string {
  const [year, month] = period.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[date.getMonth()]}-${year.substring(2)}`;
}
