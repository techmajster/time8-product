/**
 * Script to check workspace details including teams
 * Run with: npx tsx scripts/check-workspace.ts <workspace-name-or-slug>
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

async function checkWorkspace(nameOrSlug: string) {
  console.log('\n🔍 Checking workspace:', nameOrSlug)
  console.log('─'.repeat(60))

  try {
    // 1. Find the workspace
    const { data: workspaces, error: workspaceError } = await supabase
      .from('organizations')
      .select('*')
      .or(`name.ilike.%${nameOrSlug}%,slug.ilike.%${nameOrSlug}%`)

    if (workspaceError) {
      console.error('❌ Error fetching workspace:', workspaceError)
      return
    }

    if (!workspaces || workspaces.length === 0) {
      console.log('❌ Workspace NOT FOUND')
      return
    }

    const workspace = workspaces[0]
    console.log('✅ Found workspace:', workspace.name)
    console.log('   ID:', workspace.id)
    console.log('   Slug:', workspace.slug)
    console.log('   Created:', new Date(workspace.created_at).toLocaleString())

    // 2. Check teams
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .eq('organization_id', workspace.id)
      .order('created_at', { ascending: true })

    console.log('\n👥 Teams:')
    if (teamsError) {
      console.error('   ❌ Error fetching teams:', teamsError)
    } else if (!teams || teams.length === 0) {
      console.log('   ⚠️  NO TEAMS FOUND')
    } else {
      console.log(`   Found ${teams.length} team(s):`)
      teams.forEach((team, index) => {
        console.log(`   ${index + 1}. ${team.name} (ID: ${team.id})`)
        console.log(`      Created: ${new Date(team.created_at).toLocaleString()}`)
      })
    }

    // 3. Check user_organizations
    const { data: userOrgs, error: userOrgsError } = await supabase
      .from('user_organizations')
      .select(`
        *,
        profiles:user_id (
          full_name,
          email
        )
      `)
      .eq('organization_id', workspace.id)

    console.log('\n👤 Users:')
    if (userOrgsError) {
      console.error('   ❌ Error fetching users:', userOrgsError)
    } else if (!userOrgs || userOrgs.length === 0) {
      console.log('   ⚠️  NO USERS FOUND')
    } else {
      console.log(`   Found ${userOrgs.length} user(s):`)
      userOrgs.forEach((userOrg, index) => {
        const profile = userOrg.profiles as any
        console.log(`   ${index + 1}. ${profile?.full_name || 'Unknown'} (${profile?.email || 'No email'})`)
        console.log(`      Role: ${userOrg.role}`)
        console.log(`      Team ID: ${userOrg.team_id || 'None'}`)
        console.log(`      Joined via: ${userOrg.joined_via}`)
        console.log(`      Active: ${userOrg.is_active ? '✅' : '❌'}`)
      })
    }

    // 4. Check leave types
    const { count: leaveTypeCount } = await supabase
      .from('leave_types')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', workspace.id)

    console.log('\n📊 Leave Types:', leaveTypeCount || 0)

    // 5. Check leave requests
    const { count: leaveRequestCount } = await supabase
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', workspace.id)

    console.log('📊 Leave Requests:', leaveRequestCount || 0)

    // 6. Check invitations
    const { count: invitationCount } = await supabase
      .from('invitations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', workspace.id)

    console.log('📊 Invitations:', invitationCount || 0)

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Get workspace name/slug from command line
const nameOrSlug = process.argv[2]

if (!nameOrSlug) {
  console.error('❌ Please provide a workspace name or slug')
  console.error('Usage: npx tsx scripts/check-workspace.ts <name-or-slug>')
  process.exit(1)
}

checkWorkspace(nameOrSlug)
