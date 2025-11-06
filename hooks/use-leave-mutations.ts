import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// Types for mutation payloads
interface CreateLeaveRequestPayload {
  leave_type_id: string
  start_date: string
  end_date: string
  days_requested: number
  reason?: string | null
}

interface UpdateLeaveRequestPayload {
  leave_type_id: string
  start_date: string
  end_date: string
  days_requested: number
  reason?: string | null
}

interface CancelLeaveRequestPayload {
  comment?: string
}

interface ApproveRejectLeaveRequestPayload {
  action: 'approve' | 'reject'
  comment?: string | null
}

// Create leave request mutation
export function useCreateLeaveRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateLeaveRequestPayload) => {
      const response = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit leave request')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-leave-requests'] })
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-leave-balances'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-current-leaves'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-pending-requests'] })
      queryClient.invalidateQueries({ queryKey: ['profile-leave-balances'] })
      queryClient.invalidateQueries({ queryKey: ['profile-recent-requests'] })
      queryClient.invalidateQueries({ queryKey: ['team-leave-balances'] })

      // Show success toast
      toast.success('Wniosek urlopowy został złożony!')
    },
    onError: (error: Error) => {
      console.error('Error creating leave request:', error)
      toast.error(error.message || 'Failed to submit leave request')
    },
  })
}

// Update leave request mutation
export function useUpdateLeaveRequest(requestId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: UpdateLeaveRequestPayload) => {
      const response = await fetch(`/api/leave-requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update leave request')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-leave-requests'] })
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-leave-balances'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-current-leaves'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-pending-requests'] })
      queryClient.invalidateQueries({ queryKey: ['profile-leave-balances'] })
      queryClient.invalidateQueries({ queryKey: ['profile-recent-requests'] })
      queryClient.invalidateQueries({ queryKey: ['team-leave-balances'] })

      // Note: Success toast is shown in the component with role-specific messaging
    },
    onError: (error: Error) => {
      console.error('Error updating leave request:', error)
      toast.error(error.message || 'Failed to update leave request')
    },
  })
}

// Cancel leave request mutation
export function useCancelLeaveRequest(requestId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CancelLeaveRequestPayload) => {
      const response = await fetch(`/api/leave-requests/${requestId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: payload.comment || 'Anulowane przez pracownika',
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Nie udało się anulować wniosku')
      }

      return response.json()
    },
    onSuccess: (data) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-leave-requests'] })
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-leave-balances'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-current-leaves'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-pending-requests'] })
      queryClient.invalidateQueries({ queryKey: ['profile-leave-balances'] })
      queryClient.invalidateQueries({ queryKey: ['profile-recent-requests'] })
      queryClient.invalidateQueries({ queryKey: ['team-leave-balances'] })

      // Trigger refetch for pages using manual fetch
      window.dispatchEvent(new CustomEvent('refetch-leave-requests'))

      // Note: Success toast is shown in the component with role-specific messaging
    },
    onError: (error: Error) => {
      console.error('Error cancelling leave request:', error)
      toast.error(error.message || 'Nie udało się anulować wniosku')
    },
  })
}

// Approve or reject leave request mutation
export function useApproveRejectLeaveRequest(requestId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: ApproveRejectLeaveRequestPayload) => {
      const response = await fetch(`/api/leave-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || `Nie udało się ${payload.action === 'approve' ? 'zatwierdzić' : 'odrzucić'} wniosku`)
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-leave-requests'] })
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-leave-balances'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-current-leaves'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-pending-requests'] })
      queryClient.invalidateQueries({ queryKey: ['profile-leave-balances'] })
      queryClient.invalidateQueries({ queryKey: ['profile-recent-requests'] })
      queryClient.invalidateQueries({ queryKey: ['team-leave-balances'] })

      // Trigger refetch for pages using manual fetch
      window.dispatchEvent(new CustomEvent('refetch-leave-requests'))

      // Show success toast
      const actionText = variables.action === 'approve' ? 'zatwierdzony' : 'odrzucony'
      toast.success(`Wniosek został ${actionText}`)
    },
    onError: (error: Error) => {
      console.error('Error approving/rejecting leave request:', error)
      toast.error(error.message || 'Wystąpił błąd podczas przetwarzania wniosku')
    },
  })
}

// Delete leave request mutation (for managers/admins)
export function useDeleteLeaveRequest(requestId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/leave-requests/${requestId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Nie udało się usunąć wniosku')
      }

      return response.json()
    },
    onSuccess: (data) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-leave-requests'] })
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-leave-balances'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-current-leaves'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-pending-requests'] })
      queryClient.invalidateQueries({ queryKey: ['profile-leave-balances'] })
      queryClient.invalidateQueries({ queryKey: ['profile-recent-requests'] })
      queryClient.invalidateQueries({ queryKey: ['team-leave-balances'] })

      // Trigger refetch for pages using manual fetch
      window.dispatchEvent(new CustomEvent('refetch-leave-requests'))

      // Show success toast
      toast.success(data.message || 'Wniosek urlopowy został usunięty')
    },
    onError: (error: Error) => {
      console.error('Error deleting leave request:', error)
      toast.error(error.message || 'Nie udało się usunąć wniosku')
    },
  })
}
