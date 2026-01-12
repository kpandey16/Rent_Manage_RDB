import { NextRequest, NextResponse } from "next/server";
import { db, generateId, getCurrentDateTime } from "@/lib/db";

// GET /api/operator/expenses - Get all expenses
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sinceDate = searchParams.get("sinceDate"); // Optional filter

    let sql = `
      SELECT
        id,
        amount,
        category,
        description,
        recorded_by,
        expense_date,
        created_at
      FROM operator_expenses
    `;

    const args: any[] = [];
    if (sinceDate) {
      sql += " WHERE expense_date >= ?";
      args.push(sinceDate);
    }

    sql += " ORDER BY expense_date DESC, created_at DESC";

    const result = await db.execute({ sql, args });

    return NextResponse.json({
      expenses: result.rows,
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

// POST /api/operator/expenses - Record a new expense
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, category, description, recordedBy, date } = body;

    // Validation
    if (!amount || !category || !description || !date) {
      return NextResponse.json(
        { error: "Amount, category, description, and date are required" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than zero" },
        { status: 400 }
      );
    }

    const validCategories = ['maintenance', 'supplies', 'utilities', 'repairs', 'other'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

    const now = getCurrentDateTime();
    const expenseId = generateId();

    await db.execute({
      sql: `INSERT INTO operator_expenses (id, amount, category, description, recorded_by, expense_date, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [expenseId, amount, category, description, recordedBy || "Operator", date, now],
    });

    return NextResponse.json(
      {
        message: `Expense of ₹${amount.toLocaleString("en-IN")} recorded successfully`,
        expenseId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error recording expense:", error);
    return NextResponse.json(
      { error: "Failed to record expense" },
      { status: 500 }
    );
  }
}
