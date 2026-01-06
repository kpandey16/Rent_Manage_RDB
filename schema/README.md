# Database Schema

This folder contains the SQL schema files for the Rent Management application using Turso (SQLite).

## Files

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | Main schema with all tables, indexes, and views |
| `002_queries_and_functions.sql` | Reference queries for application implementation |
| `003_seed_data.sql` | Sample data for development/testing |

## Setup

### 1. Create Database in Turso

```bash
# Install Turso CLI (if not installed)
curl -sSfL https://get.tur.so/install.sh | bash

# Login to Turso
turso auth login

# Create database
turso db create rent-manage

# Get connection URL
turso db show rent-manage --url
```

### 2. Run Schema

```bash
# Get shell access
turso db shell rent-manage

# Run schema file
.read schema/001_initial_schema.sql

# (Optional) Load seed data for testing
.read schema/003_seed_data.sql
```

### 3. Get Connection Details for Application

```bash
# Get database URL
turso db show rent-manage --url

# Create auth token
turso db tokens create rent-manage
```

## Schema Overview

### Core Tables (12 total)

**User & Access**
- `users` - Admin/Operator accounts
- `app_settings` - Application configuration
- `audit_log` - Action tracking

**Property Management**
- `rooms` - Rentable units (R1, R2, etc.)
- `rent_updates` - Rent change history
- `maintenance_requests` - Maintenance tracking

**Tenant Management**
- `tenants` - Tenant information
- `tenant_rooms` - Room allocations
- `security_deposits` - Deposit tracking

**Financial**
- `tenant_ledger` - All money IN (payments, adjustments)
- `rent_payments` - Money OUT (applied to rent periods)
- `withdrawals` - Cash withdrawal history

### Pre-built Views (7 total)

- `v_tenant_balance` - Quick balance lookup
- `v_room_current_status` - Room status with tenant
- `v_tenant_rooms_with_rent` - Allocations with rent
- `v_security_deposit_balance` - Deposit balances
- `v_defaulters` - Tenants with dues
- `v_monthly_collections` - Monthly summary
- `v_withdrawal_summary` - Withdrawal summary

## Key Concepts

### Balance Calculation
```
Balance = SUM(tenant_ledger.amount) - SUM(rent_payments.rent_amount)

Positive = Credit/Advance
Zero     = Settled
Negative = Dues (owes money)
```

### Payment Flow
1. Payment received → Entry in `tenant_ledger`
2. Auto-apply to oldest unpaid periods (full payment only)
3. Create `rent_payments` entry for each period paid
4. Remaining amount stays as credit

### Rent Calculation
- Rent is calculated on-demand from `rent_updates` table
- Use `effective_from` date to find applicable rent for any period
- Supports rent changes mid-tenure

## Development Notes

- All IDs use ULID format (sortable, URL-safe)
- Timestamps are ISO 8601 strings
- Foreign keys are enforced (`PRAGMA foreign_keys = ON`)
- Soft deletes via `is_active` flag for tenants/users
