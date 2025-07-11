import { AppLayout } from '@/components/app-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CalendarDays, Clock, Gift, Users, Plus, HelpCircle, Briefcase, TreePalm, UserCheck } from 'lucide-react'
import { LeaveRequestButton } from './components/LeaveRequestButton'
import { NewLeaveRequestSheet } from '@/app/leave/components/NewLeaveRequestSheet'
import { TeamCard } from './components/TeamCard'
import { getUserTeamScope, getTeamMemberIds } from '@/lib/team-utils'
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

  // Get user profile with organization details including country_code
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      *,
      organizations (
        id,
        name,
        country_code
      )
    `)
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    redirect('/onboarding')
  }

  // Get current date for display
  const today = new Date()
  const currentDay = today.getDate()
  const currentMonth = today.toLocaleDateString('pl-PL', { month: 'long' })

  // Calculate days until weekend (Saturday)
  const currentDayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysUntilWeekend = currentDayOfWeek === 0 ? 6 : (6 - currentDayOfWeek) // If Sunday, 6 days to Saturday, otherwise calculate
  const isWeekend = currentDayOfWeek === 0 || currentDayOfWeek === 6 // Sunday or Saturday

  // Get leave balances for current user (only for leave types that require balances)
  const { data: leaveBalances } = await supabase
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

  // Find vacation leave balance
  const vacationBalance = leaveBalances?.find(b => b.leave_types?.name === 'Urlop wypoczynkowy')
  const remainingVacationDays = vacationBalance?.remaining_days || 0

  // Get all leave types for the organization
  const { data: leaveTypes } = await supabase
    .from('leave_types')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .order('name')

  // Get team scope for filtering data
  const teamScope = await getUserTeamScope(user.id)
  const teamMemberIds = await getTeamMemberIds(teamScope)

  // Get team members based on user's team scope (team filtering logic)
  const { data: allTeamMembers } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      avatar_url,
      team_id,
      teams!profiles_team_id_fkey (
        id,
        name,
        color
      )
    `)
    .in('id', teamMemberIds)
    .order('full_name')

  // Get all teams for filtering option (only if admin or no team assigned)
  let teams: any[] = []
  if (profile.role === 'admin' || teamScope.type === 'organization') {
    const { data: teamsData } = await supabase
      .from('teams')
      .select('id, name, color')
      .eq('organization_id', profile.organization_id)
      .order('name')
    teams = teamsData || []
  }

  // Find the team where current user is a manager
  const { data: managedTeam } = await supabase
    .from('teams')
    .select('id, name, color')
    .eq('organization_id', profile.organization_id)
    .eq('manager_id', user.id)
    .single()

  // Get colleagues' birthday data for birthday calculation (same as calendar)
  const { data: teamMembersWithBirthdays } = await supabase
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
    // Use team-based filtering for pending requests
    const { count } = await supabase
      .from('leave_requests')
      .select('id', { count: 'exact' })
      .eq('status', 'pending')
      .in('user_id', teamMemberIds)
    
    pendingCount = count || 0
  }

  const pendingRequestsCount = pendingCount || 0

  // Get current active leave requests to determine who's absent today (team-filtered)
  const todayDate = new Date().toISOString().split('T')[0]
  const { data: currentLeaveRequests } = await supabase
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
        
        <div className="bg-white min-h-screen">
          {/* Main Content */}
          <div className="p-8">
          <div className="flex flex-col gap-6">
                        {/* Greeting Section */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <span className="text-5xl font-light text-neutral-950">Cześć</span>
                <Avatar className="w-12 h-12">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-neutral-100">
                    {profile.full_name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-5xl font-semibold text-neutral-950">
                  {profile.full_name?.split(' ')[0] || 'Bartek'}!
                </span>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 text-xl text-neutral-950">
                  <span className="font-normal">Masz jeszcze</span>
                  <span className="font-semibold">{remainingVacationDays} dni urlopu</span>
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
<div className="w-32 h-32 border border-neutral-200 rounded-xl bg-card flex flex-col items-center justify-center mb-1">
                    <div className="text-sm font-medium text-center text-neutral-950">Dziś</div>
                    <div className="text-5xl font-semibold text-center text-neutral-950 leading-none mb-1">
                      {currentDay}
                    </div>
                    <div className="text-sm font-medium text-center text-neutral-950">{currentMonth}</div>
                  </div>

                  {/* Weekend Card */}
                  <div className="flex-1 h-32 border border-neutral-200 rounded-xl bg-card p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-950">Weekend</span>
                      <Clock className="w-4 h-4 text-neutral-950" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="text-xl leading-7 text-neutral-950">
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
                  <div className="flex-1 h-32 border border-neutral-200 rounded-xl bg-card p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-950">Najbliższe urodziny</span>
                      <Gift className="w-4 h-4 text-neutral-950" />
                    </div>
                    <div className="flex flex-col">
                      {nearestBirthday ? (
                        <>
                          <div className="text-sm font-semibold text-neutral-950">{nearestBirthday.name}</div>
                          <div className="text-sm font-normal text-neutral-500">
                            {nearestBirthday.date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })}, 
                            {nearestBirthday.daysUntil === 0 ? ' dziś!' : 
                             nearestBirthday.daysUntil === 1 ? ' jutro' :
                             ` za ${nearestBirthday.daysUntil} dni`}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-sm font-semibold text-neutral-950">Brak urodzin</div>
                          <div className="text-sm font-normal text-neutral-500">w najbliższym czasie</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Leave Requests Card */}
                <div className="border border-neutral-200 rounded-xl bg-card p-6 flex items-end justify-between">
                  <div className="flex flex-col gap-2">
                    <div className="text-sm font-medium text-neutral-950">Wnioski urlopowe</div>
                    <div className="text-xl font-semibold text-neutral-950">
                      {pendingRequestsCount === 0 ? 'Brak oczekujących' : 
                       pendingRequestsCount === 1 ? '1 oczekujący' :
                       `${pendingRequestsCount} oczekujących`}
                    </div>
                  </div>
                  <Button asChild className="bg-neutral-900 text-neutral-50 h-8 px-3 text-xs">
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
                <Card className="border border-neutral-200">
                  <CardContent className="p-6 py-0">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold text-neutral-950">
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
      </div>
    </AppLayout>
  )
}
