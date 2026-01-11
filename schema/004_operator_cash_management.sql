-- Operator Cash Management Schema Migration
-- Version: 1.1.0
-- Created: 2026-01-11
-- Description: Adds operator expense tracking and enhances withdrawal tracking

-- ============================================================================
-- TABLE: operator_expenses
-- Tracks expenses made by operator (maintenance, supplies, utilities, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS operator_expenses (
    id TEXT PRIMARY KEY,
    amount REAL NOT NULL CHECK (amount > 0),
    category TEXT NOT NULL CHECK (category IN ('maintenance', 'supplies', 'utilities', 'repairs', 'other')),
    description TEXT NOT NULL,
    recorded_by TEXT NOT NULL, -- Operator name (no FK for now, future: REFERENCES users(id))
    expense_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_operator_expenses_date ON operator_expenses(expense_date);
CREATE INDEX idx_operator_expenses_category ON operator_expenses(category);
CREATE INDEX idx_operator_expenses_recorded_by ON operator_expenses(recorded_by);

-- ============================================================================
-- TABLE: admin_withdrawals
-- Replaces old withdrawals table with enhanced fields
-- ============================================================================
-- Drop old table if exists (only if empty or in dev environment)
-- In production, you'd want to migrate data first
DROP TABLE IF EXISTS withdrawals;

CREATE TABLE IF NOT EXISTS admin_withdrawals (
    id TEXT PRIMARY KEY,
    amount REAL NOT NULL CHECK (amount > 0),
    withdrawal_method TEXT NOT NULL CHECK (withdrawal_method IN ('cash', 'upi', 'bank_transfer', 'mixed')),
    withdrawn_by TEXT NOT NULL, -- Admin name (no FK for now, future: REFERENCES users(id))
    withdrawal_date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_admin_withdrawals_date ON admin_withdrawals(withdrawal_date);
CREATE INDEX idx_admin_withdrawals_method ON admin_withdrawals(withdrawal_method);
CREATE INDEX idx_admin_withdrawals_withdrawn_by ON admin_withdrawals(withdrawn_by);

-- ============================================================================
-- VIEW: v_operator_cash_status
-- Shows current operator balance (collections - expenses - withdrawals)
-- ============================================================================
CREATE VIEW IF NOT EXISTS v_operator_cash_status AS
SELECT
    COALESCE(
        (SELECT SUM(amount) FROM tenant_ledger WHERE type IN ('payment', 'deposit', 'discount', 'maintenance')),
        0
    ) as total_collections,
    COALESCE(
        (SELECT SUM(amount) FROM operator_expenses),
        0
    ) as total_expenses,
    COALESCE(
        (SELECT SUM(amount) FROM admin_withdrawals),
        0
    ) as total_withdrawals,
    COALESCE(
        (SELECT SUM(amount) FROM tenant_ledger WHERE type IN ('payment', 'deposit', 'discount', 'maintenance')),
        0
    ) - COALESCE(
        (SELECT SUM(amount) FROM operator_expenses),
        0
    ) - COALESCE(
        (SELECT SUM(amount) FROM admin_withdrawals),
        0
    ) as available_balance;

-- ============================================================================
-- VIEW: v_operator_collections_by_method
-- Shows collections broken down by payment method
-- ============================================================================
CREATE VIEW IF NOT EXISTS v_operator_collections_by_method AS
SELECT
    payment_method,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount
FROM tenant_ledger
WHERE type = 'payment' AND payment_method IS NOT NULL
GROUP BY payment_method;

-- ============================================================================
-- VIEW: v_operator_expenses_by_category
-- Shows expenses broken down by category
-- ============================================================================
CREATE VIEW IF NOT EXISTS v_operator_expenses_by_category AS
SELECT
    category,
    COUNT(*) as expense_count,
    SUM(amount) as total_amount
FROM operator_expenses
GROUP BY category
ORDER BY total_amount DESC;
