-- Rent Management - Common Queries and Application Logic
-- These are reference queries for application implementation
-- Version: 1.0.0

-- ============================================================================
-- QUERY: Get rent for a room on a specific date
-- Uses rent_updates history to find the applicable rent
-- ============================================================================
-- Parameters: :room_id, :date (YYYY-MM-DD)
/*
SELECT COALESCE(
    (SELECT new_rent FROM rent_updates
     WHERE room_id = :room_id
     AND effective_from <= :date
     ORDER BY effective_from DESC
     LIMIT 1),
    (SELECT monthly_rent FROM rooms WHERE id = :room_id)
) as rent_amount;
*/

-- ============================================================================
-- QUERY: Calculate rent due for a tenant for a specific period
-- Sum of all room rents for rooms allocated during that period
-- ============================================================================
-- Parameters: :tenant_id, :period_start (YYYY-MM-DD), :period_end (YYYY-MM-DD)
/*
SELECT SUM(
    COALESCE(
        (SELECT new_rent FROM rent_updates
         WHERE room_id = tr.room_id
         AND effective_from <= :period_start
         ORDER BY effective_from DESC
         LIMIT 1),
        (SELECT monthly_rent FROM rooms WHERE id = tr.room_id)
    )
) as rent_due
FROM tenant_rooms tr
WHERE tr.tenant_id = :tenant_id
  AND tr.move_in_date <= :period_end
  AND (tr.move_out_date IS NULL OR tr.move_out_date >= :period_start);
*/

-- ============================================================================
-- QUERY: Get tenant's credit balance
-- ============================================================================
-- Parameters: :tenant_id
/*
SELECT
    COALESCE((SELECT SUM(amount) FROM tenant_ledger WHERE tenant_id = :tenant_id), 0) -
    COALESCE((SELECT SUM(rent_amount) FROM rent_payments WHERE tenant_id = :tenant_id), 0)
AS credit_balance;
*/

-- ============================================================================
-- QUERY: Get unpaid periods for a tenant
-- Returns all periods where tenant had allocation but no rent_payment entry
-- ============================================================================
-- Parameters: :tenant_id, :from_date, :to_date
/*
WITH RECURSIVE months AS (
    SELECT :from_date as month_start
    UNION ALL
    SELECT date(month_start, '+1 month')
    FROM months
    WHERE month_start < :to_date
),
tenant_periods AS (
    SELECT DISTINCT strftime('%Y-%m', m.month_start) as period
    FROM months m
    JOIN tenant_rooms tr ON tr.tenant_id = :tenant_id
        AND tr.move_in_date <= date(m.month_start, '+1 month', '-1 day')
        AND (tr.move_out_date IS NULL OR tr.move_out_date >= m.month_start)
)
SELECT tp.period
FROM tenant_periods tp
LEFT JOIN rent_payments rp ON rp.tenant_id = :tenant_id AND rp.for_period = tp.period
WHERE rp.id IS NULL
ORDER BY tp.period;
*/

-- ============================================================================
-- QUERY: Audit timeline for a tenant
-- Complete payment history with running balance
-- ============================================================================
-- Parameters: :tenant_id
/*
SELECT
    l.id,
    l.transaction_date as date,
    l.type,
    l.amount,
    l.payment_method,
    l.description,
    GROUP_CONCAT(rp.for_period) as months_paid,
    (
        SELECT COALESCE(SUM(l2.amount), 0) FROM tenant_ledger l2
        WHERE l2.tenant_id = l.tenant_id
        AND (l2.transaction_date < l.transaction_date
             OR (l2.transaction_date = l.transaction_date AND l2.id <= l.id))
    ) - (
        SELECT COALESCE(SUM(rp2.rent_amount), 0) FROM rent_payments rp2
        WHERE rp2.tenant_id = l.tenant_id
        AND rp2.ledger_id IN (
            SELECT l3.id FROM tenant_ledger l3
            WHERE l3.tenant_id = l.tenant_id
            AND (l3.transaction_date < l.transaction_date
                 OR (l3.transaction_date = l.transaction_date AND l3.id <= l.id))
        )
    ) as running_balance
FROM tenant_ledger l
LEFT JOIN rent_payments rp ON rp.ledger_id = l.id
WHERE l.tenant_id = :tenant_id
GROUP BY l.id
ORDER BY l.transaction_date, l.id;
*/

-- ============================================================================
-- QUERY: Monthly income report
-- ============================================================================
-- Parameters: :year_month (YYYY-MM)
/*
SELECT
    SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END) as cash_collected,
    SUM(CASE WHEN type = 'discount' THEN amount ELSE 0 END) as discounts_given,
    SUM(CASE WHEN type = 'maintenance_credit' THEN amount ELSE 0 END) as maintenance_adjusted,
    (SELECT SUM(rent_amount) FROM rent_payments
     WHERE strftime('%Y-%m', paid_at) = :year_month) as rent_applied,
    (SELECT SUM(amount) FROM withdrawals
     WHERE strftime('%Y-%m', withdrawal_date) = :year_month) as withdrawals
FROM tenant_ledger
WHERE strftime('%Y-%m', transaction_date) = :year_month
  AND type != 'opening_balance';
*/

-- ============================================================================
-- QUERY: Collection rate for a period
-- ============================================================================
-- Parameters: :year_month (YYYY-MM)
/*
WITH period_stats AS (
    SELECT
        (SELECT COUNT(DISTINCT tenant_id) FROM tenant_rooms
         WHERE is_active = 1
         AND move_in_date <= date(:year_month || '-01', '+1 month', '-1 day')) as active_tenants,
        (SELECT SUM(rent_amount) FROM rent_payments
         WHERE for_period = :year_month) as rent_collected,
        (SELECT SUM(amount) FROM tenant_ledger
         WHERE type = 'payment'
         AND strftime('%Y-%m', transaction_date) = :year_month) as payments_received
)
SELECT
    active_tenants,
    rent_collected,
    payments_received,
    CASE WHEN rent_collected > 0
         THEN ROUND(rent_collected * 100.0 / (active_tenants * 5000), 2) -- Replace 5000 with actual avg rent
         ELSE 0
    END as collection_rate_pct
FROM period_stats;
*/

-- ============================================================================
-- QUERY: Defaulters list with details
-- ============================================================================
/*
SELECT
    t.id,
    t.name,
    t.phone,
    vb.balance as dues_amount,
    (SELECT GROUP_CONCAT(r.code) FROM tenant_rooms tr
     JOIN rooms r ON tr.room_id = r.id
     WHERE tr.tenant_id = t.id AND tr.is_active = 1) as rooms,
    (SELECT MAX(transaction_date) FROM tenant_ledger
     WHERE tenant_id = t.id AND type = 'payment') as last_payment_date
FROM tenants t
JOIN v_tenant_balance vb ON t.id = vb.tenant_id
WHERE t.is_active = 1 AND vb.balance < 0
ORDER BY vb.balance ASC;
*/

-- ============================================================================
-- QUERY: Withdrawal report for date range
-- ============================================================================
-- Parameters: :start_date, :end_date
/*
SELECT
    w.id,
    w.withdrawal_date,
    w.amount,
    w.notes,
    u.name as withdrawn_by,
    (SELECT SUM(amount) FROM withdrawals
     WHERE withdrawal_date <= w.withdrawal_date) as cumulative_withdrawn
FROM withdrawals w
LEFT JOIN users u ON w.created_by = u.id
WHERE w.withdrawal_date BETWEEN :start_date AND :end_date
ORDER BY w.withdrawal_date DESC;
*/

-- ============================================================================
-- QUERY: Room occupancy history
-- ============================================================================
-- Parameters: :room_id
/*
SELECT
    tr.id,
    t.name as tenant_name,
    t.phone,
    tr.move_in_date,
    tr.move_out_date,
    CASE WHEN tr.is_active = 1 THEN 'Current' ELSE 'Past' END as status,
    julianday(COALESCE(tr.move_out_date, date('now'))) - julianday(tr.move_in_date) as days_stayed
FROM tenant_rooms tr
JOIN tenants t ON tr.tenant_id = t.id
WHERE tr.room_id = :room_id
ORDER BY tr.move_in_date DESC;
*/

-- ============================================================================
-- QUERY: Tenant payment history
-- ============================================================================
-- Parameters: :tenant_id
/*
SELECT
    rp.for_period,
    rp.rent_amount,
    rp.paid_at,
    l.type as payment_source,
    l.payment_method,
    l.amount as payment_amount
FROM rent_payments rp
LEFT JOIN tenant_ledger l ON rp.ledger_id = l.id
WHERE rp.tenant_id = :tenant_id
ORDER BY rp.for_period DESC;
*/

-- ============================================================================
-- QUERY: Dashboard summary stats
-- ============================================================================
/*
SELECT
    (SELECT COUNT(*) FROM rooms WHERE status = 'occupied') as occupied_rooms,
    (SELECT COUNT(*) FROM rooms WHERE status = 'vacant') as vacant_rooms,
    (SELECT COUNT(*) FROM tenants WHERE is_active = 1) as active_tenants,
    (SELECT COUNT(*) FROM v_defaulters) as defaulters_count,
    (SELECT ABS(SUM(dues_amount)) FROM v_defaulters) as total_dues,
    (SELECT SUM(amount) FROM tenant_ledger
     WHERE type = 'payment'
     AND strftime('%Y-%m', transaction_date) = strftime('%Y-%m', 'now')) as this_month_collection,
    (SELECT SUM(amount) FROM withdrawals
     WHERE strftime('%Y-%m', withdrawal_date) = strftime('%Y-%m', 'now')) as this_month_withdrawals,
    (SELECT COUNT(*) FROM maintenance_requests WHERE status = 'open') as pending_maintenance;
*/

-- ============================================================================
-- QUERY: Rent update history for a room
-- ============================================================================
-- Parameters: :room_id
/*
SELECT
    ru.id,
    ru.old_rent,
    ru.new_rent,
    ru.effective_from,
    ru.created_at,
    u.name as updated_by,
    CASE
        WHEN ru.old_rent IS NULL THEN 'Initial rent'
        WHEN ru.new_rent > ru.old_rent THEN 'Increase'
        ELSE 'Decrease'
    END as change_type,
    CASE
        WHEN ru.old_rent IS NOT NULL AND ru.old_rent > 0
        THEN ROUND((ru.new_rent - ru.old_rent) * 100.0 / ru.old_rent, 2)
        ELSE NULL
    END as change_percentage
FROM rent_updates ru
LEFT JOIN users u ON ru.created_by = u.id
WHERE ru.room_id = :room_id
ORDER BY ru.effective_from DESC;
*/

-- ============================================================================
-- PROCEDURE-LIKE PATTERN: Apply payment to unpaid periods
-- This shows the logic to be implemented in application code
-- ============================================================================
/*
Application Logic (pseudocode):

function applyPayment(tenant_id, payment_amount, payment_method, description):
    1. Begin transaction

    2. Create ledger entry:
       INSERT INTO tenant_ledger (id, tenant_id, transaction_date, type, amount, payment_method, description, created_by)
       VALUES (new_ulid(), tenant_id, current_date, 'payment', payment_amount, payment_method, description, current_user)

       ledger_id = last_insert_id

    3. Get current credit balance:
       credit = (SUM of tenant_ledger.amount) - (SUM of rent_payments.rent_amount)

    4. Get unpaid periods (oldest first):
       periods = SELECT period FROM unpaid_periods ORDER BY period ASC

    5. For each period in periods:
       rent_due = calculate_rent_for_period(tenant_id, period)

       IF credit >= rent_due:
           INSERT INTO rent_payments (id, tenant_id, for_period, rent_amount, ledger_id, paid_at)
           VALUES (new_ulid(), tenant_id, period, rent_due, ledger_id, current_datetime)

           credit = credit - rent_due
       ELSE:
           BREAK  -- Stop, cannot afford this period

    6. Commit transaction

    7. Return:
       - ledger_id
       - periods_paid: list of periods marked as paid
       - remaining_credit: leftover credit balance
*/
