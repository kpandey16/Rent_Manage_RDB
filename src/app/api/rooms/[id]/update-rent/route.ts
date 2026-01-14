import { NextRequest, NextResponse } from "next/server";
import { db, generateId, getCurrentDateTime } from "@/lib/db";

// POST /api/rooms/[id]/update-rent - Update room rent
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    const body = await request.json();
    const { newRent, effectiveFrom } = body;

    // Validation
    if (!newRent || newRent <= 0) {
      return NextResponse.json(
        { error: "New rent amount is required and must be greater than zero" },
        { status: 400 }
      );
    }

    if (!effectiveFrom) {
      return NextResponse.json(
        { error: "Effective date is required" },
        { status: 400 }
      );
    }

    // Validate effective date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(effectiveFrom)) {
      return NextResponse.json(
        { error: "Effective date must be in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    // Check if room exists
    const room = await db.execute({
      sql: "SELECT id, monthly_rent FROM rooms WHERE id = ?",
      args: [roomId],
    });

    if (room.rows.length === 0) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    const oldRent = Number(room.rows[0].monthly_rent);
    const now = getCurrentDateTime();

    // Check if there's already a rent update for this effective date
    const existingUpdate = await db.execute({
      sql: "SELECT id FROM rent_updates WHERE room_id = ? AND effective_from = ?",
      args: [roomId, effectiveFrom],
    });

    if (existingUpdate.rows.length > 0) {
      return NextResponse.json(
        { error: "Rent update already exists for this effective date" },
        { status: 400 }
      );
    }

    // Create rent update record
    const updateId = generateId();
    await db.execute({
      sql: `INSERT INTO rent_updates (id, room_id, old_rent, new_rent, effective_from, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [updateId, roomId, oldRent, newRent, effectiveFrom, now],
    });

    // Update room's current monthly_rent
    await db.execute({
      sql: "UPDATE rooms SET monthly_rent = ?, updated_at = ? WHERE id = ?",
      args: [newRent, now, roomId],
    });

    return NextResponse.json(
      {
        message: `Rent updated successfully from ₹${oldRent.toLocaleString("en-IN")} to ₹${newRent.toLocaleString("en-IN")} effective from ${new Date(effectiveFrom).toLocaleDateString("en-IN")}`,
        updateId,
        oldRent,
        newRent,
        effectiveFrom,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error updating rent:", error);
    return NextResponse.json(
      { error: "Failed to update rent" },
      { status: 500 }
    );
  }
}

// GET /api/rooms/[id]/update-rent - Get rent update history for a room
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;

    // Get rent update history
    const updates = await db.execute({
      sql: `SELECT id, old_rent, new_rent, effective_from, created_at
            FROM rent_updates
            WHERE room_id = ?
            ORDER BY effective_from DESC`,
      args: [roomId],
    });

    return NextResponse.json({
      updates: updates.rows,
    });
  } catch (error) {
    console.error("Error fetching rent updates:", error);
    return NextResponse.json(
      { error: "Failed to fetch rent updates" },
      { status: 500 }
    );
  }
}
