# Performance Testing Guide - SQL Optimization

## Overview

A new SQL-optimized endpoint has been created to improve dashboard loading performance from 3-5 seconds to under 1 second. This guide explains how to test and verify the optimization before migrating.

## What Was Implemented

### New Endpoint: `/api/tenants/optimized`
- Uses pure SQL for rent calculations (instead of N+1 queries)
- Implements the same logic as existing `calculateTotalRentOwed()` and `calculateUnpaidRent()`
- Uses recursive CTEs to handle:
  - Period generation from move-in to today
  - Historical rent updates
  - Multiple rooms per tenant
  - Paid vs unpaid period tracking

### Debug Mode in Dashboard
- Toggle to enable side-by-side comparison
- Shows both old and new calculation results
- Visual indicators (✓/✗) to verify accuracy
- Performance metrics display

## How to Test

### Step 1: Enable Debug Mode

1. Navigate to the **Dashboard** (home page)
2. Look for the **"Debug Mode (Compare Calculations)"** checkbox at the top
3. Check the box to enable debug mode

### Step 2: Observe the Performance Metrics

Once enabled, you'll see a blue badge showing:
```
Original: XXXms | Optimized: XXXms | Speedup: X.Xx
```

**Example:**
```
Original: 2847ms | Optimized: 342ms | Speedup: 8.3x
```

### Step 3: Compare Calculation Results

In the tenant table, you'll see two "Total Dues" columns:
- **Total Dues (Old)** - From existing TypeScript calculation
- **Total Dues (New)** - From new SQL calculation

Each row will have a badge:
- **Green ✓** - Values match (calculations are identical)
- **Red ✗** - Values don't match (needs investigation)

### Step 4: Investigate Mismatches

If you see any red ✗ badges:

1. Note the tenant name and both values
2. Check the tenant's details:
   - Number of rooms
   - Move-in dates
   - Rent update history
   - Payment records
3. You can run the SQL queries manually (see below) to debug

## Manual SQL Testing

### Test Query 1: Total Rent Owed

Replace `'TENANT_ID_HERE'` with an actual tenant ID:

```sql
WITH RECURSIVE
  tenant_rooms_data AS (
    SELECT
      tr.room_id,
      tr.move_in_date,
      COALESCE(tr.move_out_date, DATE('now')) as move_out_date
    FROM tenant_rooms tr
    WHERE tr.tenant_id = 'TENANT_ID_HERE'
      AND tr.is_active = 1
  ),
  months AS (
    SELECT
      room_id,
      DATE(SUBSTR(move_in_date, 1, 7) || '-01') as period_date,
      move_in_date,
      move_out_date
    FROM tenant_rooms_data

    UNION ALL

    SELECT
      m.room_id,
      DATE(m.period_date, '+1 month') as period_date,
      m.move_in_date,
      m.move_out_date
    FROM months m
    WHERE DATE(m.period_date, '+1 month') <= DATE(SUBSTR(m.move_out_date, 1, 7) || '-01')
  ),
  period_rents AS (
    SELECT
      m.room_id,
      STRFTIME('%Y-%m', m.period_date) as period,
      COALESCE(
        (SELECT ru.new_rent
         FROM rent_updates ru
         WHERE ru.room_id = m.room_id
           AND ru.effective_from <= m.period_date
         ORDER BY ru.effective_from DESC
         LIMIT 1),
        (SELECT ru.old_rent
         FROM rent_updates ru
         WHERE ru.room_id = m.room_id
         ORDER BY ru.effective_from ASC
         LIMIT 1),
        (SELECT r.monthly_rent FROM rooms r WHERE r.id = m.room_id)
      ) as rent_amount
    FROM months m
  )
SELECT
  SUM(rent_amount) as total_rent_owed,
  COUNT(*) as total_months,
  MIN(period) as first_period,
  MAX(period) as last_period
FROM period_rents;
```

### Test Query 2: Unpaid Rent

```sql
WITH RECURSIVE
  tenant_rooms_data AS (
    SELECT
      tr.room_id,
      tr.move_in_date,
      COALESCE(tr.move_out_date, DATE('now')) as move_out_date
    FROM tenant_rooms tr
    WHERE tr.tenant_id = 'TENANT_ID_HERE'
      AND tr.is_active = 1
  ),
  months AS (
    SELECT
      room_id,
      DATE(SUBSTR(move_in_date, 1, 7) || '-01') as period_date,
      move_in_date,
      move_out_date
    FROM tenant_rooms_data

    UNION ALL

    SELECT
      m.room_id,
      DATE(m.period_date, '+1 month') as period_date,
      m.move_in_date,
      m.move_out_date
    FROM months m
    WHERE DATE(m.period_date, '+1 month') <= DATE(SUBSTR(m.move_out_date, 1, 7) || '-01')
  ),
  period_rents AS (
    SELECT
      m.room_id,
      STRFTIME('%Y-%m', m.period_date) as period,
      COALESCE(
        (SELECT ru.new_rent
         FROM rent_updates ru
         WHERE ru.room_id = m.room_id
           AND ru.effective_from <= m.period_date
         ORDER BY ru.effective_from DESC
         LIMIT 1),
        (SELECT ru.old_rent
         FROM rent_updates ru
         WHERE ru.room_id = m.room_id
         ORDER BY ru.effective_from ASC
         LIMIT 1),
        (SELECT r.monthly_rent FROM rooms r WHERE r.id = m.room_id)
      ) as rent_amount
    FROM months m
  ),
  paid_periods AS (
    SELECT DISTINCT for_period
    FROM rent_payments
    WHERE tenant_id = 'TENANT_ID_HERE'
  )
SELECT
  SUM(pr.rent_amount) as total_unpaid_rent,
  COUNT(*) as unpaid_months,
  GROUP_CONCAT(pr.period) as unpaid_periods
FROM period_rents pr
WHERE pr.period NOT IN (SELECT for_period FROM paid_periods);
```

## Expected Results

### All Tenants Should Show ✓

If the SQL calculations are correct, **all tenants should have green ✓ badges**. This means:
- Total dues match between old and new methods
- Rent calculation logic is identical
- SQL optimization is safe to deploy

### Performance Improvement

Expected speedup: **5-10x faster**

Before: 3000-5000ms (with 1000-2000 database queries)
After: 300-700ms (with ~2 queries per tenant)

## What to Report

When testing, please share:

1. **Performance metrics:**
   - Original time: ___ms
   - Optimized time: ___ms
   - Speedup: ___x

2. **Accuracy results:**
   - Total tenants tested: ___
   - Matching results (✓): ___
   - Mismatches (✗): ___

3. **For any mismatches:**
   - Tenant name
   - Old value: ₹___
   - New value: ₹___
   - Tenant scenario (rooms, rent updates, etc.)

## Next Steps

### If All Tests Pass (All ✓)
1. Disable debug mode
2. Replace `/api/tenants` endpoint with optimized version
3. Keep old logic as fallback for 1 week
4. Monitor production
5. Remove old code if stable

### If There Are Mismatches (Any ✗)
1. Report the specific tenants with mismatches
2. Investigate root cause
3. Fix SQL query
4. Re-test until all match
5. DO NOT migrate to production

## Rollback Plan

If issues are discovered after migration:
1. Revert to previous commit
2. Old logic is still in `src/lib/rent-calculator.ts`
3. Original endpoint can be restored in minutes

## Performance Monitoring

After migration, monitor:
- Dashboard load time (should be < 1 second)
- Database query count (should be ~50-100 instead of 1000-2000)
- No changes to calculation accuracy
- User experience improvements

## Safety Notes

- ✅ Original logic is completely untouched
- ✅ Debug mode only adds comparison, doesn't modify data
- ✅ Can be disabled at any time
- ✅ No database schema changes required
- ✅ No risk to existing calculations
- ✅ New endpoint is read-only

## Questions or Issues?

If you encounter any issues during testing:
1. Take a screenshot of the debug comparison
2. Note the specific tenant(s) with issues
3. Check browser console for errors
4. Report findings before proceeding
