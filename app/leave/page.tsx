import { AppLayout } from '@/components/app-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { LeaveRequestRow } from './components/LeaveRequestRow'
import { LeaveBalanceCard } from './components/LeaveBalanceCard'
import { NewLeaveRequestDialog } from './components/NewLeaveRequestDialog'
import { Plus, Clock, CheckCircle, Calendar } from 'lucide-react'
import Link from 'next/link'
import { UserProfile } from '@/types/leave'

export default async function LeaveRequestsPage({ searchParams }: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Await searchParams
  const resolvedSearchParams = await searchParams

  // Get user profile
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

  // Get leave requests based on role
  const isManagerOrAdmin = profile.role === 'admin' || profile.role === 'manager'
  
  let leaveRequestsQuery = supabase
    .from('leave_requests')
    .select(`
      *,
      leave_types (
        id,
        name,
        color,
        days_per_year
      ),
      profiles!leave_requests_user_id_fkey (
        id,
        full_name,
        email
      ),
      reviewed_by_profile:profiles!leave_requests_reviewed_by_fkey (
        full_name,
        email
      )
    `)
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })

  // If employee, only show their own requests
  if (!isManagerOrAdmin) {
    leaveRequestsQuery = leaveRequestsQuery.eq('user_id', user.id)
  }

  const { data: leaveRequests, error } = await leaveRequestsQuery

  if (error) {
    console.error('Error fetching leave requests:', error)
  }

  // Get leave balances for current user (only for leave types that require balances)
  const { data: leaveBalances, error: balanceError } = await supabase
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
    .eq('leave_types.requires_balance', true) // Only fetch balances for leave types that require them

  // Get leave types for the new request dialog
  const { data: leaveTypes } = await supabase
    .from('leave_types')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .order('name')

  // Create user profile for validation
  const userProfile: UserProfile = {
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email,
    role: profile.role,
    employment_start_date: profile.employment_start_date,
    organization_id: profile.organization_id
  }

  // Find the request being edited
  const editRequestId = resolvedSearchParams?.edit as string
  const requestToEdit = editRequestId ? leaveRequests?.find(req => req.id === editRequestId) : null

  // Get quick stats
  const totalRequests = leaveRequests?.length || 0
  const pendingRequests = leaveRequests?.filter(req => req.status === 'pending').length || 0
  const approvedRequests = leaveRequests?.filter(req => req.status === 'approved').length || 0
  const myPendingRequests = leaveRequests?.filter(req => req.user_id === user.id && req.status === 'pending').length || 0

  return (
    <AppLayout>
      <NewLeaveRequestDialog 
        leaveTypes={leaveTypes || []}
        leaveBalances={leaveBalances || []}
        userProfile={userProfile}
      />
      
      <div className="min-h-screen bg-background">
        <div className="p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <PageHeader
              title="Wnioski urlopowe"
              description="Zarządzaj swoimi wnioskami urlopowymi i sprawdzaj status"
            >
              <Link href="/leave?new=true">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nowy wniosek
                </Button>
              </Link>
            </PageHeader>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Main content - Left column (3/4 width) */}
              <div className="lg:col-span-3">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                    <div className="flex items-center">
                      <div className="p-2 bg-warning/10 rounded-lg">
                        <Clock className="h-5 w-5 text-warning" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm font-medium text-muted-foreground">Oczekujące</p>
                      <p className="text-2xl font-semibold text-foreground">{pendingRequests}</p>
                    </div>
                  </div>

                  <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                    <div className="flex items-center">
                      <div className="p-2 bg-success/10 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-success" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm font-medium text-muted-foreground">Zatwierdzone</p>
                      <p className="text-2xl font-semibold text-foreground">{approvedRequests}</p>
                    </div>
                  </div>

                  <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
                    <div className="flex items-center">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm font-medium text-muted-foreground">Wykorzystane dni</p>
                      <p className="text-2xl font-semibold text-foreground">{leaveBalances?.find(b => b.leave_types?.name === 'Urlop wypoczynkowy')?.used_days || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Leave requests list */}
                <div className="bg-card rounded-lg border border-border shadow-sm">
                  <div className="p-6 border-b border-border">
                    <h2 className="text-lg font-medium text-foreground">Wszystkie wnioski</h2>
                    <Link href="/leave?new=true">
                    </Link>
                  </div>
                  
                  <div className="divide-y divide-border">
                    {leaveRequests && leaveRequests.length > 0 ? (
                      leaveRequests.map((request) => (
                        <LeaveRequestRow
                          key={request.id}
                          request={request}
                          isManagerOrAdmin={isManagerOrAdmin}
                          currentUserId={user.id}
                        />
                      ))
                    ) : (
                      <div className="p-8 text-center">
                        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Brak wniosków urlopowych</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Kliknij "Nowy wniosek" aby złożyć swój pierwszy wniosek
                        </p>
                      </div>
                    )}
                  </div>
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