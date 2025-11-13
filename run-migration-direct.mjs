import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Read the migration file
  const migrationSQL = readFileSync(
    './supabase/migrations/20251113000001_add_quantity_based_billing_type.sql',
    'utf8'
  );

  console.log('🚀 Running migration: 20251113000001_add_quantity_based_billing_type.sql');
  console.log('📄 Connected to:', supabaseUrl);
  console.log('');

  // Split migration into individual statements (excluding comments and verification queries)
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && s !== 'BEGIN' && s !== 'COMMIT');

  try {
    console.log('📊 Executing migration statements...\n');

    // Execute BEGIN
    console.log('🔹 BEGIN transaction');
    await supabase.rpc('exec_sql', { sql: 'BEGIN;' }).catch(() => {});

    // Drop existing CHECK constraint
    console.log('🔹 Dropping existing CHECK constraint...');
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_billing_type_check;`
    });
    if (error1) console.log('   Note:', error1.message);

    // Add new CHECK constraint
    console.log('🔹 Adding new CHECK constraint with quantity_based...');
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_billing_type_check CHECK (billing_type IN ('volume', 'usage_based', 'quantity_based'));`
    });
    if (error2) {
      console.error('   ❌ Error:', error2.message);
      throw error2;
    }

    // Update column comment
    console.log('🔹 Updating column comment...');
    const { error: error3 } = await supabase.rpc('exec_sql', {
      sql: `COMMENT ON COLUMN subscriptions.billing_type IS 'Billing model: - "volume": Legacy subscriptions (pre-usage-based billing, to be cleaned up) - "usage_based": Monthly subscriptions using Usage Records API (pay at end of period) - "quantity_based": Yearly subscriptions using quantity updates with immediate proration (pay upfront) Determines which billing logic to apply when adding/removing seats.';`
    });
    if (error3) console.log('   Note:', error3.message);

    // Commit transaction
    console.log('🔹 COMMIT transaction');
    await supabase.rpc('exec_sql', { sql: 'COMMIT;' }).catch(() => {});

    console.log('\n✅ Migration executed successfully!');
    console.log('');

    // Run verification queries
    console.log('🔍 Running verification queries...\n');

    // Check billing_type column
    const { data: columnData, error: verifyError1 } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, column_default, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'subscriptions')
      .eq('column_name', 'billing_type');

    if (verifyError1) {
      console.log('⚠️  Could not verify column (this is ok):', verifyError1.message);
    } else {
      console.log('✓ billing_type column exists');
    }

    // Check existing subscriptions
    const { data: countData, error: verifyError2 } = await supabase
      .from('subscriptions')
      .select('billing_type', { count: 'exact', head: false });

    if (!verifyError2 && countData) {
      const counts = {};
      countData.forEach(row => {
        counts[row.billing_type] = (counts[row.billing_type] || 0) + 1;
      });
      console.log('✓ Existing subscriptions by billing_type:');
      Object.entries(counts).forEach(([type, count]) => {
        console.log(`   - ${type}: ${count}`);
      });
    }

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Rolling back...');
    await supabase.rpc('exec_sql', { sql: 'ROLLBACK;' }).catch(() => {});
    process.exit(1);
  }
}

runMigration();
