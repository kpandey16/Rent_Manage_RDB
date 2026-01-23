import { NextRequest, NextResponse } from 'next/server';
import { db, generateId, getCurrentDateTime } from '@/lib/db';

// GET /api/lawn/withdrawals - Get all withdrawals
export async function GET() {
  try {
    const result = await db.execute({
      sql: `SELECT id, amount, withdrawal_date, withdrawn_by, withdrawal_method, notes, created_at
            FROM lawn_withdrawals
            ORDER BY withdrawal_date DESC, created_at DESC`,
    });

    const withdrawals = result.rows.map((row: any) => ({
      id: row.id,
      amount: Number(row.amount),
      withdrawalDate: row.withdrawal_date,
      withdrawnBy: row.withdrawn_by,
      withdrawalMethod: row.withdrawal_method,
      notes: row.notes,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ withdrawals });
  } catch (error) {
    console.error('Error fetching lawn withdrawals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lawn withdrawals' },
      { status: 500 }
    );
  }
}

// POST /api/lawn/withdrawals - Create new withdrawal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, withdrawalDate, withdrawnBy, withdrawalMethod, notes } = body;

    // Validation
    if (!amount || !withdrawalDate || !withdrawnBy) {
      return NextResponse.json(
        { error: 'Amount, withdrawal date, and withdrawn by are required' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than zero' },
        { status: 400 }
      );
    }

    // Check available balance
    const statusResult = await db.execute({
      sql: `SELECT
              COALESCE((SELECT value FROM lawn_settings WHERE key = 'opening_balance'), 0) as opening_balance,
              COALESCE((SELECT SUM(booking_amount) FROM lawn_events), 0) as total_income,
              COALESCE((SELECT SUM(amount) FROM lawn_withdrawals), 0) as total_withdrawals`,
    });

    const openingBalance = Number(statusResult.rows[0].opening_balance);
    const totalIncome = Number(statusResult.rows[0].total_income);
    const totalWithdrawals = Number(statusResult.rows[0].total_withdrawals);
    const availableBalance = openingBalance + totalIncome - totalWithdrawals;

    if (amount > availableBalance) {
      return NextResponse.json(
        {
          error: `Insufficient balance. Available: ₹${availableBalance.toLocaleString('en-IN')}`,
        },
        { status: 400 }
      );
    }

    const withdrawalId = generateId();
    const now = getCurrentDateTime();

    await db.execute({
      sql: `INSERT INTO lawn_withdrawals (id, amount, withdrawal_date, withdrawn_by, withdrawal_method, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        withdrawalId,
        amount,
        withdrawalDate,
        withdrawnBy,
        withdrawalMethod || null,
        notes || null,
        now,
      ],
    });

    return NextResponse.json(
      {
        message: 'Withdrawal recorded successfully',
        withdrawalId,
        newBalance: availableBalance - amount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating lawn withdrawal:', error);
    return NextResponse.json(
      { error: 'Failed to create lawn withdrawal' },
      { status: 500 }
    );
  }
}
