-- =========================================
-- DATABASE RESET SCRIPT
-- =========================================
-- This script deletes ALL DATA from all tables EXCEPT the users table
-- WARNING: This action is IRREVERSIBLE!
-- Use this script only for testing or when you need to completely reset the application data
--
-- Tables NOT affected:
--   - users (preserved to keep login credentials)
--
-- Tables that will be cleared:
--   - tenants, rooms, tenant_rooms, tenant_ledger, rent_payments
--   - security_deposits, rent_updates
--   - lawn_events, lawn_withdrawals, lawn_settings
--   - operator_expenses, operator_withdrawals
--   - admin_withdrawals (if exists)
--   - rollback_history
-- =========================================

-- Disable foreign key checks temporarily (SQLite)
PRAGMA foreign_keys = OFF;

-- =========================================
-- RENTAL MANAGEMENT TABLES
-- =========================================

-- Delete rent payment records (child of tenant_ledger)
DELETE FROM rent_payments;

-- Delete security deposit records
DELETE FROM security_deposits;

-- Delete tenant ledger entries (transactions)
DELETE FROM tenant_ledger;

-- Delete tenant room allocations (junction table)
DELETE FROM tenant_rooms;

-- Delete rent update history
DELETE FROM rent_updates;

-- Delete tenants
DELETE FROM tenants;

-- Delete rooms
DELETE FROM rooms;

-- =========================================
-- LAWN EVENTS TABLES
-- =========================================

-- Delete lawn event bookings
DELETE FROM lawn_events;

-- Delete lawn withdrawals
DELETE FROM lawn_withdrawals;

-- Delete lawn settings (opening balance)
DELETE FROM lawn_settings;

-- =========================================
-- CASH MANAGEMENT TABLES
-- =========================================

-- Delete operator expenses
DELETE FROM operator_expenses;

-- Delete operator withdrawals
DELETE FROM operator_withdrawals;

-- =========================================
-- SYSTEM TABLES
-- =========================================

-- Delete rollback history
DELETE FROM rollback_history;

-- =========================================
-- RESET SQLITE SEQUENCE (Auto-increment counters)
-- =========================================
-- This resets the internal row counters for all tables
-- Note: Only relevant if using INTEGER PRIMARY KEY autoincrement

DELETE FROM sqlite_sequence WHERE name != 'users';

-- Re-enable foreign key checks
PRAGMA foreign_keys = ON;

-- =========================================
-- VERIFICATION QUERIES
-- =========================================
-- Uncomment these to verify the reset was successful

-- SELECT 'tenants' as table_name, COUNT(*) as row_count FROM tenants
-- UNION ALL SELECT 'rooms', COUNT(*) FROM rooms
-- UNION ALL SELECT 'tenant_rooms', COUNT(*) FROM tenant_rooms
-- UNION ALL SELECT 'tenant_ledger', COUNT(*) FROM tenant_ledger
-- UNION ALL SELECT 'rent_payments', COUNT(*) FROM rent_payments
-- UNION ALL SELECT 'security_deposits', COUNT(*) FROM security_deposits
-- UNION ALL SELECT 'rent_updates', COUNT(*) FROM rent_updates
-- UNION ALL SELECT 'lawn_events', COUNT(*) FROM lawn_events
-- UNION ALL SELECT 'lawn_withdrawals', COUNT(*) FROM lawn_withdrawals
-- UNION ALL SELECT 'lawn_settings', COUNT(*) FROM lawn_settings
-- UNION ALL SELECT 'operator_expenses', COUNT(*) FROM operator_expenses
-- UNION ALL SELECT 'operator_withdrawals', COUNT(*) FROM operator_withdrawals
-- UNION ALL SELECT 'rollback_history', COUNT(*) FROM rollback_history
-- UNION ALL SELECT 'users', COUNT(*) FROM users;
