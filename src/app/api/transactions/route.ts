import { NextRequest, NextResponse } from "next/server";
import { db, generateId, getCurrentDateTime } from "@/lib/db";
import { getTenantRentForPeriod } from "@/lib/rent-calculator";

// POST /api/transactions - Record a transaction (payment, deposit, etc.)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, amount, type, method, date, notes, discount, maintenanceDeduction, otherAdjustment, autoApplyToRent } = body;

    // Validation
    if (!tenantId || amount === undefined || amount === null || !type || !date) {
      return NextResponse.json(
        { error: "Tenant ID, amount, type, and date are required" },
        { status: 400 }
      );
    }

    // Amount validation - allow 0 for credit type, require > 0 for others
    if (type !== "credit" && amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than zero" },
        { status: 400 }
      );
    }

    // Check if tenant exists
    const tenant = await db.execute({
      sql: "SELECT id, name, is_active FROM tenants WHERE id = ?",
      args: [tenantId],
    });

    if (tenant.rows.length === 0) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    const now = getCurrentDateTime();
    const transactionDate = date || now.split(' ')[0];

    // Handle different transaction types (3 core types only)
    switch (type) {
      case "payment":
        return await handlePayment(
          tenantId,
          amount,
          method,
          transactionDate,
          notes,
          now,
          discount || 0,
          maintenanceDeduction || 0,
          otherAdjustment || 0,
          autoApplyToRent !== false // default true
        );

      case "credit":
        return await handleCreditApplied(tenantId, amount, transactionDate, notes, now);

      case "adjustment":
        return await handleAdjustment(tenantId, amount, transactionDate, notes, now);

      default:
        return NextResponse.json(
          { error: "Invalid transaction type. Use: payment, credit, or adjustment" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error recording transaction:", error);
    return NextResponse.json(
      { error: "Failed to record transaction" },
      { status: 500 }
    );
  }
}

// Handle regular payment - Apply to rent automatically
async function handlePayment(
  tenantId: string,
  amount: number,
  method: string,
  transactionDate: string,
  notes: string | undefined,
  now: string,
  discount: number = 0,
  maintenanceDeduction: number = 0,
  otherAdjustment: number = 0,
  autoApplyToRent: boolean = true
) {
  const ledgerId = generateId();
  const bundleId = generateId(); // Bundle ID for grouping related transactions
  const appliedPeriods: string[] = [];
  const adjustmentIds: string[] = [];
  const totalAdjustments = discount + maintenanceDeduction + otherAdjustment;

  // Get existing credit balance BEFORE creating any entries
  const existingCreditResult = await db.execute({
    sql: `SELECT
            COALESCE(SUM(tl.amount), 0) as ledger_total,
            COALESCE((SELECT SUM(rent_amount) FROM rent_payments WHERE tenant_id = ?), 0) as payments_total
          FROM tenant_ledger tl
          WHERE tl.tenant_id = ?`,
    args: [tenantId, tenantId],
  });

  const ledgerTotal = Number(existingCreditResult.rows[0].ledger_total);
  const paymentsTotal = Number(existingCreditResult.rows[0].payments_total);
  const existingCredit = ledgerTotal - paymentsTotal;

  // ATOMIC BUNDLE: Create all adjustment entries first (all use 'adjustment' type with subtype)
  if (discount > 0) {
    const discountId = generateId();
    await db.execute({
      sql: `INSERT INTO tenant_ledger (id, tenant_id, transaction_date, type, subtype, amount, payment_method, description, bundle_id, created_at)
            VALUES (?, ?, ?, 'adjustment', 'discount', ?, NULL, ?, ?, ?)`,
      args: [discountId, tenantId, transactionDate, discount, notes || "Discount applied", bundleId, now],
    });
    adjustmentIds.push(discountId);
  }

  if (maintenanceDeduction > 0) {
    const maintenanceId = generateId();
    await db.execute({
      sql: `INSERT INTO tenant_ledger (id, tenant_id, transaction_date, type, subtype, amount, payment_method, description, bundle_id, created_at)
            VALUES (?, ?, ?, 'adjustment', 'maintenance', ?, NULL, ?, ?, ?)`,
      args: [maintenanceId, tenantId, transactionDate, maintenanceDeduction, notes || "Maintenance expense deduction", bundleId, now],
    });
    adjustmentIds.push(maintenanceId);
  }

  if (otherAdjustment > 0) {
    const otherId = generateId();
    await db.execute({
      sql: `INSERT INTO tenant_ledger (id, tenant_id, transaction_date, type, subtype, amount, payment_method, description, bundle_id, created_at)
            VALUES (?, ?, ?, 'adjustment', 'other', ?, NULL, ?, ?, ?)`,
      args: [otherId, tenantId, transactionDate, otherAdjustment, notes || "Other adjustment", bundleId, now],
    });
    adjustmentIds.push(otherId);
  }

  // Create ledger entry for the payment
  await db.execute({
    sql: `INSERT INTO tenant_ledger (id, tenant_id, transaction_date, type, amount, payment_method, description, bundle_id, created_at)
          VALUES (?, ?, ?, 'payment', ?, ?, ?, ?, ?)`,
    args: [ledgerId, tenantId, transactionDate, amount, method, notes || "Payment received", bundleId, now],
  });

  // Calculate total available amount (existing credit + new payment + adjustments)
  let remainingAmount = existingCredit + amount + totalAdjustments;

  // If autoApplyToRent is false, don't apply to rent - just record as credit
  if (!autoApplyToRent) {
    let message = "Payment recorded successfully";
    if (totalAdjustments > 0) {
      message += `. Applied ₹${totalAdjustments.toLocaleString("en-IN")} in adjustments`;
    }
    message += `. Total credit: ₹${remainingAmount.toLocaleString("en-IN")}`;

    return NextResponse.json(
      {
        message,
        transactionId: ledgerId,
        adjustmentIds,
        appliedTo: "credit",
        creditAmount: remainingAmount,
      },
      { status: 201 }
    );
  }

  // Get tenant's room allocations to find earliest move-in date
  const roomsResult = await db.execute({
    sql: `SELECT move_in_date
          FROM tenant_rooms
          WHERE tenant_id = ? AND is_active = 1`,
    args: [tenantId],
  });

  if (roomsResult.rows.length === 0) {
    // No active rooms - payment goes to credit
    let message = "Payment recorded as credit (no active rooms allocated)";
    if (totalAdjustments > 0) {
      message += `. Applied ₹${totalAdjustments.toLocaleString("en-IN")} in adjustments`;
    }

    return NextResponse.json(
      {
        message,
        transactionId: ledgerId,
        adjustmentIds,
        appliedTo: "credit",
        creditAmount: remainingAmount,
      },
      { status: 201 }
    );
  }

  // Find the earliest move-in date
  const earliestMoveIn = roomsResult.rows.reduce((earliest, room) => {
    const moveInDate = new Date(room.move_in_date as string);
    return !earliest || moveInDate < earliest ? moveInDate : earliest;
  }, null as Date | null);

  if (!earliestMoveIn) {
    return NextResponse.json(
      {
        message: "Payment recorded as credit",
        transactionId: ledgerId,
        appliedTo: "credit",
        creditAmount: amount,
      },
      { status: 201 }
    );
  }

  // Get already paid periods
  const paidPeriodsResult = await db.execute({
    sql: `SELECT for_period FROM rent_payments WHERE tenant_id = ? ORDER BY for_period`,
    args: [tenantId],
  });

  const paidPeriods = new Set(paidPeriodsResult.rows.map(row => row.for_period as string));

  // Generate list of periods from move-in to current month
  const currentDate = new Date();
  const periods: string[] = [];
  let date = new Date(earliestMoveIn.getFullYear(), earliestMoveIn.getMonth(), 1);

  while (date <= currentDate) {
    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!paidPeriods.has(period)) {
      periods.push(period);
    }
    date.setMonth(date.getMonth() + 1);
  }

  // Apply payment to unpaid periods - ONLY IF CAN PAY FULL MONTH
  for (const period of periods) {
    // Get the correct rent for this specific period (considers rent updates and room allocations)
    const periodRent = await getTenantRentForPeriod(tenantId, period, db);

    if (remainingAmount >= periodRent) {
      // Pay full month
      const rentPaymentId = generateId();
      await db.execute({
        sql: `INSERT INTO rent_payments (id, tenant_id, for_period, rent_amount, ledger_id, paid_at, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [rentPaymentId, tenantId, period, periodRent, ledgerId, transactionDate, now],
      });
      remainingAmount -= periodRent;
      appliedPeriods.push(period);
    } else {
      // Not enough to pay full month - stop here, keep as credit
      break;
    }
  }

  // Build response message
  let message = "Payment recorded successfully";

  // Show adjustments if any
  if (totalAdjustments > 0) {
    const adjustmentParts: string[] = [];
    if (discount > 0) adjustmentParts.push(`₹${discount.toLocaleString("en-IN")} discount`);
    if (maintenanceDeduction > 0) adjustmentParts.push(`₹${maintenanceDeduction.toLocaleString("en-IN")} maintenance`);
    if (otherAdjustment > 0) adjustmentParts.push(`₹${otherAdjustment.toLocaleString("en-IN")} adjustment`);

    message += `. Applied adjustments: ${adjustmentParts.join(", ")}`;
  }

  // Show how the payment was used
  if (appliedPeriods.length > 0) {
    // Payment was applied to rent
    if (existingCredit > 0 || totalAdjustments > 0) {
      const totalApplied = amount + (totalAdjustments > 0 ? totalAdjustments : 0) + (existingCredit > 0 ? existingCredit : 0);
      message += `. Used ₹${totalApplied.toLocaleString("en-IN")} total (payment${totalAdjustments > 0 ? " + adjustments" : ""}${existingCredit > 0 ? " + existing credit" : ""})`;
    } else if (existingCredit < 0) {
      // Had negative balance (dues/opening balance)
      const duesAmount = Math.abs(existingCredit);
      message += `. Cleared ₹${duesAmount.toLocaleString("en-IN")} opening dues`;
    }

    // Format periods as range
    const firstPeriod = appliedPeriods[0];
    const lastPeriod = appliedPeriods[appliedPeriods.length - 1];

    if (appliedPeriods.length === 1) {
      message += `. Paid: ${formatPeriod(firstPeriod)}`;
    } else {
      message += `. Paid: ${formatPeriod(firstPeriod)} to ${formatPeriod(lastPeriod)}`;
    }

    if (remainingAmount > 0) {
      message += `. Remaining credit: ₹${remainingAmount.toLocaleString("en-IN")}`;
    }
  } else {
    // Payment was NOT applied to rent - went to credit
    if (existingCredit < 0) {
      // Had negative balance (dues/opening balance)
      const duesAmount = Math.abs(existingCredit);
      const totalReceived = amount + totalAdjustments;
      if (totalReceived >= duesAmount) {
        message += `. Cleared ₹${duesAmount.toLocaleString("en-IN")} opening dues. Added to credit: ₹${remainingAmount.toLocaleString("en-IN")}`;
      } else {
        message += `. Partially cleared opening dues (₹${totalReceived.toLocaleString("en-IN")} of ₹${duesAmount.toLocaleString("en-IN")})`;
      }
    } else {
      // Payment went to credit (insufficient for full month rent)
      message += `. Added to credit balance: ₹${(amount + totalAdjustments).toLocaleString("en-IN")}. Total credit: ₹${remainingAmount.toLocaleString("en-IN")}`;
    }
  }

  return NextResponse.json(
    {
      message,
      transactionId: ledgerId,
      adjustmentIds,
      appliedPeriods,
      creditAmount: remainingAmount,
      existingCreditUsed: existingCredit,
      totalAdjustments,
    },
    { status: 201 }
  );
}

// Handle security deposit addition
async function handleSecurityDepositAdd(
  tenantId: string,
  amount: number,
  transactionDate: string,
  notes: string | undefined,
  now: string
) {
  const depositId = generateId();

  await db.execute({
    sql: `INSERT INTO security_deposits (id, tenant_id, transaction_type, amount, transaction_date, notes, created_at)
          VALUES (?, ?, 'deposit', ?, ?, ?, ?)`,
    args: [depositId, tenantId, amount, transactionDate, notes || "Security deposit added", now],
  });

  return NextResponse.json(
    {
      message: "Security deposit added successfully",
      transactionId: depositId,
    },
    { status: 201 }
  );
}

// Handle security deposit withdrawal
async function handleSecurityDepositWithdraw(
  tenantId: string,
  amount: number,
  transactionDate: string,
  notes: string | undefined,
  now: string
) {
  // Check if tenant has sufficient deposit balance
  const depositBalance = await db.execute({
    sql: `SELECT COALESCE(SUM(
            CASE
              WHEN transaction_type = 'deposit' THEN amount
              WHEN transaction_type = 'refund' THEN -amount
              WHEN transaction_type = 'used_for_rent' THEN -amount
              ELSE 0
            END
          ), 0) as balance
          FROM security_deposits
          WHERE tenant_id = ?`,
    args: [tenantId],
  });

  const balance = Number(depositBalance.rows[0].balance);
  if (balance < amount) {
    return NextResponse.json(
      { error: `Insufficient deposit balance. Available: ₹${balance}` },
      { status: 400 }
    );
  }

  const depositId = generateId();

  await db.execute({
    sql: `INSERT INTO security_deposits (id, tenant_id, transaction_type, amount, transaction_date, notes, created_at)
          VALUES (?, ?, 'refund', ?, ?, ?, ?)`,
    args: [depositId, tenantId, amount, transactionDate, notes || "Security deposit withdrawn", now],
  });

  return NextResponse.json(
    {
      message: "Security deposit withdrawn successfully",
      transactionId: depositId,
    },
    { status: 201 }
  );
}

// Handle security deposit used for rent
async function handleDepositUsedForRent(
  tenantId: string,
  amount: number,
  transactionDate: string,
  notes: string | undefined,
  now: string
) {
  // Check if tenant has sufficient deposit balance
  const depositBalance = await db.execute({
    sql: `SELECT COALESCE(SUM(
            CASE
              WHEN transaction_type = 'deposit' THEN amount
              WHEN transaction_type = 'refund' THEN -amount
              WHEN transaction_type = 'used_for_rent' THEN -amount
              ELSE 0
            END
          ), 0) as balance
          FROM security_deposits
          WHERE tenant_id = ?`,
    args: [tenantId],
  });

  const balance = Number(depositBalance.rows[0].balance);
  if (balance < amount) {
    return NextResponse.json(
      { error: `Insufficient deposit balance. Available: ₹${balance}` },
      { status: 400 }
    );
  }

  // Create ledger entry first
  const ledgerId = generateId();
  await db.execute({
    sql: `INSERT INTO tenant_ledger (id, tenant_id, transaction_date, type, amount, description, created_at)
          VALUES (?, ?, ?, 'deposit', ?, ?, ?)`,
    args: [ledgerId, tenantId, transactionDate, amount, notes || "Security deposit used for rent", now],
  });

  // Create security deposit record
  const depositId = generateId();
  await db.execute({
    sql: `INSERT INTO security_deposits (id, tenant_id, transaction_type, amount, transaction_date, notes, ledger_id, created_at)
          VALUES (?, ?, 'used_for_rent', ?, ?, ?, ?, ?)`,
    args: [depositId, tenantId, amount, transactionDate, notes || "Deposit used for rent", ledgerId, now],
  });

  return NextResponse.json(
    {
      message: "Security deposit used for rent successfully",
      transactionId: ledgerId,
    },
    { status: 201 }
  );
}

// Handle credit applied - Use existing credit balance to pay rent
async function handleCreditApplied(
  tenantId: string,
  amount: number,
  transactionDate: string,
  notes: string | undefined,
  now: string
) {
  // FIRST: Check existing credit balance BEFORE doing anything
  const existingCreditResult = await db.execute({
    sql: `SELECT
            COALESCE(SUM(tl.amount), 0) as ledger_total,
            COALESCE((SELECT SUM(rent_amount) FROM rent_payments WHERE tenant_id = ?), 0) as payments_total
          FROM tenant_ledger tl
          WHERE tl.tenant_id = ?`,
    args: [tenantId, tenantId],
  });

  const ledgerTotal = Number(existingCreditResult.rows[0].ledger_total);
  const paymentsTotal = Number(existingCreditResult.rows[0].payments_total);
  const existingCredit = ledgerTotal - paymentsTotal;

  // Validation: Must have positive credit balance
  if (existingCredit <= 0) {
    return NextResponse.json(
      { error: "No credit balance available to apply" },
      { status: 400 }
    );
  }

  // If no amount specified (or 0), use all existing credit
  const amountToApply = !amount || amount === 0 ? existingCredit : amount;

  if (amountToApply > existingCredit) {
    return NextResponse.json(
      {
        error: `Insufficient credit. Available: ₹${existingCredit.toLocaleString("en-IN")}, Requested: ₹${amountToApply.toLocaleString("en-IN")}`
      },
      { status: 400 }
    );
  }

  const ledgerId = generateId();

  // Create a ₹0 ledger entry as a marker for credit application
  // This doesn't add or remove credit, just marks when credit was manually applied to rent
  await db.execute({
    sql: `INSERT INTO tenant_ledger (id, tenant_id, transaction_date, type, amount, description, created_at)
          VALUES (?, ?, ?, 'credit', 0, ?, ?)`,
    args: [ledgerId, tenantId, transactionDate, notes || "Credit applied to rent", now],
  });

  let remainingAmount = amountToApply;
  const appliedPeriods: string[] = [];

  // Get tenant's room allocations to find earliest move-in date
  const roomsResult = await db.execute({
    sql: `SELECT move_in_date
          FROM tenant_rooms
          WHERE tenant_id = ? AND is_active = 1`,
    args: [tenantId],
  });

  if (roomsResult.rows.length === 0) {
    // No active rooms - credit applied but nothing to pay
    return NextResponse.json(
      {
        message: "Credit applied (no active rooms allocated)",
        transactionId: ledgerId,
        appliedTo: "none",
      },
      { status: 201 }
    );
  }

  // Find the earliest move-in date
  const earliestMoveIn = roomsResult.rows.reduce((earliest, room) => {
    const moveInDate = new Date(room.move_in_date as string);
    return !earliest || moveInDate < earliest ? moveInDate : earliest;
  }, null as Date | null);

  if (!earliestMoveIn) {
    return NextResponse.json(
      {
        message: "Credit applied",
        transactionId: ledgerId,
        appliedTo: "none",
      },
      { status: 201 }
    );
  }

  // Get already paid periods
  const paidPeriodsResult = await db.execute({
    sql: `SELECT for_period FROM rent_payments WHERE tenant_id = ? ORDER BY for_period`,
    args: [tenantId],
  });

  const paidPeriods = new Set(paidPeriodsResult.rows.map(row => row.for_period as string));

  // Generate list of periods from move-in to current month
  const currentDate = new Date();
  const periods: string[] = [];
  let date = new Date(earliestMoveIn.getFullYear(), earliestMoveIn.getMonth(), 1);

  while (date <= currentDate) {
    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!paidPeriods.has(period)) {
      periods.push(period);
    }
    date.setMonth(date.getMonth() + 1);
  }

  // Apply credit to unpaid periods - ONLY IF CAN PAY FULL MONTH
  for (const period of periods) {
    // Get the correct rent for this specific period (considers rent updates and room allocations)
    const periodRent = await getTenantRentForPeriod(tenantId, period, db);

    if (remainingAmount >= periodRent) {
      // Pay full month
      const rentPaymentId = generateId();
      await db.execute({
        sql: `INSERT INTO rent_payments (id, tenant_id, for_period, rent_amount, ledger_id, paid_at, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [rentPaymentId, tenantId, period, periodRent, ledgerId, transactionDate, now],
      });
      remainingAmount -= periodRent;
      appliedPeriods.push(period);
    } else {
      // Not enough to pay full month - stop here
      break;
    }
  }

  // Build response message
  const creditUsed = amountToApply - remainingAmount;
  let message = "Credit applied successfully";
  if (appliedPeriods.length > 0) {
    // Format periods as range
    const firstPeriod = appliedPeriods[0];
    const lastPeriod = appliedPeriods[appliedPeriods.length - 1];

    if (appliedPeriods.length === 1) {
      message += `. Applied ₹${creditUsed.toLocaleString("en-IN")} to: ${formatPeriod(firstPeriod)}`;
    } else {
      message += `. Applied ₹${creditUsed.toLocaleString("en-IN")} to: ${formatPeriod(firstPeriod)} to ${formatPeriod(lastPeriod)}`;
    }
    if (remainingAmount > 0) {
      message += `. Remaining credit: ₹${remainingAmount.toLocaleString("en-IN")}`;
    }
  } else {
    message += `. Insufficient credit to pay full month rent`;
  }

  return NextResponse.json(
    {
      message,
      transactionId: ledgerId,
      appliedPeriods,
    },
    { status: 201 }
  );
}

// Handle adjustment (unified: discount, maintenance, other)
async function handleAdjustment(
  tenantId: string,
  amount: number,
  transactionDate: string,
  notes: string | undefined,
  now: string,
  subtype: string = 'other'
) {
  const ledgerId = generateId();

  await db.execute({
    sql: `INSERT INTO tenant_ledger (id, tenant_id, transaction_date, type, subtype, amount, description, created_at)
          VALUES (?, ?, ?, 'adjustment', ?, ?, ?, ?)`,
    args: [ledgerId, tenantId, transactionDate, subtype, amount, notes || "Adjustment applied", now],
  });

  const categoryLabel = subtype.charAt(0).toUpperCase() + subtype.slice(1);

  return NextResponse.json(
    {
      message: `${categoryLabel} recorded successfully`,
      transactionId: ledgerId,
    },
    { status: 201 }
  );
}

// GET /api/transactions - Get all transactions with details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    let sql = `
      SELECT
        tl.id,
        tl.tenant_id,
        t.name as tenant_name,
        tl.transaction_date,
        tl.type,
        tl.subtype,
        tl.amount,
        tl.payment_method,
        tl.description,
        tl.bundle_id,
        tl.created_at
      FROM tenant_ledger tl
      JOIN tenants t ON tl.tenant_id = t.id
    `;

    const args = [];
    if (tenantId) {
      sql += " WHERE tl.tenant_id = ?";
      args.push(tenantId);
    }

    sql += " ORDER BY tl.transaction_date DESC, tl.created_at DESC";

    const result = await db.execute({ sql, args });

    // Group transactions by bundle_id
    const bundleMap = new Map<string | null, any[]>();
    result.rows.forEach((transaction: any) => {
      const bundleKey = transaction.bundle_id || transaction.id; // Use transaction id as key if no bundle_id
      if (!bundleMap.has(bundleKey)) {
        bundleMap.set(bundleKey, []);
      }
      bundleMap.get(bundleKey)!.push(transaction);
    });

    // Process each bundle (may contain 1 or more transactions)
    const transactionsWithDetails = await Promise.all(
      Array.from(bundleMap.entries()).map(async ([bundleKey, bundleTransactions]) => {
        // Use the primary transaction (payment or first in bundle) as the main transaction
        const primaryTransaction = bundleTransactions.find(t => t.type === 'payment') || bundleTransactions[0];
        const transaction = primaryTransaction;
        // All ledger entry types that contribute to credit balance (3 core types)
        const creditTypes = ['payment', 'credit', 'adjustment'];

        if (creditTypes.includes(transaction.type)) {
          // Get rent periods this ledger entry was applied to
          const rentPayments = await db.execute({
            sql: `SELECT for_period, rent_amount
                  FROM rent_payments
                  WHERE ledger_id = ?
                  ORDER BY for_period`,
            args: [transaction.id],
          });

          const appliedPeriods = rentPayments.rows.map((rp: any) => ({
            period: rp.for_period,
            amount: Number(rp.rent_amount),
          }));

          // Calculate CUMULATIVE credit balance at the time of this transaction
          // Sum all ledger entries up to and including this transaction
          const ledgerUpToTransaction = await db.execute({
            sql: `SELECT COALESCE(SUM(amount), 0) as total
                  FROM tenant_ledger
                  WHERE tenant_id = ?
                    AND (transaction_date < ? OR (transaction_date = ? AND created_at <= ?))`,
            args: [transaction.tenant_id, transaction.transaction_date, transaction.transaction_date, transaction.created_at],
          });

          // Sum all rent payments up to and including this transaction
          const rentUpToTransaction = await db.execute({
            sql: `SELECT COALESCE(SUM(rp.rent_amount), 0) as total
                  FROM rent_payments rp
                  JOIN tenant_ledger tl ON rp.ledger_id = tl.id
                  WHERE rp.tenant_id = ?
                    AND (tl.transaction_date < ? OR (tl.transaction_date = ? AND tl.created_at <= ?))`,
            args: [transaction.tenant_id, transaction.transaction_date, transaction.transaction_date, transaction.created_at],
          });

          const ledgerTotal = Number(ledgerUpToTransaction.rows[0].total);
          const rentTotal = Number(rentUpToTransaction.rows[0].total);
          const cumulativeCreditBalance = ledgerTotal - rentTotal;

          // Set appropriate appliedTo message based on type and subtype
          let appliedToMessage = 'Credit Balance';
          if (appliedPeriods.length > 0) {
            appliedToMessage = appliedPeriods.map(p => `${formatPeriod(p.period as string)} (₹${p.amount})`).join(', ');
          } else if (transaction.type === 'credit') {
            appliedToMessage = 'Credit Applied to Rent';
          } else if (transaction.type === 'adjustment') {
            // Use subtype for clean category display
            const subtypeLabel = transaction.subtype
              ? transaction.subtype.charAt(0).toUpperCase() + transaction.subtype.slice(1)
              : 'Adjustment';
            appliedToMessage = `${subtypeLabel} Applied`;
          }

          // Calculate total amount for bundled transactions
          const totalAmount = bundleTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

          // Collect adjustment details for bundled transactions
          const adjustments = bundleTransactions
            .filter(t => t.type === 'adjustment')
            .map(t => ({
              type: t.subtype || 'other',
              amount: Number(t.amount),
              description: t.description,
            }));

          return {
            ...transaction,
            appliedPeriods,
            appliedTo: appliedToMessage,
            creditRemaining: cumulativeCreditBalance,
            bundleId: transaction.bundle_id,
            bundledTransactions: bundleTransactions.length > 1 ? bundleTransactions : undefined,
            adjustments: adjustments.length > 0 ? adjustments : undefined,
            totalAmount: bundleTransactions.length > 1 ? totalAmount : Number(transaction.amount),
          };
        }
        // Handle security deposit and other non-credit transactions
        return {
          ...transaction,
          appliedPeriods: [],
          appliedTo: 'Other Transaction',
          creditRemaining: null,
          bundleId: transaction.bundle_id,
          bundledTransactions: bundleTransactions.length > 1 ? bundleTransactions : undefined,
          totalAmount: Number(transaction.amount),
        };
      })
    );

    return NextResponse.json({
      transactions: transactionsWithDetails,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

// Helper function to format YYYY-MM to MMM-YY
function formatPeriod(period: string): string {
  const [year, month] = period.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[date.getMonth()]}-${year.substring(2)}`;
}
