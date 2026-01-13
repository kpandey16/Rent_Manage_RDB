#!/usr/bin/env node

/**
 * Clear Database Script
 * Deletes all data from tables while preserving schema and app settings
 * Use this to start with a fresh database for testing
 */

const { createClient } = require("@libsql/client");
const readline = require("readline");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function clearDatabase() {
  console.log("🗑️  Database Clear Script");
  console.log("========================\n");
  console.log("⚠️  WARNING: This will DELETE ALL DATA from the database!");
  console.log("Schema and app_settings will be preserved.\n");

  // Prompt for confirmation
  rl.question("Are you sure you want to continue? (yes/no): ", async (answer) => {
    if (answer.toLowerCase() !== "yes") {
      console.log("\n❌ Operation cancelled.");
      rl.close();
      process.exit(0);
    }

    try {
      const db = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });

      console.log("\n🔄 Connecting to database...");

      // Delete data in order (respecting foreign key constraints)
      const tables = [
        // Delete child tables first
        "audit_log",
        "credit_history",
        "rent_payments",
        "tenant_ledger",
        "security_deposits",
        "maintenance_requests",
        "tenant_rooms",
        "operator_expenses",
        "admin_withdrawals",
        "rent_updates",

        // Delete parent tables
        "tenants",
        "rooms",
        "users",
      ];

      console.log("\n🗑️  Deleting data from tables...\n");

      let totalDeleted = 0;

      for (const table of tables) {
        try {
          const countResult = await db.execute({
            sql: `SELECT COUNT(*) as count FROM ${table}`,
            args: [],
          });
          const count = Number(countResult.rows[0].count);

          if (count > 0) {
            await db.execute({
              sql: `DELETE FROM ${table}`,
              args: [],
            });
            console.log(`✓ Deleted ${count} rows from ${table}`);
            totalDeleted += count;
          } else {
            console.log(`- ${table} was already empty`);
          }
        } catch (error) {
          console.error(`✗ Error deleting from ${table}:`, error.message);
        }
      }

      console.log(`\n✅ Database cleared successfully!`);
      console.log(`📊 Total rows deleted: ${totalDeleted}`);
      console.log(`\nℹ️  Schema and app_settings have been preserved.`);

      rl.close();
      process.exit(0);
    } catch (error) {
      console.error("\n❌ Error clearing database:", error);
      rl.close();
      process.exit(1);
    }
  });
}

clearDatabase();
