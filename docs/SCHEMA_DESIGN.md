# Rent Management Database Schema Design

## Overview

This document describes the database schema for the Rent Management application using Turso (SQLite-compatible).

## Key Design Decisions

1. **Tenant-centric payments**: All payments and security deposits are at tenant level, not room level
2. **Multi-room tenants**: Tenants can occupy multiple rooms; rent = sum of individual room rents
3. **On-demand rent calculation**: Rent is calculated dynamically from room allocations and rent history (no stored rent charges)
4. **Unified ledger**: Single `tenant_ledger` table for ALL money coming IN
5. **Rent payments**: Separate `rent_payments` table for money applied OUT to rent periods
6. **Full payment only**: Rent for a period is only marked paid when fully covered (no partial period payments)
7. **Soft deletes**: Critical entities use `is_active` flag instead of hard deletes

---

## Entity Relationship Diagram

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Users     │         │    Rooms     │────────→│ Rent_Updates│
│(Admin/Oper.)│         │  (R1,R2..)   │         │  (History)  │
└──────┬──────┘         └──────┬───────┘         └─────────────┘
       │                       │
       │                ┌──────┴───────┐
       │                │ Tenant_Rooms │
       │                │ (Allocation) │
       │                └──────┬───────┘
       │                       │
       │                ┌──────┴───────┐
       │                │   Tenants    │
       │                └──────┬───────┘
       │                       │
       ▼              ┌────────┼────────┐
┌─────────────┐       │        │        │
│ Withdrawals │       ▼        ▼        ▼
└─────────────┘  ┌─────────┐ ┌───────────────┐ ┌──────────────┐
                 │ Tenant  │ │    Rent       │ │  Security    │
                 │ Ledger  │→│   Payments    │ │  Deposits    │
                 │(Money IN)│ │ (Money OUT)   │ └──────────────┘
                 └─────────┘ └───────────────┘
                       │
                 ┌─────┴─────┐
                 │Maintenance│
                 │ Requests  │
                 └───────────┘
```

---

## Tables

### 1. `users`
Stores Admin and Operator accounts.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (ULID) | Primary key |
| name | TEXT | User's full name |
| email | TEXT | Unique email for login |
| password_hash | TEXT | Hashed password |
| role | TEXT | 'admin' or 'operator' |
| is_active | INTEGER | 1 = active, 0 = disabled |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

---

### 2. `rooms`
Properties/rentable units (R1, R2, etc.).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (ULID) | Primary key |
| code | TEXT | Unique identifier (R1, R2, etc.) |
| name | TEXT | Optional friendly name |
| description | TEXT | Optional description |
| monthly_rent | REAL | Current monthly rent amount |
| status | TEXT | 'vacant' or 'occupied' |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

**Note**: `monthly_rent` reflects the CURRENT rent. Use `rent_updates` for historical rent values.

---

### 3. `rent_updates`
Tracks rent change history for rooms.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (ULID) | Primary key |
| room_id | TEXT | FK to rooms |
| old_rent | REAL | Previous rent (NULL for initial) |
| new_rent | REAL | New rent amount |
| effective_from | TEXT | Date when new rent takes effect |
| created_by | TEXT | FK to users |
| created_at | TEXT | ISO timestamp |

**Usage**:
- When room is created: `old_rent=NULL, new_rent=initial_rent`
- When rent changes: `old_rent=previous, new_rent=updated`

**Get rent for a room on any date**:
```sql
SELECT new_rent FROM rent_updates
WHERE room_id = ? AND effective_from <= ?
ORDER BY effective_from DESC
LIMIT 1
```

---

### 4. `tenants`
Tenant information.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (ULID) | Primary key |
| name | TEXT | Tenant's full name |
| phone | TEXT | Phone number |
| address | TEXT | Permanent/previous address |
| is_active | INTEGER | 1 = active tenant, 0 = vacated |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

---

### 5. `tenant_rooms`
Tracks room allocations to tenants (supports multiple rooms per tenant).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (ULID) | Primary key |
| tenant_id | TEXT | FK to tenants |
| room_id | TEXT | FK to rooms |
| move_in_date | TEXT | Date of move-in |
| move_out_date | TEXT | Date of move-out (NULL if active) |
| is_active | INTEGER | 1 = currently allocated |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

**Business Rules**:
- When `is_active` = 1, room status should be 'occupied'
- Move-out requires no dues check if this is tenant's last room

---

### 6. `tenant_ledger`
All money coming IN - unified ledger for payments, adjustments, and opening balances.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (ULID) | Primary key |
| tenant_id | TEXT | FK to tenants |
| transaction_date | TEXT | Date of transaction |
| type | TEXT | See types below |
| amount | REAL | Amount (see sign convention below) |
| payment_method | TEXT | 'cash', 'upi' (for payments only) |
| description | TEXT | Details/notes |
| reference_id | TEXT | Link to maintenance_requests, etc. |
| created_by | TEXT | FK to users |
| created_at | TEXT | ISO timestamp |

**Transaction Types & Amount Sign**:
| Type | Amount Sign | Description |
|------|-------------|-------------|
| `payment` | + (positive) | Payment received from tenant |
| `discount` | + (positive) | Ad-hoc discount given |
| `maintenance_credit` | + (positive) | Maintenance cost credited to tenant |
| `opening_balance` | +/- | Initial balance when migrating tenant |

**Note on `opening_balance`**:
- Positive = Tenant had advance/credit in old system
- Negative = Tenant had dues in old system

---

### 7. `rent_payments`
Tracks which rent periods are PAID - money going OUT (applied to rent).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (ULID) | Primary key |
| tenant_id | TEXT | FK to tenants |
| for_period | TEXT | YYYY-MM format |
| rent_amount | REAL | Rent amount that was due (snapshot) |
| ledger_id | TEXT | FK to tenant_ledger (which entry triggered this) |
| paid_at | TEXT | When this period was marked paid |
| created_at | TEXT | ISO timestamp |

**Business Rule**: A period only gets an entry here when FULLY paid.

---

### 8. `security_deposits`
Tracks security deposit transactions.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (ULID) | Primary key |
| tenant_id | TEXT | FK to tenants |
| transaction_type | TEXT | 'deposit' or 'refund' |
| amount | REAL | Always positive |
| transaction_date | TEXT | Date of transaction |
| notes | TEXT | Optional notes |
| created_by | TEXT | FK to users |
| created_at | TEXT | ISO timestamp |

**Current Deposit Calculation**:
```sql
SELECT
  SUM(CASE WHEN transaction_type = 'deposit' THEN amount ELSE 0 END) -
  SUM(CASE WHEN transaction_type = 'refund' THEN amount ELSE 0 END) as current_deposit
FROM security_deposits
WHERE tenant_id = ?
```

---

### 9. `maintenance_requests`
Tracks maintenance work.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (ULID) | Primary key |
| room_id | TEXT | FK to rooms |
| tenant_id | TEXT | FK to tenants (who gets credit, nullable) |
| description | TEXT | What work is needed |
| estimated_cost | REAL | Estimated cost (nullable) |
| actual_cost | REAL | Final cost (nullable) |
| status | TEXT | 'open', 'in_progress', 'resolved' |
| is_adjusted_in_rent | INTEGER | 1 if credited to tenant |
| ledger_entry_id | TEXT | FK to tenant_ledger (when adjusted) |
| created_by | TEXT | FK to users |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |
| resolved_at | TEXT | When resolved |

---

### 10. `withdrawals`
Tracks cash withdrawals from collections.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (ULID) | Primary key |
| amount | REAL | Withdrawal amount |
| withdrawal_date | TEXT | Date of withdrawal |
| notes | TEXT | Purpose/notes |
| created_by | TEXT | FK to users |
| created_at | TEXT | ISO timestamp |

---

## Core Calculations

### Tenant Credit Balance
```sql
-- Credits (money IN) - Debits (money applied to rent)
SELECT
  COALESCE((SELECT SUM(amount) FROM tenant_ledger WHERE tenant_id = ?), 0) -
  COALESCE((SELECT SUM(rent_amount) FROM rent_payments WHERE tenant_id = ?), 0)
AS credit_balance

-- Positive = Tenant has credit/advance
-- Zero     = Settled
-- Negative = Tenant has dues (owes money)
```

### Rent Due for a Period (calculated on-demand)
```sql
-- Sum of room rents for all rooms allocated to tenant in that period
SELECT SUM(
  (SELECT new_rent FROM rent_updates
   WHERE room_id = tr.room_id
   AND effective_from <= :period_start
   ORDER BY effective_from DESC LIMIT 1)
) as rent_due
FROM tenant_rooms tr
WHERE tr.tenant_id = :tenant_id
  AND tr.move_in_date <= :period_end
  AND (tr.move_out_date IS NULL OR tr.move_out_date >= :period_start)
```

### Unpaid Periods
A period is unpaid if:
1. Tenant had room allocation during that period
2. No entry exists in `rent_payments` for that period

### Payment Application Logic
When a payment comes in:
```
1. Calculate available credit (existing credit + new payment)
2. Get list of unpaid periods (oldest first)
3. For each unpaid period:
   - Calculate rent due
   - If credit >= rent_due:
     - Create rent_payments entry
     - Reduce available credit
   - Else: Stop (no partial payments)
4. Remaining credit stays for next payment
```

**Example**:
```
Payment: ₹8000

Jan rent: ₹5000 ≤ ₹8000 ✓ → Mark Jan PAID, credit = ₹3000
Feb rent: ₹5000 > ₹3000 ✗ → Stop (no partial)

Credit balance: ₹3000 (available for next payment)
```

---

## Audit Timeline Query

Complete payment history with running balance:

```sql
SELECT
  l.transaction_date as date,
  l.type,
  l.amount,
  l.payment_method,
  l.description,
  GROUP_CONCAT(rp.for_period) as months_paid,
  (
    SELECT SUM(l2.amount) FROM tenant_ledger l2
    WHERE l2.tenant_id = l.tenant_id
    AND (l2.transaction_date < l.transaction_date
         OR (l2.transaction_date = l.transaction_date AND l2.id <= l.id))
  ) - (
    SELECT COALESCE(SUM(rp2.rent_amount), 0) FROM rent_payments rp2
    WHERE rp2.tenant_id = l.tenant_id
    AND (rp2.paid_at < l.transaction_date
         OR (rp2.paid_at = l.transaction_date AND rp2.ledger_id <= l.id))
  ) as running_balance
FROM tenant_ledger l
LEFT JOIN rent_payments rp ON rp.ledger_id = l.id
WHERE l.tenant_id = ?
GROUP BY l.id
ORDER BY l.transaction_date, l.id;
```

**Example Output**:

| Date | Type | Amount | Method | Months Paid | Balance |
|------|------|--------|--------|-------------|---------|
| 2024-01-01 | opening_balance | -10000 | - | - | -10000 |
| 2024-01-15 | payment | +15000 | cash | 2024-01,2024-02 | 0 |
| 2024-02-10 | discount | +500 | - | - | +500 |
| 2024-03-05 | payment | +5000 | upi | 2024-03 | +500 |
| 2024-03-10 | maintenance_credit | +1000 | - | - | +1500 |

---

## Reporting Queries

### Monthly Income (collections in a month)
```sql
SELECT SUM(amount) as total_collected
FROM tenant_ledger
WHERE type = 'payment'
  AND strftime('%Y-%m', transaction_date) = '2024-01';
```

### Collection Rate
```sql
-- Total rent due vs Total rent paid for active tenants
WITH rent_due AS (
  SELECT SUM(rent_amount) as total FROM rent_payments
  WHERE strftime('%Y-%m', paid_at) = '2024-01'
),
payments AS (
  SELECT SUM(amount) as total FROM tenant_ledger
  WHERE type = 'payment'
  AND strftime('%Y-%m', transaction_date) = '2024-01'
)
SELECT
  payments.total as collected,
  rent_due.total as applied_to_rent
FROM payments, rent_due;
```

### Defaulters (negative balance = has dues)
```sql
SELECT
  t.id,
  t.name,
  t.phone,
  COALESCE(SUM(l.amount), 0) - COALESCE(SUM(rp.rent_amount), 0) as balance
FROM tenants t
LEFT JOIN tenant_ledger l ON t.id = l.tenant_id
LEFT JOIN rent_payments rp ON t.id = rp.tenant_id
WHERE t.is_active = 1
GROUP BY t.id
HAVING balance < 0;
```

### Withdrawal Report (custom range)
```sql
SELECT
  withdrawal_date,
  amount,
  notes,
  (SELECT name FROM users WHERE id = created_by) as withdrawn_by
FROM withdrawals
WHERE withdrawal_date BETWEEN '2024-01-01' AND '2024-06-30'
ORDER BY withdrawal_date DESC;
```

---

## Indexes (for Performance)

```sql
-- Tenant ledger queries
CREATE INDEX idx_tenant_ledger_tenant_id ON tenant_ledger(tenant_id);
CREATE INDEX idx_tenant_ledger_date ON tenant_ledger(transaction_date);
CREATE INDEX idx_tenant_ledger_type ON tenant_ledger(type);

-- Rent payments queries
CREATE INDEX idx_rent_payments_tenant_id ON rent_payments(tenant_id);
CREATE INDEX idx_rent_payments_period ON rent_payments(for_period);
CREATE INDEX idx_rent_payments_ledger_id ON rent_payments(ledger_id);

-- Room allocations
CREATE INDEX idx_tenant_rooms_tenant_id ON tenant_rooms(tenant_id);
CREATE INDEX idx_tenant_rooms_room_id ON tenant_rooms(room_id);

-- Rent history
CREATE INDEX idx_rent_updates_room_id ON rent_updates(room_id);
CREATE INDEX idx_rent_updates_effective ON rent_updates(effective_from);

-- Withdrawals
CREATE INDEX idx_withdrawals_date ON withdrawals(withdrawal_date);

-- Maintenance
CREATE INDEX idx_maintenance_room_id ON maintenance_requests(room_id);
CREATE INDEX idx_maintenance_tenant_id ON maintenance_requests(tenant_id);
```

---

## Notes

1. **ULID vs UUID**: Using ULID for IDs (sortable, URL-safe). Can use UUID if preferred.
2. **Timestamps**: Stored as ISO 8601 strings for SQLite/Turso compatibility.
3. **Currency**: Using REAL type. All amounts in base currency (INR assumed).
4. **Rent Due Date**: 1st of every month.
5. **Billing Cycle**: Calendar month (1st to 31st).
6. **Soft Deletes**: Tenants and users use `is_active` flag to preserve history.

---

## Migration Support

When importing tenants from old system:

1. Create tenant record
2. Create room allocations with historical move_in_date
3. Add `opening_balance` entry to tenant_ledger:
   - Positive amount = tenant has advance
   - Negative amount = tenant has dues
4. Add past rent_payments for periods that were paid in old system

---

## Future Considerations (Not in Current Scope)

- [ ] Role-based permissions for Admin vs Operator
- [ ] Document storage references
- [ ] Lease/agreement management
- [ ] Communication/notification logs
- [ ] Multi-landlord SaaS support
