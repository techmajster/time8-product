import { Suspense } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/app-layout'
import { LeaveRequestsTable } from './components/LeaveRequestsTable'
import { getUserTeamScope, getTeamMemberIds } from '@/lib/team-utils'

interface LeaveRequestWithUser {
  id: string
  user_id: string
  start_date: string
  end_date: string
  leave_type_id: string
  days_requested: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  created_at: string
  user_profile: {
    full_name: string | null
    email: string
    avatar_url: string | null
    organization_id: string
  }
  leave_types: {
    name: string
  } | null
}

async function getLeaveRequests(status?: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // MULTI-ORG UPDATE: Get user's organization and role from user_organizations
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Get user's active organization from user_organizations
  const { data: userOrg } = await supabase
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
    .eq('is_default', true)
    .single()

  if (!userOrg) redirect('/onboarding')

  // Add organization context to profile for backward compatibility
  profile.organization_id = userOrg.organization_id
  profile.role = userOrg.role
  profile.organizations = userOrg.organizations

  // Only managers and admins can see leave requests
  if (userOrg.role !== 'manager' && userOrg.role !== 'admin') {
    redirect('/leave')
  }

  // Get team scope for filtering
  const teamScope = await getUserTeamScope(user.id)
  const teamMemberIds = await getTeamMemberIds(teamScope)

  let query = supabase
    .from('leave_requests')
    .select(`
      id,
      user_id,
      start_date,
      end_date,
      leave_type_id,
      days_requested,
      reason,
      status,
      created_at,
      user_profile:profiles!leave_requests_user_id_fkey (
        full_name,
        email,
        avatar_url,
        organization_id
      ),
      leave_types (
        name
      )
    `)
    .in('user_id', teamMemberIds)
    .order('created_at', { ascending: false })

  if (status && status !== 'wszystkie') {
    const statusMap: Record<string, string> = {
      'nowe': 'pending',
      'zaakceptowane': 'approved',
      'odrzucone': 'rejected'
    }
    query = query.eq('status', statusMap[status] || status)
  }

  const { data: leaveRequests, error } = await query

  if (error) {
    console.error('Error fetching leave requests:', error)
    return []
  }

  // Transform the data to match our interface
  const transformedRequests = leaveRequests?.map(request => ({
    ...request,
    user_profile: Array.isArray(request.user_profile) ? request.user_profile[0] : request.user_profile,
    leave_types: Array.isArray(request.leave_types) ? request.leave_types[0] : request.leave_types
  })) || []

  return transformedRequests as LeaveRequestWithUser[]
}

async function LeaveRequestsContent({ status }: { status?: string }) {
  const requests = await getLeaveRequests(status)
  
  return <LeaveRequestsTable requests={requests} />
}

export default async function LeaveRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const activeTab = resolvedSearchParams.tab || 'nowe'

  return (
    <AppLayout>
      <div className="p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <h1 className="font-semibold text-3xl leading-9 text-neutral-950">
                Wnioski urlopowe
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and Actions */}
      <div className="flex items-center justify-between">
        <Tabs value={activeTab}>
          <TabsList>
            <TabsTrigger value="nowe" asChild>
              <a href="?tab=nowe">Nowe</a>
            </TabsTrigger>
            <TabsTrigger value="zaakceptowane" asChild>
              <a href="?tab=zaakceptowane">Zaakceptowane</a>
            </TabsTrigger>
            <TabsTrigger value="odrzucone" asChild>
              <a href="?tab=odrzucone">Odrzucone</a>
            </TabsTrigger>
            <TabsTrigger value="wszystkie" asChild>
              <a href="?tab=wszystkie">Wszystkie</a>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Filtry
          </Button>
          <Button variant="outline" size="sm">
            Export
          </Button>
        </div>
      </div>

      {/* Content */}
      <Suspense fallback={<div>Loading...</div>}>
        <LeaveRequestsContent status={activeTab} />
      </Suspense>
    </div>
    </AppLayout>
  )
} 