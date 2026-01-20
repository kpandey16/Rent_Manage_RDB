import { NextRequest, NextResponse } from "next/server";
import { validatePaymentRollback } from "@/lib/rollback";
import { getCurrentUser } from "@/lib/auth";

// POST /api/rollback/validate - Validate if a payment can be rolled back
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
    const { ledgerId } = body;

    if (!ledgerId) {
      return NextResponse.json(
        { error: "Ledger ID is required" },
        { status: 400 }
      );
    }

    // Validate rollback
    const validation = await validatePaymentRollback(ledgerId);

    return NextResponse.json(validation);

  } catch (error) {
    console.error("Error validating rollback:", error);
    return NextResponse.json(
      { error: "Failed to validate rollback" },
      { status: 500 }
    );
  }
}
