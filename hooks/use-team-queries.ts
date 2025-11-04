import { useQuery } from '@tanstack/react-query'

// Query keys factory for team data
export const teamKeys = {
  members: (organizationId: string, teamId?: string) => ['team-members', organizationId, teamId] as const,
  leaveBalances: (organizationId: string, year: number) => ['team-leave-balances', organizationId, year] as const,
}

interface TeamMember {
  id: string
  email: string
  full_name: string | null
  role: string
  avatar_url: string | null
  team_id: string | null
  teams?: {
    id: string
    name: string
    color: string
  } | null
}

interface LeaveBalance {
  id: string
  user_id: string
  leave_type_id: string
  remaining_days: number
  leave_types: {
    id: string
    name: string
    color: string
    requires_balance: boolean
  }
}

// Fetch team members for team page
export function useTeamMembersQuery(
  organizationId: string,
  teamId?: string,
  initialData?: TeamMember[]
) {
  return useQuery({
    queryKey: teamKeys.members(organizationId, teamId),
    queryFn: async () => {
      const response = await fetch('/api/team/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          teamId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch team members')
      }

      return response.json() as Promise<TeamMember[]>
    },
    initialData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  })
}

// Fetch leave balances for all team members
export function useTeamLeaveBalances(
  organizationId: string,
  year: number = new Date().getFullYear(),
  initialData?: LeaveBalance[]
) {
  return useQuery({
    queryKey: teamKeys.leaveBalances(organizationId, year),
    queryFn: async () => {
      const response = await fetch(`/api/team/leave-balances?organizationId=${organizationId}&year=${year}`)

      if (!response.ok) {
        throw new Error('Failed to fetch team leave balances')
      }

      return response.json() as Promise<LeaveBalance[]>
    },
    initialData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  })
}
