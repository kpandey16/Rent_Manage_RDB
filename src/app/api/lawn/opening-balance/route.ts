import { NextRequest, NextResponse } from 'next/server';
import { db, getCurrentDateTime } from '@/lib/db';

// GET /api/lawn/opening-balance - Get current opening balance
export async function GET() {
  try {
    const result = await db.execute({
      sql: 'SELECT value FROM lawn_settings WHERE key = ?',
      args: ['opening_balance'],
    });

    const openingBalance = result.rows.length > 0
      ? Number(result.rows[0].value)
      : 0;

    return NextResponse.json({ openingBalance });
  } catch (error) {
    console.error('Error fetching opening balance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch opening balance' },
      { status: 500 }
    );
  }
}

// POST /api/lawn/opening-balance - Set opening balance
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount } = body;

    // Validation
    if (amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'Amount is required' },
        { status: 400 }
      );
    }

    const now = getCurrentDateTime();

    // Update or insert opening balance
    await db.execute({
      sql: `INSERT INTO lawn_settings (key, value, updated_at)
            VALUES ('opening_balance', ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?`,
      args: [amount, now, amount, now],
    });

    return NextResponse.json({
      message: 'Opening balance updated successfully',
      openingBalance: Number(amount),
    });
  } catch (error) {
    console.error('Error updating opening balance:', error);
    return NextResponse.json(
      { error: 'Failed to update opening balance' },
      { status: 500 }
    );
  }
}
