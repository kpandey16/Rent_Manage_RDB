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

    // Get collections by payment method
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

    // Get total collections
    let totalCollectionsQuery = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM tenant_ledger
      WHERE type = 'payment'
    `;

    const totalCollectionsArgs: any[] = [];
    if (effectiveSinceDate) {
      totalCollectionsQuery += " AND transaction_date > ?";
      totalCollectionsArgs.push(effectiveSinceDate);
    }

    const totalCollectionsResult = await db.execute({
      sql: totalCollectionsQuery,
      args: totalCollectionsArgs,
    });

    // Get expenses by category
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

    // Get total expenses
    let totalExpensesQuery = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM operator_expenses
    `;

    const totalExpensesArgs: any[] = [];
    if (effectiveSinceDate) {
      totalExpensesQuery += " WHERE expense_date > ?";
      totalExpensesArgs.push(effectiveSinceDate);
    }

    const totalExpensesResult = await db.execute({
      sql: totalExpensesQuery,
      args: totalExpensesArgs,
    });

    const totalCollections = Number(totalCollectionsResult.rows[0].total);
    const totalExpenses = Number(totalExpensesResult.rows[0].total);
    const availableBalance = totalCollections - totalExpenses;

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
      totalCollections,
      totalExpenses,
      availableBalance,
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
