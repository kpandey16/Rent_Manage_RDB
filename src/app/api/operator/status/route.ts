import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/operator/status - Get operator cash status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sinceDate = searchParams.get("sinceDate"); // Optional: filter since last withdrawal

    // If no sinceDate provided, use the timestamp of the last withdrawal
    let effectiveSinceTimestamp = sinceDate;

    if (!effectiveSinceTimestamp) {
      const lastWithdrawal = await db.execute({
        sql: `SELECT created_at FROM admin_withdrawals ORDER BY created_at DESC LIMIT 1`,
        args: [],
      });

      if (lastWithdrawal.rows.length > 0) {
        effectiveSinceTimestamp = lastWithdrawal.rows[0].created_at as string;
      }
    }

    // Get ALL TIME totals for accurate available balance
    const allTimeCollectionsResult = await db.execute({
      sql: `SELECT COALESCE(SUM(amount), 0) as total FROM tenant_ledger WHERE type = 'payment'`,
      args: [],
    });

    const allTimeExpensesResult = await db.execute({
      sql: `SELECT COALESCE(SUM(amount), 0) as total FROM operator_expenses`,
      args: [],
    });

    const allTimeWithdrawalsResult = await db.execute({
      sql: `SELECT COALESCE(SUM(amount), 0) as total FROM admin_withdrawals`,
      args: [],
    });

    // Get all time adjustments
    const allTimeAdjustmentsResult = await db.execute({
      sql: `SELECT
              adjustment_type,
              COALESCE(SUM(amount), 0) as total
            FROM operator_adjustments
            GROUP BY adjustment_type`,
      args: [],
    });

    // Calculate adjustment impact on balance
    let adjustmentsTotal = 0;
    allTimeAdjustmentsResult.rows.forEach((row: any) => {
      const type = row.adjustment_type;
      const amount = Number(row.total);

      if (type === 'opening_balance' || type === 'add_cash') {
        adjustmentsTotal += amount;
      } else if (type === 'remove_cash') {
        adjustmentsTotal -= amount;
      } else if (type === 'reconciliation') {
        adjustmentsTotal += amount; // Reconciliation can be positive or negative
      }
    });

    // Calculate TRUE available balance (all time)
    const allTimeCollections = Number(allTimeCollectionsResult.rows[0].total);
    const allTimeExpenses = Number(allTimeExpensesResult.rows[0].total);
    const allTimeWithdrawals = Number(allTimeWithdrawalsResult.rows[0].total);
    const availableBalance = allTimeCollections - allTimeExpenses - allTimeWithdrawals + adjustmentsTotal;

    // Get collections by payment method (for display, since last withdrawal)
    let collectionsQuery = `
      SELECT
        payment_method,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total
      FROM tenant_ledger
      WHERE type = 'payment'
    `;

    const collectionsArgs: any[] = [];
    if (effectiveSinceTimestamp) {
      collectionsQuery += " AND created_at > ?";
      collectionsArgs.push(effectiveSinceTimestamp);
    }

    collectionsQuery += " GROUP BY payment_method";

    const collectionsResult = await db.execute({
      sql: collectionsQuery,
      args: collectionsArgs,
    });

    // Get total collections since last withdrawal (for display)
    let totalCollectionsSinceQuery = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM tenant_ledger
      WHERE type = 'payment'
    `;

    const totalCollectionsSinceArgs: any[] = [];
    if (effectiveSinceTimestamp) {
      totalCollectionsSinceQuery += " AND created_at > ?";
      totalCollectionsSinceArgs.push(effectiveSinceTimestamp);
    }

    const totalCollectionsSinceResult = await db.execute({
      sql: totalCollectionsSinceQuery,
      args: totalCollectionsSinceArgs,
    });

    // Get expenses by category (since last withdrawal)
    let expensesQuery = `
      SELECT
        category,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total
      FROM operator_expenses
    `;

    const expensesArgs: any[] = [];
    if (effectiveSinceTimestamp) {
      expensesQuery += " WHERE created_at > ?";
      expensesArgs.push(effectiveSinceTimestamp);
    }

    expensesQuery += " GROUP BY category";

    const expensesResult = await db.execute({
      sql: expensesQuery,
      args: expensesArgs,
    });

    // Get total expenses since last withdrawal (for display)
    let totalExpensesSinceQuery = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM operator_expenses
    `;

    const totalExpensesSinceArgs: any[] = [];
    if (effectiveSinceTimestamp) {
      totalExpensesSinceQuery += " WHERE created_at > ?";
      totalExpensesSinceArgs.push(effectiveSinceTimestamp);
    }

    const totalExpensesSinceResult = await db.execute({
      sql: totalExpensesSinceQuery,
      args: totalExpensesSinceArgs,
    });

    const totalCollectionsSince = Number(totalCollectionsSinceResult.rows[0].total);
    const totalExpensesSince = Number(totalExpensesSinceResult.rows[0].total);

    // Get total withdrawals since timestamp (for display)
    let totalWithdrawalsSinceQuery = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM admin_withdrawals
    `;

    const totalWithdrawalsSinceArgs: any[] = [];
    if (effectiveSinceTimestamp) {
      totalWithdrawalsSinceQuery += " WHERE created_at > ?";
      totalWithdrawalsSinceArgs.push(effectiveSinceTimestamp);
    }

    const totalWithdrawalsSinceResult = await db.execute({
      sql: totalWithdrawalsSinceQuery,
      args: totalWithdrawalsSinceArgs,
    });

    const totalWithdrawalsSince = Number(totalWithdrawalsSinceResult.rows[0].total);

    // Format collections by method
    const collectionsByMethod = collectionsResult.rows.map((row: any) => ({
      method: row.payment_method || 'not specified',
      count: Number(row.count),
      total: Number(row.total),
    }));

    // Format expenses by category
    const expensesByCategory = expensesResult.rows.map((row: any) => ({
      category: row.category,
      count: Number(row.count),
      total: Number(row.total),
    }));

    return NextResponse.json({
      sinceDate: effectiveSinceTimestamp, // Now a timestamp, not just a date
      totalCollections: totalCollectionsSince, // Since specified timestamp (for display)
      totalExpenses: totalExpensesSince, // Since specified timestamp (for display)
      totalWithdrawals: totalWithdrawalsSince, // Since specified timestamp (for display)
      availableBalance, // TRUE balance = all collections - all expenses - all withdrawals + adjustments
      adjustmentsTotal, // Total impact of adjustments
      collectionsByMethod,
      expensesByCategory,
    });
  } catch (error) {
    console.error("Error fetching operator status:", error);
    return NextResponse.json(
      { error: "Failed to fetch operator status" },
      { status: 500 }
    );
  }
}
