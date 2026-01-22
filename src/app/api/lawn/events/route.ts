import { NextRequest, NextResponse } from 'next/server';
import { db, generateId, getCurrentDateTime } from '@/lib/db';

// GET /api/lawn/events - Get all events with running balance
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

    // Get all events
    const eventsResult = await db.execute({
      sql: `SELECT id, event_date, booking_amount, customer_name, phone, notes, created_at
            FROM lawn_events
            ORDER BY event_date DESC, created_at DESC`,
    });

    // Get all withdrawals
    const withdrawalsResult = await db.execute({
      sql: `SELECT id, amount, withdrawal_date, withdrawn_by, withdrawal_method, notes, created_at
            FROM lawn_withdrawals
            ORDER BY withdrawal_date DESC, created_at DESC`,
    });

    // Combine events and withdrawals, then sort by date
    const allTransactions: any[] = [];

    // Add opening balance as first entry
    if (openingBalance !== 0) {
      allTransactions.push({
        id: 'opening_balance',
        date: '1900-01-01', // Use old date to ensure it's first
        type: 'opening_balance',
        amount: openingBalance,
        description: 'Opening Balance',
        created_at: '1900-01-01T00:00:00',
      });
    }

    // Add events
    eventsResult.rows.forEach((row: any) => {
      allTransactions.push({
        id: row.id,
        date: row.event_date,
        type: 'event',
        amount: Number(row.booking_amount),
        customerName: row.customer_name,
        phone: row.phone,
        notes: row.notes,
        created_at: row.created_at,
      });
    });

    // Add withdrawals
    withdrawalsResult.rows.forEach((row: any) => {
      allTransactions.push({
        id: row.id,
        date: row.withdrawal_date,
        type: 'withdrawal',
        amount: Number(row.amount),
        withdrawnBy: row.withdrawn_by,
        withdrawalMethod: row.withdrawal_method,
        notes: row.notes,
        created_at: row.created_at,
      });
    });

    // Sort by date (oldest first for running balance calculation)
    allTransactions.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.created_at.localeCompare(b.created_at);
    });

    // Calculate running balance
    let runningBalance = 0;
    const transactionsWithBalance = allTransactions.map((transaction) => {
      if (transaction.type === 'opening_balance') {
        runningBalance = transaction.amount;
      } else if (transaction.type === 'event') {
        runningBalance += transaction.amount;
      } else if (transaction.type === 'withdrawal') {
        runningBalance -= transaction.amount;
      }

      return {
        ...transaction,
        runningBalance,
      };
    });

    // Reverse to show newest first
    transactionsWithBalance.reverse();

    return NextResponse.json({
      transactions: transactionsWithBalance,
      openingBalance,
    });
  } catch (error) {
    console.error('Error fetching lawn events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lawn events' },
      { status: 500 }
    );
  }
}

// POST /api/lawn/events - Create new event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventDate, bookingAmount, customerName, phone, notes } = body;

    // Validation
    if (!eventDate || !bookingAmount) {
      return NextResponse.json(
        { error: 'Event date and booking amount are required' },
        { status: 400 }
      );
    }

    if (bookingAmount <= 0) {
      return NextResponse.json(
        { error: 'Booking amount must be greater than zero' },
        { status: 400 }
      );
    }

    const eventId = generateId();
    const now = getCurrentDateTime();

    await db.execute({
      sql: `INSERT INTO lawn_events (id, event_date, booking_amount, customer_name, phone, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        eventId,
        eventDate,
        bookingAmount,
        customerName || null,
        phone || null,
        notes || null,
        now,
      ],
    });

    return NextResponse.json(
      {
        message: 'Event added successfully',
        eventId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating lawn event:', error);
    return NextResponse.json(
      { error: 'Failed to create lawn event' },
      { status: 500 }
    );
  }
}
