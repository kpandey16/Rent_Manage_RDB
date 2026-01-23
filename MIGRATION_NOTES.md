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

---

## Database Reset Script

**Files**: `scripts/reset_db.sql` and `scripts/reset_db.js`

### What it does:
Deletes ALL data from the database EXCEPT the users table. This is useful for:
- Testing with clean data
- Resetting a development environment
- Starting fresh while keeping login credentials

### How to run:
```bash
node scripts/reset_db.js
```

### Safety Features:
- **Double confirmation required** - You must type "DELETE ALL DATA" to proceed
- **Users table is preserved** - Login credentials remain intact
- **Verification report** - Shows row counts after reset

### What gets deleted:
- All tenants and their records
- All rooms and allocations
- All transactions and payments
- All security deposits
- All lawn events and withdrawals
- All cash management records
- All rollback history

### What is preserved:
- Users table (login credentials)

⚠️ **WARNING**: This action is IRREVERSIBLE! Only use in development or when you're absolutely sure.

---

## Features Added in This Session

### 1. Audit Tracking
Automatically tracks which user collected rent payments
- API changes in `/api/transactions/route.ts`
- UI changes in `/payments/page.tsx` and `/tenants/[id]/page.tsx`

### 2. Settings Page
User can change their password
- New page: `/settings`
- New API: `/api/auth/change-password`
- Accessible from user icon dropdown in header

### 3. Mobile Sticky Filters
Filter/sort controls remain visible while scrolling on mobile
- Fixed on: Tenants, Rooms, Lawn Events, and Dashboard pages
- Uses sticky positioning for mobile, normal flow for desktop

### 4. Edit Tenant Details
Edit tenant name, phone, and email
- API: `PUT /api/tenants/[id]`
- Component: `EditTenantForm`
- Edit button on tenant detail page

### 5. Edit Room Details
Edit room code, name, and description
- API: `PUT /api/rooms/[id]`
- Component: `EditRoomForm`
- Edit button on room detail page
