import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// Types for mutation payloads
interface UpdateWorkModePayload {
  work_mode: 'monday_to_friday' | 'multi_shift'
  working_days: string[]
}

interface UpdateOrganizationPayload {
  name?: string
  country_code?: string
  default_language?: string
}

interface CreateLeaveTypePayload {
  name: string
  days_per_year: number
  color: string
  requires_balance: boolean
  requires_approval: boolean
}

interface UpdateLeaveTypePayload {
  name?: string
  days_per_year?: number
  color?: string
  requires_balance?: boolean
  requires_approval?: boolean
}

interface DeleteLeaveTypePayload {
  id: string
}

interface CreateTeamPayload {
  name: string
  description?: string
}

interface UpdateTeamPayload {
  name?: string
  description?: string
}

interface AddEmployeePayload {
  email: string
  full_name: string
  role: 'admin' | 'manager' | 'employee'
  country_code: string
  default_language: string
  team_id?: string
}

interface UpdateEmployeePayload {
  full_name?: string
  role?: 'admin' | 'manager' | 'employee'
  country_code?: string
  default_language?: string
  team_id?: string
}

// Update work mode mutation
export function useUpdateWorkMode() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (payload: UpdateWorkModePayload) => {
      const response = await fetch('/api/admin/settings/work-mode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Nie udało się zaktualizować trybu pracy')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['organization'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-leave-requests'] })

      // Show success toast
      toast.success('Tryb pracy został zaktualizowany!')

      // Refresh page data
      router.refresh()
    },
    onError: (error: Error) => {
      console.error('Error updating work mode:', error)
      toast.error(error.message || 'Wystąpił błąd podczas aktualizacji trybu pracy')
    },
  })
}

// Update organization mutation
export function useUpdateOrganization() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (payload: UpdateOrganizationPayload) => {
      const response = await fetch('/api/admin/settings/organization', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to update organization')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate organization queries
      queryClient.invalidateQueries({ queryKey: ['organization'] })

      // Show success toast
      toast.success('Organization updated successfully!')

      // Refresh page data
      router.refresh()
    },
    onError: (error: Error) => {
      console.error('Error updating organization:', error)
      toast.error(error.message || 'Failed to update organization')
    },
  })
}

// Create leave type mutation
export function useCreateLeaveType() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (payload: CreateLeaveTypePayload) => {
      const response = await fetch('/api/admin/leave-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to create leave type')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate leave types queries
      queryClient.invalidateQueries({ queryKey: ['leave-types'] })

      // Show success toast
      toast.success('Leave type created successfully!')

      // Refresh page data
      router.refresh()
    },
    onError: (error: Error) => {
      console.error('Error creating leave type:', error)
      toast.error(error.message || 'Failed to create leave type')
    },
  })
}

// Update leave type mutation
export function useUpdateLeaveType(leaveTypeId: string) {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (payload: UpdateLeaveTypePayload) => {
      const response = await fetch(`/api/admin/leave-types/${leaveTypeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to update leave type')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate leave types queries
      queryClient.invalidateQueries({ queryKey: ['leave-types'] })

      // Show success toast
      toast.success('Leave type updated successfully!')

      // Refresh page data
      router.refresh()
    },
    onError: (error: Error) => {
      console.error('Error updating leave type:', error)
      toast.error(error.message || 'Failed to update leave type')
    },
  })
}

// Delete leave type mutation
export function useDeleteLeaveType() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (payload: DeleteLeaveTypePayload) => {
      const response = await fetch(`/api/admin/leave-types/${payload.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete leave type')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate leave types queries
      queryClient.invalidateQueries({ queryKey: ['leave-types'] })

      // Show success toast
      toast.success('Leave type deleted successfully!')

      // Refresh page data
      router.refresh()
    },
    onError: (error: Error) => {
      console.error('Error deleting leave type:', error)
      toast.error(error.message || 'Failed to delete leave type')
    },
  })
}

// Create team mutation
export function useCreateTeam() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (payload: CreateTeamPayload) => {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to create team')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate teams queries
      queryClient.invalidateQueries({ queryKey: ['teams'] })

      // Show success toast
      toast.success('Team created successfully!')

      // Refresh page data
      router.refresh()
    },
    onError: (error: Error) => {
      console.error('Error creating team:', error)
      toast.error(error.message || 'Failed to create team')
    },
  })
}

// Update team mutation
export function useUpdateTeam(teamId: string) {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (payload: UpdateTeamPayload) => {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to update team')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate teams queries
      queryClient.invalidateQueries({ queryKey: ['teams'] })

      // Show success toast
      toast.success('Team updated successfully!')

      // Refresh page data
      router.refresh()
    },
    onError: (error: Error) => {
      console.error('Error updating team:', error)
      toast.error(error.message || 'Failed to update team')
    },
  })
}

// Delete team mutation
export function useDeleteTeam() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (teamId: string) => {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete team')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate teams queries
      queryClient.invalidateQueries({ queryKey: ['teams'] })

      // Show success toast
      toast.success('Team deleted successfully!')

      // Refresh page data
      router.refresh()
    },
    onError: (error: Error) => {
      console.error('Error deleting team:', error)
      toast.error(error.message || 'Failed to delete team')
    },
  })
}

// Add employee mutation
export function useAddEmployee() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (payload: AddEmployeePayload) => {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to add employee')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate employees queries
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })

      // Show success toast
      toast.success('Employee added successfully!')

      // Refresh page data
      router.refresh()
    },
    onError: (error: Error) => {
      console.error('Error adding employee:', error)
      toast.error(error.message || 'Failed to add employee')
    },
  })
}

// Update employee mutation
export function useUpdateEmployee(employeeId: string) {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (payload: UpdateEmployeePayload) => {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to update employee')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate employees queries
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })

      // Show success toast
      toast.success('Employee updated successfully!')

      // Refresh page data
      router.refresh()
    },
    onError: (error: Error) => {
      console.error('Error updating employee:', error)
      toast.error(error.message || 'Failed to update employee')
    },
  })
}

// Delete employee mutation
export function useDeleteEmployee() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (employeeId: string) => {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete employee')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate employees queries
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })

      // Show success toast
      toast.success('Employee deleted successfully!')

      // Refresh page data
      router.refresh()
    },
    onError: (error: Error) => {
      console.error('Error deleting employee:', error)
      toast.error(error.message || 'Failed to delete employee')
    },
  })
}
