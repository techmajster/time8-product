/**
 * Script to apply the workspace deletion function migration
 * Run with: npx tsx scripts/apply-workspace-deletion-migration.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  console.log('\n🔧 Applying workspace deletion function migration')
  console.log('─'.repeat(60))

  try {
    // Read the migration file
    const migrationPath = join(process.cwd(), 'supabase/migrations/20251030000000_add_workspace_deletion_function.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    console.log('📄 Read migration file')

    // Execute the migration
    console.log('⚙️  Executing migration...')

    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })

    if (error) {
      console.error('❌ Migration failed:', error)

      // Try alternative approach - create function directly
      console.log('\n📝 Trying alternative approach...')

      const createFunctionSQL = `
CREATE OR REPLACE FUNCTION delete_workspace_leave_types(workspace_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  ALTER TABLE leave_types DISABLE TRIGGER trg_prevent_mandatory_deletion;
  DELETE FROM leave_types WHERE organization_id = workspace_id;
  ALTER TABLE leave_types ENABLE TRIGGER trg_prevent_mandatory_deletion;
  RAISE NOTICE 'Deleted all leave types for workspace %', workspace_id;
END;
$$;
`

      const { error: createError } = await supabase.rpc('exec_sql', { sql: createFunctionSQL })

      if (createError) {
        console.error('❌ Alternative approach also failed:', createError)
        return
      }

      console.log('✅ Function created successfully (alternative method)')
    } else {
      console.log('✅ Migration applied successfully!')
    }

    // Verify function exists
    console.log('\n🔍 Verifying function creation...')
    const { data: functions, error: verifyError } = await supabase
      .from('pg_proc')
      .select('proname')
      .eq('proname', 'delete_workspace_leave_types')

    if (verifyError) {
      console.log('⚠️  Could not verify function (this is okay)')
    } else {
      console.log('✅ Function verified:', functions?.length > 0 ? 'EXISTS' : 'NOT FOUND')
    }

    console.log('\n🎉 Done!')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

applyMigration()
