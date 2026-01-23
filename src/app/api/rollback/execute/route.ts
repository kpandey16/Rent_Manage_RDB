import { NextRequest, NextResponse } from "next/server";
import { executePaymentRollback } from "@/lib/rollback";
import { getCurrentUser } from "@/lib/auth";

// POST /api/rollback/execute - Execute payment rollback
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only admin can rollback
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: "Only admin users can rollback payments" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { ledgerId, reason } = body;

    // Validation
    if (!ledgerId) {
      return NextResponse.json(
        { error: "Ledger ID is required" },
        { status: 400 }
      );
    }

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: "Reason is required for rollback" },
        { status: 400 }
      );
    }

    if (reason.trim().length < 10) {
      return NextResponse.json(
        { error: "Please provide a detailed reason (at least 10 characters)" },
        { status: 400 }
      );
    }

    // Execute rollback
    const result = await executePaymentRollback(ledgerId, reason.trim(), user.id);

    return NextResponse.json(
      {
        message: result.message,
        rollbackId: result.rollbackId,
        periodsAffected: result.periodsAffected,
        amountRefunded: result.amountRefunded
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error executing rollback:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to execute rollback" },
      { status: 500 }
    );
  }
}
