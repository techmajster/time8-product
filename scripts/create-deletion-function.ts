/**
 * Script to create the workspace deletion function
 * Run with: npx tsx scripts/create-deletion-function.ts
 */

import { createClient } from '@supabase/supabase-js'

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
  },
  db: {
    schema: 'public'
  }
})

async function createDeletionFunction() {
  console.log('\n🔧 Creating workspace deletion function')
  console.log('─'.repeat(60))

  try {
    // Create the function using raw SQL via rpc
    const functionSQL = `
CREATE OR REPLACE FUNCTION delete_workspace_leave_types(workspace_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Temporarily disable the mandatory deletion trigger
  ALTER TABLE leave_types DISABLE TRIGGER trg_prevent_mandatory_deletion;

  -- Delete all leave types for this workspace
  DELETE FROM leave_types WHERE organization_id = workspace_id;

  -- Re-enable the trigger
  ALTER TABLE leave_types ENABLE TRIGGER trg_prevent_mandatory_deletion;

  -- Log the action
  RAISE NOTICE 'Deleted all leave types for workspace %', workspace_id;
END;
$$;
`

    console.log('📝 Creating function...')

    // Try using Supabase's sql client
    const { error } = await (supabase as any).rpc('exec', { query: functionSQL })

    if (error) {
      console.log('⚠️  RPC approach failed, trying direct SQL execution')

      // Alternative: Try using PostgREST's raw query
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: functionSQL })
      })

      if (!response.ok) {
        console.error('❌ Failed to create function')
        console.error('Response:', await response.text())
        return
      }
    }

    console.log('✅ Function created successfully!')
    console.log('\n📝 Now updating the API route to use this function...')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

createDeletionFunction()
