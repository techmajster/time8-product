import { AppLayout } from '@/components/app-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LeaveBalanceCard } from '../leave/components/LeaveBalanceCard'

export default async function DashboardPage() {
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
        name,
        subscription_tier
      )
    `)
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    redirect('/onboarding')
  }

  // Get leave balances for current user
  const { data: leaveBalances } = await supabase
    .from('leave_balances')
    .select(`
      *,
      leave_types (
        name,
        color
      )
    `)
    .eq('user_id', user.id)
    .eq('year', new Date().getFullYear())

  // Get team count for organization
  const { count: teamCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', profile.organization_id)

  // Get pending leave requests count
  const { count: pendingRequestsCount } = await supabase
    .from('leave_requests')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', profile.organization_id)
    .eq('status', 'pending')

  // Calculate vacation balance for quick display
  const vacationBalance = leaveBalances?.find(b => b.leave_types?.name === 'Urlop wypoczynkowy')

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <div className="p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Main content - Left column (3/4 width) */}
              <div className="lg:col-span-3">
                {/* Header */}
                <div className="mb-8">
                  <h1 className="text-2xl font-semibold text-foreground">Pulpit</h1>
                  <p className="text-muted-foreground mt-1">Witaj ponownie, {profile.full_name || user.email}</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {/* Leave Balance Card */}
                  <Card className="bg-card border-border shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Saldo urlopowe</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {vacationBalance ? (
                        <>
                          <div className="text-2xl font-bold text-foreground">
                            {vacationBalance.remaining_days} dni
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            pozostało w tym roku
                          </p>
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground">Brak danych</div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Team Members Card */}
                  <Card className="bg-card border-border shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Zespół</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-foreground">{teamCount || 0}</div>
                      <p className="text-xs text-muted-foreground mt-1">członków organizacji</p>
                    </CardContent>
                  </Card>

                  {/* Pending Requests Card - only for managers/admins */}
                  {profile.role === 'admin' && (
                    <Card className="bg-card border-border shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Oczekujące wnioski</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground">{pendingRequestsCount || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">do zatwierdzenia</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
                </div>

              {/* Right column - Leave Balance */}
              <div className="lg:col-span-1">
                <div className="sticky top-6">
                  <LeaveBalanceCard 
                    leaveBalances={leaveBalances || []} 
                    showDetails={true} 
                    displayMode="vertical"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}