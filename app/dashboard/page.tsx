import { AppLayout } from '@/components/app-layout'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { NewLeaveRequestSheet } from '@/app/leave/components/NewLeaveRequestSheet'
import { DashboardClient } from './components/DashboardClient'
import { getTranslations } from 'next-intl/server'
import { calculateNearestBirthday, type NearestBirthday } from '@/lib/utils/birthday'

export default async function DashboardPage() {
  const t = await getTranslations('dashboard')
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // MULTI-ORG UPDATE: Get user profile and organization details via user_organizations
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
        country_code
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)
    
  // If we have an active org cookie, use that specific org, otherwise use default
  if (activeOrgId) {
    userOrgQuery = userOrgQuery.eq('organization_id', activeOrgId)
  } else {
    userOrgQuery = userOrgQuery.eq('is_default', true)
  }
  
  const { data: userOrg } = await userOrgQuery.single()

  if (!userOrg) {
    redirect('/onboarding')
  }

  // Add organization context to profile for backward compatibility
  profile.organization_id = userOrg.organization_id
  profile.role = userOrg.role
  profile.organizations = userOrg.organizations

  // SECURITY NOTE: Using admin client to bypass RLS for team-based filtering
  // This is necessary because the current RLS policies don't support the complex
  // team scope logic (restrict_calendar_by_group setting). The code manually
  // filters results based on teamMemberIds which is calculated based on:
  // 1. User's role (admin sees all, manager sees team)
  // 2. Organization's restrict_calendar_by_group setting
  // 3. User's team membership
  // TODO: Future enhancement - Implement RLS policies to handle this logic at the database level
  const supabaseAdmin = createAdminClient()

  // Get current date for display
  const today = new Date()
  const currentDay = today.getDate()
  const currentMonth = today.toLocaleDateString('pl-PL', { month: 'long' })
  const currentDayName = today.toLocaleDateString('pl-PL', { weekday: 'long' })
  const currentYear = today.getFullYear()

  // Polish month names for display
  const monthNames = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
  ]

  // Get leave balances for current user (only for leave types that require balances)
  const { data: leaveBalances } = await supabaseAdmin
    .from('leave_balances')
    .select(`
      *,
      leave_types!inner (
        id,
        name,
        color,
        leave_category,
        requires_balance,
        days_per_year
      )
    `)
    .eq('user_id', user.id)
    .eq('year', new Date().getFullYear())
    .eq('leave_types.requires_balance', true)

  // Find vacation leave balance
  const vacationBalance = leaveBalances?.find(b => b.leave_types?.name === 'Urlop wypoczynkowy')
  const remainingVacationDays = vacationBalance?.remaining_days || 0

  // Check if vacation balance is an override (custom entitled_days)
  const workspaceDefault = vacationBalance?.leave_types?.days_per_year || 0
  const actualEntitled = vacationBalance?.entitled_days || 0
  const isVacationOverride = actualEntitled !== workspaceDefault

  // Get all leave types for the organization
  const { data: leaveTypes } = await supabaseAdmin
    .from('leave_types')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .order('name')

  // Get organization's calendar restriction setting
  const { data: orgSettings } = await supabaseAdmin
    .from('organizations')
    .select('restrict_calendar_by_group')
    .eq('id', profile.organization_id)
    .single()

  const restrictByGroup = orgSettings?.restrict_calendar_by_group || false

  // Get team scope for filtering data - bypass team-utils to use admin client
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
    if (userOrg.team_id) {
      // User is in a group - show only group members' calendars
      teamScope = { type: 'team', teamId: userOrg.team_id, organizationId: profile.organization_id }

      const { data: teamMembers } = await supabaseAdmin
        .from('user_organizations')
        .select('user_id')
        .eq('organization_id', profile.organization_id)
        .eq('team_id', userOrg.team_id)
        .eq('is_active', true)

      teamMemberIds = teamMembers?.map(m => m.user_id) || []
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

  // Get team members based on user's team scope via user_organizations (multi-org approach)
  const { data: rawTeamMembers } = await supabaseAdmin
    .from('user_organizations')
    .select(`
      user_id,
      role,
      team_id,
      profiles!user_organizations_user_id_fkey (
        id,
        email,
        full_name,
        avatar_url
      ),
      teams!user_organizations_team_id_fkey (
        id,
        name,
        color
      )
    `)
    .eq('organization_id', profile.organization_id)
    .eq('is_active', true)
    .in('user_id', teamMemberIds)
    .order('profiles(full_name)', { ascending: true })

  // Transform the data to match expected interface
  const allTeamMembers = rawTeamMembers?.map(userOrg => {
    const profile = Array.isArray(userOrg.profiles) ? userOrg.profiles[0] : userOrg.profiles
    return {
      id: profile?.id || userOrg.user_id,
      email: profile?.email || '',
      full_name: profile?.full_name,
      avatar_url: profile?.avatar_url,
      team_id: userOrg.team_id,
      teams: Array.isArray(userOrg.teams) ? userOrg.teams[0] : userOrg.teams
    }
  }) || []

  // Get all teams for filtering option (only if admin or no team assigned)
  let teams: any[] = []
  if (profile.role === 'admin' || teamScope.type === 'organization') {
    const { data: teamsData } = await supabaseAdmin
      .from('teams')
      .select('id, name, color')
      .eq('organization_id', profile.organization_id)
      .order('name')
    teams = teamsData || []
  }

  // Find the team where current user is a manager
  const { data: managedTeam } = await supabaseAdmin
    .from('teams')
    .select('id, name, color')
    .eq('organization_id', profile.organization_id)
    .eq('manager_id', user.id)
    .single()

  // Get colleagues' birthday data for birthday calculation (same as calendar)
  const { data: teamMembersWithBirthdays } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, birth_date')
    .in('id', teamMemberIds)
    .not('birth_date', 'is', null)
    .order('full_name')

  // Calculate nearest birthday using utility function
  const nearestBirthday = calculateNearestBirthday(teamMembersWithBirthdays || [])

  // Get pending leave requests count based on team scope
  let pendingCount = 0
  
  if (profile.role === 'admin' || profile.role === 'manager') {
    // Use team-based filtering for pending requests with admin client
    const { count } = await supabaseAdmin
      .from('leave_requests')
      .select('id', { count: 'exact' })
      .eq('status', 'pending')
      .in('user_id', teamMemberIds)
    
    pendingCount = count || 0
  }

  const pendingRequestsCount = pendingCount || 0

  // Get current active leave requests to determine who's absent today (team-filtered)
  const todayDate = new Date().toISOString().split('T')[0]
  const { data: currentLeaveRequests } = await supabaseAdmin
    .from('leave_requests')
    .select(`
      id,
      user_id,
      start_date,
      end_date,
      leave_types (
        name,
        color
      ),
      profiles!leave_requests_user_id_fkey (
        id,
        full_name,
        email,
        avatar_url
      )
    `)
    .eq('status', 'approved')
    .lte('start_date', todayDate)
    .gte('end_date', todayDate)
    .in('user_id', teamMemberIds)

  // Split team members into absent and working
  const absentMemberIds = new Set(currentLeaveRequests?.map(req => req.user_id) || [])
  const workingMembers = allTeamMembers?.filter(member => !absentMemberIds.has(member.id)) || []

  return (
    <AppLayout>
      {/* NewLeaveRequestSheet component for dashboard functionality */}
      <NewLeaveRequestSheet
        leaveTypes={leaveTypes || []}
        leaveBalances={leaveBalances || []}
        userProfile={profile}
      />

      <div className="flex flex-col gap-6 py-11">
        <DashboardClient
          profile={profile}
          organizationId={profile.organization_id}
          countryCode={profile.organizations?.country_code || 'PL'}
          userId={user.id}
          userOrg={userOrg}
          teamMemberIds={teamMemberIds}
          teamScope={teamScope}
          teams={teams}
          managedTeam={managedTeam}
          colleagues={teamMembersWithBirthdays || []}
          initialTeamMembers={allTeamMembers}
          initialLeaveBalances={leaveBalances || []}
          initialCurrentLeaves={currentLeaveRequests || []}
          initialPendingCount={pendingCount}
          nearestBirthday={nearestBirthday}
          currentDay={currentDay}
          currentMonth={currentMonth}
          currentDayName={currentDayName}
          currentYear={currentYear}
          monthNames={monthNames}
        />
      </div>
    </AppLayout>
  )
}

