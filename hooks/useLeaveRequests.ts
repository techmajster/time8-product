import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Query keys for cache management
export const leaveRequestKeys = {
  all: ['leaveRequests'] as const,
  lists: () => [...leaveRequestKeys.all, 'list'] as const,
  list: (filters: string) => [...leaveRequestKeys.lists(), { filters }] as const,
  calendar: (startDate: string, endDate: string, teamMemberIds: string) =>
    ['calendar-leave-requests', startDate, endDate, teamMemberIds] as const,
  details: () => [...leaveRequestKeys.all, 'detail'] as const,
  detail: (id: string) => [...leaveRequestKeys.details(), id] as const,
}

// Fetch all leave requests
export function useLeaveRequests(
  organizationId: string,
  userId?: string,
  initialData?: any[]
) {
  const filters = userId ? `${organizationId}-${userId}` : organizationId

  return useQuery({
    queryKey: leaveRequestKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams({ organizationId })
      if (userId) {
        params.append('userId', userId)
      }

      const response = await fetch(`/api/leave-requests?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch leave requests')
      }
      const data = await response.json()
      return data.leaveRequests || []
    },
    initialData,
    staleTime: 1000 * 30, // 30 seconds
    enabled: !!organizationId, // Only run if organizationId exists
  })
}

// Fetch single leave request
export function useLeaveRequest(id: string) {
  return useQuery({
    queryKey: leaveRequestKeys.detail(id),
    queryFn: async () => {
      const response = await fetch(`/api/leave-requests/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch leave request')
      }
      return response.json()
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!id,
  })
}

// Create leave request mutation
export function useCreateLeaveRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (leaveRequest: any) => {
      const response = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leaveRequest),
      })
      if (!response.ok) {
        throw new Error('Failed to create leave request')
      }
      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch leave requests
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.lists() })
    },
  })
}

// Update leave request mutation
export function useUpdateLeaveRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/leave-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error('Failed to update leave request')
      }
      return response.json()
    },
    onSuccess: (_, variables) => {
      // Invalidate specific leave request and list
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.lists() })
    },
  })
}

// Delete leave request mutation
export function useDeleteLeaveRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/leave-requests/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete leave request')
      }
      return response.json()
    },
    onSuccess: () => {
      // Invalidate leave requests list
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.lists() })
    },
  })
}

// Fetch calendar leave requests for a date range
export function useCalendarLeaveRequests(
  startDate: string,
  endDate: string,
  teamMemberIds: string[]
) {
  const teamMemberIdsStr = teamMemberIds.join(',')

  return useQuery({
    queryKey: leaveRequestKeys.calendar(startDate, endDate, teamMemberIdsStr),
    queryFn: async () => {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        team_member_ids: teamMemberIdsStr,
      })

      const response = await fetch(`/api/calendar/leave-requests?${params}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch leave requests: ${response.statusText}`)
      }

      const leaveData = await response.json()

      // Transform to match expected calendar format
      if (leaveData && leaveData.length > 0) {
        return leaveData.map((leave: any) => ({
          ...leave,
          profiles: {
            id: leave.profiles?.id || leave.user_id,
            first_name: leave.profiles?.full_name?.split(' ')[0] || 'Unknown',
            last_name: leave.profiles?.full_name?.split(' ').slice(1).join(' ') || 'User',
            full_name: leave.profiles?.full_name || 'Unknown User',
            email: leave.profiles?.email || '',
            avatar_url: leave.profiles?.avatar_url || null,
          },
          leave_types: {
            id: leave.leave_types?.id || leave.leave_type_id,
            name: leave.leave_types?.name || 'Unknown Type',
            color: leave.leave_types?.color || '#6b7280',
          },
        }))
      }

      return []
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: !!startDate && !!endDate && teamMemberIds.length > 0,
  })
}
