import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await params;

    // Fetch transaction details
    const transactionResult = await db.execute({
      sql: `SELECT
              tl.id,
              tl.tenant_id,
              tl.transaction_date,
              tl.type,
              tl.subtype,
              tl.amount,
              tl.payment_method,
              tl.description,
              tl.document_id,
              tl.created_at,
              t.name as tenant_name
            FROM tenant_ledger tl
            JOIN tenants t ON tl.tenant_id = t.id
            WHERE tl.id = ?`,
      args: [transactionId],
    });

    if (transactionResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    const transaction: any = transactionResult.rows[0];

    // Fetch tenant's rooms
    const roomsResult = await db.execute({
      sql: `SELECT r.code, r.name
            FROM tenant_rooms tr
            JOIN rooms r ON tr.room_id = r.id
            WHERE tr.tenant_id = ? AND tr.is_active = 1`,
      args: [transaction.tenant_id],
    });

    const rooms = roomsResult.rows.map((room: any) => room.code);

    // Fetch rent periods paid by this transaction
    const rentPaymentsResult = await db.execute({
      sql: `SELECT for_period, rent_amount
            FROM rent_payments
            WHERE ledger_id = ?
            ORDER BY for_period`,
      args: [transactionId],
    });

    const rentPeriods = rentPaymentsResult.rows.map((rp: any) => ({
      period: rp.for_period as string,
      amount: Number(rp.rent_amount),
    }));

    // Fetch adjustments in the same document bundle (if any)
    const adjustments: any[] = [];
    if (transaction.document_id) {
      const adjustmentsResult = await db.execute({
        sql: `SELECT type, subtype, amount, description
              FROM tenant_ledger
              WHERE document_id = ? AND type = 'adjustment'`,
        args: [transaction.document_id],
      });

      adjustments.push(
        ...adjustmentsResult.rows.map((adj: any) => ({
          type: adj.subtype || 'other',
          amount: Number(adj.amount),
          description: adj.description as string,
        }))
      );
    }

    // Calculate credit balance at the time of this transaction
    const ledgerUpToTransaction = await db.execute({
      sql: `SELECT COALESCE(SUM(amount), 0) as total
            FROM tenant_ledger
            WHERE tenant_id = ?
              AND (transaction_date < ? OR (transaction_date = ? AND created_at <= ?))`,
      args: [
        transaction.tenant_id,
        transaction.transaction_date,
        transaction.transaction_date,
        transaction.created_at,
      ],
    });

    const rentUpToTransaction = await db.execute({
      sql: `SELECT COALESCE(SUM(rp.rent_amount), 0) as total
            FROM rent_payments rp
            JOIN tenant_ledger tl ON rp.ledger_id = tl.id
            WHERE rp.tenant_id = ?
              AND (tl.transaction_date < ? OR (tl.transaction_date = ? AND tl.created_at <= ?))`,
      args: [
        transaction.tenant_id,
        transaction.transaction_date,
        transaction.transaction_date,
        transaction.created_at,
      ],
    });

    const ledgerTotal = Number(ledgerUpToTransaction.rows[0].total);
    const rentTotal = Number(rentUpToTransaction.rows[0].total);
    const creditRemaining = ledgerTotal - rentTotal;

    // Calculate total amount (payment + adjustments)
    const totalAmount =
      Number(transaction.amount) +
      adjustments.reduce((sum, adj) => sum + adj.amount, 0);

    // Build receipt data
    const receiptData = {
      receiptId: transaction.id,
      receiptDate: new Date().toISOString(),
      tenant: {
        name: transaction.tenant_name,
        id: transaction.tenant_id,
        rooms,
      },
      payment: {
        amount: Number(transaction.amount),
        method: transaction.payment_method || 'N/A',
        date: transaction.transaction_date,
        description: transaction.description,
      },
      adjustments: adjustments.length > 0 ? adjustments : undefined,
      rentPeriods: rentPeriods.length > 0 ? rentPeriods : undefined,
      totalAmount,
      creditRemaining: creditRemaining > 0 ? creditRemaining : undefined,
      landlord: {
        name: 'Property Management', // TODO: Make this configurable
        // address: 'Your Address Here',
        // phone: 'Your Phone Here',
        // email: 'your-email@example.com',
      },
    };

    return NextResponse.json({ receipt: receiptData });
  } catch (error) {
    console.error('Error generating receipt:', error);
    return NextResponse.json(
      { error: 'Failed to generate receipt' },
      { status: 500 }
    );
  }
}
