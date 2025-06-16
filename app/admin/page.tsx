import { AppLayout } from '@/components/app-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Settings, Users, Calendar, Plus, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import { LeaveBalanceManager } from './components/LeaveBalanceManager'

export default async function AdminPage() {
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

  // Check if user is admin
  if (profile.role !== 'admin') {
    redirect('/dashboard')
  }

  // Get organization stats
  const { data: teamMembers } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('organization_id', profile.organization_id)

  const { data: leaveTypes } = await supabase
    .from('leave_types')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .order('name')

  // Get all leave balances with proper joins and filtering for balance-required types only
  const { data: rawBalances, error: balancesError } = await supabase
    .from('leave_balances')
    .select(`
      *,
      leave_types!inner (
        id,
        name,
        color,
        requires_balance
      )
    `)
    .eq('organization_id', profile.organization_id)
    .eq('year', new Date().getFullYear())
    .eq('leave_types.requires_balance', true) // Only fetch balances for leave types that require them

  console.log('Raw leave balances:', { rawBalances, balancesError, currentYear: new Date().getFullYear(), orgId: profile.organization_id })

  let leaveBalances: Array<{
    id: string
    user_id: string
    leave_type_id: string
    year: number
    entitled_days: number
    used_days: number
    carried_forward: number
    allocated_days: number
    remaining_days: number
    profiles: { id: string; full_name: string | null; email: string; role: string } | null
    leave_types: { id: string; name: string; color: string }
  }> = []
  if (rawBalances && rawBalances.length > 0) {
    const userIds = rawBalances.map(b => b.user_id)

    const { data: users } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .in('id', userIds)

    // Combine the data and map column names to match component expectations
    leaveBalances = rawBalances
      .map(balance => ({
        ...balance,
        allocated_days: balance.entitled_days, // Map entitled_days to allocated_days for component compatibility
        remaining_days: balance.entitled_days - balance.used_days, // Calculate remaining days
        profiles: users?.find(u => u.id === balance.user_id) || null,
        leave_types: balance.leave_types // This already comes from the join
      }))
      .filter(balance => balance.profiles !== null) as Array<{
        id: string
        user_id: string
        leave_type_id: string
        year: number
        entitled_days: number
        used_days: number
        carried_forward: number
        allocated_days: number
        remaining_days: number
        profiles: { id: string; full_name: string | null; email: string; role: string }
        leave_types: { id: string; name: string; color: string }
      }>
  }

  console.log('Final leave balances:', leaveBalances)

  // Get recent leave requests for overview
  const { data: recentRequests } = await supabase
    .from('leave_requests')
    .select(`
      id,
      status,
      created_at,
      profiles!user_id (
        full_name,
        email
      )
    `)
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <div className="p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-foreground">Panel Administratora</h1>
              <p className="text-muted-foreground mt-1">
                Zarządzaj saldami urlopowymi i konfiguracją organizacji
              </p>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Członkowie zespołu</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{teamMembers?.length || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">aktywnych użytkowników</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Typy urlopów</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{leaveTypes?.length || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">skonfigurowanych typów</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Salda urlopowe</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{leaveBalances?.length || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">dla roku {new Date().getFullYear()}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Ostatnie wnioski</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{recentRequests?.length || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">w ostatnim czasie</p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Leave Balance Management - Takes up 2/3 of the space */}
              <div className="xl:col-span-2">
                <LeaveBalanceManager 
                  teamMembers={teamMembers || []}
                  leaveTypes={leaveTypes || []}
                  leaveBalances={leaveBalances as any[]}
                  organizationId={profile.organization_id}
                />
              </div>

              {/* Admin Actions & Quick Info - Takes up 1/3 of the space */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Szybkie akcje
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button asChild className="w-full" variant="outline">
                      <Link href="/team">
                        <Users className="h-4 w-4 mr-2" />
                        Zarządzaj zespołem
                      </Link>
                    </Button>
                    <Button asChild className="w-full" variant="outline">
                      <Link href="/admin/leave-types">
                        <Plus className="h-4 w-4 mr-2" />
                        Konfiguruj typy urlopów
                      </Link>
                    </Button>
                    <Button asChild className="w-full" variant="outline">
                      <Link href="/leave">
                        <Calendar className="h-4 w-4 mr-2" />
                        Przegląd wniosków
                      </Link>
                    </Button>
                    <Button asChild className="w-full" variant="outline">
                      <Link href="/admin/holidays">
                        <CalendarDays className="h-4 w-4 mr-2" />
                        Zarządzaj świętami
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* Recent Requests */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Ostatnie wnioski</CardTitle>
                    <CardDescription>Najnowsze wnioski urlopowe</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentRequests && recentRequests.length > 0 ? (
                      <div className="space-y-3">
                        {recentRequests.map((request) => (
                          <div key={request.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div>
                              <p className="text-sm font-medium">
                                {(request as any).profiles?.full_name || (request as any).profiles?.email}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(request.created_at).toLocaleDateString('pl-PL')}
                              </p>
                            </div>
                            <Badge className={
                              request.status === 'pending' ? 'bg-warning/10 text-warning-foreground border-warning/20 dark:bg-warning/10 dark:text-warning-foreground dark:border-warning/20' :
                              request.status === 'approved' ? 'bg-success/10 text-success-foreground border-success/20 dark:bg-success/10 dark:text-success-foreground dark:border-success/20' :
                              'bg-destructive/10 text-destructive-foreground border-destructive/20 dark:bg-destructive/10 dark:text-destructive-foreground dark:border-destructive/20'
                            }>
                              {request.status === 'pending' ? 'Oczekujący' : request.status === 'approved' ? 'Zatwierdzony' : 'Odrzucony'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Brak ostatnich wniosków</p>
                    )}
                  </CardContent>
                </Card>

                {/* Organization Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informacje o organizacji</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium">Nazwa organizacji</p>
                        <p className="text-sm text-muted-foreground">{profile.organizations?.name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Twoja rola</p>
                        <p className="text-sm text-muted-foreground">Administrator</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Rok podatkowy</p>
                        <p className="text-sm text-muted-foreground">{new Date().getFullYear()}</p>
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