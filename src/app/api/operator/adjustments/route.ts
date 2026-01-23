import { NextRequest, NextResponse } from 'next/server';
import { db, generateId, getCurrentDateTime } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// POST /api/operator/adjustments - Create a new operator balance adjustment
export async function POST(request: NextRequest) {
  try {
    // Get current user for audit trail
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { amount, adjustmentType, adjustmentDate, notes } = body;

    // Validation
    if (!amount || amount === 0) {
      return NextResponse.json(
        { error: 'Amount is required and cannot be zero' },
        { status: 400 }
      );
    }

    if (!adjustmentType) {
      return NextResponse.json(
        { error: 'Adjustment type is required' },
        { status: 400 }
      );
    }

    const validTypes = ['opening_balance', 'add_cash', 'remove_cash', 'reconciliation'];
    if (!validTypes.includes(adjustmentType)) {
      return NextResponse.json(
        { error: 'Invalid adjustment type' },
        { status: 400 }
      );
    }

    if (!adjustmentDate) {
      return NextResponse.json(
        { error: 'Adjustment date is required' },
        { status: 400 }
      );
    }

    if (!notes || notes.trim().length === 0) {
      return NextResponse.json(
        { error: 'Notes are required to explain the adjustment' },
        { status: 400 }
      );
    }

    // For opening_balance and add_cash, amount should be positive
    // For remove_cash, amount should be positive (will be subtracted in calculation)
    // For reconciliation, amount can be positive or negative
    if (adjustmentType !== 'reconciliation' && amount < 0) {
      return NextResponse.json(
        { error: 'Amount must be positive' },
        { status: 400 }
      );
    }

    const adjustmentId = generateId();
    const now = getCurrentDateTime();

    // Create adjustment record
    await db.execute({
      sql: `INSERT INTO operator_adjustments (id, amount, adjustment_type, adjustment_date, notes, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [adjustmentId, amount, adjustmentType, adjustmentDate, notes.trim(), currentUser.id, now],
    });

    // Build success message based on type
    let message = 'Adjustment recorded successfully';
    switch (adjustmentType) {
      case 'opening_balance':
        message = `Opening balance of ₹${Math.abs(amount).toLocaleString('en-IN')} set successfully`;
        break;
      case 'add_cash':
        message = `₹${Math.abs(amount).toLocaleString('en-IN')} added to operator balance`;
        break;
      case 'remove_cash':
        message = `₹${Math.abs(amount).toLocaleString('en-IN')} removed from operator balance`;
        break;
      case 'reconciliation':
        message = `Reconciliation adjustment of ${amount >= 0 ? '+' : ''}₹${Math.abs(amount).toLocaleString('en-IN')} recorded`;
        break;
    }

    return NextResponse.json({
      message,
      adjustmentId,
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating operator adjustment:', error);
    return NextResponse.json(
      { error: 'Failed to create adjustment' },
      { status: 500 }
    );
  }
}

// GET /api/operator/adjustments - Get all operator adjustments
export async function GET(request: NextRequest) {
  try {
    const result = await db.execute({
      sql: `SELECT
              oa.id,
              oa.amount,
              oa.adjustment_type,
              oa.adjustment_date,
              oa.notes,
              oa.created_by,
              oa.created_at,
              u.name as created_by_name,
              u.username as created_by_username
            FROM operator_adjustments oa
            LEFT JOIN users u ON oa.created_by = u.id
            ORDER BY oa.adjustment_date DESC, oa.created_at DESC`,
      args: [],
    });

    const adjustments = result.rows.map((row: any) => ({
      id: row.id,
      amount: Number(row.amount),
      adjustmentType: row.adjustment_type,
      adjustmentDate: row.adjustment_date,
      notes: row.notes,
      createdBy: row.created_by_name || row.created_by_username || 'Unknown',
      createdAt: row.created_at,
    }));

    return NextResponse.json({
      adjustments,
    });

  } catch (error) {
    console.error('Error fetching operator adjustments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch adjustments' },
      { status: 500 }
    );
  }
}
