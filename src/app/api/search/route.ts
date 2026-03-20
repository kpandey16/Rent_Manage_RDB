import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ tenants: [], rooms: [] });
    }

    const searchTerm = `%${query.trim()}%`;

    // Search tenants by name, phone, or email
    const tenantsResult = await pool.query(
      `SELECT
        t.tenant_id,
        t.name,
        t.phone,
        t.email,
        ra.room_id
      FROM tenants t
      LEFT JOIN room_allocations ra ON t.tenant_id = ra.tenant_id
        AND ra.vacated_on IS NULL
      WHERE
        t.name ILIKE $1
        OR t.phone ILIKE $1
        OR t.email ILIKE $1
      ORDER BY t.name
      LIMIT 10`,
      [searchTerm]
    );

    // Search rooms by room_id
    const roomsResult = await pool.query(
      `SELECT
        r.room_id,
        r.monthly_rent,
        CASE
          WHEN ra.allocation_id IS NOT NULL THEN 'occupied'
          ELSE 'vacant'
        END as status,
        t.name as tenant_name,
        t.tenant_id
      FROM rooms r
      LEFT JOIN room_allocations ra ON r.room_id = ra.room_id
        AND ra.vacated_on IS NULL
      LEFT JOIN tenants t ON ra.tenant_id = t.tenant_id
      WHERE r.room_id ILIKE $1
      ORDER BY r.room_id
      LIMIT 10`,
      [searchTerm]
    );

    return NextResponse.json({
      tenants: tenantsResult.rows.map((row) => ({
        tenant_id: row.tenant_id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        room_id: row.room_id,
      })),
      rooms: roomsResult.rows.map((row) => ({
        room_id: row.room_id,
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
