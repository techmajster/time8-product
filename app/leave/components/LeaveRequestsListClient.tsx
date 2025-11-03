'use client'

import { useQuery } from '@tanstack/react-query'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { LeaveRequestsTable } from './LeaveRequestsTable'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'

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

interface LeaveRequestsListClientProps {
  userId: string
  organizationId: string
  initialRequests: LeaveRequest[]
}

export function LeaveRequestsListClient({
  userId,
  organizationId,
  initialRequests
}: LeaveRequestsListClientProps) {
  const t = useTranslations()

  // Use React Query to fetch leave requests with automatic cache invalidation
  const { data: leaveRequests = initialRequests, isLoading } = useQuery({
    queryKey: ['leaveRequests', userId, organizationId],
    queryFn: async () => {
      console.log('🔍 Fetching leave requests via React Query:', { userId, organizationId })

      const response = await fetch(`/api/leave-requests?userId=${userId}&organizationId=${organizationId}`)

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response')
        console.error('❌ Error fetching leave requests:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
        throw new Error(`Failed to fetch leave requests: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('✅ Leave requests fetched via React Query:', { count: data?.length || 0 })

      return data || []
    },
    staleTime: 1000 * 30, // 30 seconds - refetch if data is older
    initialData: initialRequests, // Use server-side data as initial data
    enabled: !!userId && !!organizationId, // Only fetch if we have required data
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Tabs defaultValue="all" className="w-full">
      <div className="flex items-center justify-between">
        <TabsList className="bg-muted rounded-lg p-[3px] w-[218px]">
          <TabsTrigger value="all" className="flex-1 text-sm font-medium">
            {t('leave.page.tabs.all')}
          </TabsTrigger>
          <TabsTrigger value="2025" className="flex-1 text-sm font-medium">
            {t('leave.page.tabs.year2025')}
          </TabsTrigger>
          <TabsTrigger value="2024" className="flex-1 text-sm font-medium">
            {t('leave.page.tabs.year2024')}
          </TabsTrigger>
        </TabsList>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-4 text-sm font-medium"
          >
            {t('leave.page.button.filters')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-4 text-sm font-medium"
          >
            {t('leave.page.button.export')}
          </Button>
        </div>
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
  )
}
