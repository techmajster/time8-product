/**
 * @jest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { ReactNode } from 'react'
import { queryKeys, cacheUtils, useQueryInvalidation } from '@/components/providers/QueryProvider'

// Mock toast to prevent errors in tests
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}))

describe('React Query Cache Behavior and Invalidation', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    // Create a fresh query client for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // Disable retries in tests
          staleTime: 0, // Make data immediately stale for testing
          gcTime: Infinity, // Keep data in cache during tests
        },
        mutations: {
          retry: false,
        },
      },
      logger: {
        log: () => {},
        warn: () => {},
        error: () => {},
      },
    })
  })

  afterEach(() => {
    queryClient.clear()
  })

  // Test wrapper component
  function createWrapper() {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  describe('Query Key Factory Consistency', () => {
    it('should generate consistent query keys', () => {
      const orgId = 'test-org-123'
      const userId = 'test-user-456'

      // Test user query keys
      expect(queryKeys.user.profile()).toEqual(['user', 'profile'])
      expect(queryKeys.user.organizations()).toEqual(['user', 'organizations'])
      expect(queryKeys.user.currentOrganization(orgId)).toEqual(['user', 'organization', orgId])

      // Test leave query keys
      expect(queryKeys.leave.requests(orgId)).toEqual(['leave', 'requests', orgId, undefined])
      expect(queryKeys.leave.request('req-123')).toEqual(['leave', 'request', 'req-123'])
      expect(queryKeys.leave.balances(userId, orgId)).toEqual(['leave', 'balances', userId, orgId])

      // Test organization query keys
      expect(queryKeys.organization.members(orgId)).toEqual(['organization', 'members', orgId])
      expect(queryKeys.organization.teams(orgId)).toEqual(['organization', 'teams', orgId])

      // Test calendar query keys with date ranges
      expect(queryKeys.calendar.leaveRequests(orgId, '2025-01-01', '2025-01-31'))
        .toEqual(['calendar', 'leave-requests', orgId, '2025-01-01', '2025-01-31'])
    })

    it('should generate different keys for different parameters', () => {
      const orgId1 = 'org-1'
      const orgId2 = 'org-2'
      const filters1 = { status: 'approved' }
      const filters2 = { status: 'pending' }

      const key1 = queryKeys.leave.requests(orgId1, filters1)
      const key2 = queryKeys.leave.requests(orgId1, filters2)
      const key3 = queryKeys.leave.requests(orgId2, filters1)

      expect(key1).not.toEqual(key2)
      expect(key1).not.toEqual(key3)
      expect(key2).not.toEqual(key3)
    })
  })

  describe('Cache Data Management', () => {
    it('should set and retrieve cached data', async () => {
      const testData = [
        { id: '1', user_id: 'user-1', status: 'approved' },
        { id: '2', user_id: 'user-2', status: 'pending' }
      ]

      const queryKey = queryKeys.leave.requests('test-org')

      // Set data in cache
      queryClient.setQueryData(queryKey, testData)

      // Retrieve data from cache
      const cachedData = queryClient.getQueryData(queryKey)
      expect(cachedData).toEqual(testData)
    })

    it('should handle optimistic updates for leave requests', () => {
      const orgId = 'test-org'
      const existingData = [
        { id: '1', user_id: 'user-1', status: 'approved' },
        { id: '2', user_id: 'user-2', status: 'pending' }
      ]
      const newRequest = { id: '3', user_id: 'user-3', status: 'pending' }

      // Set initial data
      queryClient.setQueryData(queryKeys.leave.requests(orgId), existingData)

      // Apply optimistic update
      cacheUtils.setOptimisticLeaveRequest(queryClient, orgId, newRequest)

      // Verify new request was added at the beginning
      const updatedData = queryClient.getQueryData(queryKeys.leave.requests(orgId))
      expect(updatedData).toEqual([newRequest, ...existingData])
    })

    it('should update existing leave request in cache', () => {
      const orgId = 'test-org'
      const existingData = [
        { id: '1', user_id: 'user-1', status: 'pending' },
        { id: '2', user_id: 'user-2', status: 'approved' }
      ]
      const updatedRequest = { id: '1', user_id: 'user-1', status: 'approved' }

      // Set initial data
      queryClient.setQueryData(queryKeys.leave.requests(orgId), existingData)

      // Update request
      cacheUtils.updateLeaveRequest(queryClient, orgId, updatedRequest)

      // Verify request was updated
      const updatedData = queryClient.getQueryData(queryKeys.leave.requests(orgId)) as any[]
      expect(updatedData[0]).toEqual(updatedRequest)
      expect(updatedData[1]).toEqual(existingData[1]) // Other request unchanged
    })

    it('should remove leave request from cache', () => {
      const orgId = 'test-org'
      const existingData = [
        { id: '1', user_id: 'user-1', status: 'approved' },
        { id: '2', user_id: 'user-2', status: 'pending' }
      ]

      // Set initial data
      queryClient.setQueryData(queryKeys.leave.requests(orgId), existingData)

      // Remove request
      cacheUtils.removeLeaveRequest(queryClient, orgId, '1')

      // Verify request was removed
      const updatedData = queryClient.getQueryData(queryKeys.leave.requests(orgId)) as any[]
      expect(updatedData).toHaveLength(1)
      expect(updatedData[0].id).toBe('2')
    })
  })

  describe('Cache Invalidation Strategies', () => {
    it('should invalidate leave requests when requested', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useQueryInvalidation(), { wrapper })

      const orgId = 'test-org'
      const testData = [{ id: '1', status: 'approved' }]

      // Set data in cache
      queryClient.setQueryData(queryKeys.leave.requests(orgId), testData)
      
      // Mock the invalidateQueries method
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

      // Invalidate leave requests
      result.current.invalidateLeaveRequests(orgId)

      // Verify invalidation was called with correct query keys
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: queryKeys.leave.requests(orgId)
      })
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: queryKeys.calendar.leaveRequests(orgId, '', '')
      })
    })

    it('should invalidate user data', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useQueryInvalidation(), { wrapper })

      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

      // Invalidate user data
      result.current.invalidateUserData()

      // Verify correct queries were invalidated
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: queryKeys.user.profile()
      })
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: queryKeys.user.organizations()
      })
    })

    it('should invalidate organization-specific data', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useQueryInvalidation(), { wrapper })

      const orgId = 'test-org'
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

      // Invalidate organization data
      result.current.invalidateOrganizationData(orgId)

      // Verify organization-specific queries were invalidated
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: queryKeys.organization.members(orgId)
      })
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: queryKeys.organization.teams(orgId)
      })
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: queryKeys.organization.settings(orgId)
      })
    })

    it('should clear all cache when requested', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useQueryInvalidation(), { wrapper })

      // Set some test data
      queryClient.setQueryData(['test'], { data: 'test' })
      
      const clearSpy = jest.spyOn(queryClient, 'clear')

      // Clear all cache
      result.current.clearAllCache()

      expect(clearSpy).toHaveBeenCalled()
    })
  })

  describe('Batch Operations', () => {
    it('should perform batch invalidation efficiently', () => {
      const patterns = [
        queryKeys.leave.requests('org-1'),
        queryKeys.leave.requests('org-2'),
        queryKeys.organization.members('org-1'),
        queryKeys.user.profile()
      ]

      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

      // Perform batch invalidation
      cacheUtils.batchInvalidate(queryClient, patterns)

      // Verify all patterns were invalidated
      expect(invalidateQueriesSpy).toHaveBeenCalledTimes(patterns.length)
      
      patterns.forEach(pattern => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: pattern })
      })
    })

    it('should handle empty data gracefully in optimistic updates', () => {
      const orgId = 'test-org'
      const newRequest = { id: '1', status: 'pending' }

      // Apply optimistic update with no existing data
      cacheUtils.setOptimisticLeaveRequest(queryClient, orgId, newRequest)

      // Should create array with new request
      const data = queryClient.getQueryData(queryKeys.leave.requests(orgId))
      expect(data).toEqual([newRequest])
    })

    it('should handle missing data gracefully in updates', () => {
      const orgId = 'test-org'
      const updatedRequest = { id: '1', status: 'approved' }

      // Try to update non-existent data
      cacheUtils.updateLeaveRequest(queryClient, orgId, updatedRequest)

      // Should create array with updated request
      const data = queryClient.getQueryData(queryKeys.leave.requests(orgId))
      expect(data).toEqual([updatedRequest])
    })
  })

  describe('Cache Performance Characteristics', () => {
    it('should measure cache hit performance', async () => {
      const queryKey = queryKeys.leave.requests('perf-test-org')
      const testData = Array.from({ length: 1000 }, (_, i) => ({
        id: `request-${i}`,
        status: i % 3 === 0 ? 'approved' : 'pending'
      }))

      // Set large dataset in cache
      queryClient.setQueryData(queryKey, testData)

      // Measure cache retrieval time
      const iterations = 100
      const times: number[] = []

      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        const data = queryClient.getQueryData(queryKey)
        const end = performance.now()
        times.push(end - start)
        
        expect(data).toBeDefined()
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length
      const maxTime = Math.max(...times)

      console.log(`\n📊 Cache Performance (${testData.length} items):`)
      console.log(`  Average retrieval time: ${avgTime.toFixed(4)}ms`)
      console.log(`  Max retrieval time: ${maxTime.toFixed(4)}ms`)

      // Cache hits should be very fast (< 1ms on average)
      expect(avgTime).toBeLessThan(1)
      expect(maxTime).toBeLessThan(5)
    })

    it('should measure cache update performance', async () => {
      const orgId = 'perf-test-org'
      const baseData = Array.from({ length: 500 }, (_, i) => ({
        id: `request-${i}`,
        status: 'pending'
      }))

      queryClient.setQueryData(queryKeys.leave.requests(orgId), baseData)

      // Measure update performance
      const iterations = 50
      const times: number[] = []

      for (let i = 0; i < iterations; i++) {
        const updatedRequest = {
          id: `request-${i}`,
          status: 'approved'
        }

        const start = performance.now()
        cacheUtils.updateLeaveRequest(queryClient, orgId, updatedRequest)
        const end = performance.now()
        times.push(end - start)
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length

      console.log(`\n📊 Cache Update Performance (${baseData.length} items):`)
      console.log(`  Average update time: ${avgTime.toFixed(4)}ms`)

      // Cache updates should be reasonably fast
      expect(avgTime).toBeLessThan(5)
    })

    it('should measure invalidation performance', async () => {
      const patterns = Array.from({ length: 20 }, (_, i) => 
        queryKeys.leave.requests(`org-${i}`)
      )

      // Set data for all patterns
      patterns.forEach((pattern, i) => {
        const data = Array.from({ length: 100 }, (_, j) => ({ id: `${i}-${j}` }))
        queryClient.setQueryData(pattern, data)
      })

      // Measure batch invalidation time
      const start = performance.now()
      cacheUtils.batchInvalidate(queryClient, patterns)
      const end = performance.now()

      const batchTime = end - start
      console.log(`\n📊 Batch Invalidation Performance (${patterns.length} queries):`)
      console.log(`  Total time: ${batchTime.toFixed(4)}ms`)
      console.log(`  Per query: ${(batchTime / patterns.length).toFixed(4)}ms`)

      // Batch invalidation should be efficient
      expect(batchTime).toBeLessThan(50)
      expect(batchTime / patterns.length).toBeLessThan(5)
    })
  })

  describe('Multi-Organization Cache Isolation', () => {
    it('should maintain data isolation between organizations', () => {
      const org1Id = 'org-1'
      const org2Id = 'org-2'
      
      const org1Data = [{ id: '1', org: org1Id, data: 'org1-data' }]
      const org2Data = [{ id: '2', org: org2Id, data: 'org2-data' }]

      // Set data for different organizations
      queryClient.setQueryData(queryKeys.leave.requests(org1Id), org1Data)
      queryClient.setQueryData(queryKeys.leave.requests(org2Id), org2Data)

      // Verify data isolation
      const retrievedOrg1Data = queryClient.getQueryData(queryKeys.leave.requests(org1Id))
      const retrievedOrg2Data = queryClient.getQueryData(queryKeys.leave.requests(org2Id))

      expect(retrievedOrg1Data).toEqual(org1Data)
      expect(retrievedOrg2Data).toEqual(org2Data)
      expect(retrievedOrg1Data).not.toEqual(retrievedOrg2Data)
    })

    it('should invalidate only specific organization data', () => {
      const org1Id = 'org-1'
      const org2Id = 'org-2'

      // Set data for both organizations
      queryClient.setQueryData(queryKeys.leave.requests(org1Id), [{ id: '1' }])
      queryClient.setQueryData(queryKeys.leave.requests(org2Id), [{ id: '2' }])
      
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

      // Invalidate only org1 data
      queryClient.invalidateQueries({ queryKey: queryKeys.leave.requests(org1Id) })

      // Verify only org1 queries were invalidated
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ 
        queryKey: queryKeys.leave.requests(org1Id)
      })

      // Org2 data should still be accessible
      const org2Data = queryClient.getQueryData(queryKeys.leave.requests(org2Id))
      expect(org2Data).toBeDefined()
    })
  })
})