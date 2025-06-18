import { AppLayout } from '@/components/app-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import { Calendar, Users, TrendingDown, AlertTriangle, CalendarDays } from 'lucide-react'
import { TeamCalendarView } from './components/TeamCalendarView'
import { CapacityOverview } from './components/CapacityOverview'
import { UpcomingLeaves } from './components/UpcomingLeaves'

export default async function CalendarPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
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

  // Get all team members
  const { data: teamMembers } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, avatar_url')
    .eq('organization_id', profile.organization_id)
    .order('full_name')

  // Get leave requests for the next 12 months (extended from 3 months)
  const startDate = new Date()
  const endDate = new Date()
  endDate.setMonth(endDate.getMonth() + 12) // Extended to 12 months

  console.log('Calendar date range:', {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  })

  console.log('User profile organization_id:', profile.organization_id)

  const { data: leaveRequestsRaw, error: leaveRequestsError } = await supabase
    .from('leave_requests')
    .select(`
      id,
      user_id,
      start_date,
      end_date,
      status,
      days_requested,
      organization_id,
      leave_types (
        name,
        color
      ),
      profiles!leave_requests_user_id_fkey (
        full_name,
        email,
        avatar_url
      )
    `)
    .eq('organization_id', profile.organization_id)
    .gte('start_date', startDate.toISOString().split('T')[0])
    .lte('start_date', endDate.toISOString().split('T')[0])
    .in('status', ['approved', 'pending'])
    .order('start_date')

  // Transform the data to match the expected interface
  const leaveRequests = (leaveRequestsRaw || []).map((request: any) => ({
    id: request.id,
    userId: request.user_id,
    startDate: request.start_date,
    endDate: request.end_date,
    status: request.status,
    workingDays: request.days_requested || 0,
    // Also include snake_case properties for CapacityOverview component
    user_id: request.user_id,
    start_date: request.start_date,
    end_date: request.end_date,
    working_days: request.days_requested || 0,
    leaveType: {
      name: request.leave_types?.name || 'Unknown',
      color: request.leave_types?.color || '#gray-500'
    },
    // Also include snake_case for CapacityOverview
    leave_types: {
      name: request.leave_types?.name || 'Unknown',
      color: request.leave_types?.color || '#gray-500'
    },
    user: {
      fullName: request.profiles?.full_name || 'Unknown User',
      email: request.profiles?.email || '',
      avatarUrl: request.profiles?.avatar_url || null
    },
    // Also include snake_case for CapacityOverview
    profiles: {
      full_name: request.profiles?.full_name || 'Unknown User',
      email: request.profiles?.email || '',
      avatar_url: request.profiles?.avatar_url || null
    }
  }))

  console.log('Transformed leave requests:', leaveRequests?.length || 0, 'requests')
  if (leaveRequestsError) {
    console.error('Leave requests query error:', leaveRequestsError)
  }

  // Get organization's country code for holiday filtering
  const { data: orgSettings } = await supabase
    .from('organizations')
    .select('country_code')
    .eq('id', profile.organization_id)
    .single()

  const countryCode = orgSettings?.country_code || 'PL'

  // Get holidays for the same period (filtered by organization's country)
  const { data: holidaysRaw, error: holidaysError } = await supabase
    .from('company_holidays')
    .select('*')
    .or(`organization_id.eq.${profile.organization_id},and(type.eq.national,country_code.eq.${countryCode})`)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .order('date')

  if (holidaysError) {
    console.error('Error fetching holidays:', holidaysError)
  }

  // Transform holidays to match the expected interface
  const holidays = holidaysRaw?.map((holiday: any) => ({
    id: holiday.id,
    name: holiday.name,
    date: holiday.date,
    holiday_type: holiday.type || 'organization' // Map 'type' to 'holiday_type'
  })) || []

  console.log('Holidays data:', holidays)

  // Calculate capacity metrics
  const totalTeamMembers = teamMembers?.length || 0
  const currentDate = new Date()
  
  // Get leaves for current week
  const weekStart = new Date(currentDate)
  weekStart.setDate(currentDate.getDate() - currentDate.getDay())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const currentWeekLeaves = leaveRequests?.filter(leave => {
    const leaveStart = new Date(leave.startDate)
    const leaveEnd = new Date(leave.endDate)
    return leave.status === 'approved' && (
      (leaveStart <= weekEnd && leaveEnd >= weekStart)
    )
  }) || []

  const peopleOutThisWeek = new Set(currentWeekLeaves.map(leave => leave.userId)).size
  const capacityThisWeek = totalTeamMembers > 0 ? Math.round((1 - peopleOutThisWeek / totalTeamMembers) * 100) : 100

  // Get leaves for next week
  const nextWeekStart = new Date(weekEnd)
  nextWeekStart.setDate(weekEnd.getDate() + 1)
  const nextWeekEnd = new Date(nextWeekStart)
  nextWeekEnd.setDate(nextWeekStart.getDate() + 6)

  const nextWeekLeaves = leaveRequests?.filter(leave => {
    const leaveStart = new Date(leave.startDate)
    const leaveEnd = new Date(leave.endDate)
    return leave.status === 'approved' && (
      (leaveStart <= nextWeekEnd && leaveEnd >= nextWeekStart)
    )
  }) || []

  const peopleOutNextWeek = new Set(nextWeekLeaves.map(leave => leave.userId)).size
  const capacityNextWeek = totalTeamMembers > 0 ? Math.round((1 - peopleOutNextWeek / totalTeamMembers) * 100) : 100

  // Count pending requests
  const pendingRequests = leaveRequests?.filter(leave => leave.status === 'pending').length || 0

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <div className="p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <PageHeader
              title="Kalendarz zespołu"
              description="Zobacz, kto kiedy jest niedostępny i planuj obciążenie zespołu"
            />

            {/* Capacity Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Zespół</CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalTeamMembers}</div>
                  <p className="text-xs text-muted-foreground">
                    aktywnych członków
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Dostępność ten tydzień</CardTitle>
                  <TrendingDown className={`h-4 w-4 ${capacityThisWeek >= 80 ? 'text-success' : capacityThisWeek >= 60 ? 'text-warning' : 'text-destructive'}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{capacityThisWeek}%</div>
                  <p className="text-xs text-muted-foreground">
                    {peopleOutThisWeek} osób na urlopie
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Dostępność przyszły tydzień</CardTitle>
                  <TrendingDown className={`h-4 w-4 ${capacityNextWeek >= 80 ? 'text-success' : capacityNextWeek >= 60 ? 'text-warning' : 'text-destructive'}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{capacityNextWeek}%</div>
                  <p className="text-xs text-muted-foreground">
                    {peopleOutNextWeek} osób na urlopie
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Oczekujące wnioski</CardTitle>
                  <AlertTriangle className={`h-4 w-4 ${pendingRequests > 0 ? 'text-warning' : 'text-success'}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingRequests}</div>
                  <p className="text-xs text-muted-foreground">
                    wymagają zatwierdzenia
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Main Calendar View */}
              <div className="xl:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Kalendarz urlopów
                    </CardTitle>
                    <CardDescription>
                      Przegląd urlopów zespołu na najbliższe 3 miesiące
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TeamCalendarView 
                      teamMembers={teamMembers || []}
                      leaveRequests={leaveRequests || []}
                      holidays={holidays || []}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar - Upcoming Leaves and Capacity Details */}
              <div className="xl:col-span-1 space-y-6">
                {/* Upcoming Leaves */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5" />
                      Nadchodzące urlopy
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <UpcomingLeaves leaveRequests={leaveRequests || []} />
                  </CardContent>
                </Card>

                {/* Capacity Planning */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5" />
                      Planowanie obciążenia
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CapacityOverview 
                      teamMembers={teamMembers || []}
                      leaveRequests={leaveRequests || []}
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