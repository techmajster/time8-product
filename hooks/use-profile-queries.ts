import { useQuery } from '@tanstack/react-query'

// Query keys factory for profile data
export const profileKeys = {
  userProfile: (userId: string) => ['user-profile', userId] as const,
  leaveBalances: (userId: string, year: number) => ['profile-leave-balances', userId, year] as const,
  recentRequests: (userId: string) => ['profile-recent-requests', userId] as const,
}

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: string
  organization_id: string
  team_id: string | null
  birth_date: string | null
  employment_start_date: string | null
  created_at: string
  updated_at: string
  organizations?: {
    id: string
    name: string
  }
}

interface LeaveBalance {
  id: string
  user_id: string
  leave_type_id: string
  remaining_days: number
  leave_types: {
    name: string
    color: string
  }
}

interface RecentLeaveRequest {
  id: string
  start_date: string
  end_date: string
  status: string
  leave_types: {
    name: string
    color: string
  }[]
}

// Fetch user profile
export function useUserProfile(userId: string, initialData?: UserProfile) {
  return useQuery({
    queryKey: profileKeys.userProfile(userId),
    queryFn: async () => {
      const response = await fetch(`/api/profile?userId=${userId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch user profile')
      }

      return response.json() as Promise<UserProfile>
    },
    initialData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  })
}

// Fetch leave balances for profile page
export function useProfileLeaveBalances(
  userId: string,
  year: number = new Date().getFullYear(),
  initialData?: LeaveBalance[]
) {
  return useQuery({
    queryKey: profileKeys.leaveBalances(userId, year),
    queryFn: async () => {
      const response = await fetch(`/api/leave-balances?userId=${userId}&year=${year}`)

      if (!response.ok) {
        throw new Error('Failed to fetch leave balances')
      }

      return response.json() as Promise<LeaveBalance[]>
    },
    initialData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  })
}

// Fetch recent leave requests for profile page
export function useRecentLeaveRequests(userId: string, initialData?: RecentLeaveRequest[]) {
  return useQuery({
    queryKey: profileKeys.recentRequests(userId),
    queryFn: async () => {
      const response = await fetch(`/api/leave-requests/recent?userId=${userId}&limit=5`)

      if (!response.ok) {
        throw new Error('Failed to fetch recent leave requests')
      }

      return response.json() as Promise<RecentLeaveRequest[]>
    },
    initialData,
    staleTime: 3 * 60 * 1000, // 3 minutes
    refetchOnWindowFocus: true,
  })
}
