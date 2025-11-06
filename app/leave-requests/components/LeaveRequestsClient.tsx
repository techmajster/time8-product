'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LeaveRequestsTable } from './LeaveRequestsTable'
import { LeaveRequestsPagination } from './LeaveRequestsPagination'
import { Loader2 } from 'lucide-react'

interface LeaveRequestWithUser {
  id: string
  user_id: string
  start_date: string
  end_date: string
  leave_type_id: string
  days_requested: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed'
  created_at: string
  user_profile: {
    full_name: string | null
    email: string
    avatar_url: string | null
    organization_id: string
  } | null
  leave_types: {
    name: string
  } | null
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export function LeaveRequestsClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') || 'nowe'
  const [requests, setRequests] = useState<LeaveRequestWithUser[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  const fetchRequests = async (page: number, limit: number) => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/leave-requests?page=${page}&limit=${limit}&tab=${tab}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch leave requests')
      }

      const data = await response.json()
      setRequests(data.leaveRequests || [])
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 })
    } catch (error) {
      console.error('Error fetching leave requests:', error)
      setRequests([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests(pagination.page, pagination.limit)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  // Listen for refetch events from mutations
  useEffect(() => {
    const handleRefetch = () => {
      fetchRequests(pagination.page, pagination.limit)
    }

    window.addEventListener('refetch-leave-requests', handleRefetch)
    return () => window.removeEventListener('refetch-leave-requests', handleRefetch)
  }, [pagination.page, pagination.limit])

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }))
    fetchRequests(newPage, pagination.limit)
  }

  const handleItemsPerPageChange = (newLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }))
    fetchRequests(1, newLimit)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <LeaveRequestsTable requests={requests} />
      {pagination.total > 0 && (
        <LeaveRequestsPagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          itemsPerPage={pagination.limit}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}
    </div>
  )
}
