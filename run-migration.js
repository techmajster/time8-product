const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Read the migration file
  const migrationSQL = fs.readFileSync(
    './supabase/migrations/20251113000001_add_quantity_based_billing_type.sql',
    'utf8'
  );

  console.log('🚀 Running migration: 20251113000001_add_quantity_based_billing_type.sql');
  console.log('');

  try {
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // Try direct query if RPC doesn't exist
      console.log('Trying direct SQL execution...');
      const result = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ query: migrationSQL })
      });

      if (!result.ok) {
        throw new Error(`HTTP error! status: ${result.status}`);
      }

      console.log('✅ Migration executed successfully!');
    } else {
      console.log('✅ Migration executed successfully!');
      if (data) {
        console.log('Result:', data);
      }
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
