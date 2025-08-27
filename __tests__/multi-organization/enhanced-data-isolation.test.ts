/**
 * Enhanced Data Isolation Between Organizations Test Suite
 * 
 * Tests for Task 5.4: Test data isolation between different organizations
 * 
 * This test suite enhances the existing data-isolation.test.ts with additional
 * multi-organization scenarios including:
 * - Advanced multi-tenant data segregation patterns
 * - Complex organization relationship scenarios
 * - Advanced query isolation validation
 * - Performance impact of isolation mechanisms
 * - Data leakage prevention in bulk operations
 * - Edge cases in organization boundaries
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { createMockRequest, createTestUser, createTestOrganization, cleanupTestData } from '../utils/test-helpers'
import { createClient } from '@supabase/supabase-js'

// Import API route handlers
import { GET as employeesGet } from '@/app/api/employees/route'
import { GET as leaveRequestsGet } from '@/app/api/leave-requests/route'
import { GET as organizationMembersGet } from '@/app/api/organization/members/route'
import { GET as dashboardDataGet } from '@/app/api/dashboard-data/route'
import { GET as calendarLeaveRequestsGet } from '@/app/api/calendar/leave-requests/route'
import { GET as teamsGet } from '@/app/api/teams/route'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('Enhanced Data Isolation Between Organizations Tests', () => {
  let org1Id: string
  let org2Id: string
  let org3Id: string
  let org4Id: string
  let org5Id: string
  
  // Users distributed across organizations
  let org1Users: string[]
  let org2Users: string[]
  let org3Users: string[]
  let multiOrgUsers: string[]
  let testUserIds: string[]
  let testOrgIds: string[]
  
  // Complex test data for isolation validation
  let testLeaveRequests: { [orgId: string]: string[] } = {}
  let testTeams: { [orgId: string]: string[] } = {}
  let testInvitations: { [orgId: string]: string[] } = {}

  beforeEach(async () => {
    // Create multiple test organizations for comprehensive isolation testing
    org1Id = await createTestOrganization('Enhanced Isolation Org 1')
    org2Id = await createTestOrganization('Enhanced Isolation Org 2')
    org3Id = await createTestOrganization('Enhanced Isolation Org 3')
    org4Id = await createTestOrganization('Enhanced Isolation Org 4')
    org5Id = await createTestOrganization('Enhanced Isolation Org 5')

    testOrgIds = [org1Id, org2Id, org3Id, org4Id, org5Id]

    // Create users for each organization
    org1Users = [
      await createTestUser('admin1@enhanced-isolation.test', org1Id, 'admin'),
      await createTestUser('manager1@enhanced-isolation.test', org1Id, 'manager'),
      await createTestUser('employee1a@enhanced-isolation.test', org1Id, 'employee'),
      await createTestUser('employee1b@enhanced-isolation.test', org1Id, 'employee'),
    ]

    org2Users = [
      await createTestUser('admin2@enhanced-isolation.test', org2Id, 'admin'),
      await createTestUser('manager2@enhanced-isolation.test', org2Id, 'manager'),
      await createTestUser('employee2a@enhanced-isolation.test', org2Id, 'employee'),
    ]

    org3Users = [
      await createTestUser('admin3@enhanced-isolation.test', org3Id, 'admin'),
      await createTestUser('employee3a@enhanced-isolation.test', org3Id, 'employee'),
    ]

    // Create multi-organization users with complex membership patterns
    const multiOrg1 = await createTestUser('multi1@enhanced-isolation.test', org1Id, 'employee')
    const multiOrg2 = await createTestUser('multi2@enhanced-isolation.test', org2Id, 'manager')
    const multiOrg3 = await createTestUser('multi3@enhanced-isolation.test', org1Id, 'admin')

    multiOrgUsers = [multiOrg1, multiOrg2, multiOrg3]

    // Add multi-org users to additional organizations
    await supabaseAdmin.from('user_organizations').insert([
      // Multi-org user 1: Employee in org1, Manager in org2, Admin in org4
      {
        user_id: multiOrg1,
        organization_id: org2Id,
        role: 'manager',
        is_active: true,
        is_default: false,
        joined_via: 'invitation',
        employment_type: 'full_time'
      },
      {
        user_id: multiOrg1,
        organization_id: org4Id,
        role: 'admin',
        is_active: true,
        is_default: false,
        joined_via: 'invitation',
        employment_type: 'part_time'
      },
      // Multi-org user 2: Manager in org2, Employee in org3, Manager in org5
      {
        user_id: multiOrg2,
        organization_id: org3Id,
        role: 'employee',
        is_active: true,
        is_default: false,
        joined_via: 'invitation',
        employment_type: 'contract'
      },
      {
        user_id: multiOrg2,
        organization_id: org5Id,
        role: 'manager',
        is_active: true,
        is_default: false,
        joined_via: 'invitation',
        employment_type: 'full_time'
      },
      // Multi-org user 3: Admin in org1, Employee in org3, Manager in org5
      {
        user_id: multiOrg3,
        organization_id: org3Id,
        role: 'employee',
        is_active: true,
        is_default: false,
        joined_via: 'invitation',
        employment_type: 'full_time'
      },
      {
        user_id: multiOrg3,
        organization_id: org5Id,
        role: 'manager',
        is_active: true,
        is_default: false,
        joined_via: 'invitation',
        employment_type: 'part_time'
      }
    ])

    testUserIds = [...org1Users, ...org2Users, ...org3Users, ...multiOrgUsers]

    // Setup complex test data for isolation validation
    await setupEnhancedIsolationTestData()
  })

  afterEach(async () => {
    await cleanupTestData(testUserIds, testOrgIds)
  })

  async function setupEnhancedIsolationTestData() {
    // Create leave requests for each organization with varying patterns
    const leaveRequestsData = [
      // Org 1 - Multiple requests from different users
      { user_id: org1Users[0], organization_id: org1Id, start_date: '2024-01-10', end_date: '2024-01-11', status: 'approved', reason: 'Org1 Admin Leave' },
      { user_id: org1Users[1], organization_id: org1Id, start_date: '2024-01-12', end_date: '2024-01-13', status: 'pending', reason: 'Org1 Manager Leave' },
      { user_id: org1Users[2], organization_id: org1Id, start_date: '2024-01-14', end_date: '2024-01-15', status: 'rejected', reason: 'Org1 Employee1 Leave' },
      { user_id: org1Users[3], organization_id: org1Id, start_date: '2024-01-16', end_date: '2024-01-17', status: 'pending', reason: 'Org1 Employee2 Leave' },
      { user_id: multiOrgUsers[0], organization_id: org1Id, start_date: '2024-01-18', end_date: '2024-01-19', status: 'approved', reason: 'Multi-org User in Org1' },
      
      // Org 2 - Different pattern
      { user_id: org2Users[0], organization_id: org2Id, start_date: '2024-01-20', end_date: '2024-01-21', status: 'pending', reason: 'Org2 Admin Leave' },
      { user_id: org2Users[1], organization_id: org2Id, start_date: '2024-01-22', end_date: '2024-01-23', status: 'approved', reason: 'Org2 Manager Leave' },
      { user_id: multiOrgUsers[0], organization_id: org2Id, start_date: '2024-01-24', end_date: '2024-01-25', status: 'pending', reason: 'Multi-org User in Org2' },
      { user_id: multiOrgUsers[1], organization_id: org2Id, start_date: '2024-01-26', end_date: '2024-01-27', status: 'approved', reason: 'Multi-org User2 in Org2' },
      
      // Org 3 - Minimal data
      { user_id: org3Users[0], organization_id: org3Id, start_date: '2024-01-28', end_date: '2024-01-29', status: 'pending', reason: 'Org3 Admin Leave' },
      { user_id: multiOrgUsers[1], organization_id: org3Id, start_date: '2024-01-30', end_date: '2024-01-31', status: 'approved', reason: 'Multi-org User2 in Org3' },
      
      // Org 4 - Only multi-org user
      { user_id: multiOrgUsers[0], organization_id: org4Id, start_date: '2024-02-01', end_date: '2024-02-02', status: 'pending', reason: 'Multi-org User in Org4' },
      
      // Org 5 - Multiple multi-org users
      { user_id: multiOrgUsers[1], organization_id: org5Id, start_date: '2024-02-03', end_date: '2024-02-04', status: 'approved', reason: 'Multi-org User2 in Org5' },
      { user_id: multiOrgUsers[2], organization_id: org5Id, start_date: '2024-02-05', end_date: '2024-02-06', status: 'pending', reason: 'Multi-org User3 in Org5' }
    ]

    const { data: insertedLeaveRequests } = await supabaseAdmin
      .from('leave_requests')
      .insert(leaveRequestsData)
      .select('id, organization_id')

    // Group leave requests by organization
    if (insertedLeaveRequests) {
      for (const request of insertedLeaveRequests) {
        if (!testLeaveRequests[request.organization_id]) {
          testLeaveRequests[request.organization_id] = []
        }
        testLeaveRequests[request.organization_id].push(request.id)
      }
    }

    // Create teams for each organization
    const teamsData = [
      { organization_id: org1Id, name: 'Org1 Development Team', description: 'Dev team for org 1' },
      { organization_id: org1Id, name: 'Org1 QA Team', description: 'QA team for org 1' },
      { organization_id: org2Id, name: 'Org2 Marketing Team', description: 'Marketing team for org 2' },
      { organization_id: org3Id, name: 'Org3 Operations Team', description: 'Ops team for org 3' },
      { organization_id: org4Id, name: 'Org4 Support Team', description: 'Support team for org 4' },
      { organization_id: org5Id, name: 'Org5 Sales Team', description: 'Sales team for org 5' },
      { organization_id: org5Id, name: 'Org5 Engineering Team', description: 'Engineering team for org 5' }
    ]

    const { data: insertedTeams } = await supabaseAdmin
      .from('teams')
      .insert(teamsData)
      .select('id, organization_id')

    // Group teams by organization
    if (insertedTeams) {
      for (const team of insertedTeams) {
        if (!testTeams[team.organization_id]) {
          testTeams[team.organization_id] = []
        }
        testTeams[team.organization_id].push(team.id)
      }
    }

    // Create invitations for each organization
    const invitationsData = [
      { organization_id: org1Id, email: 'invite1@enhanced-isolation.test', role: 'employee', token: 'enhanced-org1-token-1', created_by: org1Users[0] },
      { organization_id: org1Id, email: 'invite2@enhanced-isolation.test', role: 'manager', token: 'enhanced-org1-token-2', created_by: org1Users[0] },
      { organization_id: org2Id, email: 'invite3@enhanced-isolation.test', role: 'employee', token: 'enhanced-org2-token-1', created_by: org2Users[0] },
      { organization_id: org3Id, email: 'invite4@enhanced-isolation.test', role: 'employee', token: 'enhanced-org3-token-1', created_by: org3Users[0] },
      { organization_id: org4Id, email: 'invite5@enhanced-isolation.test', role: 'manager', token: 'enhanced-org4-token-1', created_by: multiOrgUsers[0] },
      { organization_id: org5Id, email: 'invite6@enhanced-isolation.test', role: 'employee', token: 'enhanced-org5-token-1', created_by: multiOrgUsers[1] }
    ]

    const { data: insertedInvitations } = await supabaseAdmin
      .from('invitations')
      .insert(invitationsData)
      .select('id, organization_id')

    // Group invitations by organization
    if (insertedInvitations) {
      for (const invitation of insertedInvitations) {
        if (!testInvitations[invitation.organization_id]) {
          testInvitations[invitation.organization_id] = []
        }
        testInvitations[invitation.organization_id].push(invitation.id)
      }
    }
  }

  describe('Complex Multi-Organization Data Isolation', () => {
    test('should isolate data across 5 organizations with varying user distributions', async () => {
      const organizationTests = [
        { orgId: org1Id, adminUser: org1Users[0], expectedMinEmployees: 5 }, // 4 regular + 1 multi-org
        { orgId: org2Id, adminUser: org2Users[0], expectedMinEmployees: 4 }, // 3 regular + 2 multi-org
        { orgId: org3Id, adminUser: org3Users[0], expectedMinEmployees: 4 }, // 2 regular + 2 multi-org
        { orgId: org4Id, adminUser: multiOrgUsers[0], expectedMinEmployees: 1 }, // 1 multi-org only
        { orgId: org5Id, adminUser: multiOrgUsers[1], expectedMinEmployees: 2 }  // 2 multi-org users
      ]

      for (const { orgId, adminUser, expectedMinEmployees } of organizationTests) {
        const employeesRequest = createMockRequest('GET', '/api/employees', {}, {
          userId: adminUser,
          organizationId: orgId
        })

        const employeesResponse = await employeesGet(employeesRequest)
        expect(employeesResponse.status).toBe(200)

        const employeesData = await employeesResponse.json()
        expect(employeesData.employees).toBeDefined()
        expect(employeesData.employees.length).toBeGreaterThanOrEqual(expectedMinEmployees)

        // Verify all employees belong to the correct organization
        for (const employee of employeesData.employees) {
          expect(employee.organization_id).toBe(orgId)
        }

        // Verify no employees from other organizations are included
        const otherOrgIds = testOrgIds.filter(id => id !== orgId)
        for (const employee of employeesData.employees) {
          expect(otherOrgIds).not.toContain(employee.organization_id)
        }
      }
    })

    test('should isolate leave requests with complex user membership patterns', async () => {
      // Test each organization's leave request isolation
      for (const orgId of testOrgIds) {
        if (testLeaveRequests[orgId] && testLeaveRequests[orgId].length > 0) {
          // Find an admin user for this organization
          let adminUser: string | null = null
          
          if (orgId === org1Id) adminUser = org1Users[0]
          else if (orgId === org2Id) adminUser = org2Users[0]
          else if (orgId === org3Id) adminUser = org3Users[0]
          else if (orgId === org4Id) adminUser = multiOrgUsers[0] // Admin in org4
          else if (orgId === org5Id) adminUser = multiOrgUsers[1] // Manager in org5, but sufficient for test

          if (adminUser) {
            const leaveRequestsRequest = createMockRequest('GET', '/api/leave-requests', {}, {
              userId: adminUser,
              organizationId: orgId
            })

            const leaveRequestsResponse = await leaveRequestsGet(leaveRequestsRequest)
            expect(leaveRequestsResponse.status).toBe(200)

            const leaveRequestsData = await leaveRequestsResponse.json()
            expect(leaveRequestsData.leaveRequests).toBeDefined()

            // Verify all leave requests belong to the correct organization
            for (const request of leaveRequestsData.leaveRequests) {
              expect(request.organization_id).toBe(orgId)
            }

            // Verify leave requests from other organizations are not included
            const otherOrgIds = testOrgIds.filter(id => id !== orgId)
            for (const request of leaveRequestsData.leaveRequests) {
              expect(otherOrgIds).not.toContain(request.organization_id)
            }
          }
        }
      }
    })

    test('should prevent data leakage in dashboard aggregations', async () => {
      // Test dashboard data isolation for each organization
      const dashboardTests = [
        { orgId: org1Id, adminUser: org1Users[0] },
        { orgId: org2Id, adminUser: org2Users[0] },
        { orgId: org3Id, adminUser: org3Users[0] }
      ]

      for (const { orgId, adminUser } of dashboardTests) {
        const dashboardRequest = createMockRequest('GET', '/api/dashboard-data', {}, {
          userId: adminUser,
          organizationId: orgId
        })

        const dashboardResponse = await dashboardDataGet(dashboardRequest)
        expect(dashboardResponse.status).toBe(200)

        const dashboardData = await dashboardResponse.json()

        // Validate all dashboard data belongs to the correct organization
        if (dashboardData.leaveRequests) {
          for (const request of dashboardData.leaveRequests) {
            expect(request.organization_id).toBe(orgId)
          }
        }

        if (dashboardData.employees) {
          for (const employee of dashboardData.employees) {
            expect(employee.organization_id).toBe(orgId)
          }
        }

        if (dashboardData.teams) {
          for (const team of dashboardData.teams) {
            expect(team.organization_id).toBe(orgId)
          }
        }

        // Verify no aggregated data from other organizations
        const otherOrgIds = testOrgIds.filter(id => id !== orgId)
        
        if (dashboardData.leaveRequests) {
          for (const request of dashboardData.leaveRequests) {
            expect(otherOrgIds).not.toContain(request.organization_id)
          }
        }
      }
    })
  })

  describe('Multi-Organization User Data Isolation', () => {
    test('should isolate data for multi-org users based on current context', async () => {
      const multiOrgUser = multiOrgUsers[0] // Employee in org1, Manager in org2, Admin in org4
      
      const contexts = [
        { orgId: org1Id, role: 'employee' },
        { orgId: org2Id, role: 'manager' },
        { orgId: org4Id, role: 'admin' }
      ]

      for (const { orgId, role } of contexts) {
        // Test employee data access
        const employeesRequest = createMockRequest('GET', '/api/employees', {}, {
          userId: multiOrgUser,
          organizationId: orgId
        })

        const employeesResponse = await employeesGet(employeesRequest)
        expect(employeesResponse.status).toBe(200)

        const employeesData = await employeesResponse.json()
        
        // All employees should belong to current organization only
        for (const employee of employeesData.employees) {
          expect(employee.organization_id).toBe(orgId)
        }

        // Test leave requests access
        const leaveRequestsRequest = createMockRequest('GET', '/api/leave-requests', {}, {
          userId: multiOrgUser,
          organizationId: orgId
        })

        const leaveRequestsResponse = await leaveRequestsGet(leaveRequestsRequest)
        expect(leaveRequestsResponse.status).toBe(200)

        const leaveRequestsData = await leaveRequestsResponse.json()
        
        // All leave requests should belong to current organization only
        for (const request of leaveRequestsData.leaveRequests) {
          expect(request.organization_id).toBe(orgId)
        }

        // Role-based data should be filtered appropriately
        if (role === 'employee') {
          // Employee should primarily see their own requests
          const ownRequests = leaveRequestsData.leaveRequests.filter(
            (req: any) => req.user_id === multiOrgUser
          )
          expect(ownRequests.length).toBeGreaterThan(0)
        }
      }
    })

    test('should prevent multi-org user from seeing cross-organization data simultaneously', async () => {
      const multiOrgUser = multiOrgUsers[1] // Manager in org2, Employee in org3, Manager in org5

      // Make concurrent requests to different organizations
      const concurrentRequests = [
        {
          request: createMockRequest('GET', '/api/employees', {}, {
            userId: multiOrgUser,
            organizationId: org2Id
          }),
          expectedOrgId: org2Id
        },
        {
          request: createMockRequest('GET', '/api/employees', {}, {
            userId: multiOrgUser,
            organizationId: org3Id
          }),
          expectedOrgId: org3Id
        },
        {
          request: createMockRequest('GET', '/api/employees', {}, {
            userId: multiOrgUser,
            organizationId: org5Id
          }),
          expectedOrgId: org5Id
        }
      ]

      const responses = await Promise.all(
        concurrentRequests.map(({ request }) => employeesGet(request))
      )

      // Validate each response contains only data from the requested organization
      for (let i = 0; i < responses.length; i++) {
        const response = responses[i]
        const expectedOrgId = concurrentRequests[i].expectedOrgId

        expect(response.status).toBe(200)

        const data = await response.json()
        
        for (const employee of data.employees) {
          expect(employee.organization_id).toBe(expectedOrgId)
          
          // Ensure no data from other organizations
          const otherOrgIds = [org2Id, org3Id, org5Id].filter(id => id !== expectedOrgId)
          expect(otherOrgIds).not.toContain(employee.organization_id)
        }
      }
    })
  })

  describe('Advanced Query Isolation Validation', () => {
    test('should maintain isolation in complex joined queries', async () => {
      // Test calendar leave requests endpoint which typically involves complex joins
      for (const orgId of [org1Id, org2Id, org3Id]) {
        let adminUser: string
        if (orgId === org1Id) adminUser = org1Users[0]
        else if (orgId === org2Id) adminUser = org2Users[0]
        else adminUser = org3Users[0]

        const calendarRequest = createMockRequest('GET', '/api/calendar/leave-requests', {}, {
          userId: adminUser,
          organizationId: orgId
        })

        const calendarResponse = await calendarLeaveRequestsGet(calendarRequest)
        
        if (calendarResponse.status === 200) {
          const calendarData = await calendarResponse.json()
          
          if (calendarData.leaveRequests) {
            for (const request of calendarData.leaveRequests) {
              expect(request.organization_id).toBe(orgId)
            }
          }
          
          if (calendarData.events) {
            for (const event of calendarData.events) {
              if (event.organization_id) {
                expect(event.organization_id).toBe(orgId)
              }
            }
          }
        }
      }
    })

    test('should isolate team data across organizations', async () => {
      // Test teams endpoint for isolation
      for (const orgId of testOrgIds) {
        if (testTeams[orgId] && testTeams[orgId].length > 0) {
          // Find appropriate user for this organization
          let testUser: string | null = null
          
          if (orgId === org1Id) testUser = org1Users[0]
          else if (orgId === org2Id) testUser = org2Users[0]
          else if (orgId === org3Id) testUser = org3Users[0]
          else if (orgId === org4Id) testUser = multiOrgUsers[0]
          else if (orgId === org5Id) testUser = multiOrgUsers[1]

          if (testUser) {
            const teamsRequest = createMockRequest('GET', '/api/teams', {}, {
              userId: testUser,
              organizationId: orgId
            })

            const teamsResponse = await teamsGet(teamsRequest)
            
            if (teamsResponse.status === 200) {
              const teamsData = await teamsResponse.json()
              
              if (teamsData.teams) {
                for (const team of teamsData.teams) {
                  expect(team.organization_id).toBe(orgId)
                }
              }
            }
          }
        }
      }
    })
  })

  describe('Bulk Operations and Performance Isolation', () => {
    test('should maintain isolation during bulk data operations', async () => {
      // Create bulk leave requests across organizations
      const bulkLeaveRequestsData = []
      
      for (const orgId of testOrgIds) {
        if (orgId === org1Id && org1Users.length > 0) {
          bulkLeaveRequestsData.push({
            user_id: org1Users[0],
            organization_id: orgId,
            start_date: '2024-03-01',
            end_date: '2024-03-02',
            status: 'pending',
            reason: `Bulk test for ${orgId}`
          })
        }
      }

      if (bulkLeaveRequestsData.length > 0) {
        await supabaseAdmin
          .from('leave_requests')
          .insert(bulkLeaveRequestsData)

        // Verify bulk queries maintain isolation
        for (const orgId of [org1Id, org2Id, org3Id]) {
          let adminUser: string
          if (orgId === org1Id) adminUser = org1Users[0]
          else if (orgId === org2Id) adminUser = org2Users[0]
          else adminUser = org3Users[0]

          const bulkRequest = createMockRequest('GET', '/api/leave-requests', {}, {
            userId: adminUser,
            organizationId: orgId
          })

          const bulkResponse = await leaveRequestsGet(bulkRequest)
          expect(bulkResponse.status).toBe(200)

          const bulkData = await bulkResponse.json()
          
          for (const request of bulkData.leaveRequests) {
            expect(request.organization_id).toBe(orgId)
          }
        }
      }
    })

    test('should handle high-volume data isolation efficiently', async () => {
      // Test with multiple concurrent requests to validate isolation performance
      const concurrentRequests = []
      
      for (let i = 0; i < 10; i++) {
        // Alternate between different organizations
        const orgIndex = i % 3
        let orgId: string, adminUser: string
        
        if (orgIndex === 0) {
          orgId = org1Id
          adminUser = org1Users[0]
        } else if (orgIndex === 1) {
          orgId = org2Id
          adminUser = org2Users[0]
        } else {
          orgId = org3Id
          adminUser = org3Users[0]
        }

        concurrentRequests.push({
          request: createMockRequest('GET', '/api/employees', {}, {
            userId: adminUser,
            organizationId: orgId,
            requestId: i
          }),
          expectedOrgId: orgId
        })
      }

      const startTime = Date.now()
      const responses = await Promise.all(
        concurrentRequests.map(({ request }) => employeesGet(request))
      )
      const endTime = Date.now()

      // Verify all requests completed successfully
      for (let i = 0; i < responses.length; i++) {
        const response = responses[i]
        const expectedOrgId = concurrentRequests[i].expectedOrgId

        expect(response.status).toBe(200)

        const data = await response.json()
        for (const employee of data.employees) {
          expect(employee.organization_id).toBe(expectedOrgId)
        }
      }

      // Basic performance check - should complete within reasonable time
      const executionTime = endTime - startTime
      expect(executionTime).toBeLessThan(30000) // 30 seconds max for 10 concurrent requests
    })
  })

  describe('Edge Cases and Boundary Conditions', () => {
    test('should handle organization with single user isolation', async () => {
      // Org4 has only one user (multiOrgUsers[0])
      const singleUserRequest = createMockRequest('GET', '/api/employees', {}, {
        userId: multiOrgUsers[0],
        organizationId: org4Id
      })

      const singleUserResponse = await employeesGet(singleUserRequest)
      expect(singleUserResponse.status).toBe(200)

      const singleUserData = await singleUserResponse.json()
      expect(singleUserData.employees).toBeDefined()
      expect(singleUserData.employees.length).toBe(1)
      expect(singleUserData.employees[0].organization_id).toBe(org4Id)
    })

    test('should handle empty organization data sets', async () => {
      // Create a new organization with no additional data
      const emptyOrgId = await createTestOrganization('Empty Org Test')
      const emptyOrgAdminId = await createTestUser('empty@enhanced-isolation.test', emptyOrgId, 'admin')
      
      testUserIds.push(emptyOrgAdminId)
      testOrgIds.push(emptyOrgId)

      const emptyOrgRequest = createMockRequest('GET', '/api/employees', {}, {
        userId: emptyOrgAdminId,
        organizationId: emptyOrgId
      })

      const emptyOrgResponse = await employeesGet(emptyOrgRequest)
      expect(emptyOrgResponse.status).toBe(200)

      const emptyOrgData = await emptyOrgResponse.json()
      expect(emptyOrgData.employees).toBeDefined()
      expect(emptyOrgData.employees.length).toBe(1) // Only the admin user
      expect(emptyOrgData.employees[0].organization_id).toBe(emptyOrgId)
    })

    test('should prevent data access to deactivated organization memberships', async () => {
      // Deactivate multi-org user's membership in org5
      await supabaseAdmin
        .from('user_organizations')
        .update({ is_active: false })
        .eq('user_id', multiOrgUsers[1])
        .eq('organization_id', org5Id)

      // Attempt to access org5 data should fail
      const deactivatedAccessRequest = createMockRequest('GET', '/api/employees', {}, {
        userId: multiOrgUsers[1],
        organizationId: org5Id
      })

      const deactivatedAccessResponse = await employeesGet(deactivatedAccessRequest)
      expect(deactivatedAccessResponse.status).toBe(403)

      const deactivatedErrorData = await deactivatedAccessResponse.json()
      expect(deactivatedErrorData.error).toMatch(/organization|access denied|not belong|inactive/i)
    })

    test('should validate isolation with malformed organization IDs', async () => {
      const malformedOrgRequests = [
        {
          orgId: null,
          description: 'null organization ID'
        },
        {
          orgId: '',
          description: 'empty organization ID'
        },
        {
          orgId: 'invalid-uuid',
          description: 'invalid UUID format'
        },
        {
          orgId: '00000000-0000-0000-0000-000000000000',
          description: 'non-existent organization ID'
        }
      ]

      for (const { orgId, description } of malformedOrgRequests) {
        const malformedRequest = createMockRequest('GET', '/api/employees', {}, {
          userId: org1Users[0],
          organizationId: orgId
        })

        const malformedResponse = await employeesGet(malformedRequest)
        
        // Should fail with appropriate error (not success with leaked data)
        expect(malformedResponse.status).toBeGreaterThanOrEqual(400)
        
        if (malformedResponse.status !== 500) {
          const errorData = await malformedResponse.json()
          expect(errorData.error).toBeDefined()
        }
      }
    })
  })
})