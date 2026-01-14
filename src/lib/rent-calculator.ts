/**
 * Get the rent amount for a specific month based on rent update history
 * @param roomId - The room ID
 * @param period - The period in YYYY-MM format
 * @param db - Database instance
 * @returns The rent amount for that month
 */
export async function getRentForPeriod(
  roomId: string,
  period: string,
  db: any
): Promise<number> {
  // Convert period (YYYY-MM) to first day of month for comparison
  const [year, month] = period.split("-");
  const periodDate = `${year}-${month}-01`;

  // Get all rent updates for this room up to and including this period
  // Order by effective_from DESC to get the most recent applicable rent
  const rentUpdate = await db.execute({
    sql: `SELECT new_rent
          FROM rent_updates
          WHERE room_id = ? AND effective_from <= ?
          ORDER BY effective_from DESC
          LIMIT 1`,
    args: [roomId, periodDate],
  });

  if (rentUpdate.rows.length > 0) {
    return Number(rentUpdate.rows[0].new_rent);
  }

  // If no rent update found for this period, use the room's initial monthly_rent
  // Get the oldest rent update to find the original rent
  const oldestUpdate = await db.execute({
    sql: `SELECT old_rent
          FROM rent_updates
          WHERE room_id = ?
          ORDER BY effective_from ASC
          LIMIT 1`,
    args: [roomId],
  });

  if (oldestUpdate.rows.length > 0 && oldestUpdate.rows[0].old_rent !== null) {
    return Number(oldestUpdate.rows[0].old_rent);
  }

  // Fallback: get current monthly_rent from rooms table
  const room = await db.execute({
    sql: "SELECT monthly_rent FROM rooms WHERE id = ?",
    args: [roomId],
  });

  if (room.rows.length > 0) {
    return Number(room.rows[0].monthly_rent);
  }

  return 0;
}

/**
 * Get total rent for a tenant for a specific period
 * Considers which rooms were allocated and their historical rent
 * @param tenantId - The tenant ID
 * @param period - The period in YYYY-MM format
 * @param db - Database instance
 * @returns Total rent for that period
 */
export async function getTenantRentForPeriod(
  tenantId: string,
  period: string,
  db: any
): Promise<number> {
  const [year, month] = period.split("-");
  const periodDate = new Date(parseInt(year), parseInt(month) - 1, 1);

  // Get all room allocations for this tenant
  const allocations = await db.execute({
    sql: `SELECT room_id, move_in_date, move_out_date
          FROM tenant_rooms
          WHERE tenant_id = ?`,
    args: [tenantId],
  });

  let totalRent = 0;

  for (const allocation of allocations.rows) {
    const moveInDate = new Date(allocation.move_in_date as string);
    const moveOutDate = allocation.move_out_date
      ? new Date(allocation.move_out_date as string)
      : null;

    // Check if this room was allocated during this period
    const periodStart = new Date(periodDate.getFullYear(), periodDate.getMonth(), 1);
    const periodEnd = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0);

    // Room is active in this period if:
    // - Move-in date is before or during this period
    // - Move-out date is null (still active) OR after this period starts
    const isActiveInPeriod =
      moveInDate <= periodEnd &&
      (!moveOutDate || moveOutDate >= periodStart);

    if (isActiveInPeriod) {
      const roomId = allocation.room_id as string;
      const rentForPeriod = await getRentForPeriod(roomId, period, db);
      totalRent += rentForPeriod;
    }
  }

  return totalRent;
}

/**
 * Calculate total rent owed for a tenant considering rent update history
 * @param tenantId - The tenant ID
 * @param db - Database instance
 * @returns Total rent owed
 */
export async function calculateTotalRentOwed(
  tenantId: string,
  db: any
): Promise<number> {
  // Get tenant's room allocations
  const allocations = await db.execute({
    sql: `SELECT room_id, move_in_date, move_out_date
          FROM tenant_rooms
          WHERE tenant_id = ? AND is_active = 1`,
    args: [tenantId],
  });

  if (allocations.rows.length === 0) {
    return 0;
  }

  let totalRentOwed = 0;
  const today = new Date();

  for (const allocation of allocations.rows) {
    const roomId = allocation.room_id as string;
    const moveInDate = new Date(allocation.move_in_date as string);
    const moveOutDate = allocation.move_out_date
      ? new Date(allocation.move_out_date as string)
      : today;

    // Generate all periods from move-in to move-out (or today)
    let currentDate = new Date(moveInDate.getFullYear(), moveInDate.getMonth(), 1);
    const endDate = new Date(moveOutDate.getFullYear(), moveOutDate.getMonth(), 1);

    while (currentDate <= endDate) {
      const period = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;

      // Get rent for this specific period
      const rentForPeriod = await getRentForPeriod(roomId, period, db);
      totalRentOwed += rentForPeriod;

      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }

  return totalRentOwed;
}
