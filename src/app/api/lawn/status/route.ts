import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Get opening balance
    const openingBalanceResult = await db.execute({
      sql: 'SELECT value FROM lawn_settings WHERE key = ?',
      args: ['opening_balance'],
    });

    const openingBalance = openingBalanceResult.rows.length > 0
      ? Number(openingBalanceResult.rows[0].value)
      : 0;

    // Get total income from events
    const eventsResult = await db.execute({
      sql: 'SELECT COALESCE(SUM(booking_amount), 0) as total FROM lawn_events',
    });
    const totalIncome = Number(eventsResult.rows[0].total);

    // Get total withdrawals
    const withdrawalsResult = await db.execute({
      sql: 'SELECT COALESCE(SUM(amount), 0) as total FROM lawn_withdrawals',
    });
    const totalWithdrawals = Number(withdrawalsResult.rows[0].total);

    // Calculate available balance
    const availableBalance = openingBalance + totalIncome - totalWithdrawals;

    // Get event count
    const eventCountResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM lawn_events',
    });
    const eventCount = Number(eventCountResult.rows[0].count);

    return NextResponse.json({
      openingBalance,
      totalIncome,
      totalWithdrawals,
      availableBalance,
      eventCount,
    });
  } catch (error) {
    console.error('Error fetching lawn status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lawn status' },
      { status: 500 }
    );
  }
}
