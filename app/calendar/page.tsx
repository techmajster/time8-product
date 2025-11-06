import { AppLayout } from '@/components/app-layout'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { NewLeaveRequestSheet } from '@/app/leave/components/NewLeaveRequestSheet'
import CalendarClient from './components/CalendarClient'

export default async function CalendarPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // MULTI-ORG UPDATE: Get user profile and organization via user_organizations
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Get current active organization (respect workspace switching cookie)
  const cookieStore = await cookies()
  const activeOrgId = cookieStore.get('active-organization-id')?.value
  
  let userOrgQuery = supabase
    .from('user_organizations')
    .select(`
      *,
      organizations (
        id,
        name,
        country_code,
        work_mode,
        working_days
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)
    
  // If we have an active org cookie, use that specific org, otherwise use default
  if (activeOrgId) {
    userOrgQuery = userOrgQuery.eq('organization_id', activeOrgId)
    console.log('🍪 Calendar: Using active organization from cookie:', activeOrgId)
  } else {
    userOrgQuery = userOrgQuery.eq('is_default', true)
    console.log('🏠 Calendar: Using default organization (no active cookie)')
  }
  
  const { data: userOrg } = await userOrgQuery.single()

  if (!userOrg) {
    redirect('/onboarding')
  }

  // Add organization context to profile for backward compatibility
  profile.organization_id = userOrg.organization_id
  profile.role = userOrg.role
  profile.organizations = userOrg.organizations

  // Use admin client for better RLS handling
  const supabaseAdmin = createAdminClient()

  // Get leave types for the NewLeaveRequestSheet
  const { data: leaveTypes } = await supabaseAdmin
    .from('leave_types')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .order('name')

  // Get leave balances for the NewLeaveRequestSheet
  const { data: leaveBalances } = await supabaseAdmin
    .from('leave_balances')
    .select(`
      *,
      leave_types!inner (
        id,
        name,
        color,
        leave_category,
        requires_balance
      )
    `)
    .eq('user_id', user.id)
    .eq('year', new Date().getFullYear())
    .eq('leave_types.requires_balance', true)

  // Get pending leave requests for balance calculation
  const { data: leaveRequests } = await supabase
    .from('leave_requests')
    .select(`
      *,
      leave_types (
        id,
        name,
        color
      )
    `)
    .eq('user_id', user.id)
    .eq('organization_id', profile.organization_id)
    .eq('status', 'pending')

  // Get organization's calendar restriction setting
  const { data: orgSettings } = await supabaseAdmin
    .from('organizations')
    .select('restrict_calendar_by_group')
    .eq('id', profile.organization_id)
    .single()

  const restrictByGroup = orgSettings?.restrict_calendar_by_group || false

  // Get team scope for filtering based on group membership and restriction setting
  let teamScope: any
  let teamMemberIds: string[] = []

  // Determine team scope using admin client to bypass RLS
  if (profile.role === 'admin') {
    // Admin always sees all organization members
    teamScope = { type: 'organization', organizationId: profile.organization_id }

    const { data: allOrgMembers } = await supabaseAdmin
      .from('user_organizations')
      .select('user_id')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)

    teamMemberIds = allOrgMembers?.map(m => m.user_id) || []
  } else if (restrictByGroup) {
    // Restriction is ON - apply group-based filtering
    // Check if user is in a team/group via user_organizations.team_id
    const { data: userTeamMembership } = await supabaseAdmin
      .from('user_organizations')
      .select('team_id')
      .eq('user_id', user.id)
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)
      .single()

    if (userTeamMembership?.team_id) {
      // User is in a group - show only group members' calendars
      teamScope = { type: 'team', teamId: userTeamMembership.team_id, organizationId: profile.organization_id }

      const { data: groupMembers } = await supabaseAdmin
        .from('user_organizations')
        .select('user_id')
        .eq('organization_id', profile.organization_id)
        .eq('team_id', userTeamMembership.team_id)
        .eq('is_active', true)

      teamMemberIds = groupMembers?.map(m => m.user_id) || []
    } else {
      // User has no group - show all organization members
      teamScope = { type: 'organization', organizationId: profile.organization_id }

      const { data: allOrgMembers } = await supabaseAdmin
        .from('user_organizations')
        .select('user_id')
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)

      teamMemberIds = allOrgMembers?.map(m => m.user_id) || []
    }
  } else {
    // Restriction is OFF - everyone sees everyone
    teamScope = { type: 'organization', organizationId: profile.organization_id }

    const { data: allOrgMembers } = await supabaseAdmin
      .from('user_organizations')
      .select('user_id')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)

    teamMemberIds = allOrgMembers?.map(m => m.user_id) || []
  }

  console.log('📅 Calendar page - team member IDs (group-based filtering):', {
    count: teamMemberIds.length,
    teamScope,
    organizationId: profile.organization_id,
    userRole: profile.role,
    restrictByGroup,
    memberIds: teamMemberIds
  })

  // Get colleagues' birthday data for birthday card functionality (team-filtered)
  const { data: colleagues } = await supabaseAdmin
    .from('profiles')
    .select(`
      id,
      full_name,
      birth_date,
      avatar_url
    `)
    .in('id', teamMemberIds)
    .not('birth_date', 'is', null)
    .order('full_name')

  return (
    <AppLayout>
      {/* NewLeaveRequestSheet component for calendar functionality */}
      <NewLeaveRequestSheet
        leaveTypes={leaveTypes || []}
        leaveBalances={leaveBalances || []}
        userProfile={profile}
        pendingRequests={(leaveRequests || [])
          .filter(req => req.status === 'pending')
          .map(req => ({
            leave_type_id: req.leave_types?.id || '',
            days_requested: req.days_requested
          }))
        }
      />
      
      <CalendarClient
        organizationId={profile.organization_id}
        countryCode={profile.organizations?.country_code || 'PL'}
        userId={user.id}
        colleagues={colleagues || []}
        teamMemberIds={teamMemberIds}
        teamScope={teamScope}
        workingDays={profile.organizations?.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']}
        disableResponsive={true}
      />
    </AppLayout>
  )
} 