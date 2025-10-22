import { AppLayout } from '@/components/app-layout'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Settings, Users, Calendar, Plus, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'


export default async function AdminPage() {
  const t = await getTranslations('admin')
  const tCommon = await getTranslations('common')
  
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // MULTI-ORG UPDATE: Get user profile and organization via user_organizations
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
        name
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)
    
  // If we have an active org cookie, use that specific org, otherwise use default
  if (activeOrgId) {
    userOrgQuery = userOrgQuery.eq('organization_id', activeOrgId)
    console.log('🍪 Admin: Using active organization from cookie:', activeOrgId)
  } else {
    userOrgQuery = userOrgQuery.eq('is_default', true)
    console.log('🏠 Admin: Using default organization (no active cookie)')
  }
  
  const { data: userOrg } = await userOrgQuery.single()

  if (!userOrg) {
    redirect('/onboarding')
  }

  // Add organization context to profile for backward compatibility
  profile.organization_id = userOrg.organization_id
  profile.role = userOrg.role
  profile.organizations = userOrg.organizations

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
    .select('id, name, color, leave_category, requires_balance, days_per_year')
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
              <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
              <p className="text-muted-foreground mt-1">
                {t('description')}
              </p>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t('teamMembersCard')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{teamMembers?.length || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">{t('activeUsers')}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t('leaveTypesCard')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{leaveTypes?.length || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">{t('configuredTypes')}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t('leaveBalancesCard')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{leaveBalances?.length || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">{t('forYear')} {new Date().getFullYear()}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t('recentRequestsCard')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{recentRequests?.length || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">{t('recently')}</p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 xl:grid-cols-1 gap-8">
              {/* Admin Actions */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      {t('quickActions')}
                    </CardTitle>
                    <CardDescription>
                      {t('quickActionsDescription')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Organization Settings */}
                    <Link href="/admin/settings">
                      <Button variant="outline" className="w-full justify-start">
                        <Settings className="h-4 w-4 mr-2" />
                        {t('organizationSettings')}
                      </Button>
                    </Link>

                    {/* Team Management */}
                    <Link href="/team">
                      <Button variant="outline" className="w-full justify-start">
                        <Users className="h-4 w-4 mr-2" />
                        {t('teamManagement')}
                      </Button>
                    </Link>


                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>{t('recentActivity')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentRequests && recentRequests.length > 0 ? (
                      <div className="space-y-4">
                        {recentRequests.map((request) => (
                          <div key={request.id} className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">
                                {(request.profiles as any)?.full_name || (request.profiles as any)?.email}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(request.created_at).toLocaleDateString('pl-PL')}
                              </p>
                            </div>
                            <Badge variant={
                              request.status === 'approved' ? 'default' :
                              request.status === 'pending' ? 'secondary' : 'destructive'
                            }>
                              {request.status === 'pending' ? t('pending') :
                               request.status === 'approved' ? t('approved') : 
                               request.status === 'rejected' ? t('rejected') : request.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t('noRecentActivity')}</p>
                    )}
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