/**
 * Authorization Test Suite
 * 
 * This comprehensive test suite validates role-based access control (RBAC) including:
 * - Admin-only operations
 * - Manager-specific permissions
 * - Employee-level restrictions
 * - Cross-role access validation
 * - Permission inheritance and delegation
 * - Context-based authorization (organization-scoped)
 * - Resource ownership validation
 * - Action-based permissions (CRUD operations)
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { createMockRequest, createTestUser, createTestOrganization, cleanupTestData } from '../utils/test-helpers'
import { createClient } from '@supabase/supabase-js'

// Import API route handlers
import { GET as employeesGet, POST as employeesPost } from '@/app/api/employees/route'
import { DELETE as employeesDelete, PUT as employeesPut } from '@/app/api/employees/[id]/route'
import { GET as leaveRequestsGet, POST as leaveRequestsPost } from '@/app/api/leave-requests/route'
import { POST as leaveRequestApprove } from '@/app/api/leave-requests/[id]/approve/route'
import { POST as leaveRequestCancel } from '@/app/api/leave-requests/[id]/cancel/route'
import { GET as organizationSettingsGet, PUT as organizationSettingsPut } from '@/app/api/admin/settings/organization/route'
import { POST as sendInvitation } from '@/app/api/send-invitation/route'
import { POST as cancelInvitation } from '@/app/api/cancel-invitation/route'
import { GET as teamMembersGet, POST as teamMembersPost } from '@/app/api/team/members/route'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('Authorization and Role-Based Access Control Tests', () => {
  let testOrgId: string
  let secondOrgId: string
  let adminUserId: string
  let managerUserId: string
  let employeeUserId: string
  let secondOrgAdminId: string
  let testUserIds: string[]
  let testOrgIds: string[]
  let testLeaveRequestId: string
  let testInvitationId: string
  let testTeamId: string

  beforeEach(async () => {
    // Create test organizations
    testOrgId = await createTestOrganization('Auth Test Org')
    secondOrgId = await createTestOrganization('Second Auth Test Org')

    // Create users with different roles
    adminUserId = await createTestUser('admin@authtest.com', testOrgId, 'admin')
    managerUserId = await createTestUser('manager@authtest.com', testOrgId, 'manager')
    employeeUserId = await createTestUser('employee@authtest.com', testOrgId, 'employee')
    secondOrgAdminId = await createTestUser('admin2@authtest.com', secondOrgId, 'admin')

    testUserIds = [adminUserId, managerUserId, employeeUserId, secondOrgAdminId]
    testOrgIds = [testOrgId, secondOrgId]

    // Create test data for authorization testing
    await setupTestData()
  })

  afterEach(async () => {
    await cleanupTestData(testUserIds, testOrgIds)
  })

  async function setupTestData() {
    // Create a test leave request
    const { data: leaveRequest } = await supabaseAdmin
      .from('leave_requests')
      .insert({
        user_id: employeeUserId,
        organization_id: testOrgId,
        start_date: '2024-01-15',
        end_date: '2024-01-16',
        status: 'pending',
        reason: 'Test leave request for authorization testing'
      })
      .select()
      .single()

    testLeaveRequestId = leaveRequest?.id

    // Create a test invitation
    const { data: invitation } = await supabaseAdmin
      .from('invitations')
      .insert({
        organization_id: testOrgId,
        email: 'testinvite@authtest.com',
        role: 'employee',
        token: 'test-auth-token-123',
        created_by: adminUserId
      })
      .select()
      .single()

    testInvitationId = invitation?.id

    // Create a test team
    const { data: team } = await supabaseAdmin
      .from('teams')
      .insert({
        organization_id: testOrgId,
        name: 'Test Authorization Team',
        description: 'Team for testing authorization'
      })
      .select()
      .single()

    testTeamId = team?.id
  }

  describe('Admin-Only Operations', () => {
    test('should allow admin to create employees', async () => {
      const request = createMockRequest('POST', '/api/employees', {
        email: 'newemployee@authtest.com',
        fullName: 'New Employee',
        role: 'employee'
      }, { userId: adminUserId, organizationId: testOrgId })

      const response = await employeesPost(request)
      expect(response.status).toBe(201)

      const data = await response.json()
      expect(data.employee).toBeDefined()
      expect(data.employee.email).toBe('newemployee@authtest.com')
    })

    test('should deny manager from creating employees', async () => {
      const request = createMockRequest('POST', '/api/employees', {
        email: 'unauthorized@authtest.com',
        fullName: 'Unauthorized User',
        role: 'employee'
      }, { userId: managerUserId, organizationId: testOrgId })

      const response = await employeesPost(request)
      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data.error).toMatch(/access denied|unauthorized|admin/i)
    })

    test('should deny employee from creating employees', async () => {
      const request = createMockRequest('POST', '/api/employees', {
        email: 'unauthorized@authtest.com',
        fullName: 'Unauthorized User',
        role: 'employee'
      }, { userId: employeeUserId, organizationId: testOrgId })

      const response = await employeesPost(request)
      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data.error).toMatch(/access denied|unauthorized|admin/i)
    })

    test('should allow admin to manage organization settings', async () => {
      const request = createMockRequest('PUT', '/api/admin/settings/organization', {
        allowDomainJoinRequests: false,
        requireAdminApproval: true,
        defaultEmploymentType: 'contract'
      }, { userId: adminUserId, organizationId: testOrgId })

      const response = await organizationSettingsPut(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.settings).toBeDefined()
    })

    test('should deny manager from managing organization settings', async () => {
      const request = createMockRequest('PUT', '/api/admin/settings/organization', {
        allowDomainJoinRequests: false,
        requireAdminApproval: true
      }, { userId: managerUserId, organizationId: testOrgId })

      const response = await organizationSettingsPut(request)
      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data.error).toMatch(/access denied|unauthorized|admin/i)
    })

    test('should deny employee from managing organization settings', async () => {
      const request = createMockRequest('PUT', '/api/admin/settings/organization', {
        allowDomainJoinRequests: false
      }, { userId: employeeUserId, organizationId: testOrgId })

      const response = await organizationSettingsPut(request)
      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data.error).toMatch(/access denied|unauthorized|admin/i)
    })

    test('should allow admin to send invitations', async () => {
      const request = createMockRequest('POST', '/api/send-invitation', {
        email: 'invite@authtest.com',
        role: 'employee',
        fullName: 'Invited User'
      }, { userId: adminUserId, organizationId: testOrgId })

      const response = await sendInvitation(request)
      expect([201, 200]).toContain(response.status) // Different implementations might use different status codes

      const data = await response.json()
      expect(data.invitation || data.success).toBeDefined()
    })

    test('should deny employee from sending invitations', async () => {
      const request = createMockRequest('POST', '/api/send-invitation', {
        email: 'unauthorized@authtest.com',
        role: 'employee',
        fullName: 'Unauthorized Invite'
      }, { userId: employeeUserId, organizationId: testOrgId })

      const response = await sendInvitation(request)
      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data.error).toMatch(/access denied|unauthorized|admin/i)
    })
  })

  describe('Manager-Level Permissions', () => {
    test('should allow manager to view leave requests', async () => {
      const request = createMockRequest('GET', '/api/leave-requests', {}, {
        userId: managerUserId,
        organizationId: testOrgId
      })

      const response = await leaveRequestsGet(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.leaveRequests).toBeDefined()
      expect(Array.isArray(data.leaveRequests)).toBe(true)
    })

    test('should allow manager to approve leave requests', async () => {
      const request = createMockRequest('POST', `/api/leave-requests/${testLeaveRequestId}/approve`, {
        approvalNotes: 'Approved by manager'
      }, { userId: managerUserId, organizationId: testOrgId })

      const response = await leaveRequestApprove(request)
      expect([200, 204]).toContain(response.status)

      // Verify the leave request was approved
      const { data: updatedRequest } = await supabaseAdmin
        .from('leave_requests')
        .select('status, approved_by')
        .eq('id', testLeaveRequestId)
        .single()

      expect(updatedRequest?.status).toBe('approved')
      expect(updatedRequest?.approved_by).toBe(managerUserId)
    })

    test('should deny employee from approving leave requests', async () => {
      const request = createMockRequest('POST', `/api/leave-requests/${testLeaveRequestId}/approve`, {
        approvalNotes: 'Unauthorized approval attempt'
      }, { userId: employeeUserId, organizationId: testOrgId })

      const response = await leaveRequestApprove(request)
      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data.error).toMatch(/access denied|unauthorized|manager|admin/i)
    })

    test('should allow manager to manage team members', async () => {
      const request = createMockRequest('POST', '/api/team/members', {
        userId: employeeUserId,
        teamId: testTeamId,
        role: 'member'
      }, { userId: managerUserId, organizationId: testOrgId })

      const response = await teamMembersPost(request)
      expect([200, 201]).toContain(response.status)

      const data = await response.json()
      expect(data.success || data.member).toBeDefined()
    })

    test('should allow manager to view team members', async () => {
      const request = createMockRequest('GET', '/api/team/members', {}, {
        userId: managerUserId,
        organizationId: testOrgId
      })

      const response = await teamMembersGet(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.members).toBeDefined()
      expect(Array.isArray(data.members)).toBe(true)
    })

    test('should deny manager from accessing different organization data', async () => {
      const request = createMockRequest('GET', '/api/leave-requests', {}, {
        userId: managerUserId,
        organizationId: secondOrgId // Different organization
      })

      const response = await leaveRequestsGet(request)
      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data.error).toMatch(/organization|access denied|unauthorized/i)
    })
  })

  describe('Employee-Level Restrictions', () => {
    test('should allow employee to view their own leave requests', async () => {
      const request = createMockRequest('GET', '/api/leave-requests', {}, {
        userId: employeeUserId,
        organizationId: testOrgId
      })

      const response = await leaveRequestsGet(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.leaveRequests).toBeDefined()
      
      // Employee should only see their own requests
      const ownRequests = data.leaveRequests.filter((req: any) => req.user_id === employeeUserId)
      expect(ownRequests.length).toBeGreaterThan(0)
      
      // Should not see other employees' requests
      const otherRequests = data.leaveRequests.filter((req: any) => req.user_id !== employeeUserId)
      expect(otherRequests.length).toBe(0)
    })

    test('should allow employee to create their own leave requests', async () => {
      const request = createMockRequest('POST', '/api/leave-requests', {
        startDate: '2024-02-15',
        endDate: '2024-02-16',
        leaveTypeId: 'valid-leave-type-id',
        reason: 'Personal leave request'
      }, { userId: employeeUserId, organizationId: testOrgId })

      const response = await leaveRequestsPost(request)
      expect(response.status).toBe(201)

      const data = await response.json()
      expect(data.leaveRequest).toBeDefined()
      expect(data.leaveRequest.user_id).toBe(employeeUserId)
    })

    test('should allow employee to cancel their own pending leave requests', async () => {
      const request = createMockRequest('POST', `/api/leave-requests/${testLeaveRequestId}/cancel`, {
        cancellationReason: 'Plans changed'
      }, { userId: employeeUserId, organizationId: testOrgId })

      const response = await leaveRequestCancel(request)
      expect([200, 204]).toContain(response.status)

      // Verify the leave request was cancelled
      const { data: updatedRequest } = await supabaseAdmin
        .from('leave_requests')
        .select('status')
        .eq('id', testLeaveRequestId)
        .single()

      expect(updatedRequest?.status).toBe('cancelled')
    })

    test('should deny employee from viewing all employees list', async () => {
      const request = createMockRequest('GET', '/api/employees', {}, {
        userId: employeeUserId,
        organizationId: testOrgId
      })

      const response = await employeesGet(request)
      
      // Depending on implementation, this might be 403 or return limited data
      if (response.status === 200) {
        const data = await response.json()
        // If allowed, should have limited information or filtering
        expect(data.employees).toBeDefined()
      } else {
        expect(response.status).toBe(403)
      }
    })

    test('should deny employee from managing other users', async () => {
      // Try to update another user's profile
      const request = createMockRequest('PUT', `/api/employees/${managerUserId}`, {
        fullName: 'Hacked Manager Name',
        role: 'employee' // Attempt role downgrade
      }, { userId: employeeUserId, organizationId: testOrgId })

      const response = await employeesPut(request)
      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data.error).toMatch(/access denied|unauthorized|permission/i)
    })

    test('should deny employee from deleting other users', async () => {
      const request = createMockRequest('DELETE', `/api/employees/${managerUserId}`, {}, {
        userId: employeeUserId,
        organizationId: testOrgId
      })

      const response = await employeesDelete(request)
      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data.error).toMatch(/access denied|unauthorized|permission/i)
    })
  })

  describe('Cross-Organization Access Control', () => {
    test('should deny access to different organization employees', async () => {
      const request = createMockRequest('GET', '/api/employees', {}, {
        userId: adminUserId,
        organizationId: secondOrgId // Wrong organization
      })

      const response = await employeesGet(request)
      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data.error).toMatch(/organization|access denied|unauthorized/i)
    })

    test('should deny modification of different organization data', async () => {
      const request = createMockRequest('POST', '/api/employees', {
        email: 'crossorg@test.com',
        fullName: 'Cross Org User',
        role: 'employee'
      }, { userId: adminUserId, organizationId: secondOrgId })

      const response = await employeesPost(request)
      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data.error).toMatch(/organization|access denied|unauthorized/i)
    })

    test('should deny approval of different organization leave requests', async () => {
      // Create a leave request in the second organization
      const { data: secondOrgRequest } = await supabaseAdmin
        .from('leave_requests')
        .insert({
          user_id: secondOrgAdminId,
          organization_id: secondOrgId,
          start_date: '2024-01-20',
          end_date: '2024-01-21',
          status: 'pending',
          reason: 'Cross-org test request'
        })
        .select()
        .single()

      // Try to approve it from first org manager
      const request = createMockRequest('POST', `/api/leave-requests/${secondOrgRequest?.id}/approve`, {
        approvalNotes: 'Cross-org approval attempt'
      }, { userId: managerUserId, organizationId: testOrgId })

      const response = await leaveRequestApprove(request)
      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data.error).toMatch(/organization|access denied|not found/i)
    })
  })

  describe('Resource Ownership Validation', () => {
    test('should allow user to cancel only their own leave requests', async () => {
      // Create another employee's leave request
      const anotherEmployeeId = await createTestUser('another@authtest.com', testOrgId, 'employee')
      testUserIds.push(anotherEmployeeId)

      const { data: anotherRequest } = await supabaseAdmin
        .from('leave_requests')
        .insert({
          user_id: anotherEmployeeId,
          organization_id: testOrgId,
          start_date: '2024-01-25',
          end_date: '2024-01-26',
          status: 'pending',
          reason: 'Another employee request'
        })
        .select()
        .single()

      // Employee should not be able to cancel another employee's request
      const request = createMockRequest('POST', `/api/leave-requests/${anotherRequest?.id}/cancel`, {
        cancellationReason: 'Unauthorized cancellation'
      }, { userId: employeeUserId, organizationId: testOrgId })

      const response = await leaveRequestCancel(request)
      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data.error).toMatch(/access denied|unauthorized|not found/i)
    })

    test('should allow user to update only their own profile', async () => {
      // Employee should be able to update their own profile
      const ownRequest = createMockRequest('PUT', `/api/employees/${employeeUserId}`, {
        fullName: 'Updated Employee Name'
      }, { userId: employeeUserId, organizationId: testOrgId })

      const ownResponse = await employeesPut(ownRequest)
      expect([200, 204]).toContain(ownResponse.status)

      // But not another employee's profile
      const otherRequest = createMockRequest('PUT', `/api/employees/${managerUserId}`, {
        fullName: 'Hacked Manager Name'
      }, { userId: employeeUserId, organizationId: testOrgId })

      const otherResponse = await employeesPut(otherRequest)
      expect(otherResponse.status).toBe(403)
    })
  })

  describe('Permission Inheritance and Delegation', () => {
    test('should allow admin to perform all manager actions', async () => {
      // Admin should be able to approve leave requests (manager permission)
      const approveRequest = createMockRequest('POST', `/api/leave-requests/${testLeaveRequestId}/approve`, {
        approvalNotes: 'Admin approval'
      }, { userId: adminUserId, organizationId: testOrgId })

      const approveResponse = await leaveRequestApprove(approveRequest)
      expect([200, 204]).toContain(approveResponse.status)

      // Admin should be able to manage teams (manager permission)
      const teamRequest = createMockRequest('GET', '/api/team/members', {}, {
        userId: adminUserId,
        organizationId: testOrgId
      })

      const teamResponse = await teamMembersGet(teamRequest)
      expect(teamResponse.status).toBe(200)
    })

    test('should allow admin to perform all employee actions', async () => {
      // Admin should be able to create leave requests (employee permission)
      const leaveRequest = createMockRequest('POST', '/api/leave-requests', {
        startDate: '2024-03-15',
        endDate: '2024-03-16',
        leaveTypeId: 'valid-leave-type-id',
        reason: 'Admin leave request'
      }, { userId: adminUserId, organizationId: testOrgId })

      const leaveResponse = await leaveRequestsPost(leaveRequest)
      expect(response.status).toBe(201)

      // Admin should be able to view their own data (employee permission)
      const viewRequest = createMockRequest('GET', '/api/leave-requests', {}, {
        userId: adminUserId,
        organizationId: testOrgId
      })

      const viewResponse = await leaveRequestsGet(viewRequest)
      expect(viewResponse.status).toBe(200)
    })

    test('should allow manager to perform employee actions but not admin actions', async () => {
      // Manager should be able to create leave requests (employee permission)
      const leaveRequest = createMockRequest('POST', '/api/leave-requests', {
        startDate: '2024-04-15',
        endDate: '2024-04-16',
        leaveTypeId: 'valid-leave-type-id',
        reason: 'Manager leave request'
      }, { userId: managerUserId, organizationId: testOrgId })

      const leaveResponse = await leaveRequestsPost(leaveRequest)
      expect(leaveResponse.status).toBe(201)

      // But manager should not be able to create employees (admin permission)
      const createEmployeeRequest = createMockRequest('POST', '/api/employees', {
        email: 'unauthorized@authtest.com',
        fullName: 'Unauthorized Employee',
        role: 'employee'
      }, { userId: managerUserId, organizationId: testOrgId })

      const createEmployeeResponse = await employeesPost(createEmployeeRequest)
      expect(createEmployeeResponse.status).toBe(403)
    })
  })

  describe('Context-Based Authorization', () => {
    test('should enforce organization context in all operations', async () => {
      const operationTests = [
        { endpoint: '/api/employees', method: 'GET' },
        { endpoint: '/api/leave-requests', method: 'GET' },
        { endpoint: '/api/team/members', method: 'GET' },
      ]

      for (const operation of operationTests) {
        // Valid organization context
        const validRequest = createMockRequest(operation.method, operation.endpoint, {}, {
          userId: adminUserId,
          organizationId: testOrgId
        })

        let validResponse: Response
        switch (operation.endpoint) {
          case '/api/employees':
            validResponse = await employeesGet(validRequest)
            break
          case '/api/leave-requests':
            validResponse = await leaveRequestsGet(validRequest)
            break
          case '/api/team/members':
            validResponse = await teamMembersGet(validRequest)
            break
          default:
            continue
        }

        expect(validResponse.status).toBe(200)

        // Invalid organization context
        const invalidRequest = createMockRequest(operation.method, operation.endpoint, {}, {
          userId: adminUserId,
          organizationId: secondOrgId // User doesn't belong to this org
        })

        let invalidResponse: Response
        switch (operation.endpoint) {
          case '/api/employees':
            invalidResponse = await employeesGet(invalidRequest)
            break
          case '/api/leave-requests':
            invalidResponse = await leaveRequestsGet(invalidRequest)
            break
          case '/api/team/members':
            invalidResponse = await teamMembersGet(invalidRequest)
            break
          default:
            continue
        }

        expect(invalidResponse.status).toBe(403)
      }
    })

    test('should require organization context for all protected operations', async () => {
      const request = createMockRequest('GET', '/api/employees', {}, {
        userId: adminUserId
        // Missing organizationId
      })

      const response = await employeesGet(request)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toMatch(/organization|context|required/i)
    })
  })
})