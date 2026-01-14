import { NextRequest, NextResponse } from "next/server";
import { db, generateId, getCurrentDateTime } from "@/lib/db";

// GET /api/operator/withdrawals - Get all withdrawals
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sinceDate = searchParams.get("sinceDate"); // Optional filter

    let sql = `
      SELECT
        id,
        amount,
        withdrawal_method,
        withdrawn_by,
        withdrawal_date,
        notes,
        created_at
      FROM admin_withdrawals
    `;

    const args: any[] = [];
    if (sinceDate) {
      sql += " WHERE created_at > ?";
      args.push(sinceDate);
    }

    sql += " ORDER BY created_at DESC";

    const result = await db.execute({ sql, args });

    return NextResponse.json({
      withdrawals: result.rows,
    });
  } catch (error) {
    console.error("Error fetching withdrawals:", error);
    return NextResponse.json(
      { error: "Failed to fetch withdrawals" },
      { status: 500 }
    );
  }
}

// POST /api/operator/withdrawals - Record a new withdrawal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, method, withdrawnBy, date, notes } = body;

    // Validation
    if (!amount || !method || !date) {
      return NextResponse.json(
        { error: "Amount, method, and date are required" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than zero" },
        { status: 400 }
      );
    }

    const validMethods = ['cash', 'upi', 'bank_transfer', 'mixed'];
    if (!validMethods.includes(method)) {
      return NextResponse.json(
        { error: "Invalid withdrawal method" },
        { status: 400 }
      );
    }

    const now = getCurrentDateTime();
    const withdrawalId = generateId();

    await db.execute({
      sql: `INSERT INTO admin_withdrawals (id, amount, withdrawal_method, withdrawn_by, withdrawal_date, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [withdrawalId, amount, method, withdrawnBy || "Admin", date, notes || null, now],
    });

    return NextResponse.json(
      {
        message: `Withdrawal of ₹${amount.toLocaleString("en-IN")} recorded successfully`,
        withdrawalId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error recording withdrawal:", error);
    return NextResponse.json(
      { error: "Failed to record withdrawal" },
      { status: 500 }
    );
  }
}
