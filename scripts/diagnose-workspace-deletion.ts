/**
 * Script to diagnose why workspace deletion is failing
 * Run with: npx tsx scripts/diagnose-workspace-deletion.ts <workspace-slug>
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

async function diagnoseWorkspaceDeletion(slug: string) {
  console.log('\n🔍 Diagnosing workspace deletion for:', slug)
  console.log('─'.repeat(60))

  try {
    // 1. Get workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single()

    if (workspaceError || !workspace) {
      console.error('❌ Workspace not found:', workspaceError)
      return
    }

    console.log('✅ Found workspace:', workspace.name)
    console.log('   ID:', workspace.id)

    // 2. Check leave_types
    const { data: leaveTypes, error: leaveTypesError } = await supabase
      .from('leave_types')
      .select('*')
      .eq('organization_id', workspace.id)

    console.log('\n📋 Leave Types:')
    if (leaveTypesError) {
      console.error('   ❌ Error:', leaveTypesError)
    } else if (!leaveTypes || leaveTypes.length === 0) {
      console.log('   ✅ None found')
    } else {
      console.log(`   Found ${leaveTypes.length} leave type(s)`)
      leaveTypes.forEach((lt, index) => {
        console.log(`   ${index + 1}. ${lt.name} (ID: ${lt.id})`)
      })

      // Check what's referencing each leave type
      for (const leaveType of leaveTypes) {
        console.log(`\n   Checking references for "${leaveType.name}":`)

        // Check leave_balances
        const { count: balanceCount } = await supabase
          .from('leave_balances')
          .select('*', { count: 'exact', head: true })
          .eq('leave_type_id', leaveType.id)

        console.log(`      Leave Balances: ${balanceCount || 0}`)

        // Check leave_requests
        const { count: requestCount } = await supabase
          .from('leave_requests')
          .select('*', { count: 'exact', head: true })
          .eq('leave_type_id', leaveType.id)

        console.log(`      Leave Requests: ${requestCount || 0}`)
      }
    }

    // 3. Check leave_balances by organization
    const { data: leaveBalances, error: balancesError } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('organization_id', workspace.id)

    console.log('\n💰 Leave Balances:')
    if (balancesError) {
      console.error('   ❌ Error:', balancesError)
    } else if (!leaveBalances || leaveBalances.length === 0) {
      console.log('   ✅ None found')
    } else {
      console.log(`   ⚠️  Found ${leaveBalances.length} leave balance(s) that should be deleted first`)
    }

    // 4. Check leave_requests by organization
    const { data: leaveRequests, error: requestsError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('organization_id', workspace.id)

    console.log('\n📝 Leave Requests:')
    if (requestsError) {
      console.error('   ❌ Error:', requestsError)
    } else if (!leaveRequests || leaveRequests.length === 0) {
      console.log('   ✅ None found')
    } else {
      console.log(`   ⚠️  Found ${leaveRequests.length} leave request(s) that should be deleted first`)
    }

    // 5. Check teams
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .eq('organization_id', workspace.id)

    console.log('\n👥 Teams:')
    if (teamsError) {
      console.error('   ❌ Error:', teamsError)
    } else if (!teams || teams.length === 0) {
      console.log('   ✅ None found')
    } else {
      console.log(`   Found ${teams.length} team(s)`)
    }

    // 6. Check user_organizations
    const { data: userOrgs, error: userOrgsError } = await supabase
      .from('user_organizations')
      .select('*')
      .eq('organization_id', workspace.id)

    console.log('\n👤 User Organizations:')
    if (userOrgsError) {
      console.error('   ❌ Error:', userOrgsError)
    } else if (!userOrgs || userOrgs.length === 0) {
      console.log('   ✅ None found')
    } else {
      console.log(`   Found ${userOrgs.length} user-organization record(s)`)
    }

    // 7. Check invitations
    const { data: invitations, error: invitationsError } = await supabase
      .from('invitations')
      .select('*')
      .eq('organization_id', workspace.id)

    console.log('\n📧 Invitations:')
    if (invitationsError) {
      console.error('   ❌ Error:', invitationsError)
    } else if (!invitations || invitations.length === 0) {
      console.log('   ✅ None found')
    } else {
      console.log(`   Found ${invitations.length} invitation(s)`)
    }

    // 8. Check company_holidays
    const { data: holidays, error: holidaysError } = await supabase
      .from('company_holidays')
      .select('*')
      .eq('organization_id', workspace.id)

    console.log('\n🎉 Company Holidays:')
    if (holidaysError) {
      console.error('   ❌ Error:', holidaysError)
    } else if (!holidays || holidays.length === 0) {
      console.log('   ✅ None found')
    } else {
      console.log(`   Found ${holidays.length} holiday(s)`)
    }

    console.log('\n' + '─'.repeat(60))
    console.log('💡 Diagnosis Summary:')
    console.log('─'.repeat(60))

    if (leaveTypes && leaveTypes.length > 0) {
      console.log('⚠️  Issue: Leave types exist and may have foreign key constraints')
      console.log('   Solution: Ensure leave_balances and leave_requests are deleted first')
    }

    if (leaveBalances && leaveBalances.length > 0) {
      console.log('⚠️  Issue: Leave balances still exist')
      console.log('   These must be deleted before leave_types')
    }

    if (leaveRequests && leaveRequests.length > 0) {
      console.log('⚠️  Issue: Leave requests still exist')
      console.log('   These must be deleted before leave_types')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Get workspace slug from command line
const slug = process.argv[2]

if (!slug) {
  console.error('❌ Please provide a workspace slug')
  console.error('Usage: npx tsx scripts/diagnose-workspace-deletion.ts <workspace-slug>')
  process.exit(1)
}

diagnoseWorkspaceDeletion(slug)
