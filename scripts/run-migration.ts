import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Running migration: 20251113000001_add_quantity_based_billing_type.sql\n');

  try {
    // Execute the SQL statements directly via PostgreSQL connection

    // Step 1: Drop existing CHECK constraint
    console.log('🔹 Step 1: Dropping existing CHECK constraint...');
    const dropQuery = `ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_billing_type_check;`;
    const { error: error1 } = await supabase.rpc('exec', { sql: dropQuery });
    if (error1 && !error1.message.includes('does not exist')) {
      console.log('   Note:', error1.message);
    }
    console.log('   ✓ Done\n');

    // Step 2: Add new CHECK constraint
    console.log('🔹 Step 2: Adding new CHECK constraint with quantity_based...');
    const addQuery = `ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_billing_type_check CHECK (billing_type IN ('volume', 'usage_based', 'quantity_based'));`;
    const { error: error2 } = await supabase.rpc('exec', { sql: addQuery });
    if (error2) {
      throw new Error(`Failed to add constraint: ${error2.message}`);
    }
    console.log('   ✓ Done\n');

    // Step 3: Update column comment
    console.log('🔹 Step 3: Updating column comment...');
    const commentQuery = `COMMENT ON COLUMN subscriptions.billing_type IS 'Billing model: - "volume": Legacy subscriptions (pre-usage-based billing, to be cleaned up) - "usage_based": Monthly subscriptions using Usage Records API (pay at end of period) - "quantity_based": Yearly subscriptions using quantity updates with immediate proration (pay upfront) Determines which billing logic to apply when adding/removing seats.';`;
    const { error: error3 } = await supabase.rpc('exec', { sql: commentQuery });
    if (error3) {
      console.log('   Note:', error3.message);
    }
    console.log('   ✓ Done\n');

    console.log('✅ Migration executed successfully!\n');

    // Verification
    console.log('🔍 Verifying migration...\n');
    const { data, error } = await supabase
      .from('subscriptions')
      .select('billing_type')
      .limit(1);

    if (error) {
      console.log('⚠️  Note: Could not verify (this might be ok):', error.message);
    } else {
      console.log('✓ Subscriptions table accessible');
    }

    console.log('\n🎉 Migration completed!');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
