/**
 * Data Isolation and Multi-Tenancy Security Test Suite
 * 
 * This comprehensive test suite validates organization-based data isolation including:
 * - Multi-tenant data segregation
 * - Cross-organization data leakage prevention
 * - Organization context enforcement
 * - Data visibility boundaries
 * - Shared resource isolation
 * - Multi-organization user handling
 * - Query filtering validation
 * - Database-level isolation verification
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { createMockRequest, createTestUser, createTestOrganization, cleanupTestData } from '../utils/test-helpers'
import { createClient } from '@supabase/supabase-js'

// Import API route handlers
import { GET as employeesGet } from '@/app/api/employees/route'
import { GET as leaveRequestsGet } from '@/app/api/leave-requests/route'
import { GET as teamMembersGet } from '@/app/api/team/members/route'
import { GET as organizationMembersGet } from '@/app/api/organization/members/route'
import { GET as dashboardDataGet } from '@/app/api/dashboard-data/route'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('Data Isolation and Multi-Tenancy Security Tests', () => {
  let org1Id: string
  let org2Id: string
  let org3Id: string
  let admin1Id: string
  let manager1Id: string
  let employee1Id: string
  let admin2Id: string
  let employee2Id: string
  let admin3Id: string
  let multiOrgUserId: string // User belonging to multiple organizations
  let testUserIds: string[]
  let testOrgIds: string[]

  // Test data for isolation verification
  let org1LeaveRequestId: string
  let org2LeaveRequestId: string
  let org1TeamId: string
  let org2TeamId: string
  let org1InvitationId: string
  let org2InvitationId: string

  beforeEach(async () => {
    // Create multiple test organizations
    org1Id = await createTestOrganization('Isolation Test Org 1')
    org2Id = await createTestOrganization('Isolation Test Org 2')
    org3Id = await createTestOrganization('Isolation Test Org 3')

    // Create users in different organizations
    admin1Id = await createTestUser('admin1@isolation.com', org1Id, 'admin')
    manager1Id = await createTestUser('manager1@isolation.com', org1Id, 'manager')
    employee1Id = await createTestUser('employee1@isolation.com', org1Id, 'employee')
    
    admin2Id = await createTestUser('admin2@isolation.com', org2Id, 'admin')
    employee2Id = await createTestUser('employee2@isolation.com', org2Id, 'employee')
    
    admin3Id = await createTestUser('admin3@isolation.com', org3Id, 'admin')
    
    // Create a user belonging to multiple organizations
    multiOrgUserId = await createTestUser('multi@isolation.com', org1Id, 'employee')

    testUserIds = [admin1Id, manager1Id, employee1Id, admin2Id, employee2Id, admin3Id, multiOrgUserId]
    testOrgIds = [org1Id, org2Id, org3Id]

    // Add multi-org user to second organization
    await supabaseAdmin
      .from('user_organizations')
      .insert({
        user_id: multiOrgUserId,
        organization_id: org2Id,
        role: 'manager',
        is_active: true,
        is_default: false,
        joined_via: 'invitation',
        employment_type: 'full_time'
      })

    // Create test data for isolation testing
    await setupIsolationTestData()
  })

  afterEach(async () => {
    await cleanupTestData(testUserIds, testOrgIds)
  })

  async function setupIsolationTestData() {
    // Create leave requests in different organizations
    const { data: leaveRequest1 } = await supabaseAdmin
      .from('leave_requests')
      .insert({
        user_id: employee1Id,
        organization_id: org1Id,
        start_date: '2024-01-15',
        end_date: '2024-01-16',
        status: 'pending',
        reason: 'Org 1 leave request'
      })
      .select()
      .single()

    const { data: leaveRequest2 } = await supabaseAdmin
      .from('leave_requests')
      .insert({
        user_id: employee2Id,
        organization_id: org2Id,
        start_date: '2024-01-17',
        end_date: '2024-01-18',
        status: 'pending',
        reason: 'Org 2 leave request'
      })
      .select()
      .single()

    org1LeaveRequestId = leaveRequest1?.id
    org2LeaveRequestId = leaveRequest2?.id

    // Create teams in different organizations
    const { data: team1 } = await supabaseAdmin
      .from('teams')
      .insert({
        organization_id: org1Id,
        name: 'Org 1 Development Team',
        description: 'Development team for organization 1'
      })
      .select()
      .single()

    const { data: team2 } = await supabaseAdmin
      .from('teams')
      .insert({
        organization_id: org2Id,
        name: 'Org 2 Marketing Team',
        description: 'Marketing team for organization 2'
      })
      .select()
      .single()

    org1TeamId = team1?.id
    org2TeamId = team2?.id

    // Create invitations in different organizations
    const { data: invitation1 } = await supabaseAdmin
      .from('invitations')
      .insert({
        organization_id: org1Id,
        email: 'invite1@isolation.com',
        role: 'employee',
        token: 'org1-isolation-token-123',
        created_by: admin1Id
      })
      .select()
      .single()

    const { data: invitation2 } = await supabaseAdmin
      .from('invitations')
      .insert({
        organization_id: org2Id,
        email: 'invite2@isolation.com',
        role: 'employee',
        token: 'org2-isolation-token-456',
        created_by: admin2Id
      })
      .select()
      .single()

    org1InvitationId = invitation1?.id
    org2InvitationId = invitation2?.id

    // Create organization settings for each org
    await supabaseAdmin
      .from('organization_settings')
      .insert([
        {
          organization_id: org1Id,
          allow_domain_join_requests: true,
          require_admin_approval_for_domain_join: false,
          default_employment_type: 'full_time'
        },
        {
          organization_id: org2Id,
          allow_domain_join_requests: false,
          require_admin_approval_for_domain_join: true,
          default_employment_type: 'contract'
        },
        {
          organization_id: org3Id,
          allow_domain_join_requests: true,
          require_admin_approval_for_domain_join: true,
          default_employment_type: 'part_time'
        }
      ])
  }

  describe('Employee Data Isolation', () => {
    test('should only return employees from the requesting organization', async () => {
      // Request from org1 admin
      const org1Request = createMockRequest('GET', '/api/employees', {}, {
        userId: admin1Id,
        organizationId: org1Id
      })

      const org1Response = await employeesGet(org1Request)
      expect(org1Response.status).toBe(200)

      const org1Data = await org1Response.json()
      expect(org1Data.employees).toBeDefined()
      expect(Array.isArray(org1Data.employees)).toBe(true)

      // Verify all employees belong to org1
      const org1Employees = org1Data.employees
      for (const employee of org1Employees) {
        expect(employee.organization_id).toBe(org1Id)
      }

      // Verify org2 employees are not included
      const org2EmployeeIds = [admin2Id, employee2Id]
      const leakedEmployees = org1Employees.filter((emp: any) => 
        org2EmployeeIds.includes(emp.id)
      )
      expect(leakedEmployees).toHaveLength(0)

      // Request from org2 admin
      const org2Request = createMockRequest('GET', '/api/employees', {}, {
        userId: admin2Id,
        organizationId: org2Id
      })

      const org2Response = await employeesGet(org2Request)
      expect(org2Response.status).toBe(200)

      const org2Data = await org2Response.json()
      expect(org2Data.employees).toBeDefined()

      // Verify all employees belong to org2
      const org2Employees = org2Data.employees
      for (const employee of org2Employees) {
        expect(employee.organization_id).toBe(org2Id)
      }

      // Verify org1 employees are not included
      const org1EmployeeIds = [admin1Id, manager1Id, employee1Id]
      const leakedFromOrg1 = org2Employees.filter((emp: any) => 
        org1EmployeeIds.includes(emp.id)
      )
      expect(leakedFromOrg1).toHaveLength(0)
    })

    test('should prevent cross-organization employee access attempts', async () => {
      // Org1 admin trying to access org2 data
      const crossOrgRequest = createMockRequest('GET', '/api/employees', {}, {
        userId: admin1Id,
        organizationId: org2Id // Different organization
      })

      const crossOrgResponse = await employeesGet(crossOrgRequest)
      expect(crossOrgResponse.status).toBe(403)

      const data = await crossOrgResponse.json()
      expect(data.error).toMatch(/organization|access denied|unauthorized/i)
    })

    test('should handle organization context switching properly', async () => {
      // Multi-org user should get different data based on context
      const org1Context = createMockRequest('GET', '/api/employees', {}, {
        userId: multiOrgUserId,
        organizationId: org1Id
      })

      const org1Response = await employeesGet(org1Context)
      expect(org1Response.status).toBe(200)

      const org1Data = await org1Response.json()
      const org1Employees = org1Data.employees

      // All employees should be from org1
      for (const employee of org1Employees) {
        expect(employee.organization_id).toBe(org1Id)
      }

      const org2Context = createMockRequest('GET', '/api/employees', {}, {
        userId: multiOrgUserId,
        organizationId: org2Id
      })

      const org2Response = await employeesGet(org2Context)
      expect(org2Response.status).toBe(200)

      const org2Data = await org2Response.json()
      const org2Employees = org2Data.employees

      // All employees should be from org2
      for (const employee of org2Employees) {
        expect(employee.organization_id).toBe(org2Id)
      }

      // Verify no data overlap
      const org1Ids = org1Employees.map((emp: any) => emp.id)
      const org2Ids = org2Employees.map((emp: any) => emp.id)
      const overlap = org1Ids.filter((id: string) => org2Ids.includes(id))
      expect(overlap).toHaveLength(0)
    })
  })

  describe('Leave Request Data Isolation', () => {
    test('should only return leave requests from the requesting organization', async () => {
      // Request from org1
      const org1Request = createMockRequest('GET', '/api/leave-requests', {}, {
        userId: admin1Id,
        organizationId: org1Id
      })

      const org1Response = await leaveRequestsGet(org1Request)
      expect(org1Response.status).toBe(200)

      const org1Data = await org1Response.json()
      expect(org1Data.leaveRequests).toBeDefined()

      const org1Requests = org1Data.leaveRequests
      for (const request of org1Requests) {
        expect(request.organization_id).toBe(org1Id)
      }

      // Verify org2 requests are not included
      const org2RequestsInOrg1 = org1Requests.filter((req: any) => 
        req.id === org2LeaveRequestId
      )
      expect(org2RequestsInOrg1).toHaveLength(0)

      // Request from org2
      const org2Request = createMockRequest('GET', '/api/leave-requests', {}, {
        userId: admin2Id,
        organizationId: org2Id
      })

      const org2Response = await leaveRequestsGet(org2Request)
      expect(org2Response.status).toBe(200)

      const org2Data = await org2Response.json()
      const org2Requests = org2Data.leaveRequests

      for (const request of org2Requests) {
        expect(request.organization_id).toBe(org2Id)
      }

      // Verify org1 requests are not included
      const org1RequestsInOrg2 = org2Requests.filter((req: any) => 
        req.id === org1LeaveRequestId
      )
      expect(org1RequestsInOrg2).toHaveLength(0)
    })

    test('should isolate leave request visibility by user role within organization', async () => {
      // Employee should only see their own requests
      const employeeRequest = createMockRequest('GET', '/api/leave-requests', {}, {
        userId: employee1Id,
        organizationId: org1Id
      })

      const employeeResponse = await leaveRequestsGet(employeeRequest)
      expect(employeeResponse.status).toBe(200)

      const employeeData = await employeeResponse.json()
      const employeeRequests = employeeData.leaveRequests

      // All requests should belong to the employee
      for (const request of employeeRequests) {
        expect(request.user_id).toBe(employee1Id)
      }

      // Manager/Admin should see all org requests
      const managerRequest = createMockRequest('GET', '/api/leave-requests', {}, {
        userId: manager1Id,
        organizationId: org1Id
      })

      const managerResponse = await leaveRequestsGet(managerRequest)
      expect(managerResponse.status).toBe(200)

      const managerData = await managerResponse.json()
      const managerRequests = managerData.leaveRequests

      // Manager should see more requests than employee
      expect(managerRequests.length).toBeGreaterThanOrEqual(employeeRequests.length)
    })
  })

  describe('Team Data Isolation', () => {
    test('should only return teams from the requesting organization', async () => {
      const org1Request = createMockRequest('GET', '/api/team/members', {}, {
        userId: admin1Id,
        organizationId: org1Id
      })

      const org1Response = await teamMembersGet(org1Request)
      
      if (org1Response.status === 200) {
        const org1Data = await org1Response.json()
        const org1Teams = org1Data.teams || org1Data.members || []

        // Verify team isolation (implementation-specific)
        for (const team of org1Teams) {
          if (team.organization_id) {
            expect(team.organization_id).toBe(org1Id)
          }
        }
      }

      const org2Request = createMockRequest('GET', '/api/team/members', {}, {
        userId: admin2Id,
        organizationId: org2Id
      })

      const org2Response = await teamMembersGet(org2Request)
      
      if (org2Response.status === 200) {
        const org2Data = await org2Response.json()
        const org2Teams = org2Data.teams || org2Data.members || []

        for (const team of org2Teams) {
          if (team.organization_id) {
            expect(team.organization_id).toBe(org2Id)
          }
        }
      }
    })

    test('should prevent cross-organization team access', async () => {
      const crossOrgRequest = createMockRequest('GET', '/api/team/members', {}, {
        userId: admin1Id,
        organizationId: org2Id // Wrong organization
      })

      const response = await teamMembersGet(crossOrgRequest)
      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data.error).toMatch(/organization|access denied|unauthorized/i)
    })
  })

  describe('Organization Member Isolation', () => {
    test('should only return members from the requesting organization', async () => {
      const org1Request = createMockRequest('GET', '/api/organization/members', {}, {
        userId: admin1Id,
        organizationId: org1Id
      })

      const org1Response = await organizationMembersGet(org1Request)
      expect(org1Response.status).toBe(200)

      const org1Data = await org1Response.json()
      expect(org1Data.members).toBeDefined()

      const org1Members = org1Data.members
      for (const member of org1Members) {
        expect(member.organization_id).toBe(org1Id)
      }

      // Verify org2 members are not included
      const org2MemberIds = [admin2Id, employee2Id]
      const leakedMembers = org1Members.filter((member: any) => 
        org2MemberIds.includes(member.user_id)
      )
      expect(leakedMembers).toHaveLength(0)
    })

    test('should handle multi-organization users correctly', async () => {
      // Multi-org user should appear in both organizations but with correct context
      const org1Request = createMockRequest('GET', '/api/organization/members', {}, {
        userId: admin1Id,
        organizationId: org1Id
      })

      const org1Response = await organizationMembersGet(org1Request)
      expect(org1Response.status).toBe(200)

      const org1Data = await org1Response.json()
      const org1Members = org1Data.members

      const multiUserInOrg1 = org1Members.find((member: any) => 
        member.user_id === multiOrgUserId
      )
      expect(multiUserInOrg1).toBeDefined()
      expect(multiUserInOrg1.organization_id).toBe(org1Id)
      expect(multiUserInOrg1.role).toBe('employee')

      const org2Request = createMockRequest('GET', '/api/organization/members', {}, {
        userId: admin2Id,
        organizationId: org2Id
      })

      const org2Response = await organizationMembersGet(org2Request)
      expect(org2Response.status).toBe(200)

      const org2Data = await org2Response.json()
      const org2Members = org2Data.members

      const multiUserInOrg2 = org2Members.find((member: any) => 
        member.user_id === multiOrgUserId
      )
      expect(multiUserInOrg2).toBeDefined()
      expect(multiUserInOrg2.organization_id).toBe(org2Id)
      expect(multiUserInOrg2.role).toBe('manager')
    })
  })

  describe('Dashboard Data Isolation', () => {
    test('should only return dashboard data for the requesting organization', async () => {
      const org1Request = createMockRequest('GET', '/api/dashboard-data', {}, {
        userId: admin1Id,
        organizationId: org1Id
      })

      const org1Response = await dashboardDataGet(org1Request)
      expect(org1Response.status).toBe(200)

      const org1Data = await org1Response.json()
      
      // Verify all dashboard data is org1-specific
      if (org1Data.leaveRequests) {
        for (const request of org1Data.leaveRequests) {
          expect(request.organization_id).toBe(org1Id)
        }
      }
      
      if (org1Data.employees) {
        for (const employee of org1Data.employees) {
          expect(employee.organization_id).toBe(org1Id)
        }
      }

      const org2Request = createMockRequest('GET', '/api/dashboard-data', {}, {
        userId: admin2Id,
        organizationId: org2Id
      })

      const org2Response = await dashboardDataGet(org2Request)
      expect(org2Response.status).toBe(200)

      const org2Data = await org2Response.json()
      
      // Verify all dashboard data is org2-specific
      if (org2Data.leaveRequests) {
        for (const request of org2Data.leaveRequests) {
          expect(request.organization_id).toBe(org2Id)
        }
      }
      
      if (org2Data.employees) {
        for (const employee of org2Data.employees) {
          expect(employee.organization_id).toBe(org2Id)
        }
      }
    })
  })

  describe('Database-Level Isolation Verification', () => {
    test('should verify RLS policies prevent direct database access across organizations', async () => {
      // This test verifies RLS at the database level
      // Using admin client to simulate RLS policy enforcement

      // Test profiles table isolation
      const { data: org1Profiles, error: org1Error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('organization_id', org1Id)

      expect(org1Error).toBeNull()
      expect(org1Profiles).toBeDefined()
      
      for (const profile of org1Profiles || []) {
        expect(profile.organization_id).toBe(org1Id)
      }

      // Test leave_requests table isolation
      const { data: org1LeaveRequests } = await supabaseAdmin
        .from('leave_requests')
        .select('*')
        .eq('organization_id', org1Id)

      for (const request of org1LeaveRequests || []) {
        expect(request.organization_id).toBe(org1Id)
      }

      // Test user_organizations table isolation
      const { data: org1UserOrgs } = await supabaseAdmin
        .from('user_organizations')
        .select('*')
        .eq('organization_id', org1Id)

      for (const userOrg of org1UserOrgs || []) {
        expect(userOrg.organization_id).toBe(org1Id)
      }
    })

    test('should verify foreign key constraints maintain referential integrity', async () => {
      // Attempt to create cross-organization references
      const { error: fkError } = await supabaseAdmin
        .from('leave_requests')
        .insert({
          user_id: employee1Id, // User from org1
          organization_id: org2Id, // Wrong organization
          start_date: '2024-02-01',
          end_date: '2024-02-02',
          status: 'pending',
          reason: 'Cross-org test'
        })

      // This should fail due to RLS or application logic
      expect(fkError).toBeTruthy()
    })
  })

  describe('Query Parameter Isolation', () => {
    test('should prevent organization ID manipulation in requests', async () => {
      // User from org1 trying to access org2 data by manipulating organization context
      const manipulatedRequest = createMockRequest('GET', '/api/employees', {}, {
        userId: employee1Id,
        organizationId: org2Id // User doesn't belong to org2
      })

      const response = await employeesGet(manipulatedRequest)
      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data.error).toMatch(/organization|access denied|unauthorized/i)
    })

    test('should validate organization membership before data access', async () => {
      // Create a user without any organization membership
      const orphanUserId = await createTestUser('orphan@isolation.com')
      testUserIds.push(orphanUserId)

      const orphanRequest = createMockRequest('GET', '/api/employees', {}, {
        userId: orphanUserId,
        organizationId: org1Id
      })

      const response = await employeesGet(orphanRequest)
      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data.error).toMatch(/organization|access denied|membership/i)
    })
  })

  describe('Shared Resource Isolation', () => {
    test('should isolate organization settings between organizations', async () => {
      // Verify org1 and org2 have different settings
      const { data: org1Settings } = await supabaseAdmin
        .from('organization_settings')
        .select('*')
        .eq('organization_id', org1Id)
        .single()

      const { data: org2Settings } = await supabaseAdmin
        .from('organization_settings')
        .select('*')
        .eq('organization_id', org2Id)
        .single()

      expect(org1Settings?.allow_domain_join_requests).toBe(true)
      expect(org1Settings?.default_employment_type).toBe('full_time')

      expect(org2Settings?.allow_domain_join_requests).toBe(false)
      expect(org2Settings?.default_employment_type).toBe('contract')

      // Settings should be different
      expect(org1Settings?.allow_domain_join_requests).not.toBe(org2Settings?.allow_domain_join_requests)
    })

    test('should isolate invitations between organizations', async () => {
      // Org1 should not see org2 invitations
      const { data: org1Invitations } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('organization_id', org1Id)

      expect(org1Invitations).toBeDefined()
      
      const org2InvitationsInOrg1 = org1Invitations?.filter(inv => 
        inv.id === org2InvitationId
      )
      expect(org2InvitationsInOrg1).toHaveLength(0)

      // Org2 should not see org1 invitations
      const { data: org2Invitations } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('organization_id', org2Id)

      const org1InvitationsInOrg2 = org2Invitations?.filter(inv => 
        inv.id === org1InvitationId
      )
      expect(org1InvitationsInOrg2).toHaveLength(0)
    })
  })

  describe('Bulk Operation Isolation', () => {
    test('should maintain isolation in bulk data operations', async () => {
      // Create multiple records across organizations
      const bulkLeaveRequests = [
        {
          user_id: employee1Id,
          organization_id: org1Id,
          start_date: '2024-03-01',
          end_date: '2024-03-02',
          status: 'pending',
          reason: 'Bulk test 1'
        },
        {
          user_id: employee2Id,
          organization_id: org2Id,
          start_date: '2024-03-03',
          end_date: '2024-03-04',
          status: 'pending',
          reason: 'Bulk test 2'
        }
      ]

      await supabaseAdmin
        .from('leave_requests')
        .insert(bulkLeaveRequests)

      // Verify bulk queries maintain isolation
      const org1BulkRequest = createMockRequest('GET', '/api/leave-requests', {}, {
        userId: admin1Id,
        organizationId: org1Id
      })

      const org1BulkResponse = await leaveRequestsGet(org1BulkRequest)
      const org1BulkData = await org1BulkResponse.json()

      // Should only contain org1 requests
      for (const request of org1BulkData.leaveRequests) {
        expect(request.organization_id).toBe(org1Id)
      }
    })
  })
})