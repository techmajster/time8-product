/**
 * Organization Context Preservation Test Suite
 * 
 * Tests for Task 5.2: Organization context preservation during navigation
 * 
 * This comprehensive test suite validates:
 * - Organization context persistence during page navigation
 * - Middleware organization context enforcement
 * - Cookie and session state management
 * - Context preservation across API calls
 * - Navigation state consistency
 * - Deep linking with organization context
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { createMockRequest, createTestUser, createTestOrganization, cleanupTestData } from '../utils/test-helpers'
import { createClient } from '@supabase/supabase-js'

// Import API route handlers that depend on organization context
import { GET as employeesGet } from '@/app/api/employees/route'
import { GET as leaveRequestsGet } from '@/app/api/leave-requests/route'
import { GET as dashboardDataGet } from '@/app/api/dashboard-data/route'
import { GET as organizationMembersGet } from '@/app/api/organization/members/route'
import { GET as currentOrgGet } from '@/app/api/user/current-organization/route'
import { POST as workspaceSwitchPost } from '@/app/api/workspace/switch/route'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('Organization Context Preservation Tests', () => {
  let org1Id: string
  let org2Id: string
  let org3Id: string
  let adminUserId: string
  let managerUserId: string
  let employeeUserId: string
  let multiOrgUserId: string
  let testUserIds: string[]
  let testOrgIds: string[]

  // Test data for context validation
  let org1EmployeeCount: number
  let org2EmployeeCount: number
  let org1LeaveRequestCount: number
  let org2LeaveRequestCount: number

  beforeEach(async () => {
    // Create test organizations
    org1Id = await createTestOrganization('Context Test Org 1')
    org2Id = await createTestOrganization('Context Test Org 2')
    org3Id = await createTestOrganization('Context Test Org 3')

    // Create test users
    adminUserId = await createTestUser('admin@context.test', org1Id, 'admin')
    managerUserId = await createTestUser('manager@context.test', org1Id, 'manager')
    employeeUserId = await createTestUser('employee@context.test', org1Id, 'employee')
    multiOrgUserId = await createTestUser('multi@context.test', org1Id, 'employee')
    
    testUserIds = [adminUserId, managerUserId, employeeUserId, multiOrgUserId]
    testOrgIds = [org1Id, org2Id, org3Id]

    // Add multi-org user to org2 and org3
    await supabaseAdmin
      .from('user_organizations')
      .insert([
        {
          user_id: multiOrgUserId,
          organization_id: org2Id,
          role: 'manager',
          is_active: true,
          is_default: false,
          joined_via: 'invitation',
          employment_type: 'full_time'
        },
        {
          user_id: multiOrgUserId,
          organization_id: org3Id,
          role: 'admin',
          is_active: true,
          is_default: false,
          joined_via: 'invitation',
          employment_type: 'part_time'
        }
      ])

    // Create additional test users in org2
    const org2AdminId = await createTestUser('admin2@context.test', org2Id, 'admin')
    const org2EmployeeId = await createTestUser('employee2@context.test', org2Id, 'employee')
    testUserIds.push(org2AdminId, org2EmployeeId)

    // Setup test data for context validation
    await setupContextTestData()
  })

  afterEach(async () => {
    await cleanupTestData(testUserIds, testOrgIds)
  })

  async function setupContextTestData() {
    // Create leave requests in different organizations
    const org1LeaveRequests = [
      {
        user_id: adminUserId,
        organization_id: org1Id,
        start_date: '2024-01-15',
        end_date: '2024-01-16',
        status: 'pending',
        reason: 'Org 1 admin leave'
      },
      {
        user_id: employeeUserId,
        organization_id: org1Id,
        start_date: '2024-01-17',
        end_date: '2024-01-18',
        status: 'approved',
        reason: 'Org 1 employee leave'
      }
    ]

    const org2LeaveRequests = [
      {
        user_id: multiOrgUserId,
        organization_id: org2Id,
        start_date: '2024-01-19',
        end_date: '2024-01-20',
        status: 'pending',
        reason: 'Org 2 multi-user leave'
      }
    ]

    await supabaseAdmin.from('leave_requests').insert([...org1LeaveRequests, ...org2LeaveRequests])

    // Set expected counts
    org1EmployeeCount = 4 // admin, manager, employee, multi-org user
    org2EmployeeCount = 3 // org2 admin, org2 employee, multi-org user
    org1LeaveRequestCount = 2
    org2LeaveRequestCount = 1
  }

  describe('API Context Consistency', () => {
    test('should maintain organization context across multiple API calls', async () => {
      // Make multiple API calls with consistent organization context
      const contextRequests = [
        { handler: employeesGet, endpoint: '/api/employees' },
        { handler: leaveRequestsGet, endpoint: '/api/leave-requests' },
        { handler: organizationMembersGet, endpoint: '/api/organization/members' },
        { handler: dashboardDataGet, endpoint: '/api/dashboard-data' }
      ]

      for (const { handler, endpoint } of contextRequests) {
        const request = createMockRequest('GET', endpoint, {}, {
          userId: adminUserId,
          organizationId: org1Id
        })

        const response = await handler(request)
        
        if (response.status === 200) {
          const data = await response.json()
          
          // Verify that all returned data is from org1
          if (data.employees) {
            for (const employee of data.employees) {
              expect(employee.organization_id).toBe(org1Id)
            }
          }
          
          if (data.leaveRequests) {
            for (const request of data.leaveRequests) {
              expect(request.organization_id).toBe(org1Id)
            }
          }
          
          if (data.members) {
            for (const member of data.members) {
              expect(member.organization_id).toBe(org1Id)
            }
          }
        }
      }
    })

    test('should preserve context after organization switch across API calls', async () => {
      // Initial call in org1
      const initialRequest = createMockRequest('GET', '/api/employees', {}, {
        userId: multiOrgUserId,
        organizationId: org1Id
      })

      const initialResponse = await employeesGet(initialRequest)
      expect(initialResponse.status).toBe(200)

      const initialData = await initialResponse.json()
      const initialEmployeeCount = initialData.employees.length

      // Switch to org2
      const switchRequest = createMockRequest('POST', '/api/workspace/switch', {
        organizationId: org2Id
      }, {
        userId: multiOrgUserId,
        organizationId: org1Id
      })

      const switchResponse = await workspaceSwitchPost(switchRequest)
      expect(switchResponse.status).toBe(200)

      // Subsequent call in org2 context
      const org2Request = createMockRequest('GET', '/api/employees', {}, {
        userId: multiOrgUserId,
        organizationId: org2Id
      })

      const org2Response = await employeesGet(org2Request)
      expect(org2Response.status).toBe(200)

      const org2Data = await org2Response.json()
      const org2EmployeeCount = org2Data.employees.length

      // Verify different employee counts (indicating different contexts)
      expect(initialEmployeeCount).toBe(org1EmployeeCount)
      expect(org2EmployeeCount).toBe(org2EmployeeCount)
      expect(initialEmployeeCount).not.toBe(org2EmployeeCount)

      // Verify all employees are from org2
      for (const employee of org2Data.employees) {
        expect(employee.organization_id).toBe(org2Id)
      }
    })

    test('should maintain context consistency during rapid API calls', async () => {
      const rapidRequests = Array.from({ length: 10 }, (_, i) => 
        createMockRequest('GET', '/api/employees', {}, {
          userId: adminUserId,
          organizationId: org1Id,
          requestId: i
        })
      )

      const responses = await Promise.all(
        rapidRequests.map(request => employeesGet(request))
      )

      // All requests should succeed and return org1 data
      for (const response of responses) {
        expect(response.status).toBe(200)
        
        const data = await response.json()
        if (data.employees) {
          for (const employee of data.employees) {
            expect(employee.organization_id).toBe(org1Id)
          }
        }
      }
    })
  })

  describe('Cross-Page Context Persistence', () => {
    test('should maintain organization context when navigating between pages', async () => {
      // Simulate navigation between different pages with same organization context
      const pageEndpoints = [
        '/api/dashboard-data',
        '/api/employees',
        '/api/leave-requests',
        '/api/organization/members'
      ]

      const navigationSequence = pageEndpoints.map(endpoint => ({
        request: createMockRequest('GET', endpoint, {}, {
          userId: adminUserId,
          organizationId: org1Id
        }),
        endpoint
      }))

      for (const { request, endpoint } of navigationSequence) {
        const handler = getHandlerForEndpoint(endpoint)
        if (handler) {
          const response = await handler(request)
          
          if (response.status === 200) {
            const data = await response.json()
            
            // Verify organization context is maintained
            validateOrganizationContext(data, org1Id)
          }
        }
      }
    })

    test('should preserve context when returning to previous page', async () => {
      // Navigate from dashboard to employees to leave requests and back to dashboard
      const navigationPath = [
        { endpoint: '/api/dashboard-data', handler: dashboardDataGet },
        { endpoint: '/api/employees', handler: employeesGet },
        { endpoint: '/api/leave-requests', handler: leaveRequestsGet },
        { endpoint: '/api/dashboard-data', handler: dashboardDataGet } // Return to start
      ]

      let lastDashboardData: any = null

      for (let i = 0; i < navigationPath.length; i++) {
        const { endpoint, handler } = navigationPath[i]
        
        const request = createMockRequest('GET', endpoint, {}, {
          userId: adminUserId,
          organizationId: org1Id,
          navigationStep: i
        })

        const response = await handler(request)
        expect(response.status).toBe(200)

        const data = await response.json()
        validateOrganizationContext(data, org1Id)

        // Store first dashboard data for comparison
        if (i === 0 && endpoint === '/api/dashboard-data') {
          lastDashboardData = data
        }

        // Compare when returning to dashboard
        if (i === 3 && endpoint === '/api/dashboard-data') {
          expect(data).toBeDefined()
          // Context should be consistent (same organization data)
          if (lastDashboardData && lastDashboardData.employees && data.employees) {
            expect(data.employees.length).toBe(lastDashboardData.employees.length)
          }
        }
      }
    })

    test('should handle deep linking with organization context', async () => {
      // Simulate deep links with organization context in headers/cookies
      const deepLinkRequests = [
        {
          endpoint: '/api/employees',
          handler: employeesGet,
          organizationId: org2Id,
          userId: multiOrgUserId
        },
        {
          endpoint: '/api/leave-requests', 
          handler: leaveRequestsGet,
          organizationId: org2Id,
          userId: multiOrgUserId
        }
      ]

      for (const { endpoint, handler, organizationId, userId } of deepLinkRequests) {
        const request = createMockRequest('GET', endpoint, {}, {
          userId,
          organizationId,
          isDeepLink: true
        })

        const response = await handler(request)
        expect(response.status).toBe(200)

        const data = await response.json()
        validateOrganizationContext(data, organizationId)
      }
    })
  })

  describe('Session State Management', () => {
    test('should maintain context through simulated session refresh', async () => {
      // Initial request
      const initialRequest = createMockRequest('GET', '/api/employees', {}, {
        userId: multiOrgUserId,
        organizationId: org2Id
      })

      const initialResponse = await employeesGet(initialRequest)
      expect(initialResponse.status).toBe(200)

      const initialData = await initialResponse.json()

      // Simulate session refresh by making current-organization call
      const sessionRefreshRequest = createMockRequest('GET', '/api/user/current-organization', {}, {
        userId: multiOrgUserId,
        organizationId: org2Id
      })

      const sessionRefreshResponse = await currentOrgGet(sessionRefreshRequest)
      expect(sessionRefreshResponse.status).toBe(200)

      const sessionData = await sessionRefreshResponse.json()
      expect(sessionData.organizationId).toBe(org2Id)

      // Subsequent request should maintain same context
      const subsequentRequest = createMockRequest('GET', '/api/employees', {}, {
        userId: multiOrgUserId,
        organizationId: org2Id
      })

      const subsequentResponse = await employeesGet(subsequentRequest)
      expect(subsequentResponse.status).toBe(200)

      const subsequentData = await subsequentResponse.json()
      
      // Data should be consistent (same organization)
      expect(subsequentData.employees.length).toBe(initialData.employees.length)
      
      for (const employee of subsequentData.employees) {
        expect(employee.organization_id).toBe(org2Id)
      }
    })

    test('should handle context when user has default organization set', async () => {
      // Set org2 as default for multi-org user
      await supabaseAdmin
        .from('user_organizations')
        .update({ is_default: false })
        .eq('user_id', multiOrgUserId)

      await supabaseAdmin
        .from('user_organizations')
        .update({ is_default: true })
        .eq('user_id', multiOrgUserId)
        .eq('organization_id', org2Id)

      // Request without explicit organization context (should use default)
      const defaultContextRequest = createMockRequest('GET', '/api/user/current-organization', {}, {
        userId: multiOrgUserId
        // No organizationId to simulate using default
      })

      const defaultContextResponse = await currentOrgGet(defaultContextRequest)
      
      if (defaultContextResponse.status === 200) {
        const defaultData = await defaultContextResponse.json()
        expect(defaultData.organizationId).toBe(org2Id)
      }
    })

    test('should preserve context during error recovery', async () => {
      // Make a successful request
      const successRequest = createMockRequest('GET', '/api/employees', {}, {
        userId: adminUserId,
        organizationId: org1Id
      })

      const successResponse = await employeesGet(successRequest)
      expect(successResponse.status).toBe(200)

      // Make a failing request (wrong organization)
      const failingRequest = createMockRequest('GET', '/api/employees', {}, {
        userId: adminUserId,
        organizationId: org2Id // User doesn't belong to org2
      })

      const failingResponse = await employeesGet(failingRequest)
      expect(failingResponse.status).toBe(403)

      // Return to original context - should still work
      const recoveryRequest = createMockRequest('GET', '/api/employees', {}, {
        userId: adminUserId,
        organizationId: org1Id
      })

      const recoveryResponse = await employeesGet(recoveryRequest)
      expect(recoveryResponse.status).toBe(200)

      const recoveryData = await recoveryResponse.json()
      validateOrganizationContext(recoveryData, org1Id)
    })
  })

  describe('Multi-User Context Isolation', () => {
    test('should maintain separate contexts for concurrent users', async () => {
      // Admin in org1 and manager in org1 should see same data
      const adminRequest = createMockRequest('GET', '/api/employees', {}, {
        userId: adminUserId,
        organizationId: org1Id,
        sessionId: 'admin-session'
      })

      const managerRequest = createMockRequest('GET', '/api/employees', {}, {
        userId: managerUserId,
        organizationId: org1Id,
        sessionId: 'manager-session'
      })

      // Multi-org user in org2 should see different data
      const multiOrgRequest = createMockRequest('GET', '/api/employees', {}, {
        userId: multiOrgUserId,
        organizationId: org2Id,
        sessionId: 'multi-org-session'
      })

      const [adminResponse, managerResponse, multiOrgResponse] = await Promise.all([
        employeesGet(adminRequest),
        employeesGet(managerRequest),
        employeesGet(multiOrgRequest)
      ])

      expect(adminResponse.status).toBe(200)
      expect(managerResponse.status).toBe(200)
      expect(multiOrgResponse.status).toBe(200)

      const adminData = await adminResponse.json()
      const managerData = await managerResponse.json()
      const multiOrgData = await multiOrgResponse.json()

      // Admin and manager see same org1 data
      expect(adminData.employees.length).toBe(managerData.employees.length)
      
      // Multi-org user sees different org2 data
      expect(multiOrgData.employees.length).not.toBe(adminData.employees.length)

      // Validate organization contexts
      validateOrganizationContext(adminData, org1Id)
      validateOrganizationContext(managerData, org1Id)
      validateOrganizationContext(multiOrgData, org2Id)
    })

    test('should prevent context bleeding between user sessions', async () => {
      // User 1 in org1
      const user1Org1Request = createMockRequest('GET', '/api/leave-requests', {}, {
        userId: adminUserId,
        organizationId: org1Id,
        sessionId: 'user1-org1'
      })

      // User 2 (multi-org) in org2
      const user2Org2Request = createMockRequest('GET', '/api/leave-requests', {}, {
        userId: multiOrgUserId,
        organizationId: org2Id,
        sessionId: 'user2-org2'
      })

      const [user1Response, user2Response] = await Promise.all([
        leaveRequestsGet(user1Org1Request),
        leaveRequestsGet(user2Org2Request)
      ])

      expect(user1Response.status).toBe(200)
      expect(user2Response.status).toBe(200)

      const user1Data = await user1Response.json()
      const user2Data = await user2Response.json()

      // Verify no data bleeding - each user sees only their org's data
      if (user1Data.leaveRequests) {
        for (const request of user1Data.leaveRequests) {
          expect(request.organization_id).toBe(org1Id)
        }
      }

      if (user2Data.leaveRequests) {
        for (const request of user2Data.leaveRequests) {
          expect(request.organization_id).toBe(org2Id)
        }
      }
    })
  })

  describe('Context Validation and Error Handling', () => {
    test('should detect and handle invalid organization contexts', async () => {
      const invalidContextRequest = createMockRequest('GET', '/api/employees', {}, {
        userId: adminUserId,
        organizationId: '00000000-0000-0000-0000-000000000000' // Non-existent org
      })

      const invalidResponse = await employeesGet(invalidContextRequest)
      expect(invalidResponse.status).toBe(403)

      const errorData = await invalidResponse.json()
      expect(errorData.error).toMatch(/organization|access denied|not belong/i)
    })

    test('should handle missing organization context gracefully', async () => {
      const noContextRequest = createMockRequest('GET', '/api/employees', {}, {
        userId: adminUserId
        // No organizationId provided
      })

      const noContextResponse = await employeesGet(noContextRequest)
      
      // Should either work with default organization or return proper error
      if (noContextResponse.status !== 200) {
        expect(noContextResponse.status).toBeGreaterThanOrEqual(400)
        const errorData = await noContextResponse.json()
        expect(errorData.error).toBeDefined()
      }
    })

    test('should validate user membership before applying context', async () => {
      // Employee trying to access org2 (not a member)
      const unauthorizedRequest = createMockRequest('GET', '/api/employees', {}, {
        userId: employeeUserId,
        organizationId: org2Id
      })

      const unauthorizedResponse = await employeesGet(unauthorizedRequest)
      expect(unauthorizedResponse.status).toBe(403)

      const errorData = await unauthorizedResponse.json()
      expect(errorData.error).toMatch(/organization|access denied|not belong/i)
    })
  })

  // Helper functions
  function getHandlerForEndpoint(endpoint: string) {
    const handlerMap: { [key: string]: any } = {
      '/api/dashboard-data': dashboardDataGet,
      '/api/employees': employeesGet,
      '/api/leave-requests': leaveRequestsGet,
      '/api/organization/members': organizationMembersGet
    }
    return handlerMap[endpoint]
  }

  function validateOrganizationContext(data: any, expectedOrgId: string) {
    if (data.employees) {
      for (const employee of data.employees) {
        expect(employee.organization_id).toBe(expectedOrgId)
      }
    }

    if (data.leaveRequests) {
      for (const request of data.leaveRequests) {
        expect(request.organization_id).toBe(expectedOrgId)
      }
    }

    if (data.members) {
      for (const member of data.members) {
        expect(member.organization_id).toBe(expectedOrgId)
      }
    }
  }
})