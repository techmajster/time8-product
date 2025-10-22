import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Query keys for cache management
export const leaveRequestKeys = {
  all: ['leaveRequests'] as const,
  lists: () => [...leaveRequestKeys.all, 'list'] as const,
  list: (filters: string) => [...leaveRequestKeys.lists(), { filters }] as const,
  details: () => [...leaveRequestKeys.all, 'detail'] as const,
  detail: (id: string) => [...leaveRequestKeys.details(), id] as const,
}

// Fetch all leave requests
export function useLeaveRequests(organizationId: string) {
  return useQuery({
    queryKey: leaveRequestKeys.list(organizationId),
    queryFn: async () => {
      const response = await fetch(`/api/leave-requests?organizationId=${organizationId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch leave requests')
      }
      return response.json()
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
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
