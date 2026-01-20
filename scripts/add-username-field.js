/**
 * Migration: Add username field to users table
 *
 * This script adds a username field to the existing users table
 * for authentication purposes.
 */

import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function addUsernameField() {
  try {
    console.log("🔧 Adding username field to users table...\n");

    // Step 1: Add username column
    console.log("1️⃣  Adding username column...");
    await db.execute({
      sql: "ALTER TABLE users ADD COLUMN username TEXT UNIQUE",
      args: [],
    });
    console.log("✅ Username column added");

    // Step 2: Create index on username
    console.log("2️⃣  Creating index on username...");
    await db.execute({
      sql: "CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)",
      args: [],
    });
    console.log("✅ Index created");

    console.log("\n" + "=".repeat(60));
    console.log("✅ Migration completed successfully!");
    console.log("=".repeat(60));
    console.log("\n💡 Next step: Run setup-auth.js to seed users");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

addUsernameField();
