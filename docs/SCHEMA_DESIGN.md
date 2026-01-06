# Rent Management Database Schema Design

## Overview

This document describes the database schema for the Rent Management application using Turso (SQLite-compatible).

## Key Design Decisions

1. **Tenant-centric payments**: All payments and security deposits are at tenant level, not room level
2. **Multi-room tenants**: Tenants can occupy multiple rooms; rent = sum of individual room rents
3. **Ledger-based tracking**: Financial transactions use a ledger approach for accurate balance calculation
4. **Soft deletes**: Critical entities use `is_active` flag instead of hard deletes

---

## Entity Relationship Diagram (Conceptual)

```
┌─────────┐       ┌─────────────┐       ┌─────────┐
│  Users  │       │ Tenant_Rooms│       │  Rooms  │
│ (Admin/ │       │ (Allocation)│       │(R1,R2..)│
│Operator)│       └──────┬──────┘       └────┬────┘
└────┬────┘              │                   │
     │           ┌───────┴───────┐           │
     │           │    Tenants    │           │
     │           └───────┬───────┘           │
     │                   │                   │
     ▼                   ▼                   │
┌─────────┐       ┌─────────────┐            │
│Withdrawals│     │Tenant_Ledger│            │
└─────────┘       │(All $$ txns)│            │
                  └─────────────┘            │
                         │                   │
                  ┌──────┴──────┐            │
                  │ Security    │     ┌──────┴──────┐
                  │ Deposits    │     │ Maintenance │
                  └─────────────┘     │  Requests   │
                                      └─────────────┘
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
| monthly_rent | REAL | Fixed monthly rent amount |
| status | TEXT | 'vacant' or 'occupied' |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

---

### 3. `tenants`
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

### 4. `tenant_rooms`
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

**Business Rules:**
- When `is_active` = 1, room status should be 'occupied'
- Move-out requires no dues check if this is tenant's last room

---

### 5. `tenant_ledger`
All financial transactions for a tenant (ledger approach).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (ULID) | Primary key |
| tenant_id | TEXT | FK to tenants |
| transaction_date | TEXT | Date of transaction |
| transaction_type | TEXT | See types below |
| amount | REAL | Positive = tenant owes, Negative = tenant paid/credit |
| description | TEXT | Details of transaction |
| for_period | TEXT | YYYY-MM format (for rent charges) |
| payment_method | TEXT | 'cash', 'upi', 'credit_adjustment', 'deposit_adjustment' |
| reference_id | TEXT | Optional link to maintenance_requests, etc. |
| created_by | TEXT | FK to users |
| created_at | TEXT | ISO timestamp |

**Transaction Types:**
| Type | Amount Sign | Description |
|------|-------------|-------------|
| `rent_charge` | + | Monthly rent due |
| `payment` | - | Payment received |
| `discount` | - | Ad-hoc discount given |
| `maintenance_credit` | - | Maintenance cost deducted from rent |
| `opening_balance` | +/- | Initial balance when adding existing tenant |

**Balance Calculation:**
```sql
SELECT SUM(amount) as balance FROM tenant_ledger WHERE tenant_id = ?
-- Positive balance = Tenant owes money (dues)
-- Negative balance = Tenant has credit (advance)
-- Zero = Settled
```

---

### 6. `security_deposits`
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

**Current Deposit Calculation:**
```sql
SELECT
  SUM(CASE WHEN transaction_type = 'deposit' THEN amount ELSE 0 END) -
  SUM(CASE WHEN transaction_type = 'refund' THEN amount ELSE 0 END) as current_deposit
FROM security_deposits
WHERE tenant_id = ?
```

---

### 7. `maintenance_requests`
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

### 8. `withdrawals`
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

## Key Queries for Reporting

### Monthly Income (for a specific month)
```sql
SELECT ABS(SUM(amount)) as total_collected
FROM tenant_ledger
WHERE transaction_type = 'payment'
  AND strftime('%Y-%m', transaction_date) = '2024-01';
```

### Collection Rate (for a specific month)
```sql
-- Total rent charged vs Total collected for a period
SELECT
  SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_charged,
  ABS(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)) as total_collected
FROM tenant_ledger
WHERE for_period = '2024-01';
```

### Defaulters (balance > 1 month rent)
```sql
SELECT t.id, t.name, t.phone, SUM(l.amount) as balance
FROM tenants t
JOIN tenant_ledger l ON t.id = l.tenant_id
WHERE t.is_active = 1
GROUP BY t.id
HAVING balance > 0;  -- Has dues
-- Further filter by comparing balance to their monthly rent
```

### Withdrawal Report (custom range)
```sql
SELECT * FROM withdrawals
WHERE withdrawal_date BETWEEN '2024-01-01' AND '2024-01-31'
ORDER BY withdrawal_date DESC;
```

### Tenant Balance
```sql
SELECT SUM(amount) as balance FROM tenant_ledger WHERE tenant_id = ?;
```

---

## Indexes (for Performance)

```sql
-- Frequently queried columns
CREATE INDEX idx_tenant_ledger_tenant_id ON tenant_ledger(tenant_id);
CREATE INDEX idx_tenant_ledger_for_period ON tenant_ledger(for_period);
CREATE INDEX idx_tenant_ledger_transaction_date ON tenant_ledger(transaction_date);
CREATE INDEX idx_tenant_rooms_tenant_id ON tenant_rooms(tenant_id);
CREATE INDEX idx_tenant_rooms_room_id ON tenant_rooms(room_id);
CREATE INDEX idx_withdrawals_date ON withdrawals(withdrawal_date);
CREATE INDEX idx_maintenance_room_id ON maintenance_requests(room_id);
```

---

## Notes

1. **ULID vs UUID**: Using ULID for IDs (sortable, URL-safe). Can use UUID if preferred.
2. **Timestamps**: Stored as ISO 8601 strings for SQLite compatibility.
3. **Currency**: Using REAL type. All amounts in base currency (INR assumed).
4. **Rent Due Date**: 1st of every month. Application logic generates rent_charge entries.
5. **Soft Deletes**: Tenants and users use `is_active` flag to preserve history.

---

## Future Considerations (Not in Current Scope)

- [ ] Role-based permissions for Admin vs Operator
- [ ] Document storage references
- [ ] Lease/agreement management
- [ ] Communication/notification logs
- [ ] Multi-landlord SaaS support
