import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/rollback/history - Get rollback history
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only admin can view rollback history
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: "Only admin users can view rollback history" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Build query
    let query = `
      SELECT
        rh.*,
        t.name as tenant_name,
        t.phone as tenant_phone,
        u.name as performed_by_name
      FROM rollback_history rh
      JOIN tenants t ON rh.tenant_id = t.id
      JOIN users u ON rh.performed_by = u.id
    `;

    const args: any[] = [];

    if (tenantId) {
      query += ` WHERE rh.tenant_id = ?`;
      args.push(tenantId);
    }

    query += ` ORDER BY rh.performed_at DESC LIMIT ?`;
    args.push(limit);

    const result = await db.execute({
      sql: query,
      args
    });

    // Format response
    const history = result.rows.map((row: any) => ({
      id: row.id,
      rollbackType: row.rollback_type,
      tenant: {
        id: row.tenant_id,
        name: row.tenant_name,
        phone: row.tenant_phone
      },
      paymentAmount: Number(row.payment_amount),
      paymentMethod: row.payment_method,
      paymentDate: row.payment_date,
      periods: JSON.parse(row.periods_affected),
      totalRentRolledBack: Number(row.total_rent_rolled_back),
      adjustmentsRolledBack: row.adjustments_rolled_back ? Number(row.adjustments_rolled_back) : null,
      operatorBalanceBefore: Number(row.operator_balance_before),
      operatorBalanceAfter: Number(row.operator_balance_after),
      reason: row.reason,
      performedBy: {
        id: row.performed_by,
        name: row.performed_by_name
      },
      performedAt: row.performed_at,
      wasRestored: row.was_restored === 1,
      restoredAt: row.restored_at,
      // Optionally include full deleted records
      deletedRecords: {
        rentPayments: JSON.parse(row.deleted_rent_payments),
        ledgerEntries: JSON.parse(row.deleted_ledger_entries),
        securityDeposits: row.deleted_security_deposits ? JSON.parse(row.deleted_security_deposits) : [],
        creditHistory: row.deleted_credit_history ? JSON.parse(row.deleted_credit_history) : []
      }
    }));

    return NextResponse.json({
      history,
      count: history.length
    });

  } catch (error) {
    console.error("Error fetching rollback history:", error);
    return NextResponse.json(
      { error: "Failed to fetch rollback history" },
      { status: 500 }
    );
  }
}
