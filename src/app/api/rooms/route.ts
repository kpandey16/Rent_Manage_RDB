import { NextRequest, NextResponse } from "next/server";
import { db, generateId, getCurrentDateTime } from "@/lib/db";

// POST /api/rooms - Create a new room
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, name, description, monthlyRent } = body;

    // Validation
    if (!code || !monthlyRent) {
      return NextResponse.json(
        { error: "Code and monthly rent are required" },
        { status: 400 }
      );
    }

    if (monthlyRent < 0) {
      return NextResponse.json(
        { error: "Monthly rent must be non-negative" },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existingRoom = await db.execute({
      sql: "SELECT id FROM rooms WHERE code = ?",
      args: [code],
    });

    if (existingRoom.rows.length > 0) {
      return NextResponse.json(
        { error: `Room with code ${code} already exists` },
        { status: 409 }
      );
    }

    // Insert the new room
    const roomId = generateId();
    const now = getCurrentDateTime();

    await db.execute({
      sql: `INSERT INTO rooms (id, code, name, description, monthly_rent, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'vacant', ?, ?)`,
      args: [roomId, code, name || null, description || null, monthlyRent, now, now],
    });

    // Fetch the created room
    const newRoom = await db.execute({
      sql: "SELECT * FROM rooms WHERE id = ?",
      args: [roomId],
    });

    return NextResponse.json(
      {
        message: "Room created successfully",
        room: newRoom.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 }
    );
  }
}

// GET /api/rooms - Get all rooms
export async function GET() {
  try {
    const result = await db.execute({
      sql: `SELECT
              r.*,
              tr.tenant_id,
              t.name as current_tenant_name
            FROM rooms r
            LEFT JOIN tenant_rooms tr ON r.id = tr.room_id AND tr.is_active = 1
            LEFT JOIN tenants t ON tr.tenant_id = t.id
            ORDER BY r.code`,
      args: [],
    });

    return NextResponse.json({
      rooms: result.rows,
    });
  } catch (error) {
    console.error("Error fetching rooms:", error);
    return NextResponse.json(
      { error: "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}
