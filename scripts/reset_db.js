const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: '.env.local' });

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function resetDatabase() {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl || !authToken) {
    console.error('Error: Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env.local');
    process.exit(1);
  }

  console.log('\n⚠️  ==================== WARNING ====================');
  console.log('This script will DELETE ALL DATA from the database!');
  console.log('The following will be PERMANENTLY DELETED:');
  console.log('  - All tenants and their records');
  console.log('  - All rooms and allocations');
  console.log('  - All transactions and payments');
  console.log('  - All lawn events and withdrawals');
  console.log('  - All cash management records');
  console.log('  - All rollback history');
  console.log('\nThe users table will be PRESERVED.');
  console.log('==================================================\n');

  const answer = await askQuestion('Are you ABSOLUTELY SURE you want to continue? (yes/no): ');

  if (answer.toLowerCase() !== 'yes') {
    console.log('\n❌ Reset cancelled. No changes were made.');
    rl.close();
    process.exit(0);
  }

  const confirmAnswer = await askQuestion('\nType "DELETE ALL DATA" to confirm: ');

  if (confirmAnswer !== 'DELETE ALL DATA') {
    console.log('\n❌ Reset cancelled. Confirmation text did not match.');
    rl.close();
    process.exit(0);
  }

  rl.close();

  const client = createClient({
    url: dbUrl,
    authToken: authToken,
  });

  try {
    console.log('\n🔗 Connecting to Turso database...');

    // Read the SQL file
    const sqlFile = path.join(__dirname, 'reset_db.sql');
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

    console.log(`\n🗑️  Executing ${statements.length} deletion statements...\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const firstWords = stmt.split(' ').slice(0, 3).join(' ');
      console.log(`[${i + 1}/${statements.length}] ${firstWords}...`);
      await client.execute(stmt);
    }

    console.log('\n✅ Database reset completed successfully!\n');

    // Show counts
    console.log('📊 Verifying table counts...\n');

    const tables = [
      'tenants', 'rooms', 'tenant_rooms', 'tenant_ledger',
      'rent_payments', 'security_deposits', 'rent_updates',
      'lawn_events', 'lawn_withdrawals', 'lawn_settings',
      'operator_expenses', 'operator_withdrawals',
      'rollback_history', 'users'
    ];

    for (const table of tables) {
      try {
        const result = await client.execute({
          sql: `SELECT COUNT(*) as count FROM ${table}`,
          args: [],
        });
        const count = result.rows[0].count;
        const icon = count === 0 ? '✓' : '⚠️';
        console.log(`  ${icon} ${table.padEnd(20)} ${count} rows`);
      } catch (err) {
        console.log(`  ✗ ${table.padEnd(20)} (table not found or error)`);
      }
    }

    console.log('\n✨ Reset complete! Your database is now clean.');
    console.log('   Users have been preserved for login.\n');

  } catch (error) {
    console.error('\n❌ Reset failed:', error);
    process.exit(1);
  } finally {
    client.close();
  }
}

resetDatabase();
