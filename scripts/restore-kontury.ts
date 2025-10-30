/**
 * Script to restore Kontury workspace with team and owner
 * Run with: npx tsx scripts/restore-kontury.ts <owner-email>
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

async function restoreKontury(ownerEmail: string) {
  console.log('\n🔧 Restoring Kontury workspace for owner:', ownerEmail)
  console.log('─'.repeat(60))

  try {
    // 1. Get owner user
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error('❌ Error fetching users:', listError)
      return
    }

    const owner = users.find(u => u.email === ownerEmail)

    if (!owner) {
      console.log('❌ Owner user NOT FOUND')
      return
    }

    console.log('✅ Found owner:', owner.id)
    console.log('   Email:', owner.email)
    console.log('   Name:', owner.user_metadata?.full_name || 'Not set')

    // 2. Get Kontury workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', 'kontury')
      .single()

    if (workspaceError || !workspace) {
      console.error('❌ Kontury workspace not found:', workspaceError)
      return
    }

    console.log('\n✅ Found Kontury workspace:', workspace.id)

    // 3. Check if team exists
    const { data: existingTeams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .eq('organization_id', workspace.id)

    if (teamsError) {
      console.error('❌ Error checking teams:', teamsError)
      return
    }

    let team
    if (!existingTeams || existingTeams.length === 0) {
      console.log('\n⚠️  No teams found - creating default team...')

      // Create default team
      const { data: newTeam, error: createTeamError } = await supabase
        .from('teams')
        .insert({
          name: 'Default Team',
          organization_id: workspace.id
        })
        .select()
        .single()

      if (createTeamError) {
        console.error('❌ Error creating team:', createTeamError)
        return
      }

      team = newTeam
      console.log('✅ Created team:', team.id)
    } else {
      team = existingTeams[0]
      console.log('\n✅ Using existing team:', team.id)
    }

    // 4. Check if user_organizations record exists
    const { data: existingUserOrg, error: existingUserOrgError } = await supabase
      .from('user_organizations')
      .select('*')
      .eq('user_id', owner.id)
      .eq('organization_id', workspace.id)
      .maybeSingle()

    if (existingUserOrg) {
      console.log('\n✅ User already connected to Kontury')
      console.log('   Role:', existingUserOrg.role)
      return
    }

    console.log('\n⚠️  User not connected - creating user_organizations record...')

    // Check if user has any other organizations
    const { data: otherOrgs, error: otherOrgsError } = await supabase
      .from('user_organizations')
      .select('organization_id, is_default')
      .eq('user_id', owner.id)

    const hasOtherOrgs = otherOrgs && otherOrgs.length > 0
    const hasDefaultOrg = otherOrgs?.some(o => o.is_default)

    // 5. Create user_organizations record
    const { data: newUserOrg, error: createUserOrgError } = await supabase
      .from('user_organizations')
      .insert({
        user_id: owner.id,
        organization_id: workspace.id,
        team_id: team.id,
        role: 'admin',
        is_active: true,
        is_default: !hasDefaultOrg, // Set as default if user has no default org
        joined_via: 'created'
      })
      .select()
      .single()

    if (createUserOrgError) {
      console.error('❌ Error creating user_organizations:', createUserOrgError)
      return
    }

    console.log('✅ Successfully connected user to Kontury!')
    console.log('   User:', owner.email)
    console.log('   Role:', newUserOrg.role)
    console.log('   Team:', team.name)

    console.log('\n🎉 Done! User now has admin access to Kontury workspace.')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Get owner email from command line
const ownerEmail = process.argv[2]

if (!ownerEmail) {
  console.error('❌ Please provide owner email address')
  console.error('Usage: npx tsx scripts/restore-kontury.ts <owner-email>')
  process.exit(1)
}

restoreKontury(ownerEmail)
