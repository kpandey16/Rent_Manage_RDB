import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { generateId, getCurrentDateTime } from "@/lib/db";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenantId } = await params;
    const body = await request.json();
    const { amount, date, description } = body;

    // Validation
    if (!amount || isNaN(parseFloat(amount))) {
      return NextResponse.json(
        { error: "Valid amount is required" },
        { status: 400 }
      );
    }

    if (parseFloat(amount) === 0) {
      return NextResponse.json(
        { error: "Amount cannot be zero" },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { error: "Date is required" },
        { status: 400 }
      );
    }

    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    // Check if tenant exists
    const tenantResult = await db.execute({
      sql: "SELECT id, name FROM tenants WHERE id = ?",
      args: [tenantId],
    });

    if (tenantResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    // Check if opening balance already exists
    const existingBalance = await db.execute({
      sql: `SELECT id FROM tenant_ledger
            WHERE tenant_id = ? AND type = 'adjustment' AND subtype = 'opening_balance'`,
      args: [tenantId],
    });

    if (existingBalance.rows.length > 0) {
      return NextResponse.json(
        { error: "Opening balance has already been set for this tenant" },
        { status: 400 }
      );
    }

    const ledgerId = generateId();
    const now = getCurrentDateTime();

    // Store amount as user entered (no negation needed):
    // - Positive amount = tenant's credit/advance (tenant's favor)
    // - Negative amount = tenant owes (landlord's favor)
    // This matches how credits work in the system
    const ledgerAmount = parseFloat(amount);

    // Create opening balance transaction using adjustment type with opening_balance subtype
    await db.execute({
      sql: `INSERT INTO tenant_ledger (
        id,
        tenant_id,
        transaction_date,
        type,
        subtype,
        amount,
        description,
        created_at
      ) VALUES (?, ?, ?, 'adjustment', 'opening_balance', ?, ?, ?)`,
      args: [ledgerId, tenantId, date, ledgerAmount, description.trim(), now],
    });

    return NextResponse.json({
      message: "Opening balance set successfully",
      ledgerId,
    });
  } catch (error) {
    console.error("Error setting opening balance:", error);
    return NextResponse.json(
      { error: "Failed to set opening balance" },
      { status: 500 }
    );
  }
}
