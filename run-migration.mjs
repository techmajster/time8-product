import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://odbjrxsbgvmohdnvjjil.supabase.co';
const supabaseServiceKey = 'sb_secret_QaXBguFFN1XQjvocgLSgcw_6wYSOPOY';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Read the migration file
const migration = readFileSync('./supabase/migrations/20251119110000_remove_customer_org_unique_constraint.sql', 'utf8');

// Split by semicolon and execute each statement
const statements = migration
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SELECT'));

console.log(`Executing ${statements.length} SQL statements...`);

for (const statement of statements) {
  try {
    if (statement.trim().toUpperCase().startsWith('BEGIN') || statement.trim().toUpperCase().startsWith('COMMIT')) {
      console.log(`Skipping: ${statement.substring(0, 50)}...`);
      continue;
    }
    console.log(`Executing: ${statement.substring(0, 100)}...`);
    const { error } = await supabase.rpc('exec_sql', { sql: statement });
    if (error) {
      console.error('Error:', error);
    } else {
      console.log('✅ Success');
    }
  } catch (err) {
    console.error('Error executing statement:', err);
  }
}

console.log('\nMigration complete!');
process.exit(0);
