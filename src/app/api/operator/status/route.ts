import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/operator/status - Get operator cash status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sinceDate = searchParams.get("sinceDate"); // Optional: filter since last withdrawal

    // If no sinceDate provided, use the date of the last withdrawal
    let effectiveSinceDate = sinceDate;

    if (!effectiveSinceDate) {
      const lastWithdrawal = await db.execute({
        sql: `SELECT withdrawal_date FROM admin_withdrawals ORDER BY withdrawal_date DESC, created_at DESC LIMIT 1`,
        args: [],
      });

      if (lastWithdrawal.rows.length > 0) {
        effectiveSinceDate = lastWithdrawal.rows[0].withdrawal_date as string;
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

    // Calculate TRUE available balance (all time)
    const allTimeCollections = Number(allTimeCollectionsResult.rows[0].total);
    const allTimeExpenses = Number(allTimeExpensesResult.rows[0].total);
    const allTimeWithdrawals = Number(allTimeWithdrawalsResult.rows[0].total);
    const availableBalance = allTimeCollections - allTimeExpenses - allTimeWithdrawals;

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
    if (effectiveSinceDate) {
      collectionsQuery += " AND transaction_date > ?";
      collectionsArgs.push(effectiveSinceDate);
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
    if (effectiveSinceDate) {
      totalCollectionsSinceQuery += " AND transaction_date > ?";
      totalCollectionsSinceArgs.push(effectiveSinceDate);
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
    if (effectiveSinceDate) {
      expensesQuery += " WHERE expense_date > ?";
      expensesArgs.push(effectiveSinceDate);
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
    if (effectiveSinceDate) {
      totalExpensesSinceQuery += " WHERE expense_date > ?";
      totalExpensesSinceArgs.push(effectiveSinceDate);
    }

    const totalExpensesSinceResult = await db.execute({
      sql: totalExpensesSinceQuery,
      args: totalExpensesSinceArgs,
    });

    const totalCollectionsSince = Number(totalCollectionsSinceResult.rows[0].total);
    const totalExpensesSince = Number(totalExpensesSinceResult.rows[0].total);

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
      sinceDate: effectiveSinceDate,
      totalCollections: totalCollectionsSince, // Since last withdrawal (for display)
      totalExpenses: totalExpensesSince, // Since last withdrawal (for display)
      availableBalance, // TRUE balance = all collections - all expenses - all withdrawals
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
