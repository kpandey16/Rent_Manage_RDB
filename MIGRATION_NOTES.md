# Migration Notes

## Pending Migration: Add created_by to tenant_ledger

**Date**: 2026-01-22

### What it does:
Adds a `created_by` column to the `tenant_ledger` table to track which user (admin/operator) recorded each transaction.

### How to run:
```bash
node scripts/add-created-by-to-ledger.js
```

### Files:
- `scripts/add-created-by-to-ledger.sql` - SQL migration
- `scripts/add-created-by-to-ledger.js` - Migration runner script

### Important:
This migration is required for the audit tracking feature to work properly. After running the migration:
- All new transactions will automatically record who created them
- Old transactions will have `created_by` as NULL
- The "Collected by" information will be displayed in the payments and tenant detail pages

### Features added in this session:
1. **Audit Tracking**: Automatically tracks which user collected rent payments
   - API changes in `/api/transactions/route.ts`
   - UI changes in `/payments/page.tsx` and `/tenants/[id]/page.tsx`

2. **Settings Page**: User can change their password
   - New page: `/settings`
   - New API: `/api/auth/change-password`
   - Accessible from user icon dropdown in header

3. **Mobile Sticky Filters**: Filter/sort controls remain visible while scrolling on mobile
   - Fixed on: Tenants, Rooms, and Lawn Events pages
   - Uses sticky positioning for mobile, normal flow for desktop
