import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: workspaceId } = params
    console.log('🗑️ Workspace deletion API called for:', workspaceId)

    // Validate workspace ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(workspaceId)) {
      console.error('❌ Invalid workspace ID format:', workspaceId)
      return NextResponse.json(
        { success: false, error: 'Invalid workspace ID format' },
        { status: 400 }
      )
    }

    // Get current user from session
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('❌ Authentication error:', userError)
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    console.log('🔐 User authenticated:', user.id)

    // Verify user has admin access to this workspace
    const { data: userOrg, error: userOrgError } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', workspaceId)
      .eq('is_active', true)
      .single()

    if (userOrgError || !userOrg) {
      console.error('❌ User not found in organization:', userOrgError)
      return NextResponse.json(
        { success: false, error: 'Access denied: User not found in workspace' },
        { status: 403 }
      )
    }

    if (userOrg.role !== 'admin') {
      console.error('❌ User is not admin:', userOrg.role)
      return NextResponse.json(
        { success: false, error: 'Access denied: Only admins can delete workspaces' },
        { status: 403 }
      )
    }

    console.log('✅ User has admin access, proceeding with deletion')

    // Verify workspace exists
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, slug')
      .eq('id', workspaceId)
      .single()

    if (workspaceError || !workspace) {
      console.error('❌ Workspace not found:', workspaceError)
      return NextResponse.json(
        { success: false, error: 'Workspace not found' },
        { status: 404 }
      )
    }

    console.log('🏢 Workspace found:', workspace.name)

    // Get counts before deletion for response
    const [
      { count: userCount },
      { count: leaveTypeCount },
      { count: leaveRequestCount },
      { count: leaveBalanceCount },
      { count: teamCount },
      { count: invitationCount },
      { count: holidayCount }
    ] = await Promise.all([
      supabaseAdmin.from('user_organizations').select('*', { count: 'exact', head: true }).eq('organization_id', workspaceId),
      supabaseAdmin.from('leave_types').select('*', { count: 'exact', head: true }).eq('organization_id', workspaceId),
      supabaseAdmin.from('leave_requests').select('*', { count: 'exact', head: true }).eq('organization_id', workspaceId),
      supabaseAdmin.from('leave_balances').select('*', { count: 'exact', head: true }).eq('organization_id', workspaceId),
      supabaseAdmin.from('teams').select('*', { count: 'exact', head: true }).eq('organization_id', workspaceId),
      supabaseAdmin.from('invitations').select('*', { count: 'exact', head: true }).eq('organization_id', workspaceId),
      supabaseAdmin.from('company_holidays').select('*', { count: 'exact', head: true }).eq('organization_id', workspaceId)
    ])

    console.log('📊 Data counts before deletion:', {
      users: userCount || 0,
      leaveTypes: leaveTypeCount || 0,
      leaveRequests: leaveRequestCount || 0,
      leaveBalances: leaveBalanceCount || 0,
      teams: teamCount || 0,
      invitations: invitationCount || 0,
      holidays: holidayCount || 0
    })

    // Perform cascading deletion (order matters for foreign key constraints)
    console.log('🗑️ Starting cascading deletion...')

    // 1. Delete leave balances (references leave_types and employees)
    const { error: leaveBalancesError } = await supabaseAdmin
      .from('leave_balances')
      .delete()
      .eq('organization_id', workspaceId)

    if (leaveBalancesError) {
      console.error('❌ Failed to delete leave balances:', leaveBalancesError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete leave balances' },
        { status: 500 }
      )
    }
    console.log('✅ Deleted leave balances')

    // 2. Delete leave requests (references leave_types and employees)
    const { error: leaveRequestsError } = await supabaseAdmin
      .from('leave_requests')
      .delete()
      .eq('organization_id', workspaceId)

    if (leaveRequestsError) {
      console.error('❌ Failed to delete leave requests:', leaveRequestsError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete leave requests' },
        { status: 500 }
      )
    }
    console.log('✅ Deleted leave requests')

    // 3. Delete invitations (references organization and team)
    const { error: invitationsError } = await supabaseAdmin
      .from('invitations')
      .delete()
      .eq('organization_id', workspaceId)

    if (invitationsError) {
      console.error('❌ Failed to delete invitations:', invitationsError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete invitations' },
        { status: 500 }
      )
    }
    console.log('✅ Deleted invitations')

    // 4. Delete company holidays
    const { error: holidaysError } = await supabaseAdmin
      .from('company_holidays')
      .delete()
      .eq('organization_id', workspaceId)

    if (holidaysError) {
      console.error('❌ Failed to delete company holidays:', holidaysError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete company holidays' },
        { status: 500 }
      )
    }
    console.log('✅ Deleted company holidays')

    // 5. Delete leave types (referenced by leave requests and balances)
    // First, mark all mandatory types as non-mandatory to bypass the deletion trigger
    const { error: updateMandatoryError } = await supabaseAdmin
      .from('leave_types')
      .update({ is_mandatory: false })
      .eq('organization_id', workspaceId)
      .eq('is_mandatory', true)

    if (updateMandatoryError) {
      console.error('⚠️  Warning: Failed to update mandatory flags:', updateMandatoryError)
      // Continue anyway as this might not be critical
    } else {
      console.log('✅ Marked mandatory leave types as non-mandatory for deletion')
    }

    // Now delete all leave types
    const { error: leaveTypesError } = await supabaseAdmin
      .from('leave_types')
      .delete()
      .eq('organization_id', workspaceId)

    if (leaveTypesError) {
      console.error('❌ Failed to delete leave types:', leaveTypesError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete leave types' },
        { status: 500 }
      )
    }
    console.log('✅ Deleted leave types')

    // 6. Delete user-organization relationships
    const { error: userOrgsError } = await supabaseAdmin
      .from('user_organizations')
      .delete()
      .eq('organization_id', workspaceId)

    if (userOrgsError) {
      console.error('❌ Failed to delete user organizations:', userOrgsError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete user organizations' },
        { status: 500 }
      )
    }
    console.log('✅ Deleted user-organization relationships')

    // 7. Delete teams (referenced by user_organizations and invitations)
    const { error: teamsError } = await supabaseAdmin
      .from('teams')
      .delete()
      .eq('organization_id', workspaceId)

    if (teamsError) {
      console.error('❌ Failed to delete teams:', teamsError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete teams' },
        { status: 500 }
      )
    }
    console.log('✅ Deleted teams')

    // 8. Delete organization domains (if exists)
    const { error: domainsError } = await supabaseAdmin
      .from('organization_domains')
      .delete()
      .eq('organization_id', workspaceId)

    if (domainsError) {
      console.error('❌ Failed to delete organization domains:', domainsError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete organization domains' },
        { status: 500 }
      )
    }
    console.log('✅ Deleted organization domains')

    // 9. Delete organization settings (if exists)
    const { error: settingsError } = await supabaseAdmin
      .from('organization_settings')
      .delete()
      .eq('organization_id', workspaceId)

    if (settingsError) {
      console.error('❌ Failed to delete organization settings:', settingsError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete organization settings' },
        { status: 500 }
      )
    }
    console.log('✅ Deleted organization settings')

    // 10. Finally, delete the organization itself
    const { error: organizationError } = await supabaseAdmin
      .from('organizations')
      .delete()
      .eq('id', workspaceId)

    if (organizationError) {
      console.error('❌ Failed to delete organization:', organizationError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete organization' },
        { status: 500 }
      )
    }
    console.log('✅ Deleted organization')

    console.log('🎉 Workspace deletion completed successfully')

    return NextResponse.json({
      success: true,
      message: `Workspace "${workspace.name}" deleted successfully`,
      deletedCounts: {
        users: userCount || 0,
        leaveTypes: leaveTypeCount || 0,
        leaveRequests: leaveRequestCount || 0,
        leaveBalances: leaveBalanceCount || 0,
        teams: teamCount || 0,
        invitations: invitationCount || 0,
        holidays: holidayCount || 0
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug
      }
    })

  } catch (error) {
    console.error('💥 Workspace deletion error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}