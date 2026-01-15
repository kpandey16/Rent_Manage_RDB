-- Migration Script: Add bundle_id column to tenant_ledger
-- This allows grouping related transactions (payment + adjustments) together

-- Step 1: Create new table with bundle_id column
CREATE TABLE tenant_ledger_new (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    transaction_date TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('payment', 'credit', 'adjustment', 'opening_balance')),
    subtype TEXT,
    amount REAL NOT NULL,
    payment_method TEXT,
    description TEXT,
    bundle_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Step 2: Copy all existing data (bundle_id will be NULL for old records)
INSERT INTO tenant_ledger_new
SELECT
    id,
    tenant_id,
    transaction_date,
    type,
    subtype,
    amount,
    payment_method,
    description,
    NULL as bundle_id,
    created_at
FROM tenant_ledger;

-- Step 3: Drop old table
DROP TABLE tenant_ledger;

-- Step 4: Rename new table to original name
ALTER TABLE tenant_ledger_new RENAME TO tenant_ledger;

-- Verification: Check the new schema
-- Run: SELECT sql FROM sqlite_master WHERE name = 'tenant_ledger';
