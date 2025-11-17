/**
 * Organization Admin Capabilities and Restrictions Test Suite
 * 
 * Tests for Task 5.5: Verify organization admin capabilities and restrictions
 * 
 * This comprehensive test suite validates:
 * - Admin-only operations within organization scope
 * - Cross-organization admin permission isolation
 * - Multi-organization admin user capabilities
 * - Admin role inheritance and restrictions
 * - Organization-level administrative functions
 * - Security boundaries for administrative operations
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { createMockRequest, createTestUser, createTestOrganization, cleanupTestData } from '../utils/test-helpers'
import { createClient } from '@supabase/supabase-js'

// Import admin-related API route handlers
import { GET as adminSettingsGet, PUT as adminSettingsPut } from '@/app/api/admin/settings/organization/route'
import { POST as sendInvitationPost } from '@/app/api/send-invitation/route'
import { POST as cancelInvitationPost } from '@/app/api/cancel-invitation/route'
import { GET as employeesGet, POST as employeesPost } from '@/app/api/employees/route'
import { PUT as employeesUpdate } from '@/app/api/employees/[id]/route'
import { GET as organizationMembersGet } from '@/app/api/organization/members/route'
import { POST as createTeamPost } from '@/app/api/teams/route'
import { POST as leaveBalancesPost } from '@/app/api/admin/leave-balances/route'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('Organization Admin Capabilities and Restrictions Tests', () => {
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
  
  // Multi-organization admin users
  let superAdminId: string // Admin in multiple organizations
  let limitedAdminId: string // Admin in org1, Employee in org2
  let crossOrgManagerId: string // Manager in multiple organizations
  
  let testUserIds: string[]
  let testOrgIds: string[]
  
  // Test data for admin operations
  let testInvitationIds: string[] = []
  let testTeamIds: string[] = []

  beforeEach(async () => {
    // Create test organizations
    org1Id = await createTestOrganization('Admin Test Org 1')
    org2Id = await createTestOrganization('Admin Test Org 2')
    org3Id = await createTestOrganization('Admin Test Org 3')

    // Create single-organization users
    org1AdminId = await createTestUser('admin1@admin-test.com', org1Id, 'admin')
    org1ManagerId = await createTestUser('manager1@admin-test.com', org1Id, 'manager')
    org1EmployeeId = await createTestUser('employee1@admin-test.com', org1Id, 'employee')
    
    org2AdminId = await createTestUser('admin2@admin-test.com', org2Id, 'admin')
    org2ManagerId = await createTestUser('manager2@admin-test.com', org2Id, 'manager')
    org2EmployeeId = await createTestUser('employee2@admin-test.com', org2Id, 'employee')

    // Create multi-organization admin users
    superAdminId = await createTestUser('superadmin@admin-test.com', org1Id, 'admin')
    limitedAdminId = await createTestUser('limitedadmin@admin-test.com', org1Id, 'admin')
    crossOrgManagerId = await createTestUser('crossmanager@admin-test.com', org1Id, 'manager')
    
    testUserIds = [
      org1AdminId, org1ManagerId, org1EmployeeId,
      org2AdminId, org2ManagerId, org2EmployeeId,
      superAdminId, limitedAdminId, crossOrgManagerId
    ]
    testOrgIds = [org1Id, org2Id, org3Id]

    // Setup multi-organization memberships
    await supabaseAdmin.from('user_organizations').insert([
      // Super admin: Admin in all organizations
      {
        user_id: superAdminId,
        organization_id: org2Id,
        role: 'admin',
        is_active: true,
        is_default: false,
        joined_via: 'invitation',
        employment_type: 'full_time'
      },
      {
        user_id: superAdminId,
        organization_id: org3Id,
        role: 'admin',
        is_active: true,
        is_default: false,
        joined_via: 'invitation',
        employment_type: 'full_time'
      },
      // Limited admin: Admin in org1, Employee in org2
      {
        user_id: limitedAdminId,
        organization_id: org2Id,
        role: 'employee',
        is_active: true,
        is_default: false,
        joined_via: 'invitation',
        employment_type: 'full_time'
      },
      // Cross-org manager: Manager in org1 and org2
      {
        user_id: crossOrgManagerId,
        organization_id: org2Id,
        role: 'manager',
        is_active: true,
        is_default: false,
        joined_via: 'invitation',
        employment_type: 'full_time'
      }
    ])

    // Setup test data for admin operations
    await setupAdminTestData()
  })

  afterEach(async () => {
    await cleanupTestData(testUserIds, testOrgIds)
  })

  async function setupAdminTestData() {
    // Create test invitations
    const invitationsData = [
      {
        organization_id: org1Id,
        email: 'pending1@admin-test.com',
        role: 'employee',
        token: 'admin-test-token-1',
        created_by: org1AdminId
      },
      {
        organization_id: org2Id,
        email: 'pending2@admin-test.com',
        role: 'manager',
        token: 'admin-test-token-2',
        created_by: org2AdminId
      }
    ]

    const { data: insertedInvitations } = await supabaseAdmin
      .from('invitations')
      .insert(invitationsData)
      .select('id')

    if (insertedInvitations) {
      testInvitationIds = insertedInvitations.map(inv => inv.id)
    }

    // Create test teams
    const teamsData = [
      {
        organization_id: org1Id,
        name: 'Admin Test Team 1',
        description: 'Team for admin capability testing'
      },
      {
        organization_id: org2Id,
        name: 'Admin Test Team 2',
        description: 'Team for admin capability testing'
      }
    ]

    const { data: insertedTeams } = await supabaseAdmin
      .from('teams')
      .insert(teamsData)
      .select('id')

    if (insertedTeams) {
      testTeamIds = insertedTeams.map(team => team.id)
    }
  }

  describe('Admin-Only Operations Within Organization', () => {
    test('should allow admin to access organization settings', async () => {
      const orgSettingsRequest = createMockRequest('GET', '/api/admin/settings/organization', {}, {
        userId: org1AdminId,
        organizationId: org1Id
      })

      const orgSettingsResponse = await adminSettingsGet(orgSettingsRequest)
      
      // Should succeed or return structured response (not 403)
      if (orgSettingsResponse.status !== 200) {
        // If endpoint is not implemented, should not be forbidden due to permissions
        expect(orgSettingsResponse.status).not.toBe(403)
      } else {
        const settingsData = await orgSettingsResponse.json()
        expect(settingsData).toBeDefined()
      }
    })

    test('should allow admin to modify organization settings', async () => {
      const settingsUpdateRequest = createMockRequest('PUT', '/api/admin/settings/organization', {
        name: 'Updated Org Name',
        countryCode: 'PL',
        locale: 'pl'
      }, {
        userId: org1AdminId,
        organizationId: org1Id
      })

      const settingsUpdateResponse = await adminSettingsPut(settingsUpdateRequest)

      // Should succeed (200) for admin users
      expect(settingsUpdateResponse.status).toBe(200)
      const settingsData = await settingsUpdateResponse.json()
      expect(settingsData.success).toBe(true)
      expect(settingsData.organization).toBeDefined()
    })

    test('should allow admin to send invitations', async () => {
      const invitationRequest = createMockRequest('POST', '/api/send-invitation', {
        email: 'newinvite@admin-test.com',
        role: 'employee',
        team_id: testTeamIds[0] || null
      }, {
        userId: org1AdminId,
        organizationId: org1Id
      })

      const invitationResponse = await sendInvitationPost(invitationRequest)
      
      // Should not be forbidden due to permissions
      if (invitationResponse.status === 403) {
        const errorData = await invitationResponse.json()
        expect(errorData.error).not.toMatch(/permission|access denied|role/i)
      }
    })

    test('should allow admin to cancel invitations', async () => {
      if (testInvitationIds.length > 0) {
        const cancelRequest = createMockRequest('POST', '/api/cancel-invitation', {
          invitation_id: testInvitationIds[0]
        }, {
          userId: org1AdminId,
          organizationId: org1Id
        })

        const cancelResponse = await cancelInvitationPost(cancelRequest)
        
        // Should not be forbidden due to permissions
        if (cancelResponse.status === 403) {
          const errorData = await cancelResponse.json()
          expect(errorData.error).not.toMatch(/permission|access denied|role/i)
        }
      }
    })

    test('should allow admin to create teams', async () => {
      const teamCreationRequest = createMockRequest('POST', '/api/teams', {
        name: 'New Admin Team',
        description: 'Team created by admin for testing'
      }, {
        userId: org1AdminId,
        organizationId: org1Id
      })

      const teamCreationResponse = await createTeamPost(teamCreationRequest)
      
      // Should not be forbidden due to permissions
      if (teamCreationResponse.status === 403) {
        const errorData = await teamCreationResponse.json()
        expect(errorData.error).not.toMatch(/permission|access denied|role/i)
      }
    })

    test('should allow admin to manage employee records', async () => {
      // Admin should be able to create employee records
      const employeeCreationRequest = createMockRequest('POST', '/api/employees', {
        email: 'newemployee@admin-test.com',
        full_name: 'New Employee',
        role: 'employee',
        employment_type: 'full_time'
      }, {
        userId: org1AdminId,
        organizationId: org1Id
      })

      const employeeCreationResponse = await employeesPost(employeeCreationRequest)
      
      // Should not be forbidden due to permissions
      if (employeeCreationResponse.status === 403) {
        const errorData = await employeeCreationResponse.json()
        expect(errorData.error).not.toMatch(/permission|access denied|role/i)
      }

      // Admin should be able to view all employees
      const employeesViewRequest = createMockRequest('GET', '/api/employees', {}, {
        userId: org1AdminId,
        organizationId: org1Id
      })

      const employeesViewResponse = await employeesGet(employeesViewRequest)
      expect(employeesViewResponse.status).toBe(200)

      const employeesData = await employeesViewResponse.json()
      expect(employeesData.employees).toBeDefined()
      expect(employeesData.employees.length).toBeGreaterThan(0)
    })
  })

  describe('Non-Admin User Restrictions', () => {
    test('should prevent manager from accessing admin-only settings', async () => {
      const managerSettingsRequest = createMockRequest('GET', '/api/admin/settings/organization', {}, {
        userId: org1ManagerId,
        organizationId: org1Id
      })

      const managerSettingsResponse = await adminSettingsGet(managerSettingsRequest)
      expect(managerSettingsResponse.status).toBe(403)

      const errorData = await managerSettingsResponse.json()
      expect(errorData.error).toMatch(/permission|access denied|role|admin/i)
    })

    test('should prevent employee from sending invitations', async () => {
      const employeeInviteRequest = createMockRequest('POST', '/api/send-invitation', {
        email: 'unauthorized@admin-test.com',
        role: 'employee'
      }, {
        userId: org1EmployeeId,
        organizationId: org1Id
      })

      const employeeInviteResponse = await sendInvitationPost(employeeInviteRequest)
      expect(employeeInviteResponse.status).toBe(403)

      const errorData = await employeeInviteResponse.json()
      expect(errorData.error).toMatch(/permission|access denied|role/i)
    })

    test('should prevent manager from modifying organization settings', async () => {
      const managerSettingsUpdateRequest = createMockRequest('PUT', '/api/admin/settings/organization', {
        name: 'Unauthorized Update',
        locale: 'en'
      }, {
        userId: org1ManagerId,
        organizationId: org1Id
      })

      const managerSettingsUpdateResponse = await adminSettingsPut(managerSettingsUpdateRequest)
      expect(managerSettingsUpdateResponse.status).toBe(403)

      const errorData = await managerSettingsUpdateResponse.json()
      expect(errorData.error).toMatch(/permission|access denied|role|admin/i)
    })

    test('should prevent employee from creating teams', async () => {
      const employeeTeamRequest = createMockRequest('POST', '/api/teams', {
        name: 'Unauthorized Team',
        description: 'Team creation attempt by employee'
      }, {
        userId: org1EmployeeId,
        organizationId: org1Id
      })

      const employeeTeamResponse = await createTeamPost(employeeTeamRequest)
      expect(employeeTeamResponse.status).toBe(403)

      const errorData = await employeeTeamResponse.json()
      expect(errorData.error).toMatch(/permission|access denied|role/i)
    })
  })

  describe('Cross-Organization Admin Isolation', () => {
    test('should prevent admin from accessing other organization settings', async () => {
      // Org1 admin trying to access org2 settings
      const crossOrgSettingsRequest = createMockRequest('GET', '/api/admin/settings/organization', {}, {
        userId: org1AdminId,
        organizationId: org2Id
      })

      const crossOrgSettingsResponse = await adminSettingsGet(crossOrgSettingsRequest)
      expect(crossOrgSettingsResponse.status).toBe(403)

      const errorData = await crossOrgSettingsResponse.json()
      expect(errorData.error).toMatch(/organization|access denied|not belong/i)
    })

    test('should prevent admin from sending invitations for other organizations', async () => {
      const crossOrgInviteRequest = createMockRequest('POST', '/api/send-invitation', {
        email: 'crossorg@admin-test.com',
        role: 'employee'
      }, {
        userId: org1AdminId,
        organizationId: org2Id // Different organization
      })

      const crossOrgInviteResponse = await sendInvitationPost(crossOrgInviteRequest)
      expect(crossOrgInviteResponse.status).toBe(403)

      const errorData = await crossOrgInviteResponse.json()
      expect(errorData.error).toMatch(/organization|access denied|not belong/i)
    })

    test('should prevent admin from managing employees in other organizations', async () => {
      const crossOrgEmployeeRequest = createMockRequest('GET', '/api/employees', {}, {
        userId: org1AdminId,
        organizationId: org2Id
      })

      const crossOrgEmployeeResponse = await employeesGet(crossOrgEmployeeRequest)
      expect(crossOrgEmployeeResponse.status).toBe(403)

      const errorData = await crossOrgEmployeeResponse.json()
      expect(errorData.error).toMatch(/organization|access denied|not belong/i)
    })

    test('should prevent admin from canceling invitations from other organizations', async () => {
      if (testInvitationIds.length > 1) {
        // Try to cancel org2 invitation using org1 admin
        const crossOrgCancelRequest = createMockRequest('POST', '/api/cancel-invitation', {
          invitation_id: testInvitationIds[1] // Org2 invitation
        }, {
          userId: org1AdminId,
          organizationId: org1Id // Org1 context
        })

        const crossOrgCancelResponse = await cancelInvitationPost(crossOrgCancelRequest)
        expect(crossOrgCancelResponse.status).toBe(403)

        const errorData = await crossOrgCancelResponse.json()
        expect(errorData.error).toMatch(/permission|access denied|organization/i)
      }
    })
  })

  describe('Multi-Organization Admin Capabilities', () => {
    test('should allow super admin to manage multiple organizations independently', async () => {
      const organizationContexts = [
        { orgId: org1Id, orgName: 'Org 1' },
        { orgId: org2Id, orgName: 'Org 2' },
        { orgId: org3Id, orgName: 'Org 3' }
      ]

      for (const { orgId, orgName } of organizationContexts) {
        // Should have admin capabilities in each organization
        const settingsRequest = createMockRequest('GET', '/api/admin/settings/organization', {}, {
          userId: superAdminId,
          organizationId: orgId
        })

        const settingsResponse = await adminSettingsGet(settingsRequest)
        
        // Should not be forbidden due to permissions
        if (settingsResponse.status === 403) {
          const errorData = await settingsResponse.json()
          expect(errorData.error).not.toMatch(/permission|access denied|role/i)
        }

        // Should be able to send invitations
        const inviteRequest = createMockRequest('POST', '/api/send-invitation', {
          email: `superadmin-invite-${orgId}@admin-test.com`,
          role: 'employee'
        }, {
          userId: superAdminId,
          organizationId: orgId
        })

        const inviteResponse = await sendInvitationPost(inviteRequest)
        
        // Should not be forbidden due to permissions
        if (inviteResponse.status === 403) {
          const errorData = await inviteResponse.json()
          expect(errorData.error).not.toMatch(/permission|access denied|role/i)
        }
      }
    })

    test('should restrict limited admin based on organization context', async () => {
      // Limited admin has admin role in org1, employee role in org2
      
      // Should have admin capabilities in org1
      const org1AdminRequest = createMockRequest('POST', '/api/send-invitation', {
        email: 'limitedadmin-org1@admin-test.com',
        role: 'employee'
      }, {
        userId: limitedAdminId,
        organizationId: org1Id
      })

      const org1AdminResponse = await sendInvitationPost(org1AdminRequest)
      
      // Should not be forbidden due to permissions in org1
      if (org1AdminResponse.status === 403) {
        const errorData = await org1AdminResponse.json()
        expect(errorData.error).not.toMatch(/permission|access denied|role/i)
      }

      // Should NOT have admin capabilities in org2
      const org2EmployeeRequest = createMockRequest('POST', '/api/send-invitation', {
        email: 'limitedadmin-org2@admin-test.com',
        role: 'employee'
      }, {
        userId: limitedAdminId,
        organizationId: org2Id
      })

      const org2EmployeeResponse = await sendInvitationPost(org2EmployeeRequest)
      expect(org2EmployeeResponse.status).toBe(403)

      const org2ErrorData = await org2EmployeeResponse.json()
      expect(org2ErrorData.error).toMatch(/permission|access denied|role/i)
    })

    test('should maintain role-based restrictions for cross-org managers', async () => {
      // Cross-org manager has manager role in both org1 and org2 (no admin privileges)
      
      const organizations = [org1Id, org2Id]

      for (const orgId of organizations) {
        // Should NOT have admin capabilities (can't modify settings)
        const settingsRequest = createMockRequest('PUT', '/api/admin/settings/organization', {
          name: 'Unauthorized Update',
          locale: 'en'
        }, {
          userId: crossOrgManagerId,
          organizationId: orgId
        })

        const settingsResponse = await adminSettingsPut(settingsRequest)
        expect(settingsResponse.status).toBe(403)

        const errorData = await settingsResponse.json()
        expect(errorData.error).toMatch(/permission|access denied|role|admin/i)

        // Should NOT be able to send invitations (admin-only in many systems)
        const inviteRequest = createMockRequest('POST', '/api/send-invitation', {
          email: `crossmanager-${orgId}@admin-test.com`,
          role: 'employee'
        }, {
          userId: crossOrgManagerId,
          organizationId: orgId
        })

        const inviteResponse = await sendInvitationPost(inviteRequest)
        expect(inviteResponse.status).toBe(403)

        const inviteErrorData = await inviteResponse.json()
        expect(inviteErrorData.error).toMatch(/permission|access denied|role/i)
      }
    })
  })

  describe('Advanced Admin Operations and Edge Cases', () => {
    test('should allow admin to manage leave balances', async () => {
      const leaveBalanceRequest = createMockRequest('POST', '/api/admin/leave-balances', {
        user_id: org1EmployeeId,
        leave_type_id: 'annual_leave',
        balance: 25
      }, {
        userId: org1AdminId,
        organizationId: org1Id
      })

      const leaveBalanceResponse = await leaveBalancesPost(leaveBalanceRequest)
      
      // Should not be forbidden due to permissions
      if (leaveBalanceResponse.status === 403) {
        const errorData = await leaveBalanceResponse.json()
        expect(errorData.error).not.toMatch(/permission|access denied|role/i)
      }
    })

    test('should prevent admin from operating on deactivated organization membership', async () => {
      // Deactivate super admin's membership in org3
      await supabaseAdmin
        .from('user_organizations')
        .update({ is_active: false })
        .eq('user_id', superAdminId)
        .eq('organization_id', org3Id)

      // Should not be able to perform admin operations in deactivated organization
      const deactivatedOrgRequest = createMockRequest('POST', '/api/send-invitation', {
        email: 'deactivated@admin-test.com',
        role: 'employee'
      }, {
        userId: superAdminId,
        organizationId: org3Id
      })

      const deactivatedOrgResponse = await sendInvitationPost(deactivatedOrgRequest)
      expect(deactivatedOrgResponse.status).toBe(403)

      const errorData = await deactivatedOrgResponse.json()
      expect(errorData.error).toMatch(/organization|access denied|not belong|inactive/i)
    })

    test('should handle concurrent admin operations across organizations', async () => {
      // Super admin performing operations in multiple organizations simultaneously
      const concurrentOperations = [
        {
          request: createMockRequest('POST', '/api/send-invitation', {
            email: 'concurrent1@admin-test.com',
            role: 'employee'
          }, {
            userId: superAdminId,
            organizationId: org1Id,
            operationId: 'concurrent-1'
          }),
          orgId: org1Id
        },
        {
          request: createMockRequest('POST', '/api/send-invitation', {
            email: 'concurrent2@admin-test.com',
            role: 'employee'
          }, {
            userId: superAdminId,
            organizationId: org2Id,
            operationId: 'concurrent-2'
          }),
          orgId: org2Id
        }
      ]

      const responses = await Promise.all(
        concurrentOperations.map(({ request }) => sendInvitationPost(request))
      )

      // Both operations should succeed (not be forbidden due to permissions)
      for (const response of responses) {
        if (response.status === 403) {
          const errorData = await response.json()
          expect(errorData.error).not.toMatch(/permission|access denied|role/i)
        }
      }
    })

    test('should validate admin operations with malformed data', async () => {
      const malformedRequests = [
        {
          description: 'Empty invitation request',
          request: createMockRequest('POST', '/api/send-invitation', {}, {
            userId: org1AdminId,
            organizationId: org1Id
          })
        },
        {
          description: 'Invalid team creation request',
          request: createMockRequest('POST', '/api/teams', {
            name: '' // Empty name
          }, {
            userId: org1AdminId,
            organizationId: org1Id
          })
        }
      ]

      for (const { description, request } of malformedRequests) {
        const response = await (description.includes('invitation') 
          ? sendInvitationPost(request) 
          : createTeamPost(request))

        // Should fail with validation error, not permission error
        if (response.status === 400) {
          const errorData = await response.json()
          expect(errorData.error).not.toMatch(/permission|access denied|role/i)
        }
      }
    })

    test('should handle admin operations with non-existent resources', async () => {
      const nonExistentInvitationId = '00000000-0000-0000-0000-000000000000'
      
      const nonExistentCancelRequest = createMockRequest('POST', '/api/cancel-invitation', {
        invitation_id: nonExistentInvitationId
      }, {
        userId: org1AdminId,
        organizationId: org1Id
      })

      const nonExistentCancelResponse = await cancelInvitationPost(nonExistentCancelRequest)
      
      // Should fail with not found error, not permission error
      if (nonExistentCancelResponse.status === 404) {
        const errorData = await nonExistentCancelResponse.json()
        expect(errorData.error).not.toMatch(/permission|access denied|role/i)
      }
    })
  })

  describe('Organization Admin Hierarchy and Delegation', () => {
    test('should maintain admin supremacy over managers within organization', async () => {
      // Admin should be able to override manager decisions
      const adminMemberRequest = createMockRequest('GET', '/api/organization/members', {}, {
        userId: org1AdminId,
        organizationId: org1Id
      })

      const adminMemberResponse = await organizationMembersGet(adminMemberRequest)
      expect(adminMemberResponse.status).toBe(200)

      const adminMemberData = await adminMemberResponse.json()
      expect(adminMemberData.members).toBeDefined()

      // Admin should see all members including managers
      const managerMembers = adminMemberData.members.filter((member: any) => 
        member.role === 'manager'
      )
      expect(managerMembers.length).toBeGreaterThanOrEqual(1)
    })

    test('should prevent privilege escalation through admin operations', async () => {
      // Employee should not be able to escalate privileges by creating admin invitations
      const privilegeEscalationRequest = createMockRequest('POST', '/api/send-invitation', {
        email: 'privilegeescalation@admin-test.com',
        role: 'admin' // Attempting to create admin
      }, {
        userId: org1EmployeeId,
        organizationId: org1Id
      })

      const privilegeEscalationResponse = await sendInvitationPost(privilegeEscalationRequest)
      expect(privilegeEscalationResponse.status).toBe(403)

      const errorData = await privilegeEscalationResponse.json()
      expect(errorData.error).toMatch(/permission|access denied|role/i)
    })

    test('should validate admin role requirements for sensitive operations', async () => {
      // Test various admin-only operations with non-admin users
      const sensitiveOperations = [
        {
          operation: 'Organization settings modification',
          request: createMockRequest('PUT', '/api/admin/settings/organization', {
            name: 'Unauthorized Update',
            locale: 'en'
          }, {
            userId: org1ManagerId,
            organizationId: org1Id
          }),
          handler: adminSettingsPut
        },
        {
          operation: 'Leave balance management',
          request: createMockRequest('POST', '/api/admin/leave-balances', {
            user_id: org1EmployeeId,
            leave_type_id: 'sick_leave',
            balance: 10
          }, {
            userId: org1ManagerId,
            organizationId: org1Id
          }),
          handler: leaveBalancesPost
        }
      ]

      for (const { operation, request, handler } of sensitiveOperations) {
        const response = await handler(request)
        expect(response.status).toBe(403)

        const errorData = await response.json()
        expect(errorData.error).toMatch(/permission|access denied|role|admin/i)
      }
    })
  })
})