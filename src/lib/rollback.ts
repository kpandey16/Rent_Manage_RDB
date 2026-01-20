import { db, generateId, getCurrentDateTime } from "@/lib/db";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface RollbackValidation {
  canRollback: boolean;
  errors: string[];
  warnings: string[];
  rollbackDetails?: {
    ledgerId: string;
    tenantId: string;
    paymentAmount: number;
    paymentMethod: string;
    periods: string[];
    totalRentAmount: number;
    hasAdjustments: boolean;
    adjustmentAmount?: number;
    documentId?: string;
  };
}

export interface RollbackResult {
  success: boolean;
  rollbackId: string;
  periodsAffected: string[];
  amountRefunded: number;
  message: string;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Check if this is the tenant's most recent payment (by created_at)
 */
async function isMostRecentPayment(tenantId: string, ledgerId: string): Promise<boolean> {
  const result = await db.execute({
    sql: `SELECT
            CASE WHEN id = (
              SELECT id FROM tenant_ledger
              WHERE tenant_id = ?
                AND type = 'payment'
              ORDER BY created_at DESC
              LIMIT 1
            ) THEN 1 ELSE 0 END as is_most_recent
          FROM tenant_ledger
          WHERE id = ?`,
    args: [tenantId, ledgerId]
  });

  return result.rows[0]?.is_most_recent === 1;
}

/**
 * Check if credit generated from this payment was used in subsequent transactions
 */
async function checkCreditUsageAfterPayment(
  tenantId: string,
  paymentAmount: number,
  totalRentApplied: number,
  paymentCreatedAt: string
): Promise<{ wasUsed: boolean; amountUsed: number; usedInPeriods: string[] }> {
  // If payment amount equals rent applied, no credit was generated
  if (paymentAmount <= totalRentApplied) {
    return { wasUsed: false, amountUsed: 0, usedInPeriods: [] };
  }

  const creditGenerated = paymentAmount - totalRentApplied;

  // Check if any rent was paid after this payment (which would have used credit)
  const laterPayments = await db.execute({
    sql: `SELECT rp.for_period, rp.rent_amount, tl.amount as payment_amount
          FROM rent_payments rp
          LEFT JOIN tenant_ledger tl ON rp.ledger_id = tl.id
          WHERE rp.tenant_id = ?
            AND rp.paid_at > ?
          ORDER BY rp.paid_at`,
    args: [tenantId, paymentCreatedAt]
  });

  if (laterPayments.rows.length === 0) {
    return { wasUsed: false, amountUsed: 0, usedInPeriods: [] };
  }

  // Check if any later payment used credit (payment_amount < rent_amount or payment_amount is NULL)
  const creditUsages = laterPayments.rows.filter(
    (row: any) => !row.payment_amount || row.payment_amount < row.rent_amount
  );

  if (creditUsages.length > 0) {
    const usedInPeriods = creditUsages.map((row: any) => row.for_period as string);
    const amountUsed = creditUsages.reduce(
      (sum: number, row: any) => sum + (row.rent_amount - (row.payment_amount || 0)),
      0
    );

    return { wasUsed: true, amountUsed, usedInPeriods };
  }

  return { wasUsed: false, amountUsed: 0, usedInPeriods: [] };
}

/**
 * Get current operator available balance
 */
async function getOperatorAvailableBalance(): Promise<number> {
  // Total collections
  const collectionsResult = await db.execute({
    sql: `SELECT COALESCE(SUM(amount), 0) as total
          FROM tenant_ledger
          WHERE type = 'payment'`,
    args: []
  });

  // Total expenses
  const expensesResult = await db.execute({
    sql: `SELECT COALESCE(SUM(amount), 0) as total FROM operator_expenses`,
    args: []
  });

  // Total withdrawals
  const withdrawalsResult = await db.execute({
    sql: `SELECT COALESCE(SUM(amount), 0) as total FROM admin_withdrawals`,
    args: []
  });

  const collections = Number(collectionsResult.rows[0].total);
  const expenses = Number(expensesResult.rows[0].total);
  const withdrawals = Number(withdrawalsResult.rows[0].total);

  return collections - expenses - withdrawals;
}

/**
 * Validate if a payment can be rolled back
 */
export async function validatePaymentRollback(
  ledgerId: string
): Promise<RollbackValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Step 1: Get the ledger entry
    const ledger = await db.execute({
      sql: `SELECT * FROM tenant_ledger WHERE id = ?`,
      args: [ledgerId]
    });

    if (ledger.rows.length === 0) {
      errors.push("Payment not found");
      return { canRollback: false, errors, warnings };
    }

    const p = ledger.rows[0] as any;

    // Step 2: Must be payment type
    if (p.type !== 'payment') {
      errors.push(`Cannot rollback ${p.type} type entries. Only cash/UPI payments can be rolled back.`);
    }

    // Step 3: Must be cash or UPI method
    if (p.payment_method !== 'cash' && p.payment_method !== 'upi') {
      errors.push(`Payment method '${p.payment_method}' cannot be rolled back. Only cash/UPI payments are eligible.`);
    }

    // Step 4: Must be tenant's most recent payment
    const isMostRecent = await isMostRecentPayment(p.tenant_id, ledgerId);
    if (!isMostRecent) {
      errors.push("Only the most recent payment can be rolled back");
    }

    // Step 5: Get all rent_payments from this ledger entry
    const allRentPayments = await db.execute({
      sql: `SELECT for_period, rent_amount FROM rent_payments
            WHERE ledger_id = ?
            ORDER BY for_period`,
      args: [ledgerId]
    });

    const periods = allRentPayments.rows.map((r: any) => r.for_period as string);
    const totalRentAmount = allRentPayments.rows.reduce(
      (sum: number, r: any) => sum + Number(r.rent_amount),
      0
    );

    // Step 6: Check if credit generated from this payment was used
    const creditCheck = await checkCreditUsageAfterPayment(
      p.tenant_id,
      Number(p.amount),
      totalRentAmount,
      p.created_at
    );

    if (creditCheck.wasUsed) {
      errors.push(
        `Cannot rollback: ₹${creditCheck.amountUsed.toLocaleString('en-IN')} credit from this payment was used in ${creditCheck.usedInPeriods.join(', ')}`
      );
    }

    // Step 7: Check operator cash availability
    const operatorBalance = await getOperatorAvailableBalance();
    if (operatorBalance < Number(p.amount)) {
      errors.push(
        `Insufficient operator funds: ₹${operatorBalance.toLocaleString('en-IN')} available, ₹${Number(p.amount).toLocaleString('en-IN')} needed`
      );
    }

    // Step 8: Check for bundled adjustments
    let hasAdjustments = false;
    let adjustmentAmount = 0;

    if (p.document_id) {
      const adjustments = await db.execute({
        sql: `SELECT type, subtype, amount FROM tenant_ledger
              WHERE document_id = ? AND type = 'adjustment'`,
        args: [p.document_id]
      });

      if (adjustments.rows.length > 0) {
        hasAdjustments = true;
        adjustmentAmount = adjustments.rows.reduce(
          (sum: number, adj: any) => sum + Number(adj.amount),
          0
        );

        const adjTypes = adjustments.rows.map((a: any) => a.subtype).join(', ');
        warnings.push(
          `This payment includes ₹${adjustmentAmount.toLocaleString('en-IN')} in adjustments (${adjTypes}). These will also be rolled back.`
        );
      }
    }

    // Step 9: Warn about multi-period rollback
    if (periods.length > 1) {
      warnings.push(
        `This payment covers ${periods.length} months (${periods.join(', ')}). All periods will be rolled back.`
      );
    }

    return {
      canRollback: errors.length === 0,
      errors,
      warnings,
      rollbackDetails: {
        ledgerId,
        tenantId: p.tenant_id,
        paymentAmount: Number(p.amount),
        paymentMethod: p.payment_method,
        periods,
        totalRentAmount,
        hasAdjustments,
        adjustmentAmount: hasAdjustments ? adjustmentAmount : undefined,
        documentId: p.document_id
      }
    };
  } catch (error) {
    console.error("Error validating rollback:", error);
    errors.push("Failed to validate rollback: " + (error as Error).message);
    return { canRollback: false, errors, warnings };
  }
}

// ============================================================================
// EXECUTION FUNCTIONS
// ============================================================================

/**
 * Execute payment rollback by deleting records and saving to rollback_history
 */
export async function executePaymentRollback(
  ledgerId: string,
  reason: string,
  userId: string
): Promise<RollbackResult> {
  const now = getCurrentDateTime();
  const rollbackId = generateId();

  try {
    // Validate first
    const validation = await validatePaymentRollback(ledgerId);
    if (!validation.canRollback) {
      throw new Error(validation.errors.join('; '));
    }

    const details = validation.rollbackDetails!;

    // Get operator balance before
    const operatorBalanceBefore = await getOperatorAvailableBalance();

    // Get payment details for audit
    const payment = await db.execute({
      sql: `SELECT * FROM tenant_ledger WHERE id = ?`,
      args: [ledgerId]
    });

    const p = payment.rows[0] as any;

    // 2. Collect ALL records that will be deleted (for audit)

    // All rent_payments from this ledger_id
    const rentPaymentsToDelete = await db.execute({
      sql: `SELECT * FROM rent_payments WHERE ledger_id = ?`,
      args: [details.ledgerId]
    });

    // All ledger entries in the bundle
    const ledgerEntriesToDelete = await db.execute({
      sql: details.documentId
        ? `SELECT * FROM tenant_ledger WHERE document_id = ?`
        : `SELECT * FROM tenant_ledger WHERE id = ?`,
      args: [details.documentId || details.ledgerId]
    });

    // Any security_deposits referencing this ledger
    const securityDepositsToDelete = await db.execute({
      sql: `SELECT * FROM security_deposits WHERE ledger_id = ?`,
      args: [details.ledgerId]
    });

    // Any credit_history referencing this ledger
    const creditHistoryToDelete = await db.execute({
      sql: `SELECT * FROM credit_history WHERE ledger_id = ?`,
      args: [details.ledgerId]
    });

    // 3. Save to rollback_history FIRST (before deleting)
    await db.execute({
      sql: `INSERT INTO rollback_history (
              id, rollback_type, tenant_id, performed_by, performed_at, reason,
              payment_amount, payment_method, payment_date, document_id,
              periods_affected,
              deleted_rent_payments, deleted_ledger_entries,
              deleted_security_deposits, deleted_credit_history,
              total_rent_rolled_back, adjustments_rolled_back,
              operator_balance_before, operator_balance_after,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        rollbackId,
        'payment',
        details.tenantId,
        userId,
        now,
        reason,
        details.paymentAmount,
        details.paymentMethod,
        p.transaction_date,
        details.documentId || null,
        JSON.stringify(details.periods),
        JSON.stringify(rentPaymentsToDelete.rows),
        JSON.stringify(ledgerEntriesToDelete.rows),
        JSON.stringify(securityDepositsToDelete.rows),
        JSON.stringify(creditHistoryToDelete.rows),
        details.totalRentAmount,
        details.adjustmentAmount || null,
        operatorBalanceBefore,
        operatorBalanceBefore - details.paymentAmount,
        now
      ]
    });

    // 4. Now DELETE in correct order (children first, then parent)

    // Delete rent_payments (child)
    await db.execute({
      sql: `DELETE FROM rent_payments WHERE ledger_id = ?`,
      args: [details.ledgerId]
    });

    // Delete security_deposits (child) if any
    if (securityDepositsToDelete.rows.length > 0) {
      await db.execute({
        sql: `DELETE FROM security_deposits WHERE ledger_id = ?`,
        args: [details.ledgerId]
      });
    }

    // Delete credit_history (child) if any
    if (creditHistoryToDelete.rows.length > 0) {
      await db.execute({
        sql: `DELETE FROM credit_history WHERE ledger_id = ?`,
        args: [details.ledgerId]
      });
    }

    // Delete ledger entries (parent) - includes payment and adjustments
    await db.execute({
      sql: details.documentId
        ? `DELETE FROM tenant_ledger WHERE document_id = ?`
        : `DELETE FROM tenant_ledger WHERE id = ?`,
      args: [details.documentId || details.ledgerId]
    });

    // 5. Create audit log
    await db.execute({
      sql: `INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, old_values, created_at)
            VALUES (?, ?, 'payment.rollback', 'tenant_ledger', ?, ?, ?)`,
      args: [generateId(), userId, ledgerId, JSON.stringify(p), now]
    });

    return {
      success: true,
      rollbackId,
      periodsAffected: details.periods,
      amountRefunded: details.paymentAmount,
      message: `Successfully rolled back payment of ₹${details.paymentAmount.toLocaleString('en-IN')} for ${details.periods.join(', ')}`
    };

  } catch (error) {
    console.error("Error executing rollback:", error);
    throw new Error("Failed to execute rollback: " + (error as Error).message);
  }
}
