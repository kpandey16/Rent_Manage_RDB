import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ tenants: [], rooms: [] });
    }

    const searchTerm = `%${query.trim().toLowerCase()}%`;

    // Search tenants by name or phone
    const tenantsResult = await db.execute({
      sql: `SELECT
        t.id as tenant_id,
        t.name,
        t.phone,
        tr.room_id
      FROM tenants t
      LEFT JOIN tenant_rooms tr ON t.id = tr.tenant_id
        AND tr.is_active = 1
      WHERE
        t.is_active = 1
        AND (
          LOWER(t.name) LIKE ?
          OR LOWER(t.phone) LIKE ?
        )
      ORDER BY t.name
      LIMIT 10`,
      args: [searchTerm, searchTerm]
    });

    // Search rooms by code (room number)
    const roomsResult = await db.execute({
      sql: `SELECT
        r.id as room_id,
        r.code,
        r.monthly_rent,
        r.status,
        t.name as tenant_name,
        t.id as tenant_id
      FROM rooms r
      LEFT JOIN tenant_rooms tr ON r.id = tr.room_id
        AND tr.is_active = 1
      LEFT JOIN tenants t ON tr.tenant_id = t.id
      WHERE LOWER(r.code) LIKE ?
      ORDER BY r.code
      LIMIT 10`,
      args: [searchTerm]
    });

    return NextResponse.json({
      tenants: tenantsResult.rows.map((row: any) => ({
        tenant_id: row.tenant_id,
        name: row.name,
        phone: row.phone,
        room_id: row.room_id,
      })),
      rooms: roomsResult.rows.map((row: any) => ({
        room_id: row.room_id,
        code: row.code,
        monthly_rent: row.monthly_rent,
        status: row.status,
        tenant_name: row.tenant_name,
        tenant_id: row.tenant_id,
      })),
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search" },
      { status: 500 }
    );
  }
}
