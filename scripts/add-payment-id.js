/**
 * Migration Script: Add payment_id column to tenant_ledger table
 *
 * This script adds a payment_id column to link adjustments to their parent payment
 * (e.g., adjustments reference the payment transaction they belong to)
 */

import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: join(__dirname, '..', '.env') });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
  try {
    console.log("🔄 Starting migration: Adding payment_id column to tenant_ledger...");

    // Check if payment_id column already exists
    const schemaCheck = await db.execute({
      sql: "SELECT sql FROM sqlite_master WHERE type='table' AND name='tenant_ledger'",
      args: [],
    });

    if (schemaCheck.rows.length === 0) {
      console.error("❌ Error: tenant_ledger table not found");
      process.exit(1);
    }

    const tableSchema = schemaCheck.rows[0].sql;
    if (tableSchema.includes('payment_id')) {
      console.log("✅ payment_id column already exists. No migration needed.");
      process.exit(0);
    }

    console.log("📋 Current schema:");
    console.log(tableSchema);
    console.log();

    // Step 1: Create new table with payment_id column
    console.log("1️⃣  Creating new table with payment_id column...");
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
        payment_id TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      )`,
      args: [],
    });
    console.log("✅ New table created");

    // Step 2: Copy all existing data
    console.log("2️⃣  Copying existing data...");
    const copyResult = await db.execute({
      sql: `INSERT INTO tenant_ledger_new
            SELECT
              id,
              tenant_id,
              transaction_date,
              type,
              subtype,
              amount,
              payment_method,
              description,
              NULL as payment_id,
              created_at
            FROM tenant_ledger`,
      args: [],
    });
    console.log(`✅ Copied ${copyResult.rowsAffected} records`);

    // Step 3: Drop old table
    console.log("3️⃣  Dropping old table...");
    await db.execute({
      sql: "DROP TABLE tenant_ledger",
      args: [],
    });
    console.log("✅ Old table dropped");

    // Step 4: Rename new table
    console.log("4️⃣  Renaming new table...");
    await db.execute({
      sql: "ALTER TABLE tenant_ledger_new RENAME TO tenant_ledger",
      args: [],
    });
    console.log("✅ Table renamed");

    // Verify the new schema
    const verifySchema = await db.execute({
      sql: "SELECT sql FROM sqlite_master WHERE type='table' AND name='tenant_ledger'",
      args: [],
    });

    console.log("\n📋 New schema:");
    console.log(verifySchema.rows[0].sql);
    console.log();

    console.log("✅ Migration completed successfully!");
    console.log("ℹ️  The payment_id column has been added to tenant_ledger table");
    console.log("ℹ️  Existing records have payment_id set to NULL");
    console.log("ℹ️  New adjustments will reference their parent payment transaction");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrate();
