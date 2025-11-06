import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { refetchTeamManagement } from '@/lib/refetch-events'

/**
 * Hook for deleting an employee account
 */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/employees/${userId}`, {
        method: 'DELETE'
      })

      let data: any = {}

      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text()
        if (text) {
          try {
            data = JSON.parse(text)
          } catch (e) {
            console.error('Failed to parse JSON response:', e)
          }
        }
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to remove employee')
      }

      return data
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Pracownik został usunięty z organizacji')
      refetchTeamManagement()
    },
    onError: (error) => {
      console.error('Error removing employee:', error)
      toast.error(error instanceof Error ? error.message : 'Wystąpił błąd podczas usuwania pracownika')
    }
  })
}

/**
 * Hook for canceling a pending user removal
 */
export function useCancelRemoval() {
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/cancel-removal/${userId}`, {
        method: 'POST'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to cancel removal')
      }

      return result
    },
    onSuccess: () => {
      refetchTeamManagement()
    },
    onError: (error) => {
      console.error('Error canceling removal:', error)
      throw error
    }
  })
}

/**
 * Hook for reactivating an archived user
 */
export function useReactivateUser() {
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/reactivate-user/${userId}`, {
        method: 'POST'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reactivate user')
      }

      return result
    },
    onSuccess: () => {
      refetchTeamManagement()
    },
    onError: (error) => {
      console.error('Error reactivating user:', error)
      throw error
    }
  })
}
