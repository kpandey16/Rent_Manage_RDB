#!/usr/bin/env node

/**
 * Fix CHECK constraint on tenant_ledger table
 * Adds 'adjustment' type to allowed values
 */

import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function fixConstraint() {
  console.log('🔧 Fixing CHECK constraint on tenant_ledger table...\n');

  try {
    // Step 1: Create new table with correct constraint
    console.log('1️⃣ Creating new table with updated constraint...');
    await db.execute({
      sql: `CREATE TABLE tenant_ledger_new (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        transaction_date TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('payment', 'credit', 'adjustment', 'opening_balance')),
        subtype TEXT,
        amount REAL NOT NULL,
        payment_method TEXT,
        description TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      )`,
      args: [],
    });

    // Step 2: Copy all data from old table
    console.log('2️⃣ Copying data from old table...');
    await db.execute({
      sql: `INSERT INTO tenant_ledger_new
            SELECT id, tenant_id, transaction_date, type, subtype, amount, payment_method, description, created_at
            FROM tenant_ledger`,
      args: [],
    });

    // Step 3: Drop old table
    console.log('3️⃣ Dropping old table...');
    await db.execute({
      sql: `DROP TABLE tenant_ledger`,
      args: [],
    });

    // Step 4: Rename new table
    console.log('4️⃣ Renaming new table...');
    await db.execute({
      sql: `ALTER TABLE tenant_ledger_new RENAME TO tenant_ledger`,
      args: [],
    });

    console.log('\n✅ Constraint fixed successfully!');
    console.log('📝 Allowed types: payment, credit, adjustment, opening_balance');
    console.log('\n🚀 You can now run the migration script:');
    console.log('   node scripts/migrate-transaction-types.js');

  } catch (error) {
    console.error('❌ Failed to fix constraint:', error);
    process.exit(1);
  }
}

fixConstraint();
