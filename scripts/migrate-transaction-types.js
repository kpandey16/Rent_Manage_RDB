#!/usr/bin/env node

/**
 * Migration Script: Rationalize Transaction Types
 *
 * This script migrates existing transaction types to the new 3-type system:
 * - payment (cash received)
 * - credit (apply credit to rent)
 * - adjustment (discount, maintenance, other)
 *
 * Changes:
 * - 'discount' → 'adjustment' with '[Discount]' tag
 * - 'maintenance' → 'adjustment' with '[Maintenance]' tag
 * - Updates descriptions to include category tags
 */

import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrateTransactionTypes() {
  console.log('🔄 Starting transaction type migration...\n');

  try {
    // Get all discount transactions
    const discounts = await db.execute({
      sql: `SELECT id, description FROM tenant_ledger WHERE type = 'discount'`,
      args: [],
    });

    console.log(`📊 Found ${discounts.rows.length} discount transactions to migrate`);

    // Update discount transactions to adjustment type with subtype='discount'
    for (const row of discounts.rows) {
      // Clean description - remove [Discount] tag if present
      let cleanDesc = (row.description || 'Discount applied').toString();
      cleanDesc = cleanDesc.replace(/^\[Discount\]\s*/, '');

      await db.execute({
        sql: `UPDATE tenant_ledger SET type = 'adjustment', subtype = 'discount', description = ? WHERE id = ?`,
        args: [cleanDesc, row.id],
      });
    }

    // Get all maintenance transactions
    const maintenance = await db.execute({
      sql: `SELECT id, description FROM tenant_ledger WHERE type = 'maintenance'`,
      args: [],
    });

    console.log(`📊 Found ${maintenance.rows.length} maintenance transactions to migrate`);

    // Update maintenance transactions to adjustment type with subtype='maintenance'
    for (const row of maintenance.rows) {
      // Clean description - remove [Maintenance] tag if present
      let cleanDesc = (row.description || 'Maintenance adjustment').toString();
      cleanDesc = cleanDesc.replace(/^\[Maintenance\]\s*/, '');

      await db.execute({
        sql: `UPDATE tenant_ledger SET type = 'adjustment', subtype = 'maintenance', description = ? WHERE id = ?`,
        args: [cleanDesc, row.id],
      });
    }

    console.log('\n✅ Migration completed successfully!');
    console.log(`   - ${discounts.rows.length} discount → adjustment (subtype='discount')`);
    console.log(`   - ${maintenance.rows.length} maintenance → adjustment (subtype='maintenance')`);
    console.log('\n📝 All transactions now use 3 core types: payment, credit, adjustment');
    console.log('📝 Adjustments use subtype column for categorization');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateTransactionTypes();
