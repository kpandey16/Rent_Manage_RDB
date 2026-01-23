-- Migration Script: Add created_by column to tenant_ledger
-- This allows tracking which user (admin/operator) collected the payment

-- Step 1: Create new table with created_by column
CREATE TABLE tenant_ledger_new (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    transaction_date TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('payment', 'credit', 'adjustment', 'opening_balance')),
    subtype TEXT,
    amount REAL NOT NULL,
    payment_method TEXT,
    description TEXT,
    document_id TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Step 2: Copy all existing data (created_by will be NULL for old records)
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
    document_id,
    NULL as created_by,
    created_at
FROM tenant_ledger;

-- Step 3: Drop old table
DROP TABLE tenant_ledger;

-- Step 4: Rename new table to original name
ALTER TABLE tenant_ledger_new RENAME TO tenant_ledger;

-- Verification: Check the new schema
-- Run: SELECT sql FROM sqlite_master WHERE name = 'tenant_ledger';
