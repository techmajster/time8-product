'use client'

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys, cacheUtils } from '@/components/providers/QueryProvider'
import { toast } from 'sonner'

const supabase = createClient()

// Types for our domain objects
interface LeaveRequest {
  id: string
  user_id: string
  leave_type: string
  start_date: string
  end_date: string
  days_requested: number
  status: 'pending' | 'approved' | 'rejected'
  reason?: string
  created_at: string
  updated_at: string
}

interface LeaveBalance {
  id: string
  user_id: string
  leave_type: string
  balance: number
  used: number
  year: number
  organization_id: string
}

interface OrganizationMember {
  user_id: string
  organization_id: string
  role: 'admin' | 'manager' | 'employee'
  team_id?: string
  is_active: boolean
  created_at: string
}

// Optimized query hooks with intelligent caching

/**
 * Fetch user's leave requests with optimized caching
 */
export function useLeaveRequests(
  orgId: string,
  options?: {
    status?: string[]
    startDate?: string
    endDate?: string
    userId?: string
  }
) {
  const filters = {
    status: options?.status,
    startDate: options?.startDate,
    endDate: options?.endDate,
    userId: options?.userId,
  }

  return useQuery({
    queryKey: queryKeys.leave.requests(orgId, filters),
    queryFn: async () => {
      let query = supabase
        .from('leave_requests')
        .select(`
          id,
          user_id,
          leave_type,
          start_date,
          end_date,
          days_requested,
          status,
          reason,
          created_at,
          updated_at,
          user_organizations!inner (
            role,
            is_active
          )
        `)
        .eq('user_organizations.organization_id', orgId)
        .eq('user_organizations.is_active', true)
        .order('created_at', { ascending: false })

      // Apply filters
      if (options?.status && options.status.length > 0) {
        query = query.in('status', options.status)
      }
      
      if (options?.startDate) {
        query = query.gte('start_date', options.startDate)
      }
      
      if (options?.endDate) {
        query = query.lte('end_date', options.endDate)
      }
      
      if (options?.userId) {
        query = query.eq('user_id', options.userId)
      }

      const { data, error } = await query

      if (error) throw new Error(`Failed to fetch leave requests: ${error.message}`)
      return data as LeaveRequest[]
    },
    staleTime: 30 * 1000, // 30 seconds - leave requests change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes in cache
    refetchOnWindowFocus: true,
    enabled: !!orgId,
  })
}

/**
 * Fetch single leave request with caching
 */
export function useLeaveRequest(id: string) {
  return useQuery({
    queryKey: queryKeys.leave.request(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw new Error(`Failed to fetch leave request: ${error.message}`)
      return data as LeaveRequest
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - individual requests are more stable
    enabled: !!id,
  })
}

/**
 * Fetch user's leave balances with caching
 */
export function useLeaveBalances(userId: string, orgId: string) {
  return useQuery({
    queryKey: queryKeys.leave.balances(userId, orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', orgId)
        .order('leave_type')

      if (error) throw new Error(`Failed to fetch leave balances: ${error.message}`)
      return data as LeaveBalance[]
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - balances change less frequently
    gcTime: 15 * 60 * 1000, // 15 minutes in cache
    enabled: !!userId && !!orgId,
  })
}

/**
 * Fetch organization members with caching
 */
export function useOrganizationMembers(orgId: string) {
  return useQuery({
    queryKey: queryKeys.organization.members(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_organizations')
        .select(`
          user_id,
          organization_id,
          role,
          team_id,
          is_active,
          created_at,
          profiles!inner (
            id,
            email,
            name
          )
        `)
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('created_at')

      if (error) throw new Error(`Failed to fetch organization members: ${error.message}`)
      return data as (OrganizationMember & { profiles: any })[]
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - team membership is relatively stable
    gcTime: 30 * 60 * 1000, // 30 minutes in cache
    enabled: !!orgId,
  })
}

/**
 * Fetch calendar data (leave requests for date range) with caching
 */
export function useCalendarLeaveRequests(
  orgId: string, 
  startDate: string, 
  endDate: string
) {
  return useQuery({
    queryKey: queryKeys.calendar.leaveRequests(orgId, startDate, endDate),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          id,
          user_id,
          leave_type,
          start_date,
          end_date,
          status,
          profiles!inner (name, email)
        `)
        .in('status', ['approved', 'pending'])
        .or(`start_date.lte.${endDate},end_date.gte.${startDate}`)
        .order('start_date')

      if (error) throw new Error(`Failed to fetch calendar data: ${error.message}`)
      return data
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for calendar views
    gcTime: 10 * 60 * 1000, // 10 minutes in cache
    enabled: !!orgId && !!startDate && !!endDate,
  })
}

// Optimized mutation hooks with cache invalidation

/**
 * Create leave request mutation with optimistic updates
 */
export function useCreateLeaveRequest(orgId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newRequest: Omit<LeaveRequest, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('leave_requests')
        .insert([newRequest])
        .select()
        .single()

      if (error) throw new Error(`Failed to create leave request: ${error.message}`)
      return data as LeaveRequest
    },
    onMutate: async (newRequest) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.leave.requests(orgId) })

      // Snapshot previous value
      const previousRequests = queryClient.getQueryData(queryKeys.leave.requests(orgId))

      // Optimistically update cache
      const tempRequest = {
        ...newRequest,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'pending' as const,
      }
      
      cacheUtils.setOptimisticLeaveRequest(queryClient, orgId, tempRequest)

      return { previousRequests, tempRequest }
    },
    onSuccess: (data, variables, context) => {
      // Replace temporary request with real one
      cacheUtils.updateLeaveRequest(queryClient, orgId, data)
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.leave.balances(data.user_id, orgId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.leaveRequests(orgId, '', '') })
      
      toast.success('Leave request created successfully')
    },
    onError: (error, variables, context) => {
      // Revert optimistic update
      if (context?.previousRequests) {
        queryClient.setQueryData(
          queryKeys.leave.requests(orgId), 
          context.previousRequests
        )
      }
      
      console.error('Failed to create leave request:', error)
      toast.error('Failed to create leave request')
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.leave.requests(orgId) })
    },
  })
}

/**
 * Update leave request mutation with cache updates
 */
export function useUpdateLeaveRequest(orgId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<LeaveRequest> }) => {
      const { data, error } = await supabase
        .from('leave_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(`Failed to update leave request: ${error.message}`)
      return data as LeaveRequest
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.leave.request(id) })
      await queryClient.cancelQueries({ queryKey: queryKeys.leave.requests(orgId) })

      // Snapshot previous values
      const previousRequest = queryClient.getQueryData(queryKeys.leave.request(id))
      const previousRequests = queryClient.getQueryData(queryKeys.leave.requests(orgId))

      // Optimistically update individual request
      if (previousRequest) {
        queryClient.setQueryData(queryKeys.leave.request(id), {
          ...previousRequest,
          ...updates,
          updated_at: new Date().toISOString(),
        })
      }

      // Optimistically update in list
      const updatedRequest = { 
        ...(previousRequest as LeaveRequest), 
        ...updates,
        updated_at: new Date().toISOString(),
      }
      cacheUtils.updateLeaveRequest(queryClient, orgId, updatedRequest)

      return { previousRequest, previousRequests, id }
    },
    onSuccess: (data) => {
      // Update caches with real data
      queryClient.setQueryData(queryKeys.leave.request(data.id), data)
      cacheUtils.updateLeaveRequest(queryClient, orgId, data)
      
      toast.success('Leave request updated successfully')
    },
    onError: (error, variables, context) => {
      // Revert optimistic updates
      if (context?.previousRequest) {
        queryClient.setQueryData(queryKeys.leave.request(context.id), context.previousRequest)
      }
      if (context?.previousRequests) {
        queryClient.setQueryData(queryKeys.leave.requests(orgId), context.previousRequests)
      }
      
      console.error('Failed to update leave request:', error)
      toast.error('Failed to update leave request')
    },
    onSettled: (data) => {
      // Ensure consistency
      if (data) {
        queryClient.invalidateQueries({ queryKey: queryKeys.leave.request(data.id) })
        queryClient.invalidateQueries({ queryKey: queryKeys.leave.requests(orgId) })
      }
    },
  })
}

/**
 * Delete leave request mutation with cache cleanup
 */
export function useDeleteLeaveRequest(orgId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leave_requests')
        .delete()
        .eq('id', id)

      if (error) throw new Error(`Failed to delete leave request: ${error.message}`)
      return id
    },
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.leave.requests(orgId) })

      // Snapshot previous value
      const previousRequests = queryClient.getQueryData(queryKeys.leave.requests(orgId))

      // Optimistically remove from cache
      cacheUtils.removeLeaveRequest(queryClient, orgId, id)

      return { previousRequests, id }
    },
    onSuccess: (id) => {
      // Remove from individual cache
      queryClient.removeQueries({ queryKey: queryKeys.leave.request(id) })
      
      toast.success('Leave request deleted successfully')
    },
    onError: (error, id, context) => {
      // Revert optimistic update
      if (context?.previousRequests) {
        queryClient.setQueryData(queryKeys.leave.requests(orgId), context.previousRequests)
      }
      
      console.error('Failed to delete leave request:', error)
      toast.error('Failed to delete leave request')
    },
    onSettled: () => {
      // Ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.leave.requests(orgId) })
    },
  })
}

/**
 * Prefetch commonly accessed data
 */
export function usePrefetchCriticalData(orgId?: string, userId?: string) {
  const queryClient = useQueryClient()

  const prefetchUserOrganizations = async () => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.user.organizations(),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('user_organizations')
          .select('organization_id, role, is_active')
          .eq('is_active', true)

        if (error) throw error
        return data
      },
      staleTime: 15 * 60 * 1000, // 15 minutes
    })
  }

  const prefetchLeaveTypes = async (organizationId: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.leave.types(organizationId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('leave_types')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_active', true)

        if (error) throw error
        return data
      },
      staleTime: 30 * 60 * 1000, // 30 minutes
    })
  }

  const prefetchCurrentYearHolidays = async (organizationId: string) => {
    const currentYear = new Date().getFullYear()
    await queryClient.prefetchQuery({
      queryKey: queryKeys.organization.holidays(organizationId, currentYear),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('company_holidays')
          .select('*')
          .eq('organization_id', organizationId)
          .gte('date', `${currentYear}-01-01`)
          .lte('date', `${currentYear}-12-31`)

        if (error) throw error
        return data
      },
      staleTime: 60 * 60 * 1000, // 1 hour
    })
  }

  return {
    prefetchUserOrganizations,
    prefetchLeaveTypes,
    prefetchCurrentYearHolidays,
    prefetchAllCriticalData: async () => {
      await prefetchUserOrganizations()
      if (orgId) {
        await Promise.all([
          prefetchLeaveTypes(orgId),
          prefetchCurrentYearHolidays(orgId),
        ])
      }
    },
  }
}

/**
 * Hook for cache warming on app initialization
 */
export function useCacheWarming(orgId?: string, userId?: string) {
  const { prefetchAllCriticalData } = usePrefetchCriticalData(orgId, userId)

  const warmCache = async () => {
    if (!orgId) return

    try {
      // Prefetch critical data in parallel
      await Promise.all([
        prefetchAllCriticalData(),
        // Add other commonly accessed queries here
      ])

      console.log('Cache warming completed successfully')
    } catch (error) {
      console.warn('Cache warming failed:', error)
    }
  }

  return { warmCache }
}