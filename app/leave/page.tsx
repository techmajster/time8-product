import { AppLayout } from '@/components/app-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Clock, TreePine } from 'lucide-react'
import { NewLeaveRequestSheet } from './components/NewLeaveRequestSheet'
import { LeaveRequestButton } from '../dashboard/components/LeaveRequestButton'
import { LeaveRequestsTable } from './components/LeaveRequestsTable'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { LeaveBalance as ImportedLeaveBalance } from '@/types/leave'

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

interface LeaveBalance {
  id: string
  user_id: string
  leave_type_id: string
  year: number
  entitled_days: number
  used_days: number
  remaining_days: number
  carry_over_days?: number
  leave_types: {
    id: string
    name: string
    color: string
    leave_category: string
  }
}

interface UserProfile {
  id: string
  full_name: string | null
  email: string
  role: string
  employment_start_date: string | null
  organization_id: string
}

interface MyLeavePageContentProps {
  profile: UserProfile & { organizations: { id: string; name: string } }
  leaveRequests: LeaveRequest[]
  leaveBalances: ImportedLeaveBalance[]
  leaveTypes: any[]
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

function MyLeavePageContent({ profile, leaveRequests, leaveBalances, leaveTypes }: MyLeavePageContentProps) {
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

  return (
    <AppLayout>
      <div className="p-8">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5">
                <h1 className="text-3xl font-semibold text-neutral-950">Twoje urlopy</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-80">
                {/* Search input placeholder - can be implemented later */}
              </div>
              <LeaveRequestButton />
            </div>
          </div>

          {/* Summary Cards */}
          <div className="flex gap-6">
            <Card className="flex-1 bg-white border border-neutral-200 rounded-[10px] p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-neutral-950">Łącznie pozostało</p>
                <TreePine className="w-4 h-4 text-neutral-950" />
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-xl font-semibold text-neutral-950">
                  {totalRemainingDays} dni urlopu
                </p>
                <p className="text-sm text-neutral-500">
                  w tym {carryOverDays} z zeszłego roku
                </p>
              </div>
            </Card>

            <Card className="flex-1 bg-white border border-neutral-200 rounded-[10px] p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-neutral-950">Najbliższy urlop</p>
                <Clock className="w-4 h-4 text-neutral-950" />
              </div>
              <div className="flex flex-col gap-0.5">
                {nextLeave && daysUntilNextLeave !== null ? (
                  <>
                    <p className="text-xl font-semibold text-neutral-950">
                      za {daysUntilNextLeave} {daysUntilNextLeave === 1 ? 'dzień' : 'dni'}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {nextLeave.days_requested} {nextLeave.days_requested === 1 ? 'dzień' : 'dni'} - {formatDateRange(nextLeave.start_date, nextLeave.end_date)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-semibold text-neutral-950">Brak planów</p>
                    <p className="text-sm text-neutral-500">Nie masz zaplanowanych urlopów</p>
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Tabs with Filter */}
          <Tabs defaultValue="all" className="w-full">
            <div className="flex items-center justify-between">
              <TabsList className="bg-neutral-100 rounded-[10px] p-[3px] w-[218px]">
                <TabsTrigger value="all" className="flex-1 text-sm font-medium">
                  Wszystkie
                </TabsTrigger>
                <TabsTrigger value="2025" className="flex-1 text-sm font-medium">
                  2025
                </TabsTrigger>
                <TabsTrigger value="2024" className="flex-1 text-sm font-medium">
                  2024
                </TabsTrigger>
              </TabsList>

              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 px-3 text-xs font-medium"
              >
                Filter
              </Button>
            </div>

            {/* Table Content based on active tab */}
            <TabsContent value="all" className="mt-6">
              <LeaveRequestsTable requests={leaveRequests || []} />
            </TabsContent>
            <TabsContent value="2025" className="mt-6">
              <LeaveRequestsTable 
                requests={leaveRequests?.filter(req => 
                  new Date(req.start_date).getFullYear() === 2025
                ) || []} 
              />
            </TabsContent>
            <TabsContent value="2024" className="mt-6">
              <LeaveRequestsTable 
                requests={leaveRequests?.filter(req => 
                  new Date(req.start_date).getFullYear() === 2024
                ) || []} 
              />
            </TabsContent>
          </Tabs>
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
          organization_id: profile.organization_id
        }}
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

  // Get leave balances for current user
  const { data: leaveBalances } = await supabase
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

  // Get leave types for the organization
  const { data: leaveTypes } = await supabase
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
    />
  )
}

 