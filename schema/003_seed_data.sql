-- Rent Management - Sample Seed Data for Testing
-- Version: 1.0.0
-- WARNING: This is for development/testing only. Do not run in production.

-- ============================================================================
-- Sample Users
-- ============================================================================
INSERT INTO users (id, name, email, password_hash, role, is_active) VALUES
    ('01HQXYZ001USER00ADMIN001', 'Admin User', 'admin@rentmanage.com', '$2b$10$placeholder_hash_admin', 'admin', 1),
    ('01HQXYZ002USER00OPER0001', 'Operator One', 'operator1@rentmanage.com', '$2b$10$placeholder_hash_op1', 'operator', 1),
    ('01HQXYZ003USER00OPER0002', 'Operator Two', 'operator2@rentmanage.com', '$2b$10$placeholder_hash_op2', 'operator', 1);

-- ============================================================================
-- Sample Rooms (Properties)
-- ============================================================================
INSERT INTO rooms (id, code, name, description, monthly_rent, status) VALUES
    ('01HQXYZ010ROOM00000001', 'R1', 'Room 1', 'Ground floor, 2BHK', 5000.00, 'occupied'),
    ('01HQXYZ010ROOM00000002', 'R2', 'Room 2', 'Ground floor, 1BHK', 4000.00, 'occupied'),
    ('01HQXYZ010ROOM00000003', 'R3', 'Room 3', 'First floor, 2BHK', 5500.00, 'occupied'),
    ('01HQXYZ010ROOM00000004', 'R4', 'Room 4', 'First floor, 1BHK', 4000.00, 'vacant'),
    ('01HQXYZ010ROOM00000005', 'R5', 'Room 5', 'Second floor, 2BHK', 6000.00, 'occupied'),
    ('01HQXYZ010ROOM00000006', 'R6', 'Room 6', 'Second floor, 1BHK', 4500.00, 'vacant');

-- ============================================================================
-- Rent Updates (Initial rent entries)
-- ============================================================================
INSERT INTO rent_updates (id, room_id, old_rent, new_rent, effective_from, created_by) VALUES
    ('01HQXYZ020RENT00000001', '01HQXYZ010ROOM00000001', NULL, 5000.00, '2024-01-01', '01HQXYZ001USER00ADMIN001'),
    ('01HQXYZ020RENT00000002', '01HQXYZ010ROOM00000002', NULL, 4000.00, '2024-01-01', '01HQXYZ001USER00ADMIN001'),
    ('01HQXYZ020RENT00000003', '01HQXYZ010ROOM00000003', NULL, 5000.00, '2024-01-01', '01HQXYZ001USER00ADMIN001'),
    ('01HQXYZ020RENT00000004', '01HQXYZ010ROOM00000004', NULL, 4000.00, '2024-01-01', '01HQXYZ001USER00ADMIN001'),
    ('01HQXYZ020RENT00000005', '01HQXYZ010ROOM00000005', NULL, 5500.00, '2024-01-01', '01HQXYZ001USER00ADMIN001'),
    ('01HQXYZ020RENT00000006', '01HQXYZ010ROOM00000006', NULL, 4500.00, '2024-01-01', '01HQXYZ001USER00ADMIN001');

-- Room R3 had a rent increase in June 2024
INSERT INTO rent_updates (id, room_id, old_rent, new_rent, effective_from, created_by) VALUES
    ('01HQXYZ020RENT00000007', '01HQXYZ010ROOM00000003', 5000.00, 5500.00, '2024-06-01', '01HQXYZ001USER00ADMIN001');

-- ============================================================================
-- Sample Tenants
-- ============================================================================
INSERT INTO tenants (id, name, phone, address, is_active) VALUES
    ('01HQXYZ030TENANT000001', 'Rahul Sharma', '9876543210', '123 MG Road, Delhi', 1),
    ('01HQXYZ030TENANT000002', 'Priya Patel', '9876543211', '456 Gandhi Nagar, Mumbai', 1),
    ('01HQXYZ030TENANT000003', 'Amit Kumar', '9876543212', '789 Nehru Street, Bangalore', 1),
    ('01HQXYZ030TENANT000004', 'Sneha Gupta', '9876543213', '321 Tagore Lane, Kolkata', 1),
    ('01HQXYZ030TENANT000005', 'Vikram Singh', '9876543214', '654 Ambedkar Road, Chennai', 0); -- Vacated tenant

-- ============================================================================
-- Tenant Room Allocations
-- ============================================================================
-- Rahul Sharma has 2 rooms (R1 and R3)
INSERT INTO tenant_rooms (id, tenant_id, room_id, move_in_date, move_out_date, is_active) VALUES
    ('01HQXYZ040ALLOC0000001', '01HQXYZ030TENANT000001', '01HQXYZ010ROOM00000001', '2024-01-15', NULL, 1),
    ('01HQXYZ040ALLOC0000002', '01HQXYZ030TENANT000001', '01HQXYZ010ROOM00000003', '2024-03-01', NULL, 1);

-- Priya Patel has R2
INSERT INTO tenant_rooms (id, tenant_id, room_id, move_in_date, move_out_date, is_active) VALUES
    ('01HQXYZ040ALLOC0000003', '01HQXYZ030TENANT000002', '01HQXYZ010ROOM00000002', '2024-02-01', NULL, 1);

-- Amit Kumar has R5
INSERT INTO tenant_rooms (id, tenant_id, room_id, move_in_date, move_out_date, is_active) VALUES
    ('01HQXYZ040ALLOC0000004', '01HQXYZ030TENANT000003', '01HQXYZ010ROOM00000005', '2024-01-01', NULL, 1);

-- Sneha Gupta has R4 (but inactive/vacated example) - for future use
-- Vikram Singh had R6 but vacated
INSERT INTO tenant_rooms (id, tenant_id, room_id, move_in_date, move_out_date, is_active) VALUES
    ('01HQXYZ040ALLOC0000005', '01HQXYZ030TENANT000005', '01HQXYZ010ROOM00000006', '2024-01-01', '2024-06-30', 0);

-- ============================================================================
-- Security Deposits
-- ============================================================================
INSERT INTO security_deposits (id, tenant_id, transaction_type, amount, transaction_date, notes, created_by) VALUES
    ('01HQXYZ050DEPOSIT00001', '01HQXYZ030TENANT000001', 'deposit', 15000.00, '2024-01-15', 'Initial deposit for R1', '01HQXYZ002USER00OPER0001'),
    ('01HQXYZ050DEPOSIT00002', '01HQXYZ030TENANT000001', 'deposit', 10000.00, '2024-03-01', 'Additional deposit for R3', '01HQXYZ002USER00OPER0001'),
    ('01HQXYZ050DEPOSIT00003', '01HQXYZ030TENANT000002', 'deposit', 8000.00, '2024-02-01', 'Initial deposit', '01HQXYZ002USER00OPER0001'),
    ('01HQXYZ050DEPOSIT00004', '01HQXYZ030TENANT000003', 'deposit', 12000.00, '2024-01-01', 'Initial deposit', '01HQXYZ002USER00OPER0001'),
    ('01HQXYZ050DEPOSIT00005', '01HQXYZ030TENANT000005', 'deposit', 9000.00, '2024-01-01', 'Initial deposit', '01HQXYZ002USER00OPER0001'),
    ('01HQXYZ050DEPOSIT00006', '01HQXYZ030TENANT000005', 'refund', 9000.00, '2024-06-30', 'Refund on vacation', '01HQXYZ002USER00OPER0001');

-- ============================================================================
-- Tenant Ledger - Payments and Adjustments
-- ============================================================================

-- Rahul Sharma payments (has 2 rooms, rent = 5000 + 5500 = 10500 from June)
INSERT INTO tenant_ledger (id, tenant_id, transaction_date, type, amount, payment_method, description, created_by) VALUES
    -- Opening balance (had some dues from previous system)
    ('01HQXYZ060LEDGER00001', '01HQXYZ030TENANT000001', '2024-01-01', 'opening_balance', -5000.00, NULL, 'Dues from previous system', '01HQXYZ001USER00ADMIN001'),
    -- Payments
    ('01HQXYZ060LEDGER00002', '01HQXYZ030TENANT000001', '2024-01-20', 'payment', 10000.00, 'cash', 'Jan payment', '01HQXYZ002USER00OPER0001'),
    ('01HQXYZ060LEDGER00003', '01HQXYZ030TENANT000001', '2024-02-05', 'payment', 5000.00, 'upi', 'Feb payment', '01HQXYZ002USER00OPER0001'),
    ('01HQXYZ060LEDGER00004', '01HQXYZ030TENANT000001', '2024-03-10', 'payment', 11000.00, 'cash', 'Mar payment (2 rooms)', '01HQXYZ002USER00OPER0001'),
    ('01HQXYZ060LEDGER00005', '01HQXYZ030TENANT000001', '2024-04-05', 'payment', 10000.00, 'upi', 'Apr payment', '01HQXYZ002USER00OPER0001'),
    ('01HQXYZ060LEDGER00006', '01HQXYZ030TENANT000001', '2024-04-15', 'discount', 500.00, NULL, 'Festival discount', '01HQXYZ001USER00ADMIN001');

-- Priya Patel payments (R2 = 4000/month)
INSERT INTO tenant_ledger (id, tenant_id, transaction_date, type, amount, payment_method, description, created_by) VALUES
    ('01HQXYZ060LEDGER00010', '01HQXYZ030TENANT000002', '2024-02-05', 'payment', 4000.00, 'cash', 'Feb payment', '01HQXYZ002USER00OPER0001'),
    ('01HQXYZ060LEDGER00011', '01HQXYZ030TENANT000002', '2024-03-03', 'payment', 4000.00, 'upi', 'Mar payment', '01HQXYZ002USER00OPER0001'),
    ('01HQXYZ060LEDGER00012', '01HQXYZ030TENANT000002', '2024-04-08', 'payment', 4000.00, 'cash', 'Apr payment', '01HQXYZ002USER00OPER0001'),
    ('01HQXYZ060LEDGER00013', '01HQXYZ030TENANT000002', '2024-05-05', 'payment', 8000.00, 'upi', 'May-Jun advance payment', '01HQXYZ002USER00OPER0001');

-- Amit Kumar payments (R5 = 6000/month) - Has some dues
INSERT INTO tenant_ledger (id, tenant_id, transaction_date, type, amount, payment_method, description, created_by) VALUES
    ('01HQXYZ060LEDGER00020', '01HQXYZ030TENANT000003', '2024-01-10', 'payment', 6000.00, 'cash', 'Jan payment', '01HQXYZ002USER00OPER0001'),
    ('01HQXYZ060LEDGER00021', '01HQXYZ030TENANT000003', '2024-02-15', 'payment', 6000.00, 'upi', 'Feb payment', '01HQXYZ002USER00OPER0001'),
    ('01HQXYZ060LEDGER00022', '01HQXYZ030TENANT000003', '2024-03-20', 'payment', 3000.00, 'cash', 'Partial Mar payment', '01HQXYZ002USER00OPER0001'),
    ('01HQXYZ060LEDGER00023', '01HQXYZ030TENANT000003', '2024-04-10', 'maintenance_credit', 1000.00, NULL, 'Plumbing repair by tenant', '01HQXYZ002USER00OPER0001');

-- ============================================================================
-- Rent Payments (periods marked as paid)
-- ============================================================================

-- Rahul Sharma rent payments
INSERT INTO rent_payments (id, tenant_id, for_period, rent_amount, ledger_id, paid_at) VALUES
    ('01HQXYZ070RENTPAY00001', '01HQXYZ030TENANT000001', '2024-01', 5000.00, '01HQXYZ060LEDGER00002', '2024-01-20'),
    ('01HQXYZ070RENTPAY00002', '01HQXYZ030TENANT000001', '2024-02', 5000.00, '01HQXYZ060LEDGER00003', '2024-02-05'),
    ('01HQXYZ070RENTPAY00003', '01HQXYZ030TENANT000001', '2024-03', 10000.00, '01HQXYZ060LEDGER00004', '2024-03-10'),
    ('01HQXYZ070RENTPAY00004', '01HQXYZ030TENANT000001', '2024-04', 10000.00, '01HQXYZ060LEDGER00005', '2024-04-05');

-- Priya Patel rent payments
INSERT INTO rent_payments (id, tenant_id, for_period, rent_amount, ledger_id, paid_at) VALUES
    ('01HQXYZ070RENTPAY00010', '01HQXYZ030TENANT000002', '2024-02', 4000.00, '01HQXYZ060LEDGER00010', '2024-02-05'),
    ('01HQXYZ070RENTPAY00011', '01HQXYZ030TENANT000002', '2024-03', 4000.00, '01HQXYZ060LEDGER00011', '2024-03-03'),
    ('01HQXYZ070RENTPAY00012', '01HQXYZ030TENANT000002', '2024-04', 4000.00, '01HQXYZ060LEDGER00012', '2024-04-08'),
    ('01HQXYZ070RENTPAY00013', '01HQXYZ030TENANT000002', '2024-05', 4000.00, '01HQXYZ060LEDGER00013', '2024-05-05'),
    ('01HQXYZ070RENTPAY00014', '01HQXYZ030TENANT000002', '2024-06', 4000.00, '01HQXYZ060LEDGER00013', '2024-05-05');

-- Amit Kumar rent payments (only Jan and Feb paid, Mar onwards pending)
INSERT INTO rent_payments (id, tenant_id, for_period, rent_amount, ledger_id, paid_at) VALUES
    ('01HQXYZ070RENTPAY00020', '01HQXYZ030TENANT000003', '2024-01', 6000.00, '01HQXYZ060LEDGER00020', '2024-01-10'),
    ('01HQXYZ070RENTPAY00021', '01HQXYZ030TENANT000003', '2024-02', 6000.00, '01HQXYZ060LEDGER00021', '2024-02-15');

-- ============================================================================
-- Maintenance Requests
-- ============================================================================
INSERT INTO maintenance_requests (id, room_id, tenant_id, description, estimated_cost, actual_cost, status, is_adjusted_in_rent, ledger_entry_id, created_by) VALUES
    ('01HQXYZ080MAINT0000001', '01HQXYZ010ROOM00000005', '01HQXYZ030TENANT000003', 'Plumbing repair in bathroom', 1500.00, 1000.00, 'resolved', 1, '01HQXYZ060LEDGER00023', '01HQXYZ002USER00OPER0001'),
    ('01HQXYZ080MAINT0000002', '01HQXYZ010ROOM00000001', NULL, 'Electrical wiring check', 500.00, NULL, 'open', 0, NULL, '01HQXYZ002USER00OPER0001'),
    ('01HQXYZ080MAINT0000003', '01HQXYZ010ROOM00000003', NULL, 'AC servicing', 800.00, 750.00, 'resolved', 0, NULL, '01HQXYZ002USER00OPER0001');

-- ============================================================================
-- Withdrawals
-- ============================================================================
INSERT INTO withdrawals (id, amount, withdrawal_date, notes, created_by) VALUES
    ('01HQXYZ090WITHDRAW0001', 20000.00, '2024-01-25', 'Weekly collection withdrawal', '01HQXYZ001USER00ADMIN001'),
    ('01HQXYZ090WITHDRAW0002', 15000.00, '2024-02-10', 'Weekly collection withdrawal', '01HQXYZ001USER00ADMIN001'),
    ('01HQXYZ090WITHDRAW0003', 25000.00, '2024-02-25', 'Monthly expenses withdrawal', '01HQXYZ001USER00ADMIN001'),
    ('01HQXYZ090WITHDRAW0004', 18000.00, '2024-03-15', 'Weekly collection withdrawal', '01HQXYZ001USER00ADMIN001'),
    ('01HQXYZ090WITHDRAW0005', 22000.00, '2024-04-01', 'Monthly withdrawal', '01HQXYZ001USER00ADMIN001');

-- ============================================================================
-- Audit Log Samples
-- ============================================================================
INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, new_values, created_at) VALUES
    ('01HQXYZ100AUDIT0000001', '01HQXYZ001USER00ADMIN001', 'tenant.create', 'tenant', '01HQXYZ030TENANT000001', '{"name":"Rahul Sharma","phone":"9876543210"}', '2024-01-15 10:00:00'),
    ('01HQXYZ100AUDIT0000002', '01HQXYZ002USER00OPER0001', 'payment.receive', 'tenant_ledger', '01HQXYZ060LEDGER00002', '{"amount":10000,"method":"cash"}', '2024-01-20 11:30:00'),
    ('01HQXYZ100AUDIT0000003', '01HQXYZ001USER00ADMIN001', 'room.update_rent', 'room', '01HQXYZ010ROOM00000003', '{"old_rent":5000,"new_rent":5500}', '2024-06-01 09:00:00');

-- ============================================================================
-- Verification Queries (run after seed to verify data)
-- ============================================================================
/*
-- Check tenant balances
SELECT * FROM v_tenant_balance;

-- Check room status
SELECT * FROM v_room_current_status;

-- Check defaulters
SELECT * FROM v_defaulters;

-- Check monthly collections
SELECT * FROM v_monthly_collections;

-- Check security deposit balances
SELECT * FROM v_security_deposit_balance;
*/
