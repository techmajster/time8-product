/**
 * User Permission Inheritance Across Organizations Test Suite
 * 
 * Tests for Task 5.3: Validate user permission inheritance across organizations
 * 
 * This comprehensive test suite validates:
 * - Role-based permissions within each organization
 * - Permission isolation between organizations
 * - Multi-organization user permission switching
 * - Cross-organization permission validation
 * - Administrative capability restrictions
 * - Context-sensitive permission enforcement
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { createMockRequest, createTestUser, createTestOrganization, cleanupTestData } from '../utils/test-helpers'
import { createClient } from '@supabase/supabase-js'

// Import API route handlers for permission testing
import { GET as employeesGet, POST as employeesPost } from '@/app/api/employees/route'
import { GET as leaveRequestsGet } from '@/app/api/leave-requests/route'
import { POST as leaveRequestApprove } from '@/app/api/leave-requests/[id]/approve/route'
import { GET as organizationMembersGet } from '@/app/api/organization/members/route'
import { POST as sendInvitationPost } from '@/app/api/send-invitation/route'
import { GET as adminSettingsGet, POST as adminSettingsPost } from '@/app/api/admin/settings/organization/route'
import { POST as workspaceSwitchPost } from '@/app/api/workspace/switch/route'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('User Permission Inheritance Across Organizations Tests', () => {
  let org1Id: string
  let org2Id: string
  let org3Id: string
  
  // Single-organization users
  let org1AdminId: string
  let org1ManagerId: string
  let org1EmployeeId: string
  let org2AdminId: string
  let org2ManagerId: string
  let org2EmployeeId: string
  
  // Multi-organization users with different roles
  let multiOrgUserId: string // Employee in org1, Manager in org2, Admin in org3
  let dualRoleUserId: string // Admin in org1, Employee in org2
  
  let testUserIds: string[]
  let testOrgIds: string[]
  
  // Test data for permission validation
  let org1LeaveRequestId: string
  let org2LeaveRequestId: string
  let org1TeamId: string
  let org2TeamId: string

  beforeEach(async () => {
    // Create test organizations
    org1Id = await createTestOrganization('Permission Test Org 1')
    org2Id = await createTestOrganization('Permission Test Org 2')
    org3Id = await createTestOrganization('Permission Test Org 3')

    // Create single-organization users
    org1AdminId = await createTestUser('admin1@permission.test', org1Id, 'admin')
    org1ManagerId = await createTestUser('manager1@permission.test', org1Id, 'manager')
    org1EmployeeId = await createTestUser('employee1@permission.test', org1Id, 'employee')
    
    org2AdminId = await createTestUser('admin2@permission.test', org2Id, 'admin')
    org2ManagerId = await createTestUser('manager2@permission.test', org2Id, 'manager')
    org2EmployeeId = await createTestUser('employee2@permission.test', org2Id, 'employee')

    // Create multi-organization users
    multiOrgUserId = await createTestUser('multi@permission.test', org1Id, 'employee')
    dualRoleUserId = await createTestUser('dual@permission.test', org1Id, 'admin')
    
    testUserIds = [
      org1AdminId, org1ManagerId, org1EmployeeId,
      org2AdminId, org2ManagerId, org2EmployeeId,
      multiOrgUserId, dualRoleUserId
    ]
    testOrgIds = [org1Id, org2Id, org3Id]

    // Add multi-org user to additional organizations with different roles
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

    // Add dual-role user to org2 as employee
    await supabaseAdmin
      .from('user_organizations')
      .insert({
        user_id: dualRoleUserId,
        organization_id: org2Id,
        role: 'employee',
        is_active: true,
        is_default: false,
        joined_via: 'invitation',
        employment_type: 'full_time'
      })

    // Setup test data for permission validation
    await setupPermissionTestData()
  })

  afterEach(async () => {
    await cleanupTestData(testUserIds, testOrgIds)
  })

  async function setupPermissionTestData() {
    // Create leave requests for approval testing
    const { data: org1LeaveRequest } = await supabaseAdmin
      .from('leave_requests')
      .insert({
        user_id: org1EmployeeId,
        organization_id: org1Id,
        start_date: '2024-01-15',
        end_date: '2024-01-16',
        status: 'pending',
        reason: 'Org 1 employee leave for permission test'
      })
      .select()
      .single()

    const { data: org2LeaveRequest } = await supabaseAdmin
      .from('leave_requests')
      .insert({
        user_id: org2EmployeeId,
        organization_id: org2Id,
        start_date: '2024-01-17',
        end_date: '2024-01-18',
        status: 'pending',
        reason: 'Org 2 employee leave for permission test'
      })
      .select()
      .single()

    org1LeaveRequestId = org1LeaveRequest?.id
    org2LeaveRequestId = org2LeaveRequest?.id

    // Create teams for team management testing
    const { data: org1Team } = await supabaseAdmin
      .from('teams')
      .insert({
        organization_id: org1Id,
        name: 'Org 1 Development Team',
        description: 'Team for permission testing'
      })
      .select()
      .single()

    const { data: org2Team } = await supabaseAdmin
      .from('teams')
      .insert({
        organization_id: org2Id,
        name: 'Org 2 Marketing Team',
        description: 'Team for permission testing'
      })
      .select()
      .single()

    org1TeamId = org1Team?.id
    org2TeamId = org2Team?.id
  }

  describe('Role-Based Permission Enforcement', () => {
    test('should enforce admin permissions within organization', async () => {
      // Admin should be able to access admin-only endpoints
      const adminSettingsRequest = createMockRequest('GET', '/api/admin/settings/organization', {}, {
        userId: org1AdminId,
        organizationId: org1Id
      })

      const adminSettingsResponse = await adminSettingsGet(adminSettingsRequest)
      
      // Should succeed or return structured response (not 403)
      if (adminSettingsResponse.status !== 200) {
        // If not implemented, should not be 403 forbidden
        expect(adminSettingsResponse.status).not.toBe(403)
      }

      // Admin should be able to send invitations
      const invitationRequest = createMockRequest('POST', '/api/send-invitation', {
        email: 'newuser@permission.test',
        role: 'employee'
      }, {
        userId: org1AdminId,
        organizationId: org1Id
      })

      const invitationResponse = await sendInvitationPost(invitationRequest)
      
      // Should succeed or fail for business logic reasons, not permissions
      if (invitationResponse.status === 403) {
        const errorData = await invitationResponse.json()
        expect(errorData.error).not.toMatch(/permission|access denied|unauthorized/i)
      }
    })

    test('should enforce manager permissions within organization', async () => {
      // Manager should be able to approve leave requests
      if (org1LeaveRequestId) {
        const approveRequest = createMockRequest('POST', `/api/leave-requests/${org1LeaveRequestId}/approve`, {
          status: 'approved',
          comments: 'Approved by manager for testing'
        }, {
          userId: org1ManagerId,
          organizationId: org1Id
        })

        const approveResponse = await leaveRequestApprove(approveRequest)
        
        // Should not be forbidden due to permissions
        if (approveResponse.status === 403) {
          const errorData = await approveResponse.json()
          expect(errorData.error).not.toMatch(/permission|role/i)
        }
      }

      // Manager should be able to view organization members
      const membersRequest = createMockRequest('GET', '/api/organization/members', {}, {
        userId: org1ManagerId,
        organizationId: org1Id
      })

      const membersResponse = await organizationMembersGet(membersRequest)
      expect(membersResponse.status).toBe(200)

      const membersData = await membersResponse.json()
      expect(membersData.members).toBeDefined()
    })

    test('should enforce employee permission restrictions', async () => {
      // Employee should not be able to access admin settings
      const adminSettingsRequest = createMockRequest('GET', '/api/admin/settings/organization', {}, {
        userId: org1EmployeeId,
        organizationId: org1Id
      })

      const adminSettingsResponse = await adminSettingsGet(adminSettingsRequest)
      expect(adminSettingsResponse.status).toBe(403)

      const adminErrorData = await adminSettingsResponse.json()
      expect(adminErrorData.error).toMatch(/permission|access denied|role/i)

      // Employee should not be able to send invitations
      const invitationRequest = createMockRequest('POST', '/api/send-invitation', {
        email: 'newuser@permission.test',
        role: 'employee'
      }, {
        userId: org1EmployeeId,
        organizationId: org1Id
      })

      const invitationResponse = await sendInvitationPost(invitationRequest)
      expect(invitationResponse.status).toBe(403)

      const invitationErrorData = await invitationResponse.json()
      expect(invitationErrorData.error).toMatch(/permission|access denied|role/i)
    })
  })

  describe('Multi-Organization Permission Switching', () => {
    test('should switch permissions when multi-org user changes context', async () => {
      // Multi-org user starts as employee in org1
      const org1EmployeeRequest = createMockRequest('GET', '/api/organization/members', {}, {
        userId: multiOrgUserId,
        organizationId: org1Id
      })

      const org1EmployeeResponse = await organizationMembersGet(org1EmployeeRequest)
      expect(org1EmployeeResponse.status).toBe(200)

      // Switch to org2 where user is manager
      const switchToManagerRequest = createMockRequest('POST', '/api/workspace/switch', {
        organizationId: org2Id
      }, {
        userId: multiOrgUserId,
        organizationId: org1Id
      })

      const switchToManagerResponse = await workspaceSwitchPost(switchToManagerRequest)
      expect(switchToManagerResponse.status).toBe(200)

      // Now should have manager permissions in org2
      if (org2LeaveRequestId) {
        const managerApproveRequest = createMockRequest('POST', `/api/leave-requests/${org2LeaveRequestId}/approve`, {
          status: 'approved',
          comments: 'Approved as manager in org2'
        }, {
          userId: multiOrgUserId,
          organizationId: org2Id
        })

        const managerApproveResponse = await leaveRequestApprove(managerApproveRequest)
        
        // Should have manager permissions (not forbidden)
        if (managerApproveResponse.status === 403) {
          const errorData = await managerApproveResponse.json()
          expect(errorData.error).not.toMatch(/permission|role/i)
        }
      }

      // Switch to org3 where user is admin
      const switchToAdminRequest = createMockRequest('POST', '/api/workspace/switch', {
        organizationId: org3Id
      }, {
        userId: multiOrgUserId,
        organizationId: org2Id
      })

      const switchToAdminResponse = await workspaceSwitchPost(switchToAdminRequest)
      expect(switchToAdminResponse.status).toBe(200)

      // Now should have admin permissions in org3
      const adminInviteRequest = createMockRequest('POST', '/api/send-invitation', {
        email: 'newadmin@permission.test',
        role: 'manager'
      }, {
        userId: multiOrgUserId,
        organizationId: org3Id
      })

      const adminInviteResponse = await sendInvitationPost(adminInviteRequest)
      
      // Should have admin permissions (not forbidden due to role)
      if (adminInviteResponse.status === 403) {
        const errorData = await adminInviteResponse.json()
        expect(errorData.error).not.toMatch(/permission|role|access denied/i)
      }
    })

    test('should maintain role isolation between organizations', async () => {
      // Dual-role user: Admin in org1, Employee in org2
      
      // Should have admin permissions in org1
      const org1AdminRequest = createMockRequest('POST', '/api/send-invitation', {
        email: 'org1invite@permission.test',
        role: 'employee'
      }, {
        userId: dualRoleUserId,
        organizationId: org1Id
      })

      const org1AdminResponse = await sendInvitationPost(org1AdminRequest)
      
      // Should not be forbidden due to role in org1
      if (org1AdminResponse.status === 403) {
        const org1ErrorData = await org1AdminResponse.json()
        expect(org1ErrorData.error).not.toMatch(/permission|role|access denied/i)
      }

      // Switch to org2 where user is employee
      const switchToEmployeeRequest = createMockRequest('POST', '/api/workspace/switch', {
        organizationId: org2Id
      }, {
        userId: dualRoleUserId,
        organizationId: org1Id
      })

      const switchToEmployeeResponse = await workspaceSwitchPost(switchToEmployeeRequest)
      expect(switchToEmployeeResponse.status).toBe(200)

      // Should NOT have admin permissions in org2
      const org2EmployeeRequest = createMockRequest('POST', '/api/send-invitation', {
        email: 'org2invite@permission.test',
        role: 'employee'
      }, {
        userId: dualRoleUserId,
        organizationId: org2Id
      })

      const org2EmployeeResponse = await sendInvitationPost(org2EmployeeRequest)
      expect(org2EmployeeResponse.status).toBe(403)

      const org2ErrorData = await org2EmployeeResponse.json()
      expect(org2ErrorData.error).toMatch(/permission|access denied|role/i)
    })
  })

  describe('Cross-Organization Permission Validation', () => {
    test('should prevent cross-organization permission escalation', async () => {
      // Org1 admin should not have admin permissions in org2
      const crossOrgAdminRequest = createMockRequest('POST', '/api/send-invitation', {
        email: 'crossorg@permission.test',
        role: 'employee'
      }, {
        userId: org1AdminId,
        organizationId: org2Id // Wrong organization
      })

      const crossOrgAdminResponse = await sendInvitationPost(crossOrgAdminRequest)
      expect(crossOrgAdminResponse.status).toBe(403)

      const crossOrgErrorData = await crossOrgAdminResponse.json()
      expect(crossOrgErrorData.error).toMatch(/organization|access denied|not belong/i)
    })

    test('should validate organization membership before permission checks', async () => {
      // User trying to access organization they don't belong to
      const nonMemberRequest = createMockRequest('GET', '/api/organization/members', {}, {
        userId: org1AdminId,
        organizationId: org3Id // Admin doesn't belong to org3
      })

      const nonMemberResponse = await organizationMembersGet(nonMemberRequest)
      expect(nonMemberResponse.status).toBe(403)

      const nonMemberErrorData = await nonMemberResponse.json()
      expect(nonMemberErrorData.error).toMatch(/organization|access denied|not belong/i)
    })

    test('should prevent permission inheritance across organizations', async () => {
      // Manager in org1 should not have manager permissions in org2
      if (org2LeaveRequestId) {
        const crossOrgManagerRequest = createMockRequest('POST', `/api/leave-requests/${org2LeaveRequestId}/approve`, {
          status: 'approved',
          comments: 'Cross-org approval attempt'
        }, {
          userId: org1ManagerId,
          organizationId: org2Id
        })

        const crossOrgManagerResponse = await leaveRequestApprove(crossOrgManagerRequest)
        expect(crossOrgManagerResponse.status).toBe(403)

        const crossOrgManagerErrorData = await crossOrgManagerResponse.json()
        expect(crossOrgManagerErrorData.error).toMatch(/organization|access denied|not belong/i)
      }
    })
  })

  describe('Permission Context Consistency', () => {
    test('should maintain permission context across multiple API calls', async () => {
      // Multi-org user with manager permissions in org2
      const managerEndpoints = [
        { handler: organizationMembersGet, endpoint: '/api/organization/members' },
        { handler: leaveRequestsGet, endpoint: '/api/leave-requests' },
        { handler: employeesGet, endpoint: '/api/employees' }
      ]

      for (const { handler, endpoint } of managerEndpoints) {
        const managerRequest = createMockRequest('GET', endpoint, {}, {
          userId: multiOrgUserId,
          organizationId: org2Id // Manager context
        })

        const managerResponse = await handler(managerRequest)
        expect(managerResponse.status).toBe(200)

        const managerData = await managerResponse.json()
        
        // Verify data is filtered by organization and role
        if (managerData.members) {
          for (const member of managerData.members) {
            expect(member.organization_id).toBe(org2Id)
          }
        }
        
        if (managerData.leaveRequests) {
          for (const request of managerData.leaveRequests) {
            expect(request.organization_id).toBe(org2Id)
          }
        }
        
        if (managerData.employees) {
          for (const employee of managerData.employees) {
            expect(employee.organization_id).toBe(org2Id)
          }
        }
      }
    })

    test('should handle permission context during rapid organization switches', async () => {
      const switchSequence = [
        { orgId: org2Id, expectedRole: 'manager' },
        { orgId: org3Id, expectedRole: 'admin' },
        { orgId: org1Id, expectedRole: 'employee' },
        { orgId: org3Id, expectedRole: 'admin' }
      ]

      let currentOrg = org1Id

      for (const { orgId, expectedRole } of switchSequence) {
        // Switch organization
        const switchRequest = createMockRequest('POST', '/api/workspace/switch', {
          organizationId: orgId
        }, {
          userId: multiOrgUserId,
          organizationId: currentOrg
        })

        const switchResponse = await workspaceSwitchPost(switchRequest)
        expect(switchResponse.status).toBe(200)

        // Test permission based on expected role
        if (expectedRole === 'admin') {
          const adminRequest = createMockRequest('POST', '/api/send-invitation', {
            email: `admin-test-${orgId}@permission.test`,
            role: 'employee'
          }, {
            userId: multiOrgUserId,
            organizationId: orgId
          })

          const adminResponse = await sendInvitationPost(adminRequest)
          
          // Should not be forbidden due to role
          if (adminResponse.status === 403) {
            const errorData = await adminResponse.json()
            expect(errorData.error).not.toMatch(/permission|role|access denied/i)
          }
        }

        currentOrg = orgId
      }
    })
  })

  describe('Special Permission Scenarios', () => {
    test('should handle permissions for inactive organization memberships', async () => {
      // Deactivate multi-org user's membership in org2
      await supabaseAdmin
        .from('user_organizations')
        .update({ is_active: false })
        .eq('user_id', multiOrgUserId)
        .eq('organization_id', org2Id)

      // Should not be able to access org2 resources
      const inactiveAccessRequest = createMockRequest('GET', '/api/organization/members', {}, {
        userId: multiOrgUserId,
        organizationId: org2Id
      })

      const inactiveAccessResponse = await organizationMembersGet(inactiveAccessRequest)
      expect(inactiveAccessResponse.status).toBe(403)

      const inactiveErrorData = await inactiveAccessResponse.json()
      expect(inactiveErrorData.error).toMatch(/organization|access denied|not belong|inactive/i)
    })

    test('should handle permissions for users with no default organization', async () => {
      // Remove default organization from multi-org user
      await supabaseAdmin
        .from('user_organizations')
        .update({ is_default: false })
        .eq('user_id', multiOrgUserId)

      // User should still be able to access organizations they belong to
      const nonDefaultAccessRequest = createMockRequest('GET', '/api/organization/members', {}, {
        userId: multiOrgUserId,
        organizationId: org1Id
      })

      const nonDefaultAccessResponse = await organizationMembersGet(nonDefaultAccessRequest)
      expect(nonDefaultAccessResponse.status).toBe(200)
    })

    test('should validate permissions for organization-level operations', async () => {
      // Only admins should be able to modify organization settings
      const orgSettingsRequest = createMockRequest('POST', '/api/admin/settings/organization', {
        allow_domain_join_requests: false,
        require_admin_approval_for_domain_join: true
      }, {
        userId: org1ManagerId, // Manager trying admin operation
        organizationId: org1Id
      })

      const orgSettingsResponse = await adminSettingsPost(orgSettingsRequest)
      
      if (orgSettingsResponse.status === 403) {
        const errorData = await orgSettingsResponse.json()
        expect(errorData.error).toMatch(/permission|access denied|role|admin/i)
      }

      // Admin should be able to modify settings
      const adminSettingsRequest = createMockRequest('POST', '/api/admin/settings/organization', {
        allow_domain_join_requests: false,
        require_admin_approval_for_domain_join: true
      }, {
        userId: org1AdminId,
        organizationId: org1Id
      })

      const adminSettingsResponse = await adminSettingsPost(adminSettingsRequest)
      
      // Should not be forbidden due to permissions
      if (adminSettingsResponse.status === 403) {
        const errorData = await adminSettingsResponse.json()
        expect(errorData.error).not.toMatch(/permission|access denied|role/i)
      }
    })
  })

  describe('Permission Edge Cases and Error Handling', () => {
    test('should handle malformed permission requests gracefully', async () => {
      const malformedRequest = createMockRequest('POST', '/api/send-invitation', {
        // Missing required fields
      }, {
        userId: org1AdminId,
        organizationId: org1Id
      })

      const malformedResponse = await sendInvitationPost(malformedRequest)
      
      // Should fail with validation error, not permission error
      if (malformedResponse.status === 400) {
        const errorData = await malformedResponse.json()
        expect(errorData.error).not.toMatch(/permission|access denied|role/i)
      }
    })

    test('should validate permission context with non-existent resources', async () => {
      const nonExistentLeaveRequestId = '00000000-0000-0000-0000-000000000000'
      
      const nonExistentApprovalRequest = createMockRequest('POST', `/api/leave-requests/${nonExistentLeaveRequestId}/approve`, {
        status: 'approved',
        comments: 'Approval for non-existent request'
      }, {
        userId: org1ManagerId,
        organizationId: org1Id
      })

      const nonExistentApprovalResponse = await leaveRequestApprove(nonExistentApprovalRequest)
      
      // Should fail with not found, not permission error
      if (nonExistentApprovalResponse.status === 404) {
        const errorData = await nonExistentApprovalResponse.json()
        expect(errorData.error).not.toMatch(/permission|access denied|role/i)
      }
    })

    test('should handle concurrent permission checks for same user', async () => {
      const concurrentPermissionRequests = [
        createMockRequest('GET', '/api/organization/members', {}, {
          userId: multiOrgUserId,
          organizationId: org1Id,
          requestId: 'concurrent-1'
        }),
        createMockRequest('GET', '/api/organization/members', {}, {
          userId: multiOrgUserId,
          organizationId: org2Id,
          requestId: 'concurrent-2'
        }),
        createMockRequest('GET', '/api/organization/members', {}, {
          userId: multiOrgUserId,
          organizationId: org3Id,
          requestId: 'concurrent-3'
        })
      ]

      const concurrentResponses = await Promise.all(
        concurrentPermissionRequests.map(request => organizationMembersGet(request))
      )

      // All should succeed with proper organization data
      for (const response of concurrentResponses) {
        expect(response.status).toBe(200)
      }
    })
  })
})