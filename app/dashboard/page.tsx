import { AppLayout } from '@/components/app-layout'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CalendarDays, Clock, Gift, Users, Plus, HelpCircle, Briefcase, TreePalm, UserCheck } from 'lucide-react'
import { LeaveRequestButton } from './components/LeaveRequestButton'
import { NewLeaveRequestSheet } from '@/app/leave/components/NewLeaveRequestSheet'
import { TeamCard } from './components/TeamCard'
import CalendarClient from '@/app/calendar/components/CalendarClient'

interface NearestBirthday {
  name: string
  date: Date
  daysUntil: number
}

export default async function DashboardPage() {
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
    console.log('🍪 Dashboard: Using active organization from cookie:', activeOrgId)
  } else {
    userOrgQuery = userOrgQuery.eq('is_default', true)
    console.log('🏠 Dashboard: Using default organization (no active cookie)')
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

  // Get current date for display
  const today = new Date()
  const currentDay = today.getDate()
  const currentMonth = today.toLocaleDateString('pl-PL', { month: 'long' })

  // Calculate days until weekend (Saturday)
  const currentDayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysUntilWeekend = currentDayOfWeek === 0 ? 6 : (6 - currentDayOfWeek) // If Sunday, 6 days to Saturday, otherwise calculate
  const isWeekend = currentDayOfWeek === 0 || currentDayOfWeek === 6 // Sunday or Saturday

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

  console.log('🏠 Dashboard - team scope and member IDs:', {
    count: teamMemberIds.length,
    teamScope,
    organizationId: profile.organization_id,
    userRole: profile.role,
    userTeamId: userOrg.team_id,
    restrictByGroup,
    memberIds: teamMemberIds
  })

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

  console.log('🏠 Dashboard - transformed team members:', { 
    count: allTeamMembers.length,
    members: allTeamMembers.map(m => ({ id: m.id, email: m.email, team_id: m.team_id }))
  })

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

  // Calculate nearest birthday
  const calculateNearestBirthday = (): NearestBirthday | null => {
    if (!teamMembersWithBirthdays || teamMembersWithBirthdays.length === 0) {
      return null
    }

    const today = new Date()
    const currentYear = today.getFullYear()
    
    let nearestBirthday: NearestBirthday | null = null
    let minDaysUntilBirthday = Infinity

    teamMembersWithBirthdays.forEach((member: any) => {
      if (!member.birth_date) return
      
      const birthDate = new Date(member.birth_date)
      const thisYearBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate())
      
      // If birthday already passed this year, use next year's birthday
      if (thisYearBirthday < today) {
        thisYearBirthday.setFullYear(currentYear + 1)
      }
      
      const daysUntilBirthday = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysUntilBirthday < minDaysUntilBirthday) {
        minDaysUntilBirthday = daysUntilBirthday
        nearestBirthday = {
          name: member.full_name,
          date: thisYearBirthday,
          daysUntil: daysUntilBirthday
        }
      }
    })

    return nearestBirthday
  }

  const nearestBirthday = calculateNearestBirthday()

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
  const absentMembers = currentLeaveRequests?.map(req => ({
    ...req.profiles,
    leaveType: req.leave_types,
    endDate: req.end_date
  })) || []
  
  const workingMembers = allTeamMembers?.filter(member => !absentMemberIds.has(member.id)) || []

      return (
      <AppLayout>
        {/* NewLeaveRequestSheet component for dashboard functionality */}
        <NewLeaveRequestSheet 
          leaveTypes={leaveTypes || []} 
          leaveBalances={leaveBalances || []} 
          userProfile={profile} 
        />
        
        <div className="p-8">
          <div className="flex flex-col gap-6">
                        {/* Greeting Section */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <span className="text-5xl font-light text-foreground">Cześć</span>
                <Avatar className="w-12 h-12">
                  <AvatarImage src="" />
                  <AvatarFallback>
                    {profile.full_name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-5xl font-semibold text-foreground">
                  {profile.full_name?.split(' ')[0] || 'Bartek'}!
                </span>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 text-xl text-foreground">
                  <span className="font-normal">Masz jeszcze</span>
                  <span className="font-semibold">{remainingVacationDays} dni urlopu</span>
                  {isVacationOverride && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full" title={`Niestandardowe saldo (domyślnie: ${workspaceDefault} dni)`}>
                      Niestandardowe
                    </span>
                  )}
                </div>
                <LeaveRequestButton />
              </div>
            </div>

            <div className="flex gap-4">
              {/* Left Column */}
              <div className="flex-1 flex flex-col gap-4">
                {/* Top Cards Row */}
                <div className="flex gap-4">
                  {/* Today Card */}
                  <div className="w-32 h-32 border border-border rounded-xl bg-card flex flex-col items-center justify-center mb-1">
                    <div className="text-sm font-medium text-center text-foreground">Dziś</div>
                    <div className="text-5xl font-semibold text-center text-foreground leading-none mb-1">
                      {currentDay}
                    </div>
                    <div className="text-sm font-medium text-center text-foreground">{currentMonth}</div>
                  </div>

                  {/* Weekend Card */}
                  <div className="flex-1 h-32 border border-border rounded-xl bg-card p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Weekend</span>
                      <Clock className="w-4 h-4 text-foreground" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="text-xl leading-7 text-foreground">
                        {isWeekend ? (
                          <span className="font-semibold">Mamy weekend! 🎉</span>
                        ) : daysUntilWeekend === 1 ? (
                          <>
                            <span className="font-normal">już </span>
                            <span className="font-semibold">jutro!</span>
                          </>
                        ) : (
                          <>
                            <span className="font-normal">już za </span>
                            <span className="font-semibold">{daysUntilWeekend} dni!</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Birthday Card */}
                  <div className="flex-1 h-32 border border-border rounded-xl bg-card p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Najbliższe urodziny</span>
                      <Gift className="w-4 h-4 text-foreground" />
                    </div>
                    <div className="flex flex-col">
                      {nearestBirthday ? (
                        <>
                          <div className="text-sm font-semibold text-foreground">{nearestBirthday.name}</div>
                          <div className="text-sm font-normal text-muted-foreground">
                            {nearestBirthday.date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })}, 
                            {nearestBirthday.daysUntil === 0 ? ' dziś!' : 
                             nearestBirthday.daysUntil === 1 ? ' jutro' :
                             ` za ${nearestBirthday.daysUntil} dni`}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-sm font-semibold text-foreground">Brak urodzin</div>
                          <div className="text-sm font-normal text-muted-foreground">w najbliższym czasie</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Leave Requests Card */}
                <div className="border border-border rounded-xl bg-card p-6 flex items-end justify-between">
                  <div className="flex flex-col gap-2">
                    <div className="text-sm font-medium text-foreground">Wnioski urlopowe</div>
                    <div className="text-xl font-semibold text-foreground">
                      {pendingRequestsCount === 0 ? 'Brak oczekujących' : 
                       pendingRequestsCount === 1 ? '1 oczekujący' :
                       `${pendingRequestsCount} oczekujących`}
                    </div>
                  </div>
                  <Button asChild className="h-8 px-3 text-xs">
                    <Link href="/leave-requests">Przejdź do wniosków</Link>
                  </Button>
                </div>

                {/* Team Card */}
                <TeamCard
                  allTeamMembers={(allTeamMembers || []).map((member: any) => ({
                    ...member,
                    teams: Array.isArray(member.teams) ? member.teams[0] : member.teams
                  }))}
                  absentMembers={currentLeaveRequests?.map((req: any) => ({
                    user_id: req.user_id,
                    profiles: {
                      ...req.profiles,
                      teams: null,
                      team_id: null
                    },
                    leaveType: req.leave_types,
                    endDate: req.end_date
                  })) || []}
                  teams={teams || []}
                  defaultTeamId={managedTeam?.id}
                  userRole={profile.role}
                />
              </div>

              {/* Right Column - Calendar */}
              <div className="flex-1">
                <Card className="border border-border">
                  <CardContent className="p-6 py-0">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold text-foreground">
                        Kalendarz urlopów
                      </h3>
                    </div>
                    
                    <CalendarClient 
                      organizationId={profile.organization_id}
                      countryCode={profile.organizations?.country_code || 'PL'}
                      userId={user.id}
                      colleagues={teamMembersWithBirthdays || []}
                      teamMemberIds={teamMemberIds}
                      teamScope={teamScope}
                      showHeader={false}
                      showPadding={false}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
    </AppLayout>
  )
}
