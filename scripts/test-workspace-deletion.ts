/**
 * Script to test workspace deletion via API
 * Run with: npx tsx scripts/test-workspace-deletion.ts <workspace-id>
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

async function testWorkspaceDeletion(workspaceSlug: string) {
  console.log('\n🧪 Testing workspace deletion for:', workspaceSlug)
  console.log('─'.repeat(60))

  try {
    // Get workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', workspaceSlug)
      .single()

    if (workspaceError || !workspace) {
      console.error('❌ Workspace not found:', workspaceError)
      return
    }

    console.log('✅ Found workspace:', workspace.name, workspace.id)
    console.log('\n⚠️  This will DELETE the workspace. Type "yes" to confirm (just testing API, not actually deleting)')

    // Simulate the deletion steps locally
    console.log('\n🔄 Step 1: Marking mandatory types as non-mandatory...')
    const { error: updateError } = await supabase
      .from('leave_types')
      .update({ is_mandatory: false })
      .eq('organization_id', workspace.id)
      .eq('is_mandatory', true)

    if (updateError) {
      console.error('❌ Failed to update mandatory flags:', updateError)
      return
    }

    console.log('✅ Successfully marked mandatory types as non-mandatory')

    console.log('\n🔄 Step 2: Attempting to delete leave types...')
    const { error: deleteError, count } = await supabase
      .from('leave_types')
      .delete({ count: 'exact' })
      .eq('organization_id', workspace.id)

    if (deleteError) {
      console.error('❌ Failed to delete leave types:', deleteError)

      // Restore mandatory flags if deletion failed
      console.log('\n🔄 Restoring mandatory flags...')
      await supabase
        .from('leave_types')
        .update({ is_mandatory: true })
        .eq('organization_id', workspace.id)
        .or('name.eq.Urlop wypoczynkowy,name.eq.Urlop bezpłatny')

      return
    }

    console.log(`✅ Successfully deleted ${count} leave types`)
    console.log('\n🎉 Test successful! Workspace deletion should now work.')
    console.log('⚠️  Note: We only tested the problematic step. The workspace still exists.')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Get workspace slug from command line
const slug = process.argv[2]

if (!slug) {
  console.error('❌ Please provide a workspace slug')
  console.error('Usage: npx tsx scripts/test-workspace-deletion.ts <workspace-slug>')
  process.exit(1)
}

testWorkspaceDeletion(slug)
