/**
 * Script to restore mandatory leave types for a workspace
 * Run with: npx tsx scripts/restore-leave-types.ts <workspace-slug>
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

async function restoreLeaveTypes(workspaceSlug: string) {
  console.log('\n🔧 Restoring leave types for:', workspaceSlug)
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

    // Call the ensure_mandatory_leave_types function
    console.log('\n🔄 Creating mandatory leave types...')
    const { error: functionError } = await supabase.rpc('ensure_mandatory_leave_types', {
      org_id: workspace.id
    })

    if (functionError) {
      console.error('❌ Failed to create mandatory types:', functionError)
      return
    }

    console.log('✅ Mandatory leave types created')

    // Verify
    const { data: leaveTypes, error: verifyError } = await supabase
      .from('leave_types')
      .select('*')
      .eq('organization_id', workspace.id)

    if (verifyError) {
      console.error('❌ Failed to verify:', verifyError)
      return
    }

    console.log(`\n✅ Restored ${leaveTypes?.length || 0} leave types:`)
    leaveTypes?.forEach((lt, index) => {
      console.log(`   ${index + 1}. ${lt.name} (${lt.is_mandatory ? 'Mandatory' : 'Optional'})`)
    })

    console.log('\n🎉 Done!')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Get workspace slug from command line
const slug = process.argv[2]

if (!slug) {
  console.error('❌ Please provide a workspace slug')
  console.error('Usage: npx tsx scripts/restore-leave-types.ts <workspace-slug>')
  process.exit(1)
}

restoreLeaveTypes(slug)
