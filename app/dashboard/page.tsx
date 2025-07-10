import { AppLayout } from '@/components/app-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CalendarDays, Clock, Gift, Users, ChevronLeft, ChevronRight, Plus, HelpCircle, Briefcase, TreePalm, UserCheck } from 'lucide-react'
import { LeaveRequestButton } from './components/LeaveRequestButton'
import { NewLeaveRequestSheet } from '@/app/leave/components/NewLeaveRequestSheet'
import { TeamCard } from './components/TeamCard'

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

  // Get user profile with organization details
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      *,
      organizations (
        id,
        name
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

  // Get all team members with their details and team info
  const { data: allTeamMembers } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      avatar_url,
      date_of_birth,
      team_id,
      teams!profiles_team_id_fkey (
        id,
        name,
        color
      )
    `)
    .eq('organization_id', profile.organization_id)
    .order('full_name')

  // Get all teams for filtering option
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, color')
    .eq('organization_id', profile.organization_id)
    .order('name')

  // Find the team where current user is a manager
  const { data: managedTeam } = await supabase
    .from('teams')
    .select('id, name, color')
    .eq('organization_id', profile.organization_id)
    .eq('manager_id', user.id)
    .single()

  // Filter team members with birthdays for birthday calculation
  const teamMembersWithBirthdays = allTeamMembers?.filter(member => member.date_of_birth) || []

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
      if (!member.date_of_birth) return
      
      const birthDate = new Date(member.date_of_birth)
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

  // Get pending leave requests count for the organization
  let pendingCount = 0
  
  if (profile.role === 'admin' || profile.role === 'manager') {
    // Managers and admins see all pending requests in their organization
    // First get all user IDs from the organization
    const { data: orgUsers } = await supabase
      .from('profiles')
      .select('id')
      .eq('organization_id', profile.organization_id)
    
    const orgUserIds = orgUsers?.map(user => user.id) || []
    
    const { count } = await supabase
      .from('leave_requests')
      .select('id', { count: 'exact' })
      .eq('status', 'pending')
      .in('user_id', orgUserIds)
    
    pendingCount = count || 0
  }

  const pendingRequestsCount = pendingCount || 0

  // Get current active leave requests to determine who's absent today
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
    .in('user_id', allTeamMembers?.map((member: any) => member.id) || [])

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
            <div className="flex items-center justify-between py-3">
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
                <Card className="border border-neutral-200 py-0">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-neutral-950 mb-6">Kalendarz urlopów</h3>
                    
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between h-8 mb-6">
                      <Button variant="ghost" size="sm" className="w-8 h-8 p-0 opacity-50">
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-base font-semibold text-neutral-950">Lipiec 2025</span>
                      <Button variant="ghost" size="sm" className="w-8 h-8 p-0 opacity-50">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="space-y-2">
                      {/* Day Headers */}
                      <div className="grid grid-cols-7 gap-2">
                        {['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'].map((day) => (
                          <div key={day} className="text-xs text-neutral-500 text-center p-2">
                            {day.slice(0, 2)}
                          </div>
                        ))}
                      </div>

                      {/* Calendar Days */}
                      <div className="grid grid-cols-7 gap-2">
                        {/* Week 1 */}
                        <div className="h-24 bg-neutral-100 rounded-lg p-1.5 opacity-50">
                          <span className="text-base text-neutral-500">30</span>
                        </div>
                        <div className="h-24 bg-neutral-100 rounded-lg p-1.5">
                          <span className="text-base text-neutral-950">1</span>
                        </div>
                        <div className="h-24 bg-neutral-100 rounded-lg p-1.5 relative">
                          <span className="text-base text-neutral-950">2</span>
                          <div className="absolute top-2 right-2 flex flex-col gap-1">
                            <div className="w-8 h-8 bg-neutral-100 rounded-full border-2 border-white -mb-2" />
                            <div className="w-8 h-8 bg-neutral-100 rounded-full border-2 border-white" />
                          </div>
                        </div>
                        <div className="h-24 bg-neutral-100 rounded-lg p-1.5 relative">
                          <span className="text-base text-neutral-950">3</span>
                          <div className="absolute top-2 right-2 flex flex-col gap-1">
                            <div className="w-8 h-8 bg-neutral-100 rounded-full border-2 border-white -mb-2" />
                            <div className="w-8 h-8 bg-neutral-100 rounded-full border-2 border-white" />
                          </div>
                        </div>
                        <div className="h-24 bg-neutral-100 rounded-lg p-1.5 relative">
                          <span className="text-base text-neutral-950">4</span>
                          <div className="absolute top-2 right-2 flex flex-col gap-1">
                            <div className="w-8 h-8 bg-neutral-100 rounded-full border-2 border-white -mb-2" />
                            <div className="w-8 h-8 bg-neutral-100 rounded-full border-2 border-white" />
                          </div>
                        </div>
                        <div className="h-24 bg-neutral-100 rounded-lg p-1.5">
                          <span className="text-base text-neutral-950">5</span>
                        </div>
                        <div className="h-24 bg-neutral-100 rounded-lg p-1.5">
                          <span className="text-base text-neutral-950">6</span>
                        </div>

                        {/* Week 2 */}
                        <div className="h-24 bg-neutral-100 rounded-lg p-1.5 relative">
                          <span className="text-base text-neutral-950">7</span>
                          <Gift className="w-5 h-5 absolute bottom-2 left-2" />
                          <div className="absolute top-2 right-2 flex flex-col gap-1">
                            <div className="w-8 h-8 bg-neutral-100 rounded-full border-2 border-white -mb-2" />
                            <div className="w-8 h-8 bg-neutral-100 rounded-full border-2 border-white" />
                          </div>
                        </div>
                        {Array.from({ length: 6 }, (_, i) => (
                          <div key={i + 8} className="h-24 bg-neutral-100 rounded-lg p-1.5">
                            <span className="text-base text-neutral-950">{i + 8}</span>
                          </div>
                        ))}

                        {/* Remaining weeks */}
                        {Array.from({ length: 21 }, (_, i) => (
                          <div key={i + 14} className="h-24 bg-neutral-100 rounded-lg p-1.5">
                            <span className="text-base text-neutral-950">{i + 14}</span>
                          </div>
                        ))}
                      </div>
                    </div>
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
