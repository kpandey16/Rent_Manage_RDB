import { NextRequest, NextResponse } from "next/server";
import { db, generateId, getCurrentDateTime } from "@/lib/db";

// POST /api/tenants/[id]/vacate-room - Vacate a room for a tenant
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenantId } = await params;
    const body = await request.json();
    const { roomId, vacateDate, refundAmount, refundCreditBalance, notes } = body;

    // Validation
    if (!roomId || !vacateDate) {
      return NextResponse.json(
        { error: "Room ID and vacate date are required" },
        { status: 400 }
      );
    }

    // Check if tenant exists
    const tenant = await db.execute({
      sql: "SELECT id, name, is_active FROM tenants WHERE id = ?",
      args: [tenantId],
    });

    if (tenant.rows.length === 0) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    // Check if room is allocated to this tenant
    const allocation = await db.execute({
      sql: `SELECT id FROM tenant_rooms
            WHERE tenant_id = ? AND room_id = ? AND is_active = 1`,
      args: [tenantId, roomId],
    });

    if (allocation.rows.length === 0) {
      return NextResponse.json(
        { error: "Room is not allocated to this tenant" },
        { status: 400 }
      );
    }

    // Get tenant's total dues and active rooms count
    const tenantFinancials = await db.execute({
      sql: `SELECT
              COUNT(DISTINCT CASE WHEN tr.is_active = 1 THEN tr.id END) as active_rooms_count,
              COALESCE((SELECT SUM(amount) FROM tenant_ledger WHERE tenant_id = ?), 0) as total_credits,
              COALESCE((SELECT SUM(rent_amount) FROM rent_payments WHERE tenant_id = ?), 0) as total_rent_paid,
              COALESCE(SUM(DISTINCT sd.amount *
                CASE
                  WHEN sd.transaction_type = 'deposit' THEN 1
                  WHEN sd.transaction_type = 'refund' THEN -1
                  WHEN sd.transaction_type = 'used_for_rent' THEN -1
                  ELSE 0
                END
              ), 0) as security_deposit_balance
            FROM tenants t
            LEFT JOIN tenant_rooms tr ON t.id = tr.tenant_id
            LEFT JOIN security_deposits sd ON t.id = sd.tenant_id
            WHERE t.id = ?
            GROUP BY t.id`,
      args: [tenantId, tenantId, tenantId],
    });

    const financials = tenantFinancials.rows[0];
    const activeRoomsCount = Number(financials.active_rooms_count || 0);
    const ledgerBalance = Number(financials.total_credits || 0) - Number(financials.total_rent_paid || 0);
    const totalDues = ledgerBalance < 0 ? Math.abs(ledgerBalance) : 0;
    const creditBalance = ledgerBalance > 0 ? ledgerBalance : 0;
    const securityDepositBalance = Number(financials.security_deposit_balance || 0);

    // Validation: If this is the last room and tenant has dues, block vacate
    const isLastRoom = activeRoomsCount === 1;
    if (isLastRoom && totalDues > 0) {
      return NextResponse.json(
        {
          error: `Cannot vacate: Tenant has ₹${totalDues.toLocaleString("en-IN")} pending dues. Please clear dues before vacating the only room.`
        },
        { status: 400 }
      );
    }

    // Validate security deposit refund amount
    if (refundAmount && refundAmount > 0) {
      if (refundAmount > securityDepositBalance) {
        return NextResponse.json(
          {
            error: `Refund amount (₹${refundAmount}) exceeds available security deposit (₹${securityDepositBalance})`
          },
          { status: 400 }
        );
      }
    }

    // Validate credit balance refund amount
    if (refundCreditBalance && refundCreditBalance > 0) {
      if (refundCreditBalance > creditBalance) {
        return NextResponse.json(
          {
            error: `Credit refund amount (₹${refundCreditBalance}) exceeds available credit balance (₹${creditBalance})`
          },
          { status: 400 }
        );
      }
    }

    const now = getCurrentDateTime();
    const allocationId = allocation.rows[0].id;

    // Mark tenant_room as inactive
    await db.execute({
      sql: `UPDATE tenant_rooms
            SET is_active = 0, move_out_date = ?, updated_at = ?
            WHERE id = ?`,
      args: [vacateDate, now, allocationId],
    });

    // Update room status to vacant
    await db.execute({
      sql: "UPDATE rooms SET status = 'vacant', updated_at = ? WHERE id = ?",
      args: [now, roomId],
    });

    // Process security deposit refund if requested
    if (refundAmount && refundAmount > 0) {
      const refundId = generateId();
      await db.execute({
        sql: `INSERT INTO security_deposits (id, tenant_id, transaction_type, amount, transaction_date, notes, created_at)
              VALUES (?, ?, 'refund', ?, ?, ?, ?)`,
        args: [
          refundId,
          tenantId,
          refundAmount,
          vacateDate,
          notes || `Security deposit refund on vacating room`,
          now
        ],
      });
    }

    // Process credit balance refund if requested (deducted from collection)
    if (refundCreditBalance && refundCreditBalance > 0) {
      const creditRefundId = generateId();
      await db.execute({
        sql: `INSERT INTO tenant_ledger (id, tenant_id, transaction_date, type, amount, description, created_at)
              VALUES (?, ?, ?, 'payment', ?, ?, ?)`,
        args: [
          creditRefundId,
          tenantId,
          vacateDate,
          -refundCreditBalance, // Negative amount = deduction from collection
          notes || `Credit balance refund on vacating room`,
          now
        ],
      });
    }

    // If this was the last room, mark tenant as inactive
    if (isLastRoom) {
      await db.execute({
        sql: "UPDATE tenants SET is_active = 0, updated_at = ? WHERE id = ?",
        args: [now, tenantId],
      });
    }

    // Get room details for response
    const room = await db.execute({
      sql: "SELECT code, name FROM rooms WHERE id = ?",
      args: [roomId],
    });

    // Build refund message
    const refundMessages: string[] = [];
    if (refundAmount > 0) {
      refundMessages.push(`Security deposit of ₹${refundAmount.toLocaleString("en-IN")} refunded`);
    }
    if (refundCreditBalance > 0) {
      refundMessages.push(`Credit balance of ₹${refundCreditBalance.toLocaleString("en-IN")} refunded`);
    }
    const refundMessage = refundMessages.length > 0 ? `. ${refundMessages.join('. ')}` : '';

    return NextResponse.json(
      {
        message: `Room ${room.rows[0].code} vacated successfully${refundMessage}${isLastRoom ? '. Tenant marked as inactive' : ''}`,
        vacationDetails: {
          roomCode: room.rows[0].code,
          vacateDate,
          refundAmount: refundAmount || 0,
          refundCreditBalance: refundCreditBalance || 0,
          tenantNowInactive: isLastRoom,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error vacating room:", error);
    return NextResponse.json(
      { error: "Failed to vacate room" },
      { status: 500 }
    );
  }
}
