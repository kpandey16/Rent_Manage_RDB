/**
 * Migration script to add lawn events management tables
 * Run with: node scripts/add-lawn-events.js
 */

import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
  console.log("🔧 Starting lawn events migration...");

  try {
    // Create lawn_events table
    console.log("Creating lawn_events table...");
    await db.execute(`
      CREATE TABLE IF NOT EXISTS lawn_events (
        id TEXT PRIMARY KEY,
        event_date TEXT NOT NULL,
        booking_amount REAL NOT NULL CHECK (booking_amount > 0),
        customer_name TEXT,
        phone TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_by TEXT REFERENCES users(id)
      )
    `);
    console.log("✅ lawn_events table created");

    // Create index on event_date
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_lawn_events_date
      ON lawn_events(event_date DESC)
    `);
    console.log("✅ Index on event_date created");

    // Create lawn_withdrawals table
    console.log("Creating lawn_withdrawals table...");
    await db.execute(`
      CREATE TABLE IF NOT EXISTS lawn_withdrawals (
        id TEXT PRIMARY KEY,
        amount REAL NOT NULL CHECK (amount > 0),
        withdrawal_date TEXT NOT NULL,
        withdrawn_by TEXT NOT NULL,
        withdrawal_method TEXT CHECK (withdrawal_method IN ('cash', 'bank_transfer', 'upi')),
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    console.log("✅ lawn_withdrawals table created");

    // Create index on withdrawal_date
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_lawn_withdrawals_date
      ON lawn_withdrawals(withdrawal_date DESC)
    `);
    console.log("✅ Index on withdrawal_date created");

    // Create lawn_settings table for opening balance
    console.log("Creating lawn_settings table...");
    await db.execute(`
      CREATE TABLE IF NOT EXISTS lawn_settings (
        key TEXT PRIMARY KEY,
        value REAL NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    console.log("✅ lawn_settings table created");

    // Insert default opening balance if not exists
    await db.execute(`
      INSERT OR IGNORE INTO lawn_settings (key, value, updated_at)
      VALUES ('opening_balance', 0, datetime('now'))
    `);
    console.log("✅ Default opening balance set");

    console.log("\n🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrate();
