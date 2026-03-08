-- Migration: Fix rollback_history constraints
-- Version: 1.0.1
-- Purpose: Remove CHECK constraints to support negative adjustments and credit-only transactions
-- Date: 2026-03-08

-- ============================================================================
-- Step 1: Create new table with corrected schema
-- ============================================================================
CREATE TABLE IF NOT EXISTS rollback_history_new (
    id TEXT PRIMARY KEY,

    -- Basic rollback info
    rollback_type TEXT NOT NULL CHECK (rollback_type IN ('payment', 'deposit', 'adjustment')),
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    performed_by TEXT NOT NULL REFERENCES users(id),
    performed_at TEXT NOT NULL DEFAULT (datetime('now')),
    reason TEXT NOT NULL,

    -- Original payment details
    payment_amount REAL NOT NULL, -- Can be negative for adjustments
    payment_method TEXT CHECK (payment_method IN ('cash', 'upi')),
    payment_date TEXT NOT NULL,
    document_id TEXT, -- If bundled with adjustments

    -- What was affected
    periods_affected TEXT NOT NULL, -- JSON array: ["2025-01", "2025-02"] or [] for credit-only
    total_rent_rolled_back REAL NOT NULL DEFAULT 0, -- Can be 0 for credit-only transactions
    adjustments_rolled_back REAL, -- Sum of adjustments (discount/maintenance) if any

    -- Complete audit: Store full deleted records as JSON
    deleted_rent_payments TEXT NOT NULL, -- JSON array of complete rent_payments records
    deleted_ledger_entries TEXT NOT NULL, -- JSON array of complete tenant_ledger records
    deleted_security_deposits TEXT, -- JSON array (if any security deposits involved)
    deleted_credit_history TEXT, -- JSON array (if any credit history involved)

    -- Operator cash impact tracking
    operator_balance_before REAL NOT NULL,
    operator_balance_after REAL NOT NULL,

    -- Future feature: restoration capability
    can_be_restored INTEGER NOT NULL DEFAULT 0 CHECK (can_be_restored IN (0, 1)),
    was_restored INTEGER NOT NULL DEFAULT 0 CHECK (was_restored IN (0, 1)),
    restored_at TEXT,
    restored_by TEXT REFERENCES users(id),

    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- Step 2: Copy existing data
-- ============================================================================
INSERT INTO rollback_history_new
SELECT * FROM rollback_history;

-- ============================================================================
-- Step 3: Drop old table and rename new table
-- ============================================================================
DROP TABLE rollback_history;
ALTER TABLE rollback_history_new RENAME TO rollback_history;

-- ============================================================================
-- Step 4: Recreate indexes
-- ============================================================================
CREATE INDEX idx_rollback_history_tenant ON rollback_history(tenant_id);
CREATE INDEX idx_rollback_history_performed_at ON rollback_history(performed_at);
CREATE INDEX idx_rollback_history_performed_by ON rollback_history(performed_by);
CREATE INDEX idx_rollback_history_type ON rollback_history(rollback_type);
CREATE INDEX idx_rollback_history_payment_date ON rollback_history(payment_date);

-- ============================================================================
-- NOTES:
-- - Removed CHECK constraint on payment_amount (now supports negative values)
-- - Removed CHECK constraint on total_rent_rolled_back (now supports 0)
-- - All existing data is preserved
-- ============================================================================
