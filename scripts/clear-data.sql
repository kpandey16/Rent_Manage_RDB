-- ============================================================================
-- Clear Database Data Script
-- ============================================================================
-- Purpose: Deletes all data from tables while preserving schema
-- Usage: Run this SQL file against your Turso database
-- Note: app_settings table is preserved to maintain default configuration
-- ============================================================================

-- Enable foreign keys to ensure referential integrity
PRAGMA foreign_keys = ON;

-- ============================================================================
-- Delete data in order (child tables first to respect foreign keys)
-- ============================================================================

-- Audit and history tables
DELETE FROM audit_log;
DELETE FROM credit_history;

-- Payment and transaction tables
DELETE FROM rent_payments;
DELETE FROM tenant_ledger;
DELETE FROM security_deposits;

-- Maintenance and room allocation tables
DELETE FROM maintenance_requests;
DELETE FROM tenant_rooms;

-- Operator cash management tables
DELETE FROM operator_expenses;
DELETE FROM admin_withdrawals;

-- Rent history
DELETE FROM rent_updates;

-- Parent tables
DELETE FROM tenants;
DELETE FROM rooms;
DELETE FROM users;

-- ============================================================================
-- Optional: Reset app_settings to defaults (uncomment if needed)
-- ============================================================================
-- DELETE FROM app_settings;
-- INSERT INTO app_settings (key, value, description) VALUES
--     ('rent_due_day', '1', 'Day of month when rent is due'),
--     ('currency', 'INR', 'Currency code'),
--     ('currency_symbol', '₹', 'Currency symbol'),
--     ('defaulter_threshold_months', '1', 'Months overdue to be considered defaulter');

-- ============================================================================
-- Verification: Show row counts for all tables
-- ============================================================================
SELECT 'audit_log' as table_name, COUNT(*) as row_count FROM audit_log
UNION ALL
SELECT 'credit_history', COUNT(*) FROM credit_history
UNION ALL
SELECT 'rent_payments', COUNT(*) FROM rent_payments
UNION ALL
SELECT 'tenant_ledger', COUNT(*) FROM tenant_ledger
UNION ALL
SELECT 'security_deposits', COUNT(*) FROM security_deposits
UNION ALL
SELECT 'maintenance_requests', COUNT(*) FROM maintenance_requests
UNION ALL
SELECT 'tenant_rooms', COUNT(*) FROM tenant_rooms
UNION ALL
SELECT 'operator_expenses', COUNT(*) FROM operator_expenses
UNION ALL
SELECT 'admin_withdrawals', COUNT(*) FROM admin_withdrawals
UNION ALL
SELECT 'rent_updates', COUNT(*) FROM rent_updates
UNION ALL
SELECT 'tenants', COUNT(*) FROM tenants
UNION ALL
SELECT 'rooms', COUNT(*) FROM rooms
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'app_settings', COUNT(*) FROM app_settings;
