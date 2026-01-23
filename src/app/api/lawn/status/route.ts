import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    // Get opening balance
    const openingBalanceResult = await db.execute({
      sql: 'SELECT value FROM lawn_settings WHERE key = ?',
      args: ['opening_balance'],
    });

    const openingBalance = openingBalanceResult.rows.length > 0
      ? Number(openingBalanceResult.rows[0].value)
      : 0;

    // Build SQL for filtered queries
    let eventsSql = 'SELECT COALESCE(SUM(booking_amount), 0) as total, COUNT(*) as count FROM lawn_events';
    let withdrawalsSql = 'SELECT COALESCE(SUM(amount), 0) as total FROM lawn_withdrawals';
    const eventsArgs: any[] = [];
    const withdrawalsArgs: any[] = [];

    // Add date filters if provided
    if (fromDate && toDate) {
      eventsSql += ' WHERE event_date >= ? AND event_date <= ?';
      eventsArgs.push(fromDate, toDate);
      withdrawalsSql += ' WHERE withdrawal_date >= ? AND withdrawal_date <= ?';
      withdrawalsArgs.push(fromDate, toDate);
    } else if (fromDate) {
      eventsSql += ' WHERE event_date >= ?';
      eventsArgs.push(fromDate);
      withdrawalsSql += ' WHERE withdrawal_date >= ?';
      withdrawalsArgs.push(fromDate);
    } else if (toDate) {
      eventsSql += ' WHERE event_date <= ?';
      eventsArgs.push(toDate);
      withdrawalsSql += ' WHERE withdrawal_date <= ?';
      withdrawalsArgs.push(toDate);
    }

    // Get total income from events
    const eventsResult = await db.execute({
      sql: eventsSql,
      args: eventsArgs,
    });
    const totalIncome = Number(eventsResult.rows[0].total);
    const eventCount = Number(eventsResult.rows[0].count);

    // Get total withdrawals
    const withdrawalsResult = await db.execute({
      sql: withdrawalsSql,
      args: withdrawalsArgs,
    });
    const totalWithdrawals = Number(withdrawalsResult.rows[0].total);

    // Calculate available balance (opening balance is not affected by date filter)
    const availableBalance = openingBalance + totalIncome - totalWithdrawals;

    return NextResponse.json({
      openingBalance,
      totalIncome,
      totalWithdrawals,
      availableBalance,
      eventCount,
      filtered: !!(fromDate || toDate),
      dateRange: fromDate || toDate ? { fromDate, toDate } : null,
    });
  } catch (error) {
    console.error('Error fetching lawn status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lawn status' },
      { status: 500 }
    );
  }
}
