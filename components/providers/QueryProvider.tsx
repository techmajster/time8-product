'use client'

import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, ReactNode } from 'react'
import { toast } from 'sonner'

// Custom error handler for queries
function handleQueryError(error: unknown) {
  if (error instanceof Error) {
    // Don't show toast for specific errors that are handled elsewhere
    const ignoredErrors = ['auth', 'unauthorized', 'forbidden']
    const shouldIgnore = ignoredErrors.some(ignored => 
      error.message.toLowerCase().includes(ignored)
    )
    
    if (!shouldIgnore) {
      console.error('Query error:', error)
      toast.error('An error occurred while loading data')
    }
  }
}

// Custom error handler for mutations
function handleMutationError(error: unknown) {
  if (error instanceof Error) {
    console.error('Mutation error:', error)
    toast.error(error.message || 'An error occurred while saving')
  }
}

// Create optimized query client configuration
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Cache data for 5 minutes by default
        staleTime: 5 * 60 * 1000,
        // Keep data in cache for 10 minutes after it becomes unused
        gcTime: 10 * 60 * 1000,
        // Retry failed requests up to 2 times
        retry: (failureCount, error) => {
          // Don't retry on certain errors
          if (error instanceof Error) {
            const noRetryErrors = ['401', '403', '404']
            if (noRetryErrors.some(code => error.message.includes(code))) {
              return false
            }
          }
          return failureCount < 2
        },
        // Retry delay with exponential backoff
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Refetch data when window gains focus (but not too aggressively)
        refetchOnWindowFocus: 'always',
        // Don't refetch on reconnect to avoid unnecessary requests
        refetchOnReconnect: false,
        // Don't refetch when component mounts if data is fresh
        refetchOnMount: 'always',
      },
      mutations: {
        // Retry mutations once on network errors
        retry: (failureCount, error) => {
          if (error instanceof Error && error.message.includes('network')) {
            return failureCount < 1
          }
          return false
        },
        // Show optimistic updates when possible
        onError: handleMutationError,
      },
    },
    queryCache: new QueryCache({
      onError: handleQueryError,
    }),
    mutationCache: new MutationCache({
      onError: handleMutationError,
      onSuccess: (data, variables, context, mutation) => {
        // Invalidate related queries after successful mutations
        const queryClient = mutation.options.meta?.queryClient as QueryClient
        if (queryClient && mutation.options.meta?.invalidateQueries) {
          const queriesToInvalidate = Array.isArray(mutation.options.meta.invalidateQueries)
            ? mutation.options.meta.invalidateQueries
            : [mutation.options.meta.invalidateQueries]
          
          queriesToInvalidate.forEach(queryKey => {
            queryClient.invalidateQueries({ queryKey })
          })
        }
      }
    }),
  })
}

interface QueryProviderProps {
  children: ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Create query client only once per app instance
  const [queryClient] = useState(() => createQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false} 
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  )
}

// Optimized query key factories for consistent caching
export const queryKeys = {
  // User-related queries
  user: {
    profile: () => ['user', 'profile'] as const,
    organizations: () => ['user', 'organizations'] as const,
    currentOrganization: (orgId: string) => ['user', 'organization', orgId] as const,
  },
  
  // Leave-related queries
  leave: {
    requests: (orgId: string, filters?: Record<string, any>) => 
      ['leave', 'requests', orgId, filters] as const,
    request: (id: string) => ['leave', 'request', id] as const,
    balances: (userId: string, orgId: string) => 
      ['leave', 'balances', userId, orgId] as const,
    types: (orgId: string) => ['leave', 'types', orgId] as const,
  },
  
  // Organization-related queries
  organization: {
    members: (orgId: string) => ['organization', 'members', orgId] as const,
    teams: (orgId: string) => ['organization', 'teams', orgId] as const,
    settings: (orgId: string) => ['organization', 'settings', orgId] as const,
    holidays: (orgId: string, year?: number) => 
      ['organization', 'holidays', orgId, year] as const,
  },
  
  // Calendar-related queries
  calendar: {
    leaveRequests: (orgId: string, startDate: string, endDate: string) =>
      ['calendar', 'leave-requests', orgId, startDate, endDate] as const,
    holidays: (orgId: string, startDate: string, endDate: string) =>
      ['calendar', 'holidays', orgId, startDate, endDate] as const,
  },
  
} as const

// Helper function to get the query client instance
export function getQueryClient() {
  return new QueryClient()
}

// Custom hook for cache management
export function useQueryInvalidation() {
  const queryClient = useState(() => createQueryClient())[0]
  
  return {
    // Invalidate all leave requests for an organization
    invalidateLeaveRequests: (orgId: string) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.leave.requests(orgId)
      })
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.calendar.leaveRequests(orgId, '', '')
      })
    },
    
    // Invalidate user data
    invalidateUserData: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.user.profile()
      })
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.user.organizations()
      })
    },
    
    // Invalidate organization data
    invalidateOrganizationData: (orgId: string) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.organization.members(orgId)
      })
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.organization.teams(orgId)
      })
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.organization.settings(orgId)
      })
    },
    
    // Clear all cache
    clearAllCache: () => {
      queryClient.clear()
    },
    
    // Prefetch critical data
    prefetchUserOrganizations: async () => {
      await queryClient.prefetchQuery({
        queryKey: queryKeys.user.organizations(),
        staleTime: 10 * 60 * 1000, // 10 minutes
      })
    },
  }
}

// Performance optimization utilities
export const cacheUtils = {
  // Set optimistic update for leave request creation
  setOptimisticLeaveRequest: (
    queryClient: QueryClient, 
    orgId: string, 
    newRequest: any
  ) => {
    queryClient.setQueryData(
      queryKeys.leave.requests(orgId),
      (old: any[] | undefined) => {
        if (!old) return [newRequest]
        return [newRequest, ...old]
      }
    )
  },
  
  // Remove leave request from cache
  removeLeaveRequest: (
    queryClient: QueryClient,
    orgId: string,
    requestId: string
  ) => {
    queryClient.setQueryData(
      queryKeys.leave.requests(orgId),
      (old: any[] | undefined) => {
        if (!old) return []
        return old.filter((req: any) => req.id !== requestId)
      }
    )
  },
  
  // Update leave request in cache
  updateLeaveRequest: (
    queryClient: QueryClient,
    orgId: string,
    updatedRequest: any
  ) => {
    queryClient.setQueryData(
      queryKeys.leave.requests(orgId),
      (old: any[] | undefined) => {
        if (!old) return [updatedRequest]
        return old.map((req: any) => 
          req.id === updatedRequest.id ? updatedRequest : req
        )
      }
    )
  },
  
  // Batch invalidate related queries
  batchInvalidate: (queryClient: QueryClient, patterns: string[][]) => {
    patterns.forEach(pattern => {
      queryClient.invalidateQueries({ queryKey: pattern })
    })
  },
}