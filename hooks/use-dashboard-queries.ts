import { useQuery } from '@tanstack/react-query'

// Query keys factory for dashboard data
export const dashboardKeys = {
  leaveBalances: (userId: string, year: number) => ['dashboard-leave-balances', userId, year] as const,
  teamMembers: (organizationId: string, teamMemberIds: string[]) => ['dashboard-team-members', organizationId, teamMemberIds] as const,
  currentLeaveRequests: (teamMemberIds: string[], date: string) => ['dashboard-current-leaves', teamMemberIds, date] as const,
  pendingRequests: (teamMemberIds: string[]) => ['dashboard-pending-requests', teamMemberIds] as const,
}

interface LeaveBalance {
  id: string
  user_id: string
  leave_type_id: string
  entitled_days: number
  used_days: number
  remaining_days: number
  year: number
  leave_types: {
    id: string
    name: string
    color: string
    leave_category: string
    requires_balance: boolean
    days_per_year: number
  }
}

// Fetch leave balances for current user
export function useLeaveBalances(userId: string, year: number = new Date().getFullYear()) {
  return useQuery({
    queryKey: dashboardKeys.leaveBalances(userId, year),
    queryFn: async () => {
      const response = await fetch(`/api/leave-balances?userId=${userId}&year=${year}`)

      if (!response.ok) {
        throw new Error('Failed to fetch leave balances')
      }

      return response.json() as Promise<LeaveBalance[]>
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  })
}

interface TeamMember {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  team_id: string | null
  teams?: {
    id: string
    name: string
    color: string
  } | null
}

// Fetch team members for dashboard
export function useTeamMembers(
  organizationId: string,
  teamMemberIds: string[],
  initialData?: TeamMember[]
) {
  return useQuery({
    queryKey: dashboardKeys.teamMembers(organizationId, teamMemberIds),
    queryFn: async () => {
      const response = await fetch('/api/team-members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          teamMemberIds,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch team members')
      }

      return response.json() as Promise<TeamMember[]>
    },
    initialData,
    staleTime: 3 * 60 * 1000, // 3 minutes
    refetchOnWindowFocus: true,
  })
}

interface CurrentLeaveRequest {
  id: string
  user_id: string
  start_date: string
  end_date: string
  leave_types: {
    name: string
    color: string
  }
  profiles: {
    id: string
    full_name: string
    email: string
    avatar_url: string | null
  }
}

// Fetch current active leave requests (people on leave today)
export function useCurrentLeaveRequests(
  teamMemberIds: string[],
  date: string = new Date().toISOString().split('T')[0]
) {
  return useQuery({
    queryKey: dashboardKeys.currentLeaveRequests(teamMemberIds, date),
    queryFn: async () => {
      const response = await fetch('/api/leave-requests/current', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamMemberIds,
          date,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch current leave requests')
      }

      return response.json() as Promise<CurrentLeaveRequest[]>
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
  })
}

// Fetch pending leave requests count
export function usePendingRequestsCount(teamMemberIds: string[]) {
  return useQuery({
    queryKey: dashboardKeys.pendingRequests(teamMemberIds),
    queryFn: async () => {
      const response = await fetch('/api/leave-requests/pending-count', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamMemberIds,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch pending requests count')
      }

      const data = await response.json()
      return data.count as number
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
  })
}
