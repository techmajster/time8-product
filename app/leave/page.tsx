import { AppLayout } from '@/components/app-layout'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Clock, TreePine, ChevronRight } from 'lucide-react'
import { NewLeaveRequestSheet } from './components/NewLeaveRequestSheet'
import { LeaveRequestButton } from '../dashboard/components/LeaveRequestButton'
import { LeaveRequestsTable } from './components/LeaveRequestsTable'
import { LeaveRequestsListClient } from './components/LeaveRequestsListClient'
import { Card } from '@/components/ui/card'
import { LeaveBalance, LeaveType, UserProfile } from '@/types/leave'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

interface LeaveRequest {
  id: string
  user_id: string
  start_date: string
  end_date: string
  days_requested: number
  reason: string | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  created_at: string
  leave_types: {
    id: string
    name: string
    color: string
  } | null
}

interface MyLeavePageContentProps {
  profile: UserProfile & { organizations: { id: string; name: string } }
  leaveRequests: LeaveRequest[]
  leaveBalances: LeaveBalance[]
  leaveTypes: LeaveType[]
  userId: string
  organizationId: string
}



function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }
  
  return `${formatDate(start)} - ${formatDate(end)}`
}

function getDaysUntilLeave(startDate: string): number {
  const today = new Date()
  const leaveStart = new Date(startDate)
  const diffTime = leaveStart.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

async function MyLeavePageContent({ profile, leaveRequests, leaveBalances, leaveTypes, userId, organizationId }: MyLeavePageContentProps) {
  const t = await getTranslations()
  
  // Calculate summary data
  const vacationBalance = leaveBalances?.find(b => b.leave_types?.name === 'Urlop wypoczynkowy')
  const totalRemainingDays = vacationBalance?.remaining_days || 0
  const carryOverDays = vacationBalance?.carry_over_days || 0

  // Find next upcoming approved leave
  const today = new Date()
  const upcomingLeaves = leaveRequests
    ?.filter(request => 
      request.status === 'approved' && 
      new Date(request.start_date) > today
    )
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

  const nextLeave = upcomingLeaves?.[0]
  const daysUntilNextLeave = nextLeave ? getDaysUntilLeave(nextLeave.start_date) : null
  
  const getDaysText = (count: number) => {
    if (count === 1) return 'dzień'
    return 'dni'
  }

  return (
    <AppLayout>
      <div className="py-11">
        <div className="flex flex-col gap-6">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-sm">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
              {t('leave.page.breadcrumb.dashboard')}
            </Link>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground">{t('leave.page.breadcrumb.leave')}</span>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5">
                <h1 className="text-3xl font-semibold text-foreground">{t('leave.page.title')}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <LeaveRequestButton />
            </div>
          </div>

          {/* Summary Cards - SWAPPED ORDER */}
          <div className="flex gap-6">
            {/* Card 1: Next Leave (was second, now first) */}
            <Card className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-foreground">{t('leave.page.cards.nextLeave.title')}</p>
                <Clock className="w-4 h-4 text-foreground" />
              </div>
              <div className="flex flex-col gap-0.5">
                {nextLeave && daysUntilNextLeave !== null ? (
                  <>
                    <p className="text-xl font-semibold text-foreground">
                      {t('leave.page.cards.nextLeave.inDays', { 
                        days: daysUntilNextLeave, 
                        daysText: getDaysText(daysUntilNextLeave) 
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('leave.page.cards.nextLeave.daysCount', {
                        count: nextLeave.days_requested,
                        daysText: getDaysText(nextLeave.days_requested),
                        dateRange: formatDateRange(nextLeave.start_date, nextLeave.end_date)
                      })}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-semibold text-foreground">{t('leave.page.cards.nextLeave.noPlans')}</p>
                    <p className="text-sm text-muted-foreground">{t('leave.page.cards.nextLeave.noPlansDesc')}</p>
                  </>
                )}
              </div>
            </Card>

            {/* Card 2: Total Remaining (was first, now second) */}
            <Card className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-foreground">{t('leave.page.cards.totalRemaining.title')}</p>
                <TreePine className="w-4 h-4 text-foreground" />
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-xl font-semibold text-foreground">
                  {t('leave.page.cards.totalRemaining.days', { count: totalRemainingDays })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('leave.page.cards.totalRemaining.carryOver', { count: carryOverDays })}
                </p>
              </div>
            </Card>
          </div>

          {/* Leave Requests List with React Query */}
          <LeaveRequestsListClient
            userId={userId}
            organizationId={organizationId}
            initialRequests={leaveRequests || []}
          />
        </div>
      </div>
      
      {/* Sheet for creating new leave requests */}
      <NewLeaveRequestSheet
        leaveTypes={leaveTypes || []}
        leaveBalances={leaveBalances || []}
        userProfile={{
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          role: profile.role,
          employment_start_date: profile.employment_start_date,
          organization_id: profile.organization_id,
          organizations: profile.organizations
        }}
        pendingRequests={(leaveRequests || [])
          .filter(req => req.status === 'pending')
          .map(req => ({
            leave_type_id: req.leave_types?.id || '',
            days_requested: req.days_requested
          }))
        }
      />
    </AppLayout>
  )
}

export default async function MyLeavePage() {
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
        name,
        country_code,
        locale,
        work_mode,
        working_days,
        exclude_public_holidays,
        daily_start_time,
        daily_end_time,
        work_schedule_type,
        shift_count,
        work_shifts
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)
    
  // If we have an active org cookie, use that specific org, otherwise use default
  if (activeOrgId) {
    userOrgQuery = userOrgQuery.eq('organization_id', activeOrgId)
    console.log('🍪 Leave: Using active organization from cookie:', activeOrgId)
  } else {
    userOrgQuery = userOrgQuery.eq('is_default', true)
    console.log('🏠 Leave: Using default organization (no active cookie)')
  }
  
  const { data: userOrg } = await userOrgQuery.single()

  if (!userOrg) {
    redirect('/onboarding')
  }

  // Add organization context to profile for backward compatibility
  profile.organization_id = userOrg.organization_id
  profile.role = userOrg.role
  profile.organizations = userOrg.organizations

  // Use admin client for better data access
  const supabaseAdmin = createAdminClient()

  // Get leave requests for this user
  const { data: leaveRequests } = await supabase
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
    .order('created_at', { ascending: false })

  // Get leave balances for current user using admin client
  const { data: leaveBalances, error: leaveBalancesError } = await supabaseAdmin
    .from('leave_balances')
    .select(`
      *,
      carry_over_days,
      leave_types (
        id,
        name,
        color,
        leave_category
      )
    `)
    .eq('user_id', user.id)
    .eq('year', new Date().getFullYear())

  console.log('💰 Leave page - user leave balances:', { 
    userId: user.id,
    count: leaveBalances?.length || 0, 
    error: leaveBalancesError,
    year: new Date().getFullYear(),
    balances: leaveBalances
  })

  // Get leave types for the organization using admin client
  const { data: leaveTypes } = await supabaseAdmin
    .from('leave_types')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .order('name')

  return (
    <MyLeavePageContent
      profile={profile}
      leaveRequests={leaveRequests || []}
      leaveBalances={leaveBalances || []}
      leaveTypes={leaveTypes || []}
      userId={user.id}
      organizationId={profile.organization_id}
    />
  )
}

 