import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/reports - Get reports data (defaulters, collections, monthly summary)
export async function GET() {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentPeriod = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    // Calculate defaulters - simplified approach
    // Get all active tenants and their unpaid rent periods
    const tenantsQuery = await db.execute({
      sql: `SELECT
              t.id,
              t.name,
              tr.move_in_date
            FROM tenants t
            JOIN tenant_rooms tr ON t.id = tr.tenant_id
            WHERE t.is_active = 1 AND tr.is_active = 1`,
      args: [],
    });

    // For each tenant, count unpaid months
    const defaulters = { twoMonths: 0, threeMonths: 0, fourPlusMonths: 0 };

    for (const tenant of tenantsQuery.rows) {
      const paidPeriodsQuery = await db.execute({
        sql: `SELECT for_period FROM rent_payments WHERE tenant_id = ?`,
        args: [tenant.id],
      });

      const paidPeriods = new Set(paidPeriodsQuery.rows.map((r: any) => r.for_period));

      // Calculate expected periods from move-in to current month
      const moveInDate = new Date(tenant.move_in_date as string);
      const moveInYear = moveInDate.getFullYear();
      const moveInMonth = moveInDate.getMonth() + 1;

      let unpaidCount = 0;
      let year = moveInYear;
      let month = moveInMonth;

      // Count unpaid months up to current month
      while (year < currentYear || (year === currentYear && month <= currentMonth)) {
        const period = `${year}-${String(month).padStart(2, '0')}`;
        if (!paidPeriods.has(period)) {
          unpaidCount++;
        }

        month++;
        if (month > 12) {
          month = 1;
          year++;
        }
      }

      // Categorize tenant
      if (unpaidCount >= 4) {
        defaulters.fourPlusMonths++;
      } else if (unpaidCount === 3) {
        defaulters.threeMonths++;
      } else if (unpaidCount === 2) {
        defaulters.twoMonths++;
      }
    }

    const defaultersData = defaulters;

    // Get current month data
    const currentMonthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextMonthYear = currentMonth === 12 ? currentYear + 1 : currentYear;
    const nextMonthStart = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01`;

    // Total collection for current month (payments made in current month)
    const collectionQuery = await db.execute({
      sql: `SELECT COALESCE(SUM(amount), 0) as total
            FROM tenant_ledger
            WHERE type IN ('payment', 'deposit_used')
              AND transaction_date >= ? AND transaction_date < ?`,
      args: [currentMonthStart, nextMonthStart],
    });

    const totalCollection = Number(collectionQuery.rows[0]?.total || 0);

    // Expected collection (sum of monthly rent for all active tenants)
    const expectedCollectionQuery = await db.execute({
      sql: `SELECT COALESCE(SUM(r.monthly_rent), 0) as total
            FROM tenant_rooms tr
            JOIN rooms r ON tr.room_id = r.id
            WHERE tr.is_active = 1`,
      args: [],
    });

    const expectedCollection = Number(expectedCollectionQuery.rows[0]?.total || 0);

    // Withdrawals for current month
    const withdrawalsQuery = await db.execute({
      sql: `SELECT COALESCE(SUM(amount), 0) as total
            FROM operator_withdrawals
            WHERE withdrawal_date >= ? AND withdrawal_date < ?`,
      args: [currentMonthStart, nextMonthStart],
    });

    const totalWithdrawals = Number(withdrawalsQuery.rows[0]?.total || 0);

    // Paid tenants (tenants who paid for current month)
    const paidTenantsQuery = await db.execute({
      sql: `SELECT COUNT(DISTINCT tenant_id) as count
            FROM rent_payments
            WHERE for_period = ?`,
      args: [currentPeriod],
    });

    const paidTenants = Number(paidTenantsQuery.rows[0]?.count || 0);

    // Total active tenants
    const totalTenantsQuery = await db.execute({
      sql: `SELECT COUNT(DISTINCT tenant_id) as count
            FROM tenant_rooms
            WHERE is_active = 1`,
      args: [],
    });

    const totalTenants = Number(totalTenantsQuery.rows[0]?.count || 0);

    // Collection rate
    const collectionRate = expectedCollection > 0
      ? Math.round((totalCollection / expectedCollection) * 1000) / 10
      : 0;

    // Net balance
    const netBalance = totalCollection - totalWithdrawals;

    // Get last 4 months history
    const monthlyHistory = [];
    for (let i = 0; i < 4; i++) {
      const monthDate = new Date(currentYear, currentMonth - 1 - i, 1);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth() + 1;
      const period = `${year}-${String(month).padStart(2, '0')}`;
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const nextM = month === 12 ? 1 : month + 1;
      const nextY = month === 12 ? year + 1 : year;
      const nextStart = `${nextY}-${String(nextM).padStart(2, '0')}-01`;

      // Collection for this month
      const monthCollection = await db.execute({
        sql: `SELECT COALESCE(SUM(amount), 0) as total
              FROM tenant_ledger
              WHERE type IN ('payment', 'deposit_used')
                AND transaction_date >= ? AND transaction_date < ?`,
        args: [monthStart, nextStart],
      });

      // Withdrawals for this month
      const monthWithdrawals = await db.execute({
        sql: `SELECT COALESCE(SUM(amount), 0) as total
              FROM operator_withdrawals
              WHERE withdrawal_date >= ? AND withdrawal_date < ?`,
        args: [monthStart, nextStart],
      });

      // Expected for this month (active tenants' rent during this period)
      const monthExpected = await db.execute({
        sql: `SELECT COALESCE(SUM(r.monthly_rent), 0) as total
              FROM tenant_rooms tr
              JOIN rooms r ON tr.room_id = r.id
              WHERE tr.is_active = 1
                OR (tr.move_out_date IS NOT NULL AND tr.move_out_date >= ?)`,
        args: [monthStart],
      });

      const collection = Number(monthCollection.rows[0]?.total || 0);
      const withdrawals = Number(monthWithdrawals.rows[0]?.total || 0);
      const expected = Number(monthExpected.rows[0]?.total || 0);
      const rate = expected > 0 ? Math.round((collection / expected) * 1000) / 10 : 0;

      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      monthlyHistory.push({
        month: `${monthNames[monthDate.getMonth()]} ${year}`,
        collection,
        withdrawals,
        rate,
      });
    }

    // Weekly collection for current month (last 4 weeks)
    const weeklyCollectionData = [];
    const weeksBack = 4;
    for (let i = 0; i < weeksBack; i++) {
      const weekEnd = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
      const weekStart = new Date(weekEnd.getTime() - (6 * 24 * 60 * 60 * 1000));

      const weekCollection = await db.execute({
        sql: `SELECT COALESCE(SUM(amount), 0) as total
              FROM tenant_ledger
              WHERE type IN ('payment', 'deposit_used')
                AND transaction_date >= ? AND transaction_date <= ?`,
        args: [weekStart.toISOString().split('T')[0], weekEnd.toISOString().split('T')[0]],
      });

      weeklyCollectionData.unshift({
        label: `W${weeksBack - i}`,
        amount: Number(weekCollection.rows[0]?.total || 0),
      });
    }

    // Monthly collection for chart (last 4 months)
    const monthlyCollectionData = monthlyHistory.slice().reverse().map((m) => ({
      label: m.month.split(' ')[0], // Just the month name
      amount: m.collection,
    }));

    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];

    return NextResponse.json({
      defaultersData,
      weeklyCollectionData,
      monthlyCollectionData,
      monthlyData: {
        month: `${monthNames[currentMonth - 1]} ${currentYear}`,
        totalCollection,
        expectedCollection,
        collectionRate,
        totalWithdrawals,
        netBalance,
        paidTenants,
        totalTenants,
      },
      monthlyHistory,
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
