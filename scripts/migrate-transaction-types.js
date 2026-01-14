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

    // Update discount transactions
    for (const row of discounts.rows) {
      const currentDesc = row.description || 'Discount applied';
      const newDesc = currentDesc.startsWith('[Discount]')
        ? currentDesc
        : `[Discount] ${currentDesc}`;

      await db.execute({
        sql: `UPDATE tenant_ledger SET type = 'adjustment', description = ? WHERE id = ?`,
        args: [newDesc, row.id],
      });
    }

    // Get all maintenance transactions
    const maintenance = await db.execute({
      sql: `SELECT id, description FROM tenant_ledger WHERE type = 'maintenance'`,
      args: [],
    });

    console.log(`📊 Found ${maintenance.rows.length} maintenance transactions to migrate`);

    // Update maintenance transactions
    for (const row of maintenance.rows) {
      const currentDesc = row.description || 'Maintenance adjustment';
      const newDesc = currentDesc.startsWith('[Maintenance]')
        ? currentDesc
        : `[Maintenance] ${currentDesc}`;

      await db.execute({
        sql: `UPDATE tenant_ledger SET type = 'adjustment', description = ? WHERE id = ?`,
        args: [newDesc, row.id],
      });
    }

    console.log('\n✅ Migration completed successfully!');
    console.log(`   - ${discounts.rows.length} discount → adjustment`);
    console.log(`   - ${maintenance.rows.length} maintenance → adjustment`);
    console.log('\n📝 All transactions now use 3 core types: payment, credit, adjustment');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateTransactionTypes();
