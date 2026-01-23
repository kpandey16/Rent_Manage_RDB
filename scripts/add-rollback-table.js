/**
 * Migration: Add rollback_history table
 *
 * This script creates the rollback_history table for tracking
 * payment rollbacks with complete audit trail.
 */

import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function addRollbackTable() {
  try {
    console.log("📋 Adding rollback_history table...\n");

    // Read the migration SQL file
    const migrationSQL = readFileSync(
      join(__dirname, '..', 'schema', '002_rollback_history.sql'),
      'utf-8'
    );

    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`1️⃣  Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        await db.execute({
          sql: statement,
          args: [],
        });
        console.log(`   ✓ Statement ${i + 1}/${statements.length} executed`);
      }
    }

    console.log("\n✅ rollback_history table created successfully!");
    console.log("\n" + "=".repeat(60));
    console.log("Migration completed!");
    console.log("=".repeat(60));
    console.log("\n💡 Next step: Implement rollback API and UI");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

addRollbackTable();
