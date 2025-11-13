import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function executeSQLvia HTTP(sql) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const postgrestUrl = supabaseUrl.replace('https://', 'https://').replace('.supabase.co', '.supabase.co');

  // Use the PostgREST query endpoint
  const response = await fetch(`${postgrestUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SQL execution failed: ${response.status} - ${error}`);
  }

  return response;
}

async function runMigration() {
  console.log('🚀 Running migration: 20251113000001_add_quantity_based_billing_type.sql\n');

  try {
    // Statement 1: Drop existing CHECK constraint
    console.log('🔹 Dropping existing CHECK constraint...');
    await executeSQLviaHTTP(`
      ALTER TABLE subscriptions
      DROP CONSTRAINT IF EXISTS subscriptions_billing_type_check;
    `);
    console.log('   ✓ Done\n');

    // Statement 2: Add new CHECK constraint
    console.log('🔹 Adding new CHECK constraint with quantity_based...');
    await executeSQLviaHTTP(`
      ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_billing_type_check
      CHECK (billing_type IN ('volume', 'usage_based', 'quantity_based'));
    `);
    console.log('   ✓ Done\n');

    // Statement 3: Update column comment
    console.log('🔹 Updating column comment...');
    await executeSQLviaHTTP(`
      COMMENT ON COLUMN subscriptions.billing_type IS
      'Billing model:
      - "volume": Legacy subscriptions (pre-usage-based billing, to be cleaned up)
      - "usage_based": Monthly subscriptions using Usage Records API (pay at end of period)
      - "quantity_based": Yearly subscriptions using quantity updates with immediate proration (pay upfront)
      Determines which billing logic to apply when adding/removing seats.';
    `);
    console.log('   ✓ Done\n');

    console.log('✅ Migration executed successfully!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
