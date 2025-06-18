import { AppLayout } from '@/components/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Clock, Users, TrendingUp } from 'lucide-react'
import { ScheduleTemplateManager } from './components/ScheduleTemplateManager'
import { WeeklyScheduleView } from './components/WeeklyScheduleView'
import { ScheduleManager } from './components/ScheduleManager'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SchedulePage() {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  // Get user profile for role checking
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    redirect('/auth/login')
  }

  // Get team members with full details for the weekly view
  const { data: teamMembers } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, avatar_url')
    .eq('organization_id', profile.organization_id)
    .order('full_name')

  // Get basic stats for dashboard cards
  const { data: templates } = await supabase
    .from('work_schedule_templates')
    .select('id')
    .eq('organization_id', profile.organization_id)

  const { data: schedules } = await supabase
    .from('employee_schedules')
    .select('id')
    .eq('organization_id', profile.organization_id)

  // Count employees with recent schedules (within last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0]
  
  const { data: recentSchedules } = await supabase
    .from('employee_schedules')
    .select('user_id')
    .eq('organization_id', profile.organization_id)
    .gte('date', cutoffDate)
  
  // Count unique employees with recent schedules
  const activeScheduleCount = recentSchedules 
    ? new Set(recentSchedules.map(s => s.user_id)).size 
    : 0

  const totalTeamMembers = teamMembers?.length || 0
  const totalTemplates = templates?.length || 0
  const totalSchedules = schedules?.length || 0

  // Calculate coverage percentage
  const coveragePercentage = totalTeamMembers > 0 ? Math.round((activeScheduleCount / totalTeamMembers) * 100) : 0

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <div className="p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <PageHeader
              title="Harmonogramy pracy"
              description="Zarządzaj harmonogramami pracy zespołu i planuj obciążenie"
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Zespół</CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalTeamMembers}</div>
                  <p className="text-xs text-muted-foreground">
                    członków zespołu
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pokrycie harmonogramów</CardTitle>
                  <TrendingUp className={`h-4 w-4 ${coveragePercentage >= 80 ? 'text-success' : coveragePercentage >= 60 ? 'text-warning' : 'text-destructive'}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{coveragePercentage}%</div>
                  <p className="text-xs text-muted-foreground">
                    {activeScheduleCount} z {totalTeamMembers} osób
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Szablony</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalTemplates}</div>
                  <p className="text-xs text-muted-foreground">
                    dostępnych wzorców
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Wszystkich harmonogramów</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalSchedules}</div>
                  <p className="text-xs text-muted-foreground">
                    łącznie utworzonych
                  </p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="calendar" className="space-y-6">
              <TabsList>
                <TabsTrigger value="calendar">Widok tygodniowy</TabsTrigger>
                <TabsTrigger value="schedules">Harmonogramy</TabsTrigger>
                <TabsTrigger value="templates">Szablony</TabsTrigger>
              </TabsList>

              <TabsContent value="calendar" className="space-y-4">
                <WeeklyScheduleView 
                  teamMembers={teamMembers || []} 
                  userRole={profile.role} 
                />
              </TabsContent>

              <TabsContent value="schedules" className="space-y-4">
                <ScheduleManager 
                  teamMembers={teamMembers || []} 
                  userRole={profile.role} 
                />
              </TabsContent>

              <TabsContent value="templates" className="space-y-4">
                <ScheduleTemplateManager userRole={profile.role} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppLayout>
  )
} 