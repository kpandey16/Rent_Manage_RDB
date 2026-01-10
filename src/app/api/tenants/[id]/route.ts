import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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

    // Calculate total monthly rent
    const monthlyRent = rooms.rows.reduce((sum, room) => sum + Number(room.monthly_rent), 0);

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

    // Calculate total rent owed based on allocation date and current date
    let totalRentOwed = 0;
    const today = new Date();

    for (const room of rooms.rows) {
      if (!room.move_in_date) continue; // Skip if no move-in date

      const moveInDate = new Date(room.move_in_date as string);
      const monthlyRent = Number(room.monthly_rent);

      // Calculate number of months between move-in date and today
      const yearsDiff = today.getFullYear() - moveInDate.getFullYear();
      const monthsDiff = today.getMonth() - moveInDate.getMonth();
      const totalMonths = yearsDiff * 12 + monthsDiff + 1; // +1 to include the current month

      totalRentOwed += totalMonths * monthlyRent;
    }

    // Calculate total dues
    // Total dues = Rent owed - Credits (payments made)
    const totalDues = Math.max(0, totalRentOwed - ledgerTotal);

    const tenantDetails = {
      ...tenant.rows[0],
      rooms: rooms.rows,
      monthlyRent,
      securityDeposit: Number(depositBalance.rows[0].balance),
      creditBalance: actualCreditBalance,
      totalDues,
      lastPaidMonth,
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
