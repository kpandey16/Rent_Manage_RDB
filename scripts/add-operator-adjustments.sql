-- Migration Script: Add operator_adjustments table
-- This allows manual adjustments to operator balance for:
-- - Setting opening balance
-- - Adding cash from external sources
-- - Removing cash for corrections
-- - Reconciliation adjustments

CREATE TABLE IF NOT EXISTS operator_adjustments (
    id TEXT PRIMARY KEY,
    amount REAL NOT NULL,
    adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('opening_balance', 'add_cash', 'remove_cash', 'reconciliation')),
    adjustment_date TEXT NOT NULL,
    notes TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_operator_adjustments_date ON operator_adjustments(adjustment_date DESC);
CREATE INDEX IF NOT EXISTS idx_operator_adjustments_type ON operator_adjustments(adjustment_type);

-- Verification: Check the new schema
-- Run: SELECT sql FROM sqlite_master WHERE name = 'operator_adjustments';
