import { Suspense } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { AppLayout } from '@/components/app-layout'

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

  // Get user's organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) redirect('/onboarding')

  // Only managers and admins can see all leave requests
  if (profile.role !== 'manager' && profile.role !== 'admin') {
    redirect('/leave')
  }

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
    .eq('user_profile.organization_id', profile.organization_id)
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

function formatDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  const formatOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }
  
  return `${start.toLocaleDateString('pl-PL', formatOptions)} - ${end.toLocaleDateString('pl-PL', formatOptions)}`
}

function getStatusBadge(status: string) {
  const statusConfig = {
    pending: { label: 'Oczekujący', className: 'bg-white border border-neutral-200 text-neutral-950' },
    approved: { label: 'Zaakceptowany', className: 'bg-neutral-900 text-neutral-50' },
    rejected: { label: 'Odrzucony', className: 'bg-white border border-neutral-200 text-neutral-950' },
    cancelled: { label: 'Anulowany', className: 'bg-white border border-neutral-200 text-neutral-950' }
  }
  
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
  
  return (
    <Badge className={`px-2 py-0.5 text-xs font-semibold rounded-lg ${config.className}`}>
      {config.label}
    </Badge>
  )
}

function LeaveRequestsTable({ requests }: { requests: LeaveRequestWithUser[] }) {
  return (
    <Card className="rounded-[10px] bg-white py-1">
      <div className="overflow-hidden">
        <div className="min-w-full">
          <div className="px-4 py-2">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_229px_288px_162px_110px_216px] items-center min-w-[356px] h-10 border-b border-neutral-200">
              <div className="px-2 py-0">
                <div className="font-medium text-sm text-neutral-500">Wnioskujący</div>
              </div>
              <div className="px-2 py-0">
                <div className="font-medium text-sm text-neutral-500">Data</div>
              </div>
              <div className="px-2 py-0">
                <div className="font-medium text-sm text-neutral-500">Opis</div>
              </div>
              <div className="px-2 py-0">
                <div className="font-medium text-sm text-neutral-500">Typ</div>
              </div>
              <div className="px-2 py-0 text-right">
                <div className="font-medium text-sm text-neutral-500">Liczba dni</div>
              </div>
              <div className="px-2 py-0 text-right">
                <div className="font-medium text-sm text-neutral-500">Akcje</div>
              </div>
            </div>

            {/* Table Rows */}
            {requests.map((request, index) => (
              <div 
                key={request.id} 
                className={`grid grid-cols-[1fr_229px_288px_162px_110px_216px] items-center min-w-[356px] h-[72px] border-b border-neutral-200 ${
                  index < 4 ? 'bg-zinc-100' : ''
                }`}
              >
                {/* Wnioskujący */}
                <div className="p-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={request.user_profile.avatar_url || undefined} />
                      <AvatarFallback className="bg-neutral-100">
                        {request.user_profile.full_name?.charAt(0) || request.user_profile.email.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <div className="font-medium text-sm text-neutral-950 overflow-hidden overflow-ellipsis">
                        {request.user_profile.full_name || request.user_profile.email.split('@')[0]}
                      </div>
                      <div className="font-normal text-sm text-neutral-500 overflow-hidden overflow-ellipsis">
                        {request.user_profile.email}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data */}
                <div className="p-2">
                  <div className="font-normal text-sm text-neutral-950 overflow-hidden overflow-ellipsis">
                    {formatDateRange(request.start_date, request.end_date)}
                  </div>
                </div>

                {/* Opis */}
                <div className="p-2">
                  <div className="font-medium text-sm text-neutral-950 overflow-hidden overflow-ellipsis">
                    {request.reason || 'Brak opisu'}
                  </div>
                </div>

                {/* Typ */}
                <div className="p-2">
                  <div className="font-normal text-sm text-neutral-950 overflow-hidden overflow-ellipsis">
                    {request.leave_types?.name || 'Wypoczynkowy'}
                  </div>
                </div>

                {/* Liczba dni */}
                <div className="p-2 text-right">
                  <div className="font-normal text-sm text-neutral-950">
                    {request.days_requested} {request.days_requested === 1 ? 'dzień' : 'dni'}
                  </div>
                </div>

                {/* Akcje */}
                <div className="p-2 flex justify-end">
                  {getStatusBadge(request.status)}
                </div>
              </div>
            ))}

            {requests.length === 0 && (
              <div className="flex items-center justify-center h-32 text-neutral-500">
                Brak wniosków urlopowych w tej kategorii
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
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
        <Tabs value={activeTab} className="bg-neutral-100 rounded-[10px] p-[3px] h-9">
          <TabsList className="bg-transparent h-auto p-0 gap-0">
            <TabsTrigger 
              value="nowe" 
              className="bg-transparent data-[state=active]:bg-white data-[state=active]:rounded-lg data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] px-2 py-1 h-auto text-sm font-medium text-neutral-950"
              asChild
            >
              <a href="?tab=nowe">Nowe</a>
            </TabsTrigger>
            <TabsTrigger 
              value="zaakceptowane" 
              className="bg-transparent data-[state=active]:bg-white data-[state=active]:rounded-lg data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] px-2 py-1 h-auto text-sm font-medium text-neutral-950"
              asChild
            >
              <a href="?tab=zaakceptowane">Zaakceptowane</a>
            </TabsTrigger>
            <TabsTrigger 
              value="odrzucone" 
              className="bg-transparent data-[state=active]:bg-white data-[state=active]:rounded-lg data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] px-2 py-1 h-auto text-sm font-medium text-neutral-950"
              asChild
            >
              <a href="?tab=odrzucone">Odrzucone</a>
            </TabsTrigger>
            <TabsTrigger 
              value="wszystkie" 
              className="bg-transparent data-[state=active]:bg-white data-[state=active]:rounded-lg data-[state=active]:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] px-2 py-1 h-auto text-sm font-medium text-neutral-950"
              asChild
            >
              <a href="?tab=wszystkie">Wszystkie</a>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-white border-neutral-200 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] h-7 px-3 py-2 text-xs font-medium text-neutral-950"
          >
            Filtry
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-white border-neutral-200 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] h-7 px-3 py-2 text-xs font-medium text-neutral-950"
          >
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