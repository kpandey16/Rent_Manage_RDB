-- Rent Management Database Schema for Turso (SQLite)
-- Version: 1.0.0
-- Created: 2026-01-06

-- ============================================================================
-- PRAGMA settings for SQLite/Turso
-- ============================================================================
PRAGMA foreign_keys = ON;

-- ============================================================================
-- TABLE: users
-- Admin and Operator accounts
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator')),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- TABLE: rooms
-- Properties/rentable units (R1, R2, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT,
    description TEXT,
    monthly_rent REAL NOT NULL CHECK (monthly_rent >= 0),
    status TEXT NOT NULL DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_rooms_code ON rooms(code);
CREATE INDEX idx_rooms_status ON rooms(status);

-- ============================================================================
-- TABLE: rent_updates
-- Tracks rent change history for rooms
-- ============================================================================
CREATE TABLE IF NOT EXISTS rent_updates (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    old_rent REAL CHECK (old_rent IS NULL OR old_rent >= 0),
    new_rent REAL NOT NULL CHECK (new_rent >= 0),
    effective_from TEXT NOT NULL,
    created_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_rent_updates_room_id ON rent_updates(room_id);
CREATE INDEX idx_rent_updates_effective ON rent_updates(effective_from);
CREATE INDEX idx_rent_updates_room_effective ON rent_updates(room_id, effective_from);

-- ============================================================================
-- TABLE: tenants
-- Tenant information
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_tenants_phone ON tenants(phone);
CREATE INDEX idx_tenants_is_active ON tenants(is_active);
CREATE INDEX idx_tenants_name ON tenants(name);

-- ============================================================================
-- TABLE: tenant_rooms
-- Room allocations to tenants (supports multiple rooms per tenant)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_rooms (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    move_in_date TEXT NOT NULL,
    move_out_date TEXT,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    -- Ensure a room can only be actively allocated to one tenant at a time
    UNIQUE (room_id, is_active) -- Note: Only works when is_active = 1
);

CREATE INDEX idx_tenant_rooms_tenant_id ON tenant_rooms(tenant_id);
CREATE INDEX idx_tenant_rooms_room_id ON tenant_rooms(room_id);
CREATE INDEX idx_tenant_rooms_is_active ON tenant_rooms(is_active);
CREATE INDEX idx_tenant_rooms_dates ON tenant_rooms(move_in_date, move_out_date);

-- ============================================================================
-- TABLE: tenant_ledger
-- All money coming IN - unified ledger for payments, adjustments, opening balances
-- Types:
--   payment: Cash/UPI payment received
--   deposit: Security deposit used for rent
--   credit: Accumulated credit applied to rent (amount=0, for audit)
--   discount: Ad-hoc discount given
--   maintenance: Maintenance cost credited to tenant
--   opening_balance: Migration balance (+/- for credit/dues)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_ledger (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transaction_date TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('payment', 'deposit', 'credit', 'discount', 'maintenance', 'opening_balance')),
    amount REAL NOT NULL, -- Positive for credits, negative for opening_balance dues, 0 for credit type
    payment_method TEXT CHECK (payment_method IS NULL OR payment_method IN ('cash', 'upi')),
    description TEXT,
    reference_id TEXT, -- Link to maintenance_requests, security_deposits, etc.
    created_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_tenant_ledger_tenant_id ON tenant_ledger(tenant_id);
CREATE INDEX idx_tenant_ledger_date ON tenant_ledger(transaction_date);
CREATE INDEX idx_tenant_ledger_type ON tenant_ledger(type);
CREATE INDEX idx_tenant_ledger_tenant_date ON tenant_ledger(tenant_id, transaction_date);

-- ============================================================================
-- TABLE: rent_payments
-- Tracks which rent periods are PAID - money going OUT (applied to rent)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rent_payments (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    for_period TEXT NOT NULL, -- YYYY-MM format
    rent_amount REAL NOT NULL CHECK (rent_amount > 0),
    ledger_id TEXT REFERENCES tenant_ledger(id), -- Which ledger entry triggered this
    paid_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),

    -- Ensure a tenant can only have one payment record per period
    UNIQUE (tenant_id, for_period)
);

CREATE INDEX idx_rent_payments_tenant_id ON rent_payments(tenant_id);
CREATE INDEX idx_rent_payments_period ON rent_payments(for_period);
CREATE INDEX idx_rent_payments_ledger_id ON rent_payments(ledger_id);
CREATE INDEX idx_rent_payments_paid_at ON rent_payments(paid_at);

-- ============================================================================
-- TABLE: security_deposits
-- Tracks security deposit transactions
-- Types:
--   deposit: Initial or additional deposit received
--   refund: Deposit returned to tenant (on vacation)
--   used_for_rent: Deposit used to pay rent (creates ledger entry with type='deposit')
-- ============================================================================
CREATE TABLE IF NOT EXISTS security_deposits (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'refund', 'used_for_rent')),
    amount REAL NOT NULL CHECK (amount > 0),
    transaction_date TEXT NOT NULL,
    notes TEXT,
    ledger_id TEXT REFERENCES tenant_ledger(id), -- Link to ledger entry when used_for_rent
    created_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_security_deposits_tenant_id ON security_deposits(tenant_id);
CREATE INDEX idx_security_deposits_date ON security_deposits(transaction_date);

-- ============================================================================
-- TABLE: maintenance_requests
-- Tracks maintenance work
-- ============================================================================
CREATE TABLE IF NOT EXISTS maintenance_requests (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    tenant_id TEXT REFERENCES tenants(id), -- Who gets credit (nullable)
    description TEXT NOT NULL,
    estimated_cost REAL CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
    actual_cost REAL CHECK (actual_cost IS NULL OR actual_cost >= 0),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
    is_adjusted_in_rent INTEGER NOT NULL DEFAULT 0 CHECK (is_adjusted_in_rent IN (0, 1)),
    ledger_entry_id TEXT REFERENCES tenant_ledger(id),
    created_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT
);

CREATE INDEX idx_maintenance_room_id ON maintenance_requests(room_id);
CREATE INDEX idx_maintenance_tenant_id ON maintenance_requests(tenant_id);
CREATE INDEX idx_maintenance_status ON maintenance_requests(status);

-- ============================================================================
-- TABLE: withdrawals
-- Tracks cash withdrawals from collections
-- ============================================================================
CREATE TABLE IF NOT EXISTS withdrawals (
    id TEXT PRIMARY KEY,
    amount REAL NOT NULL CHECK (amount > 0),
    withdrawal_date TEXT NOT NULL,
    notes TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_withdrawals_date ON withdrawals(withdrawal_date);

-- ============================================================================
-- TABLE: credit_history
-- Tracks ONLY when credit is added or used (not every transaction)
-- Types:
--   credit_added: When payment creates excess after rent applied
--   credit_used: When accumulated credit is used to pay rent
-- ============================================================================
CREATE TABLE IF NOT EXISTS credit_history (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit_added', 'credit_used')),
    amount REAL NOT NULL CHECK (amount > 0), -- Always positive
    balance_before REAL NOT NULL,
    balance_after REAL NOT NULL,
    source TEXT, -- For credit_added: 'payment_excess', 'discount', 'maintenance', 'deposit', 'opening_balance'
    applied_to_period TEXT, -- For credit_used: YYYY-MM format
    ledger_id TEXT REFERENCES tenant_ledger(id),
    rent_payment_id TEXT REFERENCES rent_payments(id),
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_credit_history_tenant_id ON credit_history(tenant_id);
CREATE INDEX idx_credit_history_type ON credit_history(transaction_type);
CREATE INDEX idx_credit_history_created_at ON credit_history(created_at);

-- ============================================================================
-- ADDITIONAL FEATURE: audit_log
-- Track important actions for accountability and debugging
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    action TEXT NOT NULL, -- e.g., 'tenant.create', 'payment.receive', 'room.update_rent'
    entity_type TEXT NOT NULL, -- e.g., 'tenant', 'room', 'payment'
    entity_id TEXT, -- ID of the affected entity
    old_values TEXT, -- JSON string of old values (for updates)
    new_values TEXT, -- JSON string of new values
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- ============================================================================
-- ADDITIONAL FEATURE: app_settings
-- Key-value store for application configuration
-- ============================================================================
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_by TEXT REFERENCES users(id),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Default settings
INSERT OR IGNORE INTO app_settings (key, value, description) VALUES
    ('rent_due_day', '1', 'Day of month when rent is due'),
    ('currency', 'INR', 'Currency code'),
    ('currency_symbol', '₹', 'Currency symbol'),
    ('defaulter_threshold_months', '1', 'Months overdue to be considered defaulter');

-- ============================================================================
-- VIEW: v_tenant_balance
-- Quick view of tenant credit balance
-- ============================================================================
CREATE VIEW IF NOT EXISTS v_tenant_balance AS
SELECT
    t.id as tenant_id,
    t.name as tenant_name,
    t.phone,
    t.is_active,
    COALESCE(l.total_credits, 0) as total_credits,
    COALESCE(rp.total_applied, 0) as total_applied,
    COALESCE(l.total_credits, 0) - COALESCE(rp.total_applied, 0) as balance
FROM tenants t
LEFT JOIN (
    SELECT tenant_id, SUM(amount) as total_credits
    FROM tenant_ledger
    GROUP BY tenant_id
) l ON t.id = l.tenant_id
LEFT JOIN (
    SELECT tenant_id, SUM(rent_amount) as total_applied
    FROM rent_payments
    GROUP BY tenant_id
) rp ON t.id = rp.tenant_id;

-- ============================================================================
-- VIEW: v_room_current_status
-- Room status with current tenant info
-- ============================================================================
CREATE VIEW IF NOT EXISTS v_room_current_status AS
SELECT
    r.id as room_id,
    r.code,
    r.name as room_name,
    r.monthly_rent,
    r.status,
    t.id as tenant_id,
    t.name as tenant_name,
    t.phone as tenant_phone,
    tr.move_in_date
FROM rooms r
LEFT JOIN tenant_rooms tr ON r.id = tr.room_id AND tr.is_active = 1
LEFT JOIN tenants t ON tr.tenant_id = t.id;

-- ============================================================================
-- VIEW: v_tenant_rooms_with_rent
-- Tenant allocations with rent info
-- ============================================================================
CREATE VIEW IF NOT EXISTS v_tenant_rooms_with_rent AS
SELECT
    tr.id as allocation_id,
    tr.tenant_id,
    t.name as tenant_name,
    tr.room_id,
    r.code as room_code,
    r.monthly_rent as current_rent,
    tr.move_in_date,
    tr.move_out_date,
    tr.is_active
FROM tenant_rooms tr
JOIN tenants t ON tr.tenant_id = t.id
JOIN rooms r ON tr.room_id = r.id;

-- ============================================================================
-- VIEW: v_security_deposit_balance
-- Current security deposit balance per tenant
-- ============================================================================
CREATE VIEW IF NOT EXISTS v_security_deposit_balance AS
SELECT
    t.id as tenant_id,
    t.name as tenant_name,
    COALESCE(SUM(CASE WHEN sd.transaction_type = 'deposit' THEN sd.amount ELSE 0 END), 0) as total_deposited,
    COALESCE(SUM(CASE WHEN sd.transaction_type = 'refund' THEN sd.amount ELSE 0 END), 0) as total_refunded,
    COALESCE(SUM(CASE WHEN sd.transaction_type = 'used_for_rent' THEN sd.amount ELSE 0 END), 0) as used_for_rent,
    COALESCE(SUM(CASE
        WHEN sd.transaction_type = 'deposit' THEN sd.amount
        WHEN sd.transaction_type IN ('refund', 'used_for_rent') THEN -sd.amount
        ELSE 0
    END), 0) as current_balance
FROM tenants t
LEFT JOIN security_deposits sd ON t.id = sd.tenant_id
GROUP BY t.id, t.name;

-- ============================================================================
-- VIEW: v_defaulters
-- Tenants with negative balance (dues)
-- ============================================================================
CREATE VIEW IF NOT EXISTS v_defaulters AS
SELECT
    tenant_id,
    tenant_name,
    phone,
    balance as dues_amount
FROM v_tenant_balance
WHERE is_active = 1 AND balance < 0
ORDER BY balance ASC;

-- ============================================================================
-- VIEW: v_monthly_collections
-- Monthly collection summary
-- ============================================================================
CREATE VIEW IF NOT EXISTS v_monthly_collections AS
SELECT
    strftime('%Y-%m', transaction_date) as month,
    SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END) as total_payments,
    SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) as total_from_deposits,
    SUM(CASE WHEN type = 'discount' THEN amount ELSE 0 END) as total_discounts,
    SUM(CASE WHEN type = 'maintenance' THEN amount ELSE 0 END) as total_maintenance,
    COUNT(DISTINCT tenant_id) as unique_tenants
FROM tenant_ledger
WHERE type NOT IN ('opening_balance', 'credit')
GROUP BY strftime('%Y-%m', transaction_date)
ORDER BY month DESC;

-- ============================================================================
-- VIEW: v_withdrawal_summary
-- Withdrawal summary by period
-- ============================================================================
CREATE VIEW IF NOT EXISTS v_withdrawal_summary AS
SELECT
    strftime('%Y-%m', withdrawal_date) as month,
    SUM(amount) as total_withdrawn,
    COUNT(*) as withdrawal_count
FROM withdrawals
GROUP BY strftime('%Y-%m', withdrawal_date)
ORDER BY month DESC;

-- ============================================================================
-- VIEW: v_credit_history
-- Credit balance timeline for tenants (only credit additions and usage)
-- ============================================================================
CREATE VIEW IF NOT EXISTS v_credit_history AS
SELECT
    ch.id,
    ch.tenant_id,
    t.name as tenant_name,
    ch.transaction_type,
    ch.amount,
    ch.balance_before,
    ch.balance_after,
    ch.source,
    ch.applied_to_period,
    ch.description,
    ch.created_at
FROM credit_history ch
JOIN tenants t ON ch.tenant_id = t.id
ORDER BY ch.created_at;
