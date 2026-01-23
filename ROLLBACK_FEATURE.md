# Payment Rollback Feature

## Overview

The payment rollback feature allows administrators to void/delete incorrect or duplicate payments from the system. When a payment is rolled back, all associated rent payments are marked as unpaid, and the transaction is permanently removed from the database while maintaining a complete audit trail.

## Key Features

✅ **Atomic Rollback** - All rent periods from a single payment are rolled back together
✅ **Complete Audit Trail** - Full record of deleted data stored in `rollback_history`
✅ **Safety Constraints** - Multiple validation checks prevent invalid rollbacks
✅ **Admin Only** - Only users with admin role can execute rollbacks
✅ **Cash Flow Protection** - Prevents rollback if operator doesn't have sufficient cash

---

## Rollback Rules & Constraints

### ✅ Can Rollback When:

1. **Payment Type**: Only `cash` or `upi` payments
2. **Most Recent**: Only the tenant's most recent payment (by `created_at`)
3. **No Credit Usage**: Credit generated hasn't been used in later transactions
4. **Sufficient Funds**: Operator has enough cash to refund

### ❌ Cannot Rollback When:

1. Payment used existing credit to complete rent
2. Credit from this payment was used for subsequent months
3. Payment is not the most recent for that tenant
4. Operator cash balance is insufficient
5. Payment method is not cash/upi (e.g., deposit, discount)

---

## How It Works

### 1. Database Structure

**New Table: `rollback_history`**
```sql
CREATE TABLE rollback_history (
    id TEXT PRIMARY KEY,
    rollback_type TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    performed_by TEXT NOT NULL,
    performed_at TEXT NOT NULL,
    reason TEXT NOT NULL,
    payment_amount REAL NOT NULL,
    payment_method TEXT,
    payment_date TEXT NOT NULL,
    document_id TEXT,
    periods_affected TEXT NOT NULL,  -- JSON array
    deleted_rent_payments TEXT NOT NULL,  -- Full JSON records
    deleted_ledger_entries TEXT NOT NULL,  -- Full JSON records
    deleted_security_deposits TEXT,
    deleted_credit_history TEXT,
    total_rent_rolled_back REAL NOT NULL,
    adjustments_rolled_back REAL,
    operator_balance_before REAL NOT NULL,
    operator_balance_after REAL NOT NULL,
    ...
);
```

### 2. Rollback Process

**Step 1: Validation**
- Check payment type (must be cash/upi)
- Check if most recent payment
- Check credit usage
- Check operator cash availability
- Check for bundled adjustments

**Step 2: Data Collection**
- Get all `rent_payments` linked to this ledger entry
- Get all `tenant_ledger` entries in the bundle (if document_id exists)
- Get any `security_deposits` linked to this ledger
- Get any `credit_history` linked to this ledger

**Step 3: Save Audit Trail**
- Store complete JSON of all deleted records in `rollback_history`
- Record operator balance before/after
- Record all affected periods
- Record reason for rollback

**Step 4: Delete Records**
- Delete from `rent_payments` (child)
- Delete from `security_deposits` (child, if any)
- Delete from `credit_history` (child, if any)
- Delete from `tenant_ledger` (parent - includes payment + adjustments)

**Step 5: Create Audit Log**
- Log the rollback action in `audit_log` table

---

## Usage

### For Admins:

1. Navigate to **Payments** page
2. Find the payment to rollback
3. Click the **rollback icon** (↻) next to the payment
4. Review validation warnings/errors
5. Enter a detailed reason (minimum 10 characters)
6. Confirm rollback

**Example Reasons:**
- "Duplicate entry - tenant paid twice"
- "Incorrect amount entered"
- "Tenant requested refund due to overpayment"
- "Data entry error - wrong tenant"

### UI Elements:

**Payments Page:**
- Rollback button (↻) appears only for cash/upi payments
- Red color indicates destructive action
- Clicking opens confirmation dialog

**Rollback Dialog:**
- Shows payment details
- Lists all affected periods
- Displays validation errors/warnings
- Requires reason input
- Confirms irreversible action

---

## Technical Implementation

### Files Created:

**Database:**
- `schema/002_rollback_history.sql` - Rollback history table
- `scripts/add-rollback-table.js` - Migration script

**Backend:**
- `src/lib/rollback.ts` - Validation and execution logic
- `src/app/api/rollback/validate/route.ts` - Validation endpoint
- `src/app/api/rollback/execute/route.ts` - Execution endpoint
- `src/app/api/rollback/history/route.ts` - History viewing endpoint

**Frontend:**
- `src/components/rollback/rollback-payment-dialog.tsx` - Rollback UI component
- `src/app/payments/page.tsx` - Updated with rollback button

### API Endpoints:

**POST /api/rollback/validate**
```json
Request: { "ledgerId": "abc123" }
Response: {
  "canRollback": true/false,
  "errors": [...],
  "warnings": [...],
  "rollbackDetails": { ... }
}
```

**POST /api/rollback/execute**
```json
Request: {
  "ledgerId": "abc123",
  "reason": "Duplicate entry"
}
Response: {
  "message": "Successfully rolled back...",
  "rollbackId": "xyz789",
  "periodsAffected": ["2025-01", "2025-02"],
  "amountRefunded": 10000
}
```

**GET /api/rollback/history**
```
Query params: ?tenantId=abc&limit=50
Response: {
  "history": [...],
  "count": 10
}
```

---

## Example Scenarios

### Scenario 1: Simple Payment Rollback ✅

```
Timeline:
Jan 15: Tenant paid ₹5,000 cash for Jan rent
Jan 16: Admin realizes duplicate entry

Action: Rollback Jan 15 payment
Result:
  ✅ ₹5,000 payment deleted
  ✅ Jan rent marked unpaid
  ✅ Operator cash decreases by ₹5,000
  ✅ Full audit record in rollback_history
```

### Scenario 2: Multi-Period Rollback ✅

```
Timeline:
Jan 15: Tenant paid ₹15,000 cash for Jan, Feb, Mar (₹5,000 each)

Action: Rollback Jan 15 payment
Result:
  ✅ All 3 months rolled back atomically
  ✅ Jan, Feb, Mar all unpaid
  ✅ Operator cash decreases by ₹15,000
```

### Scenario 3: Payment with Adjustment ✅

```
Timeline:
Jan 15: Tenant paid ₹3,000 cash + ₹2,000 discount = ₹5,000 for Jan

Action: Rollback Jan 15 payment
Result:
  ✅ Both payment and discount deleted
  ✅ Jan rent unpaid
  ✅ Operator cash decreases by ₹3,000
```

### Scenario 4: Cannot Rollback - Credit Used ❌

```
Timeline:
Jan 15: Tenant paid ₹8,000 → ₹5,000 to Jan, ₹3,000 credit
Feb 1:  Used ₹3,000 credit for Feb rent

Action: Try to rollback Jan 15 payment
Result:
  ❌ Blocked - "Credit from this payment was used in Feb-25"
```

### Scenario 5: Cannot Rollback - Not Most Recent ❌

```
Timeline:
Jan 15: Tenant paid ₹5,000 for Jan
Feb 10: Tenant paid ₹5,000 for Feb

Action: Try to rollback Jan 15 payment
Result:
  ❌ Blocked - "Only the most recent payment can be rolled back"
```

---

## Security & Permissions

**Role-Based Access:**
- ✅ **Admin**: Can rollback any eligible payment
- ❌ **Operator**: Cannot rollback (too risky)

**Audit Requirements:**
- Every rollback logged in `audit_log`
- Complete record in `rollback_history`
- Mandatory reason field
- Tracks performer user ID and timestamp

---

## Setup Instructions

### 1. Run Database Migration

```bash
node scripts/add-rollback-table.js
```

This creates the `rollback_history` table.

### 2. Dependencies

Already installed:
- `bcryptjs` - For authentication
- `jose` - For JWT tokens

### 3. Environment Variables

Ensure `.env.local` has:
```
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
JWT_SECRET=...
```

### 4. Verify Installation

1. Login as admin
2. Go to Payments page
3. Check for rollback button (↻) on cash/upi payments

---

## Querying Rollback History

### View All Rollbacks:

```sql
SELECT
  rh.*,
  t.name as tenant_name,
  u.name as admin_name
FROM rollback_history rh
JOIN tenants t ON rh.tenant_id = t.id
JOIN users u ON rh.performed_by = u.id
ORDER BY rh.performed_at DESC;
```

### View Deleted Records for a Rollback:

```sql
SELECT
  deleted_rent_payments,
  deleted_ledger_entries
FROM rollback_history
WHERE id = 'rollback_id_here';
```

Parse the JSON to see exact deleted data.

### Monthly Rollback Statistics:

```sql
SELECT
  strftime('%Y-%m', performed_at) as month,
  COUNT(*) as rollback_count,
  SUM(payment_amount) as total_rolled_back
FROM rollback_history
GROUP BY month
ORDER BY month DESC;
```

---

## Troubleshooting

### Error: "Only the most recent payment can be rolled back"

**Solution**: You can only rollback the tenant's latest payment. If you need to rollback an older payment, first rollback all newer payments.

### Error: "Credit from this payment was used in ..."

**Solution**: The payment generated excess credit that was later used for rent. You cannot rollback this payment as it would create inconsistencies. Consider manually adjusting balances instead.

### Error: "Insufficient operator funds"

**Solution**: The operator doesn't have enough cash to refund. Add cash to operator balance first, or rollback recent withdrawals.

### Error: "Payment method 'X' cannot be rolled back"

**Solution**: Only cash and UPI payments can be rolled back. Other transaction types (credit, discount, deposit) cannot be rolled back directly.

---

## Best Practices

1. **Always provide detailed reasons** - Future audits depend on this
2. **Verify with tenant first** - Ensure physical refund happens
3. **Check operator cash** - Make sure cash is available for refund
4. **Double-check period** - Ensure you're rolling back the correct payment
5. **Document externally** - Keep records outside system for disputes

---

## Future Enhancements (Not Implemented)

- ❌ Partial rollback (rollback one period from multi-period payment)
- ❌ Rollback restoration (undo a rollback)
- ❌ Bulk rollback (rollback multiple payments at once)
- ❌ Rollback of non-payment transactions
- ❌ Time-based restrictions (e.g., cannot rollback payments > 90 days old)
- ❌ Tenant notification on rollback

---

## Summary

The payment rollback feature provides a safe, auditable way to correct payment errors while maintaining data integrity. By using the DELETE approach with comprehensive audit trails, the system stays clean while preserving complete historical records for compliance and debugging.

**Key Takeaway**: Use rollback sparingly and only for genuine errors. It's a powerful administrative tool that should be used with care and proper authorization.
