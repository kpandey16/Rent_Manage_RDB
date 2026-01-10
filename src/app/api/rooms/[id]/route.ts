import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/rooms/[id] - Get room details with tenant and history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log("[Room Detail API] Fetching room with ID:", id);

    // Get room basic info
    const room = await db.execute({
      sql: "SELECT * FROM rooms WHERE id = ?",
      args: [id],
    });

    console.log("[Room Detail API] Query result:", room.rows.length, "rows found");

    if (room.rows.length === 0) {
      // Log all room IDs to help with debugging
      const allRooms = await db.execute({ sql: "SELECT id, code FROM rooms" });
      console.log("[Room Detail API] Available room IDs:", allRooms.rows.map((r: any) => ({ id: r.id, code: r.code })));

      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    const roomData = room.rows[0];

    // Get current tenant info (if occupied)
    let currentTenant = null;
    if (roomData.status === "occupied") {
      const tenantInfo = await db.execute({
        sql: `SELECT
                t.id,
                t.name,
                tr.move_in_date as allocated_from
              FROM tenant_rooms tr
              JOIN tenants t ON tr.tenant_id = t.id
              WHERE tr.room_id = ? AND tr.is_active = 1
              LIMIT 1`,
        args: [id],
      });

      if (tenantInfo.rows.length > 0) {
        currentTenant = tenantInfo.rows[0];
      }
    }

    // Get rent history from rent_updates table
    const rentHistory = await db.execute({
      sql: `SELECT
              effective_from,
              new_rent,
              updated_by
            FROM rent_updates
            WHERE room_id = ?
            ORDER BY effective_from DESC`,
      args: [id],
    });

    // Get past tenants (inactive tenant_rooms)
    const pastTenants = await db.execute({
      sql: `SELECT
              t.id,
              t.name,
              tr.move_in_date as from_date,
              tr.move_out_date as to_date
            FROM tenant_rooms tr
            JOIN tenants t ON tr.tenant_id = t.id
            WHERE tr.room_id = ? AND tr.is_active = 0
            ORDER BY tr.move_out_date DESC`,
      args: [id],
    });

    // Calculate duration for past tenants
    const pastTenantsWithDuration = pastTenants.rows.map((tenant: any) => {
      const from = new Date(tenant.from_date);
      const to = new Date(tenant.to_date);
      const months = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 30));
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;

      let duration = "";
      if (years > 0) {
        duration += `${years} year${years > 1 ? 's' : ''}`;
      }
      if (remainingMonths > 0) {
        if (duration) duration += " ";
        duration += `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
      }

      return {
        ...tenant,
        duration: duration || "< 1 month",
      };
    });

    const roomDetails = {
      id: roomData.id,
      code: roomData.code,
      name: roomData.name,
      description: roomData.description,
      currentRent: Number(roomData.monthly_rent),
      status: roomData.status,
      currentTenant,
      rentHistory: rentHistory.rows,
      pastTenants: pastTenantsWithDuration,
    };

    return NextResponse.json({ room: roomDetails });
  } catch (error) {
    console.error("[Room Detail API] Error fetching room details:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch room details",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
