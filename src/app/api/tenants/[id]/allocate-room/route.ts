import { NextRequest, NextResponse } from "next/server";
import { db, generateId, getCurrentDateTime } from "@/lib/db";

// POST /api/tenants/[id]/allocate-room - Allocate a room to a tenant
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenantId } = await params;
    const body = await request.json();
    const { roomId, allocationDate, rentEffectiveDate, notes } = body;

    // Validation
    if (!roomId || !allocationDate) {
      return NextResponse.json(
        { error: "Room ID and allocation date are required" },
        { status: 400 }
      );
    }

    // Convert month format (YYYY-MM) to full date (YYYY-MM-01)
    // If already a full date, keep it as is
    const moveInDate = allocationDate.length === 7 ? `${allocationDate}-01` : allocationDate;
    const effectiveDate = rentEffectiveDate
      ? (rentEffectiveDate.length === 7 ? `${rentEffectiveDate}-01` : rentEffectiveDate)
      : moveInDate;

    // Check if tenant exists and is active
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

    if (!tenant.rows[0].is_active) {
      return NextResponse.json(
        { error: "Cannot allocate room to inactive tenant" },
        { status: 400 }
      );
    }

    // Check if room exists and is vacant
    const room = await db.execute({
      sql: "SELECT id, code, name, monthly_rent, status FROM rooms WHERE id = ?",
      args: [roomId],
    });

    if (room.rows.length === 0) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    if (room.rows[0].status !== "vacant") {
      return NextResponse.json(
        { error: "Room is not vacant" },
        { status: 400 }
      );
    }

    // Check if room is already allocated to another tenant
    const existingAllocation = await db.execute({
      sql: "SELECT id FROM tenant_rooms WHERE room_id = ? AND is_active = 1",
      args: [roomId],
    });

    if (existingAllocation.rows.length > 0) {
      return NextResponse.json(
        { error: "Room is already allocated to another tenant" },
        { status: 409 }
      );
    }

    // Create the allocation
    const allocationId = generateId();
    const now = getCurrentDateTime();

    await db.execute({
      sql: `INSERT INTO tenant_rooms (id, tenant_id, room_id, move_in_date, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, ?, ?)`,
      args: [allocationId, tenantId, roomId, moveInDate, now, now],
    });

    // Update room status to occupied
    await db.execute({
      sql: "UPDATE rooms SET status = 'occupied', updated_at = ? WHERE id = ?",
      args: [now, roomId],
    });

    // If rent effective date is provided and different from move-in date,
    // create a rent update record
    if (effectiveDate !== moveInDate || rentEffectiveDate) {
      const rentUpdateId = generateId();
      await db.execute({
        sql: `INSERT INTO rent_updates (id, room_id, old_rent, new_rent, effective_from, created_at)
              VALUES (?, ?, NULL, ?, ?, ?)`,
        args: [rentUpdateId, roomId, room.rows[0].monthly_rent, effectiveDate, now],
      });
    }

    // Fetch the allocation details
    const allocation = await db.execute({
      sql: `SELECT
              tr.*,
              t.name as tenant_name,
              r.code as room_code,
              r.name as room_name,
              r.monthly_rent
            FROM tenant_rooms tr
            JOIN tenants t ON tr.tenant_id = t.id
            JOIN rooms r ON tr.room_id = r.id
            WHERE tr.id = ?`,
      args: [allocationId],
    });

    return NextResponse.json(
      {
        message: "Room allocated successfully",
        allocation: allocation.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error allocating room:", error);
    return NextResponse.json(
      { error: "Failed to allocate room" },
      { status: 500 }
    );
  }
}
