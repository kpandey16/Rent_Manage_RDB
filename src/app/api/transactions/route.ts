import { NextRequest, NextResponse } from "next/server";
import { db, generateId, getCurrentDateTime } from "@/lib/db";

// POST /api/transactions - Record a transaction (payment, deposit, etc.)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, amount, type, method, date, notes } = body;

    // Validation
    if (!tenantId || !amount || !type || !date) {
      return NextResponse.json(
        { error: "Tenant ID, amount, type, and date are required" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
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

    // Handle different transaction types
    switch (type) {
      case "payment":
        return await handlePayment(tenantId, amount, method, transactionDate, notes, now);

      case "security_deposit_add":
        return await handleSecurityDepositAdd(tenantId, amount, transactionDate, notes, now);

      case "security_deposit_withdraw":
        return await handleSecurityDepositWithdraw(tenantId, amount, transactionDate, notes, now);

      case "deposit_used":
        return await handleDepositUsedForRent(tenantId, amount, transactionDate, notes, now);

      case "credit":
        return await handleCreditApplied(tenantId, amount, transactionDate, notes, now);

      case "discount":
        return await handleDiscount(tenantId, amount, transactionDate, notes, now);

      case "maintenance":
        return await handleMaintenance(tenantId, amount, transactionDate, notes, now);

      default:
        return NextResponse.json(
          { error: "Invalid transaction type" },
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
  now: string
) {
  const ledgerId = generateId();
  let remainingAmount = amount;
  const appliedPeriods: string[] = [];

  // Create ledger entry
  await db.execute({
    sql: `INSERT INTO tenant_ledger (id, tenant_id, transaction_date, type, amount, payment_method, description, created_at)
          VALUES (?, ?, ?, 'payment', ?, ?, ?, ?)`,
    args: [ledgerId, tenantId, transactionDate, amount, method, notes || "Payment received", now],
  });

  // Get tenant's rooms and monthly rent
  const roomsResult = await db.execute({
    sql: `SELECT r.monthly_rent, tr.move_in_date
          FROM tenant_rooms tr
          JOIN rooms r ON tr.room_id = r.id
          WHERE tr.tenant_id = ? AND tr.is_active = 1`,
    args: [tenantId],
  });

  if (roomsResult.rows.length === 0) {
    // No active rooms - payment goes to credit
    return NextResponse.json(
      {
        message: "Payment recorded as credit (no active rooms allocated)",
        transactionId: ledgerId,
        appliedTo: "credit",
        creditAmount: amount,
      },
      { status: 201 }
    );
  }

  // Calculate total monthly rent
  const monthlyRent = roomsResult.rows.reduce((sum, room) => sum + Number(room.monthly_rent), 0);

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

  // Apply payment to unpaid periods
  for (const period of periods) {
    if (remainingAmount >= monthlyRent) {
      // Pay full month
      const rentPaymentId = generateId();
      await db.execute({
        sql: `INSERT INTO rent_payments (id, tenant_id, for_period, rent_amount, ledger_id, paid_at, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [rentPaymentId, tenantId, period, monthlyRent, ledgerId, transactionDate, now],
      });
      remainingAmount -= monthlyRent;
      appliedPeriods.push(period);
    } else if (remainingAmount > 0) {
      // Partial payment - record as much as possible
      const rentPaymentId = generateId();
      await db.execute({
        sql: `INSERT INTO rent_payments (id, tenant_id, for_period, rent_amount, ledger_id, paid_at, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [rentPaymentId, tenantId, period, remainingAmount, ledgerId, transactionDate, now],
      });
      appliedPeriods.push(`${period} (partial: ₹${remainingAmount})`);
      remainingAmount = 0;
      break;
    }
  }

  // Build response message
  let message = "Payment recorded successfully";
  if (appliedPeriods.length > 0) {
    message += `. Applied to: ${appliedPeriods.join(", ")}`;
  }
  if (remainingAmount > 0) {
    message += `. Credit balance: ₹${remainingAmount}`;
  }

  return NextResponse.json(
    {
      message,
      transactionId: ledgerId,
      appliedPeriods,
      creditAmount: remainingAmount,
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

// Handle credit applied
async function handleCreditApplied(
  tenantId: string,
  amount: number,
  transactionDate: string,
  notes: string | undefined,
  now: string
) {
  const ledgerId = generateId();

  await db.execute({
    sql: `INSERT INTO tenant_ledger (id, tenant_id, transaction_date, type, amount, description, created_at)
          VALUES (?, ?, ?, 'credit', ?, ?, ?)`,
    args: [ledgerId, tenantId, transactionDate, amount, notes || "Credit applied", now],
  });

  return NextResponse.json(
    {
      message: "Credit applied successfully",
      transactionId: ledgerId,
    },
    { status: 201 }
  );
}

// Handle discount
async function handleDiscount(
  tenantId: string,
  amount: number,
  transactionDate: string,
  notes: string | undefined,
  now: string
) {
  const ledgerId = generateId();

  await db.execute({
    sql: `INSERT INTO tenant_ledger (id, tenant_id, transaction_date, type, amount, description, created_at)
          VALUES (?, ?, ?, 'discount', ?, ?, ?)`,
    args: [ledgerId, tenantId, transactionDate, amount, notes || "Discount applied", now],
  });

  return NextResponse.json(
    {
      message: "Discount applied successfully",
      transactionId: ledgerId,
    },
    { status: 201 }
  );
}

// Handle maintenance adjustment
async function handleMaintenance(
  tenantId: string,
  amount: number,
  transactionDate: string,
  notes: string | undefined,
  now: string
) {
  const ledgerId = generateId();

  await db.execute({
    sql: `INSERT INTO tenant_ledger (id, tenant_id, transaction_date, type, amount, description, created_at)
          VALUES (?, ?, ?, 'maintenance', ?, ?, ?)`,
    args: [ledgerId, tenantId, transactionDate, amount, notes || "Maintenance adjustment", now],
  });

  return NextResponse.json(
    {
      message: "Maintenance adjustment recorded successfully",
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
        tl.amount,
        tl.payment_method,
        tl.description,
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

    // For each transaction, fetch applied rent periods
    const transactionsWithDetails = await Promise.all(
      result.rows.map(async (transaction: any) => {
        if (transaction.type === 'payment') {
          // Get rent periods this payment was applied to
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

          return {
            ...transaction,
            appliedPeriods,
            appliedTo: appliedPeriods.length > 0
              ? appliedPeriods.map(p => `${formatPeriod(p.period as string)} (₹${p.amount})`).join(', ')
              : 'Credit Balance',
          };
        }
        return {
          ...transaction,
          appliedPeriods: [],
          appliedTo: transaction.type === 'deposit' ? 'Security Deposit' : 'Other',
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
