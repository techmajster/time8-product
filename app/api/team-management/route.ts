import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile and organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get current active organization
    const cookieStore = await cookies()
    const activeOrgId = cookieStore.get('active-organization-id')?.value

    let userOrgQuery = supabase
      .from('user_organizations')
      .select(`
        *,
        organizations (
          id,
          name
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (activeOrgId) {
      userOrgQuery = userOrgQuery.eq('organization_id', activeOrgId)
    } else {
      userOrgQuery = userOrgQuery.eq('is_default', true)
    }

    const { data: userOrg } = await userOrgQuery.single()

    if (!userOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Only admins can access team management
    if (userOrg.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabaseAdmin = createAdminClient()
    const organizationId = userOrg.organization_id

    // Get team members with birth_date and approver_id
    const { data: rawTeamMembers } = await supabaseAdmin
      .from('user_organizations')
      .select(`
        user_id,
        organization_id,
        role,
        team_id,
        is_active,
        approver_id,
        profiles!user_organizations_user_id_fkey (
          id,
          email,
          full_name,
          avatar_url,
          birth_date
        ),
        teams!user_organizations_team_id_fkey (
          id,
          name,
          color
        )
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('profiles(full_name)', { ascending: true })

    // Get teams
    const { data: teams } = await supabaseAdmin
      .from('teams')
      .select(`
        id,
        name,
        description,
        color,
        created_at,
        manager_id
      `)
      .eq('organization_id', organizationId)
      .order('name')

    // Get team details
    const teamsWithDetails = teams ? await Promise.all(
      teams.map(async (team) => {
        let manager = null
        if (team.manager_id) {
          const { data: managerProfile } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', team.manager_id)
            .single()
          manager = managerProfile
        }

        const { count: memberCount } = await supabaseAdmin
          .from('user_organizations')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id)
          .eq('organization_id', organizationId)
          .eq('is_active', true)

        return {
          ...team,
          manager,
          members: [],
          member_count: memberCount || 0
        }
      })
    ) : []

    // Transform team members
    const teamMembers = rawTeamMembers?.map(userOrg => {
      const profile = Array.isArray(userOrg.profiles) ? userOrg.profiles[0] : userOrg.profiles
      const teamDetails = userOrg.team_id ? teamsWithDetails.find(t => t.id === userOrg.team_id) : null

      return {
        id: userOrg.user_id,
        email: profile?.email || '',
        full_name: profile?.full_name,
        role: userOrg.role,
        avatar_url: profile?.avatar_url,
        birth_date: profile?.birth_date,
        team_id: userOrg.team_id,
        approver_id: userOrg.approver_id,
        teams: teamDetails ? {
          id: teamDetails.id,
          name: teamDetails.name,
          color: teamDetails.color
        } : null
      }
    }) || []

    // Get leave balances
    const memberIds = teamMembers.map(member => member.id)
    const { data: leaveBalances } = await supabaseAdmin
      .from('leave_balances')
      .select(`
        id,
        user_id,
        leave_type_id,
        year,
        entitled_days,
        used_days,
        remaining_days,
        leave_types!inner (
          id,
          name,
          color,
          requires_balance
        )
      `)
      .in('user_id', memberIds)
      .eq('year', new Date().getFullYear())
      .eq('leave_types.requires_balance', true)

    // Get pending invitations
    const { data: rawInvitations } = await supabaseAdmin
      .from('invitations')
      .select(`
        id,
        email,
        full_name,
        birth_date,
        role,
        status,
        created_at,
        expires_at,
        invitation_code,
        invited_by,
        team_id
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    const invitations = rawInvitations ? await Promise.all(
      rawInvitations.map(async (invitation) => {
        const { data: inviterProfile } = await supabaseAdmin
          .from('profiles')
          .select('full_name, email')
          .eq('id', invitation.invited_by)
          .single()

        let teamName = 'Bez grupy'
        if (invitation.team_id) {
          const { data: team } = await supabaseAdmin
            .from('teams')
            .select('name')
            .eq('id', invitation.team_id)
            .single()
          teamName = team?.name || 'Bez grupy'
        }

        return {
          id: invitation.id,
          email: invitation.email,
          full_name: invitation.full_name,
          birth_date: invitation.birth_date,
          role: invitation.role,
          status: invitation.status,
          created_at: invitation.created_at,
          expires_at: invitation.expires_at,
          invitation_code: invitation.invitation_code,
          invited_by: invitation.invited_by,
          team_id: invitation.team_id,
          inviter_name: inviterProfile?.full_name || 'Administrator',
          inviter_email: inviterProfile?.email || '',
          team_name: teamName
        }
      })
    ) : []

    // Get pending removal users
    const { data: pendingRemovalUsers } = await supabaseAdmin
      .from('user_organizations')
      .select(`
        user_id,
        status,
        removal_effective_date,
        role,
        profiles!user_organizations_user_id_fkey (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'pending_removal')

    const transformedPendingUsers = pendingRemovalUsers?.map(pu => ({
      id: pu.user_id,
      email: (pu.profiles as any)?.email || '',
      full_name: (pu.profiles as any)?.full_name || null,
      avatar_url: (pu.profiles as any)?.avatar_url || null,
      removal_effective_date: pu.removal_effective_date,
      role: pu.role
    })) || []

    // Get archived users
    const { data: archivedUsers } = await supabaseAdmin
      .from('user_organizations')
      .select(`
        user_id,
        role,
        status,
        is_active,
        profiles!user_organizations_user_id_fkey (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'archived')

    const transformedArchivedUsers = archivedUsers?.map(au => ({
      id: au.user_id,
      email: (au.profiles as any)?.email || '',
      full_name: (au.profiles as any)?.full_name || null,
      avatar_url: (au.profiles as any)?.avatar_url || null,
      role: au.role
    })) || []

    // Get leave types for the organization
    const { data: leaveTypes } = await supabaseAdmin
      .from('leave_types')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name')

    // Get approvers (managers and admins)
    const { data: approversData } = await supabaseAdmin
      .from('user_organizations')
      .select(`
        user_id,
        role,
        profiles!user_organizations_user_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .in('role', ['manager', 'admin'])

    const approvers = approversData?.map((item: any) => ({
      id: item.profiles.id,
      full_name: item.profiles.full_name,
      email: item.profiles.email
    })) || []

    // Get active user count (only status = 'active', excludes pending_removal and archived)
    // This is used for downgrade validation in update-subscription page
    const { count: activeUserCount } = await supabaseAdmin
      .from('user_organizations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'active')

    return NextResponse.json({
      teamMembers,
      teams: teamsWithDetails || [],
      leaveBalances: leaveBalances || [],
      invitations: invitations || [],
      pendingRemovalUsers: transformedPendingUsers,
      archivedUsers: transformedArchivedUsers,
      leaveTypes: leaveTypes || [],
      approvers: approvers,
      activeUserCount: activeUserCount || 0
    })

  } catch (error) {
    console.error('Error fetching team management data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
