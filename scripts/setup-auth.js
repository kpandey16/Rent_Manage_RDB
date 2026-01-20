/**
 * Setup Authentication - Seed initial users
 *
 * This script:
 * 1. Checks if the users table exists (should be created via schema migration)
 * 2. Seeds two initial users: admin and operator
 *
 * Default credentials:
 * - Username: admin, Password: admin123
 * - Username: operator, Password: operator123
 *
 * IMPORTANT: Change these passwords after first login!
 */

import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function setupAuth() {
  try {
    console.log("🔐 Setting up authentication...\n");

    // Step 1: Check if users already exist
    console.log("1️⃣  Checking for existing users...");
    const existingUsers = await db.execute({
      sql: "SELECT COUNT(*) as count FROM users",
      args: [],
    });

    const userCount = Number(existingUsers.rows[0].count);

    if (userCount > 0) {
      console.log(`⚠️  Found ${userCount} existing user(s). Skipping seed.`);
      console.log("   To reset users, delete them manually and run this script again.");
      return;
    }

    // Step 2: Create admin user
    console.log("2️⃣  Creating admin user...");
    const adminPassword = "admin123";
    const adminHash = await bcrypt.hash(adminPassword, 10);
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO users (id, name, email, username, password_hash, role, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'admin', 1, ?, ?)`,
      args: [randomUUID(), "Admin User", "admin@app.com", "admin", adminHash, now, now],
    });
    console.log("✅ Admin user created");
    console.log("   Username: admin");
    console.log("   Password: admin123");

    // Step 3: Create operator user
    console.log("3️⃣  Creating operator user...");
    const operatorPassword = "operator123";
    const operatorHash = await bcrypt.hash(operatorPassword, 10);

    await db.execute({
      sql: `INSERT INTO users (id, name, email, username, password_hash, role, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'operator', 1, ?, ?)`,
      args: [randomUUID(), "Operator User", "operator@app.com", "operator", operatorHash, now, now],
    });
    console.log("✅ Operator user created");
    console.log("   Username: operator");
    console.log("   Password: operator123");

    console.log("\n" + "=".repeat(60));
    console.log("✅ Authentication setup completed successfully!");
    console.log("=".repeat(60));
    console.log("\n📋 Default Credentials:");
    console.log("   Admin:");
    console.log("     Username: admin");
    console.log("     Password: admin123");
    console.log("\n   Operator:");
    console.log("     Username: operator");
    console.log("     Password: operator123");
    console.log("\n⚠️  IMPORTANT: Change these passwords after first login!");
    console.log("\n💡 Next steps:");
    console.log("   1. Start your application");
    console.log("   2. Go to /login");
    console.log("   3. Login with the credentials above");
    console.log("   4. Change passwords immediately");

  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  }
}

setupAuth();
