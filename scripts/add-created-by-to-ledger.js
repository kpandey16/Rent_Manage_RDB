const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    console.error('Error: Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env.local');
    process.exit(1);
  }

  const client = createClient({
    url: dbUrl,
    authToken: authToken,
  });

  try {
    console.log('Connected to Turso database');

    // Read the SQL file
    const sqlFile = path.join(__dirname, 'add-created-by-to-ledger.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf-8');

    // Remove comment lines and split by semicolons
    const cleanedSQL = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    const statements = cleanedSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Executing ${statements.length} SQL statements...`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`\n[${i + 1}/${statements.length}] Executing...`);
      await client.execute(stmt);
      console.log('✓ Success');
    }

    // Verify the migration
    console.log('\nVerifying migration...');
    const result = await client.execute({
      sql: "SELECT sql FROM sqlite_master WHERE name = 'tenant_ledger'",
      args: [],
    });

    if (result.rows.length > 0) {
      console.log('\n✓ Migration completed successfully!');
      console.log('\nNew tenant_ledger schema:');
      console.log(result.rows[0].sql);
    }

  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  } finally {
    client.close();
  }
}

runMigration();
