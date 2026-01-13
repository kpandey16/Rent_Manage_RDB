# Database Scripts

This directory contains utility scripts for database management.

## Clear Database Scripts

**Purpose:** Deletes all data from the database while preserving the schema and app settings.

**Use case:** Starting with a fresh database for testing without having to recreate the schema.

### Option 1: SQL File (Recommended for Direct Execution)

**File:** `clear-data.sql`

Run this SQL file directly against your Turso database:

```bash
# Using turso CLI
turso db shell <your-database-name> < scripts/clear-data.sql

# Or copy-paste the SQL commands directly into the Turso web console
```

**What it does:**
- Deletes all data from tables in the correct order
- Shows verification query at the end with row counts
- Preserves app_settings by default
- Simple, no dependencies required

### Option 2: Node.js Script (Interactive with Confirmation)

**File:** `clear-database.js`

Run the script using npm:

```bash
npm run db:clear
```

Or directly with node:

```bash
node scripts/clear-database.js
```

### What it does

1. **Prompts for confirmation** - You must type `yes` to proceed
2. **Deletes all data** from the following tables (in order):
   - audit_log
   - credit_history
   - rent_payments
   - tenant_ledger
   - security_deposits
   - maintenance_requests
   - tenant_rooms
   - operator_expenses
   - admin_withdrawals
   - rent_updates
   - tenants
   - rooms
   - users

3. **Preserves:**
   - Database schema (all tables, indexes, views)
   - app_settings table (default configuration)

### Safety Features

- **Confirmation required:** You must explicitly type "yes" to proceed
- **Foreign key order:** Deletes child tables before parent tables to avoid constraint violations
- **Schema preservation:** Only data is deleted, not the table structure
- **Settings preservation:** Application settings remain intact

### Example Output

```
🗑️  Database Clear Script
========================

⚠️  WARNING: This will DELETE ALL DATA from the database!
Schema and app_settings will be preserved.

Are you sure you want to continue? (yes/no): yes

🔄 Connecting to database...

🗑️  Deleting data from tables...

✓ Deleted 15 rows from tenant_ledger
✓ Deleted 8 rows from rent_payments
✓ Deleted 5 rows from tenants
✓ Deleted 10 rows from rooms
- audit_log was already empty

✅ Database cleared successfully!
📊 Total rows deleted: 38

ℹ️  Schema and app_settings have been preserved.
```

### Requirements

- Node.js installed
- `.env.local` file with database credentials:
  - `TURSO_DATABASE_URL`
  - `TURSO_AUTH_TOKEN`

### Notes

- This script is safe to run in development and testing environments
- Use with caution in production environments
- Consider backing up data before running if needed
