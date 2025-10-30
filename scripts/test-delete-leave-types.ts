/**
 * Script to test deleting leave_types for Kontury workspace
 * Run with: npx tsx scripts/test-delete-leave-types.ts
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
  }
})

async function testDeleteLeaveTypes() {
  console.log('\n🧪 Testing leave_types deletion for Kontury')
  console.log('─'.repeat(60))

  try {
    // Get Kontury workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', 'kontury')
      .single()

    if (workspaceError || !workspace) {
      console.error('❌ Workspace not found:', workspaceError)
      return
    }

    console.log('✅ Found workspace:', workspace.name, workspace.id)

    // Try to delete leave_types
    console.log('\n🗑️  Attempting to delete leave_types...')
    const { error: deleteError, data } = await supabase
      .from('leave_types')
      .delete()
      .eq('organization_id', workspace.id)
      .select()

    if (deleteError) {
      console.error('❌ Delete failed:', JSON.stringify(deleteError, null, 2))
    } else {
      console.log('✅ Delete successful! Deleted', data?.length || 0, 'leave types')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testDeleteLeaveTypes()
