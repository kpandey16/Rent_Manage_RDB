-- Migration: Add rollback_history table
-- Version: 1.0.0
-- Purpose: Track all rolled-back payment transactions with complete audit trail

-- ============================================================================
-- TABLE: rollback_history
-- Tracks all payment rollbacks with complete record of deleted data
-- ============================================================================
CREATE TABLE IF NOT EXISTS rollback_history (
    id TEXT PRIMARY KEY,

    -- Basic rollback info
    rollback_type TEXT NOT NULL CHECK (rollback_type IN ('payment', 'deposit', 'adjustment')),
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    performed_by TEXT NOT NULL REFERENCES users(id),
    performed_at TEXT NOT NULL DEFAULT (datetime('now')),
    reason TEXT NOT NULL,

    -- Original payment details
    payment_amount REAL NOT NULL CHECK (payment_amount > 0),
    payment_method TEXT CHECK (payment_method IN ('cash', 'upi')),
    payment_date TEXT NOT NULL,
    document_id TEXT, -- If bundled with adjustments

    -- What was affected
    periods_affected TEXT NOT NULL, -- JSON array: ["2025-01", "2025-02"]
    total_rent_rolled_back REAL NOT NULL CHECK (total_rent_rolled_back > 0),
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

-- Indexes for efficient querying
CREATE INDEX idx_rollback_history_tenant ON rollback_history(tenant_id);
CREATE INDEX idx_rollback_history_performed_at ON rollback_history(performed_at);
CREATE INDEX idx_rollback_history_performed_by ON rollback_history(performed_by);
CREATE INDEX idx_rollback_history_type ON rollback_history(rollback_type);
CREATE INDEX idx_rollback_history_payment_date ON rollback_history(payment_date);

-- ============================================================================
-- NOTES:
-- - All deleted records are stored as complete JSON for full audit trail
-- - This table is append-only (no updates except for restoration)
-- - Can reconstruct exact state before rollback from JSON fields
-- - Operator balance tracking helps verify cash flow integrity
-- ============================================================================
