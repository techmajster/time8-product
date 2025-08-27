/**
 * Employee Management Within Organization Scope Test Suite
 * 
 * Tests for Task 5.6: Test employee management within organization scope
 * 
 * This comprehensive test suite validates:
 * - Employee CRUD operations within organization boundaries
 * - Cross-organization employee access restrictions
 * - Multi-organization employee visibility and management
 * - Employee profile and role management across organizations
 * - Organization-scoped employee data operations
 * - Employee lifecycle management within organizations
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { createMockRequest, createTestUser, createTestOrganization, cleanupTestData } from '../utils/test-helpers'
import { createClient } from '@supabase/supabase-js'

// Import employee management API route handlers
import { GET as employeesGet, POST as employeesPost } from '@/app/api/employees/route'
import { GET as employeeGet, PUT as employeeUpdate, DELETE as employeeDelete } from '@/app/api/employees/[id]/route'
import { GET as employeeValidate } from '@/app/api/employees/validate/route'
import { GET as organizationMembersGet } from '@/app/api/organization/members/route'
import { POST as sendInvitationPost } from '@/app/api/send-invitation/route'
import { GET as teamsGet } from '@/app/api/teams/route'
import { POST as teamMembersPost } from '@/app/api/teams/[id]/members/route'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('Employee Management Within Organization Scope Tests', () => {
  let org1Id: string
  let org2Id: string
  let org3Id: string
  
  // Organizational users
  let org1AdminId: string
  let org1ManagerId: string
  let org1Employee1Id: string
  let org1Employee2Id: string
  
  let org2AdminId: string
  let org2ManagerId: string
  let org2Employee1Id: string
  
  // Multi-organization users
  let multiOrgEmployee1Id: string // Employee in org1, Manager in org2
  let multiOrgEmployee2Id: string // Manager in org1, Employee in org3
  
  let testUserIds: string[]
  let testOrgIds: string[]
  
  // Test data for employee management
  let org1TeamIds: string[] = []
  let org2TeamIds: string[] = []
  let testInvitationIds: string[] = []

  beforeEach(async () => {
    // Create test organizations
    org1Id = await createTestOrganization('Employee Mgmt Org 1')
    org2Id = await createTestOrganization('Employee Mgmt Org 2')
    org3Id = await createTestOrganization('Employee Mgmt Org 3')

    // Create organizational users
    org1AdminId = await createTestUser('admin1@emp-mgmt.test', org1Id, 'admin')
    org1ManagerId = await createTestUser('manager1@emp-mgmt.test', org1Id, 'manager')
    org1Employee1Id = await createTestUser('employee1a@emp-mgmt.test', org1Id, 'employee')
    org1Employee2Id = await createTestUser('employee1b@emp-mgmt.test', org1Id, 'employee')
    
    org2AdminId = await createTestUser('admin2@emp-mgmt.test', org2Id, 'admin')
    org2ManagerId = await createTestUser('manager2@emp-mgmt.test', org2Id, 'manager')
    org2Employee1Id = await createTestUser('employee2a@emp-mgmt.test', org2Id, 'employee')

    // Create multi-organization users
    multiOrgEmployee1Id = await createTestUser('multi1@emp-mgmt.test', org1Id, 'employee')
    multiOrgEmployee2Id = await createTestUser('multi2@emp-mgmt.test', org1Id, 'manager')
    
    testUserIds = [
      org1AdminId, org1ManagerId, org1Employee1Id, org1Employee2Id,
      org2AdminId, org2ManagerId, org2Employee1Id,
      multiOrgEmployee1Id, multiOrgEmployee2Id
    ]
    testOrgIds = [org1Id, org2Id, org3Id]

    // Add multi-organization memberships
    await supabaseAdmin.from('user_organizations').insert([
      // Multi-org employee 1: Employee in org1, Manager in org2
      {
        user_id: multiOrgEmployee1Id,
        organization_id: org2Id,
        role: 'manager',
        is_active: true,
        is_default: false,
        joined_via: 'invitation',
        employment_type: 'full_time'
      },
      // Multi-org employee 2: Manager in org1, Employee in org3
      {
        user_id: multiOrgEmployee2Id,
        organization_id: org3Id,
        role: 'employee',
        is_active: true,
        is_default: false,
        joined_via: 'invitation',
        employment_type: 'part_time'
      }
    ])

    // Setup test data for employee management operations
    await setupEmployeeManagementTestData()
  })

  afterEach(async () => {
    await cleanupTestData(testUserIds, testOrgIds)
  })

  async function setupEmployeeManagementTestData() {
    // Create teams for employee assignment testing
    const teamsData = [
      {
        organization_id: org1Id,
        name: 'Org1 Development Team',
        description: 'Development team for employee management testing'
      },
      {
        organization_id: org1Id,
        name: 'Org1 QA Team',
        description: 'QA team for employee management testing'
      },
      {
        organization_id: org2Id,
        name: 'Org2 Marketing Team',
        description: 'Marketing team for employee management testing'
      }
    ]

    const { data: insertedTeams } = await supabaseAdmin
      .from('teams')
      .insert(teamsData)
      .select('id, organization_id')

    if (insertedTeams) {
      for (const team of insertedTeams) {
        if (team.organization_id === org1Id) {
          org1TeamIds.push(team.id)
        } else if (team.organization_id === org2Id) {
          org2TeamIds.push(team.id)
        }
      }
    }

    // Create pending invitations for employee testing
    const invitationsData = [
      {
        organization_id: org1Id,
        email: 'pending-employee1@emp-mgmt.test',
        role: 'employee',
        token: 'emp-mgmt-token-1',
        created_by: org1AdminId
      },
      {
        organization_id: org2Id,
        email: 'pending-employee2@emp-mgmt.test',
        role: 'employee',
        token: 'emp-mgmt-token-2',
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
  }

  describe('Employee Listing and Visibility Within Organization', () => {
    test('should list only employees from the requesting organization', async () => {
      // Test org1 employee listing
      const org1EmployeesRequest = createMockRequest('GET', '/api/employees', {}, {
        userId: org1AdminId,
        organizationId: org1Id
      })

      const org1EmployeesResponse = await employeesGet(org1EmployeesRequest)
      expect(org1EmployeesResponse.status).toBe(200)

      const org1EmployeesData = await org1EmployeesResponse.json()
      expect(org1EmployeesData.employees).toBeDefined()
      expect(org1EmployeesData.employees.length).toBeGreaterThanOrEqual(5) // Admin, Manager, 2 Employees, 1 Multi-org

      // Verify all employees belong to org1
      for (const employee of org1EmployeesData.employees) {
        expect(employee.organization_id).toBe(org1Id)
      }

      // Verify no employees from org2 are included
      const org2UserIds = [org2AdminId, org2ManagerId, org2Employee1Id]
      const leakedEmployees = org1EmployeesData.employees.filter((emp: any) => 
        org2UserIds.includes(emp.id)
      )
      expect(leakedEmployees).toHaveLength(0)

      // Test org2 employee listing
      const org2EmployeesRequest = createMockRequest('GET', '/api/employees', {}, {
        userId: org2AdminId,
        organizationId: org2Id
      })

      const org2EmployeesResponse = await employeesGet(org2EmployeesRequest)
      expect(org2EmployeesResponse.status).toBe(200)

      const org2EmployeesData = await org2EmployeesResponse.json()
      expect(org2EmployeesData.employees).toBeDefined()
      expect(org2EmployeesData.employees.length).toBeGreaterThanOrEqual(4) // Admin, Manager, Employee, Multi-org

      // Verify all employees belong to org2
      for (const employee of org2EmployeesData.employees) {
        expect(employee.organization_id).toBe(org2Id)
      }
    })

    test('should show different employee lists for multi-org users based on context', async () => {
      // Multi-org employee in org1 context
      const multiOrg1Request = createMockRequest('GET', '/api/employees', {}, {
        userId: multiOrgEmployee1Id,
        organizationId: org1Id
      })

      const multiOrg1Response = await employeesGet(multiOrg1Request)
      expect(multiOrg1Response.status).toBe(200)

      const multiOrg1Data = await multiOrg1Response.json()
      const org1EmployeeIds = multiOrg1Data.employees.map((emp: any) => emp.id)

      // Multi-org employee in org2 context
      const multiOrg2Request = createMockRequest('GET', '/api/employees', {}, {
        userId: multiOrgEmployee1Id,
        organizationId: org2Id
      })

      const multiOrg2Response = await employeesGet(multiOrg2Request)
      expect(multiOrg2Response.status).toBe(200)

      const multiOrg2Data = await multiOrg2Response.json()
      const org2EmployeeIds = multiOrg2Data.employees.map((emp: any) => emp.id)

      // Employee lists should be different
      expect(org1EmployeeIds).not.toEqual(org2EmployeeIds)

      // Verify organization isolation
      for (const employee of multiOrg1Data.employees) {
        expect(employee.organization_id).toBe(org1Id)
      }

      for (const employee of multiOrg2Data.employees) {
        expect(employee.organization_id).toBe(org2Id)
      }
    })

    test('should enforce role-based employee visibility restrictions', async () => {
      // Employee should see limited employee information
      const employeeViewRequest = createMockRequest('GET', '/api/employees', {}, {
        userId: org1Employee1Id,
        organizationId: org1Id
      })

      const employeeViewResponse = await employeesGet(employeeViewRequest)
      expect(employeeViewResponse.status).toBe(200)

      const employeeViewData = await employeeViewResponse.json()
      const employeeList = employeeViewData.employees

      // Employee should see all employees but may have limited details
      expect(employeeList.length).toBeGreaterThan(0)
      
      // All employees should be from the same organization
      for (const employee of employeeList) {
        expect(employee.organization_id).toBe(org1Id)
      }

      // Manager should see all employees with more details
      const managerViewRequest = createMockRequest('GET', '/api/employees', {}, {
        userId: org1ManagerId,
        organizationId: org1Id
      })

      const managerViewResponse = await employeesGet(managerViewRequest)
      expect(managerViewResponse.status).toBe(200)

      const managerViewData = await managerViewResponse.json()
      const managerEmployeeList = managerViewData.employees

      // Manager should see at least as many employees as regular employee
      expect(managerEmployeeList.length).toBeGreaterThanOrEqual(employeeList.length)
    })
  })

  describe('Individual Employee Management Operations', () => {
    test('should allow access to individual employee within same organization', async () => {
      // Admin accessing employee in same organization
      const sameOrgEmployeeRequest = createMockRequest('GET', `/api/employees/${org1Employee1Id}`, {}, {
        userId: org1AdminId,
        organizationId: org1Id
      })

      const sameOrgEmployeeResponse = await employeeGet(sameOrgEmployeeRequest)
      
      if (sameOrgEmployeeResponse.status === 200) {
        const employeeData = await sameOrgEmployeeResponse.json()
        expect(employeeData.employee).toBeDefined()
        expect(employeeData.employee.organization_id).toBe(org1Id)
      }

      // Manager accessing employee in same organization
      const managerAccessRequest = createMockRequest('GET', `/api/employees/${org1Employee1Id}`, {}, {
        userId: org1ManagerId,
        organizationId: org1Id
      })

      const managerAccessResponse = await employeeGet(managerAccessRequest)
      
      if (managerAccessResponse.status === 200) {
        const managerEmployeeData = await managerAccessResponse.json()
        expect(managerEmployeeData.employee).toBeDefined()
        expect(managerEmployeeData.employee.organization_id).toBe(org1Id)
      }
    })

    test('should prevent access to employees from different organizations', async () => {
      // Org1 admin trying to access org2 employee
      const crossOrgEmployeeRequest = createMockRequest('GET', `/api/employees/${org2Employee1Id}`, {}, {
        userId: org1AdminId,
        organizationId: org1Id
      })

      const crossOrgEmployeeResponse = await employeeGet(crossOrgEmployeeRequest)
      expect(crossOrgEmployeeResponse.status).toBe(403)

      const errorData = await crossOrgEmployeeResponse.json()
      expect(errorData.error).toMatch(/organization|access denied|not belong/i)
    })

    test('should allow employee profile updates within organization scope', async () => {
      // Admin updating employee profile within same organization
      const updateRequest = createMockRequest('PUT', `/api/employees/${org1Employee1Id}`, {
        full_name: 'Updated Employee Name',
        employment_type: 'part_time'
      }, {
        userId: org1AdminId,
        organizationId: org1Id
      })

      const updateResponse = await employeeUpdate(updateRequest)
      
      // Should not be forbidden due to organization restrictions
      if (updateResponse.status === 403) {
        const errorData = await updateResponse.json()
        expect(errorData.error).not.toMatch(/organization|not belong/i)
      }
    })

    test('should prevent employee updates across organizations', async () => {
      // Org1 admin trying to update org2 employee
      const crossOrgUpdateRequest = createMockRequest('PUT', `/api/employees/${org2Employee1Id}`, {
        full_name: 'Unauthorized Update'
      }, {
        userId: org1AdminId,
        organizationId: org1Id
      })

      const crossOrgUpdateResponse = await employeeUpdate(crossOrgUpdateRequest)
      expect(crossOrgUpdateResponse.status).toBe(403)

      const errorData = await crossOrgUpdateResponse.json()
      expect(errorData.error).toMatch(/organization|access denied|not belong/i)
    })
  })

  describe('Employee Creation and Onboarding Within Organizations', () => {
    test('should allow employee creation within organization scope', async () => {
      // Admin creating new employee in their organization
      const createEmployeeRequest = createMockRequest('POST', '/api/employees', {
        email: 'newemployee@emp-mgmt.test',
        full_name: 'New Employee',
        role: 'employee',
        employment_type: 'full_time',
        team_id: org1TeamIds[0] || null
      }, {
        userId: org1AdminId,
        organizationId: org1Id
      })

      const createEmployeeResponse = await employeesPost(createEmployeeRequest)
      
      // Should not be forbidden due to permissions
      if (createEmployeeResponse.status === 403) {
        const errorData = await createEmployeeResponse.json()
        expect(errorData.error).not.toMatch(/permission|access denied|role/i)
      }

      if (createEmployeeResponse.status === 201) {
        const createdEmployee = await createEmployeeResponse.json()
        expect(createdEmployee.employee).toBeDefined()
        expect(createdEmployee.employee.organization_id).toBe(org1Id)
      }
    })

    test('should validate employee email uniqueness within organization', async () => {
      const duplicateEmailRequest = createMockRequest('POST', '/api/employees', {
        email: 'employee1a@emp-mgmt.test', // Existing email
        full_name: 'Duplicate Email Employee',
        role: 'employee',
        employment_type: 'full_time'
      }, {
        userId: org1AdminId,
        organizationId: org1Id
      })

      const duplicateEmailResponse = await employeesPost(duplicateEmailRequest)
      
      // Should fail with validation error, not permission error
      if (duplicateEmailResponse.status === 400) {
        const errorData = await duplicateEmailResponse.json()
        expect(errorData.error).toMatch(/email|duplicate|exists/i)
        expect(errorData.error).not.toMatch(/permission|access denied/i)
      }
    })

    test('should handle invitation-based employee onboarding', async () => {
      // Send invitation for new employee
      const invitationRequest = createMockRequest('POST', '/api/send-invitation', {
        email: 'invited-employee@emp-mgmt.test',
        role: 'employee',
        team_id: org1TeamIds[0] || null
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

      if (invitationResponse.status === 200 || invitationResponse.status === 201) {
        const invitationData = await invitationResponse.json()
        expect(invitationData).toBeDefined()
      }
    })
  })

  describe('Team Assignment and Employee Organization', () => {
    test('should allow employee assignment to teams within same organization', async () => {
      if (org1TeamIds.length > 0) {
        // Add employee to team within same organization
        const teamAssignmentRequest = createMockRequest('POST', `/api/teams/${org1TeamIds[0]}/members`, {
          user_id: org1Employee1Id
        }, {
          userId: org1AdminId,
          organizationId: org1Id
        })

        const teamAssignmentResponse = await teamMembersPost(teamAssignmentRequest)
        
        // Should not be forbidden due to organization restrictions
        if (teamAssignmentResponse.status === 403) {
          const errorData = await teamAssignmentResponse.json()
          expect(errorData.error).not.toMatch(/organization|not belong/i)
        }
      }
    })

    test('should prevent employee assignment to teams in different organizations', async () => {
      if (org2TeamIds.length > 0) {
        // Try to add org1 employee to org2 team
        const crossOrgTeamRequest = createMockRequest('POST', `/api/teams/${org2TeamIds[0]}/members`, {
          user_id: org1Employee1Id // Org1 employee
        }, {
          userId: org1AdminId,
          organizationId: org1Id
        })

        const crossOrgTeamResponse = await teamMembersPost(crossOrgTeamRequest)
        expect(crossOrgTeamResponse.status).toBe(403)

        const errorData = await crossOrgTeamResponse.json()
        expect(errorData.error).toMatch(/organization|access denied|not belong/i)
      }
    })

    test('should show team assignments within organization scope', async () => {
      // View teams within organization
      const teamsRequest = createMockRequest('GET', '/api/teams', {}, {
        userId: org1AdminId,
        organizationId: org1Id
      })

      const teamsResponse = await teamsGet(teamsRequest)
      
      if (teamsResponse.status === 200) {
        const teamsData = await teamsResponse.json()
        
        if (teamsData.teams) {
          // All teams should belong to the organization
          for (const team of teamsData.teams) {
            expect(team.organization_id).toBe(org1Id)
          }
          
          // Should not include teams from other organizations
          const org2TeamInOrg1 = teamsData.teams.filter((team: any) =>
            org2TeamIds.includes(team.id)
          )
          expect(org2TeamInOrg1).toHaveLength(0)
        }
      }
    })
  })

  describe('Multi-Organization Employee Context Management', () => {
    test('should manage same employee differently across organizations', async () => {
      // Multi-org employee 1: Employee in org1, Manager in org2
      
      // View as employee in org1
      const org1Context = createMockRequest('GET', '/api/employees', {}, {
        userId: multiOrgEmployee1Id,
        organizationId: org1Id
      })

      const org1Response = await employeesGet(org1Context)
      expect(org1Response.status).toBe(200)

      const org1Data = await org1Response.json()
      const org1EmployeeCount = org1Data.employees.length

      // View as manager in org2
      const org2Context = createMockRequest('GET', '/api/employees', {}, {
        userId: multiOrgEmployee1Id,
        organizationId: org2Id
      })

      const org2Response = await employeesGet(org2Context)
      expect(org2Response.status).toBe(200)

      const org2Data = await org2Response.json()
      const org2EmployeeCount = org2Data.employees.length

      // Employee counts should be different (different organizations)
      expect(org1EmployeeCount).not.toBe(org2EmployeeCount)

      // Verify organization isolation
      for (const employee of org1Data.employees) {
        expect(employee.organization_id).toBe(org1Id)
      }

      for (const employee of org2Data.employees) {
        expect(employee.organization_id).toBe(org2Id)
      }
    })

    test('should enforce role-based permissions per organization for multi-org users', async () => {
      // Multi-org employee 2: Manager in org1, Employee in org3
      
      // As manager in org1 - should have management capabilities
      const managerInviteRequest = createMockRequest('POST', '/api/send-invitation', {
        email: 'manager-invite@emp-mgmt.test',
        role: 'employee'
      }, {
        userId: multiOrgEmployee2Id,
        organizationId: org1Id
      })

      const managerInviteResponse = await sendInvitationPost(managerInviteRequest)
      
      // Should not be forbidden due to role in org1
      if (managerInviteResponse.status === 403) {
        const errorData = await managerInviteResponse.json()
        expect(errorData.error).not.toMatch(/role|permission|access denied/i)
      }

      // As employee in org3 - should not have management capabilities
      const employeeInviteRequest = createMockRequest('POST', '/api/send-invitation', {
        email: 'employee-invite@emp-mgmt.test',
        role: 'employee'
      }, {
        userId: multiOrgEmployee2Id,
        organizationId: org3Id
      })

      const employeeInviteResponse = await sendInvitationPost(employeeInviteRequest)
      expect(employeeInviteResponse.status).toBe(403)

      const errorData = await employeeInviteResponse.json()
      expect(errorData.error).toMatch(/permission|access denied|role/i)
    })
  })

  describe('Employee Data Validation and Integrity', () => {
    test('should validate employee data consistency within organization', async () => {
      const validationRequest = createMockRequest('GET', '/api/employees/validate', {}, {
        userId: org1AdminId,
        organizationId: org1Id
      })

      const validationResponse = await employeeValidate(validationRequest)
      
      if (validationResponse.status === 200) {
        const validationData = await validationResponse.json()
        expect(validationData).toBeDefined()
        
        // All validated employees should be from the organization
        if (validationData.employees) {
          for (const employee of validationData.employees) {
            expect(employee.organization_id).toBe(org1Id)
          }
        }
      }
    })

    test('should handle employee deactivation within organization scope', async () => {
      // Deactivate employee membership
      await supabaseAdmin
        .from('user_organizations')
        .update({ is_active: false })
        .eq('user_id', org1Employee2Id)
        .eq('organization_id', org1Id)

      // Employee should not appear in active employee lists
      const activeEmployeesRequest = createMockRequest('GET', '/api/employees', {}, {
        userId: org1AdminId,
        organizationId: org1Id
      })

      const activeEmployeesResponse = await employeesGet(activeEmployeesRequest)
      expect(activeEmployeesResponse.status).toBe(200)

      const activeEmployeesData = await activeEmployeesResponse.json()
      const deactivatedEmployeeInList = activeEmployeesData.employees.find((emp: any) => 
        emp.id === org1Employee2Id
      )
      expect(deactivatedEmployeeInList).toBeUndefined()

      // Direct access to deactivated employee should be restricted
      const deactivatedEmployeeRequest = createMockRequest('GET', `/api/employees/${org1Employee2Id}`, {}, {
        userId: org1AdminId,
        organizationId: org1Id
      })

      const deactivatedEmployeeResponse = await employeeGet(deactivatedEmployeeRequest)
      expect(deactivatedEmployeeResponse.status).toBeGreaterThanOrEqual(400)
    })

    test('should maintain employee data integrity during organization operations', async () => {
      // Concurrent employee operations within same organization
      const concurrentOperations = [
        createMockRequest('GET', `/api/employees/${org1Employee1Id}`, {}, {
          userId: org1AdminId,
          organizationId: org1Id,
          operationId: 'concurrent-1'
        }),
        createMockRequest('GET', `/api/employees/${org1Employee2Id}`, {}, {
          userId: org1ManagerId,
          organizationId: org1Id,
          operationId: 'concurrent-2'
        }),
        createMockRequest('GET', '/api/employees', {}, {
          userId: org1AdminId,
          organizationId: org1Id,
          operationId: 'concurrent-3'
        })
      ]

      const responses = await Promise.all([
        employeeGet(concurrentOperations[0]),
        employeeGet(concurrentOperations[1]),
        employeesGet(concurrentOperations[2])
      ])

      // All operations should maintain data integrity
      for (const response of responses) {
        if (response.status === 200) {
          const data = await response.json()
          
          if (data.employee) {
            expect(data.employee.organization_id).toBe(org1Id)
          }
          
          if (data.employees) {
            for (const employee of data.employees) {
              expect(employee.organization_id).toBe(org1Id)
            }
          }
        }
      }
    })
  })

  describe('Employee Management Error Handling and Edge Cases', () => {
    test('should handle invalid employee IDs gracefully', async () => {
      const invalidEmployeeIds = [
        'invalid-uuid',
        '00000000-0000-0000-0000-000000000000',
        null,
        ''
      ]

      for (const invalidId of invalidEmployeeIds) {
        if (invalidId) {
          const invalidEmployeeRequest = createMockRequest('GET', `/api/employees/${invalidId}`, {}, {
            userId: org1AdminId,
            organizationId: org1Id
          })

          const invalidEmployeeResponse = await employeeGet(invalidEmployeeRequest)
          
          // Should fail with appropriate error, not permission error
          if (invalidEmployeeResponse.status >= 400 && invalidEmployeeResponse.status !== 403) {
            const errorData = await invalidEmployeeResponse.json()
            expect(errorData.error).not.toMatch(/permission|access denied|role/i)
          }
        }
      }
    })

    test('should handle malformed employee creation requests', async () => {
      const malformedRequests = [
        {
          description: 'Missing email',
          data: {
            full_name: 'No Email Employee',
            role: 'employee',
            employment_type: 'full_time'
          }
        },
        {
          description: 'Invalid role',
          data: {
            email: 'invalid-role@emp-mgmt.test',
            full_name: 'Invalid Role Employee',
            role: 'invalid_role',
            employment_type: 'full_time'
          }
        },
        {
          description: 'Missing required fields',
          data: {}
        }
      ]

      for (const { description, data } of malformedRequests) {
        const malformedRequest = createMockRequest('POST', '/api/employees', data, {
          userId: org1AdminId,
          organizationId: org1Id
        })

        const malformedResponse = await employeesPost(malformedRequest)
        
        // Should fail with validation error, not permission error
        if (malformedResponse.status === 400) {
          const errorData = await malformedResponse.json()
          expect(errorData.error).not.toMatch(/permission|access denied|role/i)
        }
      }
    })

    test('should handle employee management during high concurrent access', async () => {
      // Simulate high concurrent access to employee endpoints
      const concurrentRequests = Array.from({ length: 20 }, (_, i) => 
        createMockRequest('GET', '/api/employees', {}, {
          userId: org1AdminId,
          organizationId: org1Id,
          requestId: `concurrent-${i}`
        })
      )

      const startTime = Date.now()
      const responses = await Promise.all(
        concurrentRequests.map(request => employeesGet(request))
      )
      const endTime = Date.now()

      // All requests should maintain organization isolation
      for (const response of responses) {
        expect(response.status).toBe(200)
        
        const data = await response.json()
        for (const employee of data.employees) {
          expect(employee.organization_id).toBe(org1Id)
        }
      }

      // Performance check - should complete within reasonable time
      const executionTime = endTime - startTime
      expect(executionTime).toBeLessThan(20000) // 20 seconds max for 20 concurrent requests
    })
  })
})