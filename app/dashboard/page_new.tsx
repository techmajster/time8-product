import { AppLayout } from '@/components/app-layout'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LeaveRequestButton } from './components/LeaveRequestButton'
import { NewLeaveRequestSheet } from '@/app/leave/components/NewLeaveRequestSheet'
import { TeamCard } from './components/TeamCard'
import { CurrentDayCard } from './components/CurrentDayCard'
import { BirthdayCard } from './components/BirthdayCard'
import { DashboardCalendar } from './components/DashboardCalendar'
import { getTranslations } from 'next-intl/server'

interface NearestBirthday {
  name: string
  date: Date
  daysUntil: number
}

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

  // Use admin client for better RLS handling
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

  // Get pending leave requests for current user (for balance calculation)
  const { data: userPendingRequests } = await supabase
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
  const workingMembers = allTeamMembers?.filter(member => !absentMemberIds.has(member.id)) || []

  return (
    <AppLayout>
      {/* NewLeaveRequestSheet component for dashboard functionality */}
      <NewLeaveRequestSheet
        leaveTypes={leaveTypes || []}
        leaveBalances={leaveBalances || []}
        userProfile={profile}
        pendingRequests={(userPendingRequests || []).map(req => ({
          leave_type_id: req.leave_types?.id || '',
          days_requested: req.days_requested
        }))}
      />
      
      <div className="py-11">
        <div className="flex flex-col gap-6">
          {/* Greeting Section */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <span className="text-5xl font-light text-foreground">{t('greeting')}</span>
              <Avatar className="w-12 h-12">
                <AvatarImage src={profile.avatar_url || ''} />
                <AvatarFallback>
                  {profile.full_name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-5xl font-semibold text-foreground">
                {profile.full_name?.split(' ')[0] || 'User'}!
              </span>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 text-xl text-foreground">
                <span className="font-normal">{t('vacationBalance', { days: remainingVacationDays })}</span>
                {isVacationOverride && (
                  <span 
                    className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full" 
                    title={t('customBalanceTooltip', { default: workspaceDefault })}
                  >
                    {t('customBalance')}
                  </span>
                )}
              </div>
              <LeaveRequestButton />
            </div>
          </div>

          <div className="flex gap-4">
            {/* Left Column */}
            <div className="flex-1 flex flex-col gap-4">
              {/* Current Day Card */}
              <CurrentDayCard
                todayText={t('today', { dayName: currentDayName })}
                day={currentDay}
                dateText={`${currentDay} ${monthNames[today.getMonth()].toLowerCase()}`}
                year={currentYear}
                workStatus={t('workingToday')}
                workHours="9:00 - 15:00"
              />

              {/* Birthday Card */}
              <BirthdayCard
                title={t('nearestBirthday')}
                noBirthdaysText={t('noBirthdays')}
                name={nearestBirthday?.name}
                daysText={nearestBirthday ? (
                  nearestBirthday.daysUntil === 0
                    ? t('birthdayToday', { date: `${nearestBirthday.date.getDate()} ${monthNames[nearestBirthday.date.getMonth()].toLowerCase()}` })
                    : nearestBirthday.daysUntil === 1
                    ? t('birthdayTomorrow', { date: `${nearestBirthday.date.getDate()} ${monthNames[nearestBirthday.date.getMonth()].toLowerCase()}` })
                    : t('birthdayIn', {
                        date: `${nearestBirthday.date.getDate()} ${monthNames[nearestBirthday.date.getMonth()].toLowerCase()}`,
                        days: nearestBirthday.daysUntil
                      })
                ) : undefined}
                initials={nearestBirthday?.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
              />

              {/* Leave Requests Card */}
              <Card className="flex-row items-end justify-between">
                <CardContent className="flex-1">
                  <div className="flex flex-col gap-2">
                    <div className="text-sm font-medium">{t('leaveRequests')}</div>
                    <div className="text-xl font-semibold">
                      {pendingRequestsCount === 0 ? t('noPending') :
                       pendingRequestsCount === 1 ? t('pendingOne') :
                       t('pendingCount', { count: pendingRequestsCount })}
                    </div>
                  </div>
                </CardContent>
                <CardContent className="flex-shrink-0">
                  <Button asChild className="h-8 px-3 text-xs">
                    <Link href="/leave-requests">{t('goToRequests')}</Link>
                  </Button>
                </CardContent>
              </Card>

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
              <DashboardCalendar
                organizationId={profile.organization_id}
                countryCode={profile.organizations?.country_code || 'PL'}
                userId={user.id}
                colleagues={teamMembersWithBirthdays || []}
                teamMemberIds={teamMemberIds}
                teamScope={teamScope}
                calendarTitle={t('calendarTitle')}
                badgeText={t('calendarBadge')}
                lastUpdateLabel={t('lastUpdate')}
                lastUpdateUser="Paweł Chróściak"
                lastUpdateDate="28.06.2025"
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

