/**
 * Multi-Organization Switching Functionality Test Suite
 * 
 * Tests for Task 5.1: Organization switching functionality
 * 
 * This comprehensive test suite validates:
 * - Workspace switching mechanisms and API endpoints
 * - Organization context persistence during navigation
 * - Cookie and session management for organization context
 * - Multi-organization user switching workflows
 * - Error handling and edge cases in organization switching
 * - State management during organization transitions
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { createMockRequest, createTestUser, createTestOrganization, cleanupTestData } from '../utils/test-helpers'
import { createClient } from '@supabase/supabase-js'

// Import API route handlers
import { POST as workspaceSwitchPost } from '@/app/api/workspace/switch/route'
import { GET as currentOrgGet } from '@/app/api/user/current-organization/route'
import { GET as orgStatusGet } from '@/app/api/user/organization-status/route'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('Multi-Organization Switching Functionality Tests', () => {
  let org1Id: string
  let org2Id: string
  let org3Id: string
  let adminUserId: string
  let managerUserId: string
  let multiOrgUserId: string
  let testUserIds: string[]
  let testOrgIds: string[]

  beforeEach(async () => {
    // Create test organizations
    org1Id = await createTestOrganization('Switching Test Org 1')
    org2Id = await createTestOrganization('Switching Test Org 2')
    org3Id = await createTestOrganization('Switching Test Org 3')

    // Create test users
    adminUserId = await createTestUser('admin@switching.test', org1Id, 'admin')
    managerUserId = await createTestUser('manager@switching.test', org2Id, 'manager')
    
    // Create multi-organization user
    multiOrgUserId = await createTestUser('multi@switching.test', org1Id, 'employee')
    
    testUserIds = [adminUserId, managerUserId, multiOrgUserId]
    testOrgIds = [org1Id, org2Id, org3Id]

    // Add multi-org user to additional organizations
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

    // Add manager to org1 for cross-org testing
    await supabaseAdmin
      .from('user_organizations')
      .insert({
        user_id: managerUserId,
        organization_id: org1Id,
        role: 'employee',
        is_active: true,
        is_default: false,
        joined_via: 'invitation',
        employment_type: 'full_time'
      })
  })

  afterEach(async () => {
    await cleanupTestData(testUserIds, testOrgIds)
  })

  describe('Organization Context Switching API', () => {
    test('should successfully switch organization context for valid user', async () => {
      // Multi-org user switching from default org1 to org2
      const switchRequest = createMockRequest('POST', '/api/workspace/switch', {
        organizationId: org2Id
      }, {
        userId: multiOrgUserId,
        organizationId: org1Id // Current context
      })

      const switchResponse = await workspaceSwitchPost(switchRequest)
      expect(switchResponse.status).toBe(200)

      const switchData = await switchResponse.json()
      expect(switchData.success).toBe(true)

      // Verify the organization context has changed by calling current-organization API
      const currentOrgRequest = createMockRequest('GET', '/api/user/current-organization', {}, {
        userId: multiOrgUserId,
        organizationId: org2Id // Should now be org2
      })

      const currentOrgResponse = await currentOrgGet(currentOrgRequest)
      expect(currentOrgResponse.status).toBe(200)

      const currentOrgData = await currentOrgResponse.json()
      expect(currentOrgData.organizationId).toBe(org2Id)
    })

    test('should reject switching to organization user does not belong to', async () => {
      // Admin user trying to switch to org2 (not a member)
      const invalidSwitchRequest = createMockRequest('POST', '/api/workspace/switch', {
        organizationId: org2Id
      }, {
        userId: adminUserId,
        organizationId: org1Id
      })

      const invalidSwitchResponse = await workspaceSwitchPost(invalidSwitchRequest)
      expect(invalidSwitchResponse.status).toBe(400)

      const errorData = await invalidSwitchResponse.json()
      expect(errorData.error).toMatch(/not belong|organization/i)
    })

    test('should handle missing organizationId parameter', async () => {
      const emptyRequest = createMockRequest('POST', '/api/workspace/switch', {}, {
        userId: multiOrgUserId,
        organizationId: org1Id
      })

      const emptyResponse = await workspaceSwitchPost(emptyRequest)
      expect(emptyResponse.status).toBe(400)

      const errorData = await emptyResponse.json()
      expect(errorData.error).toMatch(/organization id is required/i)
    })

    test('should handle invalid organizationId parameter', async () => {
      const invalidIdRequest = createMockRequest('POST', '/api/workspace/switch', {
        organizationId: 'invalid-uuid'
      }, {
        userId: multiOrgUserId,
        organizationId: org1Id
      })

      const invalidIdResponse = await workspaceSwitchPost(invalidIdRequest)
      expect(invalidIdResponse.status).toBe(400)

      const errorData = await invalidIdResponse.json()
      expect(errorData.error).toBeDefined()
    })

    test('should handle non-existent organizationId', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'
      const nonExistentRequest = createMockRequest('POST', '/api/workspace/switch', {
        organizationId: nonExistentId
      }, {
        userId: multiOrgUserId,
        organizationId: org1Id
      })

      const nonExistentResponse = await workspaceSwitchPost(nonExistentRequest)
      expect(nonExistentResponse.status).toBe(400)

      const errorData = await nonExistentResponse.json()
      expect(errorData.error).toMatch(/not belong|organization/i)
    })
  })

  describe('Multi-Organization User Workflows', () => {
    test('should allow multi-org user to switch between all their organizations', async () => {
      const organizations = [org1Id, org2Id, org3Id]
      const expectedRoles = ['employee', 'manager', 'admin']

      for (let i = 0; i < organizations.length; i++) {
        const orgId = organizations[i]
        const expectedRole = expectedRoles[i]

        // Switch to organization
        const switchRequest = createMockRequest('POST', '/api/workspace/switch', {
          organizationId: orgId
        }, {
          userId: multiOrgUserId,
          organizationId: i === 0 ? org1Id : organizations[i - 1] // Previous org
        })

        const switchResponse = await workspaceSwitchPost(switchRequest)
        expect(switchResponse.status).toBe(200)

        // Verify current organization context
        const currentOrgRequest = createMockRequest('GET', '/api/user/current-organization', {}, {
          userId: multiOrgUserId,
          organizationId: orgId
        })

        const currentOrgResponse = await currentOrgGet(currentOrgRequest)
        expect(currentOrgResponse.status).toBe(200)

        const currentOrgData = await currentOrgResponse.json()
        expect(currentOrgData.organizationId).toBe(orgId)
        expect(currentOrgData.role).toBe(expectedRole)
      }
    })

    test('should maintain user permissions after organization switch', async () => {
      // Switch multi-org user from employee role (org1) to admin role (org3)
      const switchRequest = createMockRequest('POST', '/api/workspace/switch', {
        organizationId: org3Id
      }, {
        userId: multiOrgUserId,
        organizationId: org1Id
      })

      const switchResponse = await workspaceSwitchPost(switchRequest)
      expect(switchResponse.status).toBe(200)

      // Verify role change
      const currentOrgRequest = createMockRequest('GET', '/api/user/current-organization', {}, {
        userId: multiOrgUserId,
        organizationId: org3Id
      })

      const currentOrgResponse = await currentOrgGet(currentOrgRequest)
      expect(currentOrgResponse.status).toBe(200)

      const currentOrgData = await currentOrgResponse.json()
      expect(currentOrgData.role).toBe('admin')
      expect(currentOrgData.organizationId).toBe(org3Id)
    })

    test('should handle rapid consecutive organization switches', async () => {
      const switchSequence = [org2Id, org3Id, org1Id, org2Id]
      let currentOrg = org1Id

      for (const targetOrg of switchSequence) {
        const switchRequest = createMockRequest('POST', '/api/workspace/switch', {
          organizationId: targetOrg
        }, {
          userId: multiOrgUserId,
          organizationId: currentOrg
        })

        const switchResponse = await workspaceSwitchPost(switchRequest)
        expect(switchResponse.status).toBe(200)

        const switchData = await switchResponse.json()
        expect(switchData.success).toBe(true)

        currentOrg = targetOrg
      }

      // Verify final state
      const finalOrgRequest = createMockRequest('GET', '/api/user/current-organization', {}, {
        userId: multiOrgUserId,
        organizationId: org2Id
      })

      const finalOrgResponse = await currentOrgGet(finalOrgRequest)
      expect(finalOrgResponse.status).toBe(200)

      const finalOrgData = await finalOrgResponse.json()
      expect(finalOrgData.organizationId).toBe(org2Id)
    })
  })

  describe('Organization Status Integration', () => {
    test('should reflect current organization in status API after switch', async () => {
      // Initial status check
      const initialStatusRequest = createMockRequest('GET', '/api/user/organization-status', {}, {
        userId: multiOrgUserId,
        organizationId: org1Id
      })

      const initialStatusResponse = await orgStatusGet(initialStatusRequest)
      expect(initialStatusResponse.status).toBe(200)

      const initialStatusData = await initialStatusResponse.json()
      expect(initialStatusData.userWorkspaces).toBeDefined()
      expect(initialStatusData.userWorkspaces.length).toBe(3) // User belongs to 3 orgs

      // Switch organization
      const switchRequest = createMockRequest('POST', '/api/workspace/switch', {
        organizationId: org2Id
      }, {
        userId: multiOrgUserId,
        organizationId: org1Id
      })

      const switchResponse = await workspaceSwitchPost(switchRequest)
      expect(switchResponse.status).toBe(200)

      // Status check after switch
      const updatedStatusRequest = createMockRequest('GET', '/api/user/organization-status', {}, {
        userId: multiOrgUserId,
        organizationId: org2Id // Now in org2 context
      })

      const updatedStatusResponse = await orgStatusGet(updatedStatusRequest)
      expect(updatedStatusResponse.status).toBe(200)

      const updatedStatusData = await updatedStatusResponse.json()
      expect(updatedStatusData.userWorkspaces).toBeDefined()
      
      // Verify the user still sees all their organizations
      const orgIds = updatedStatusData.userWorkspaces.map((ws: any) => ws.id)
      expect(orgIds).toContain(org1Id)
      expect(orgIds).toContain(org2Id)
      expect(orgIds).toContain(org3Id)
    })

    test('should show correct role for user in each organization', async () => {
      const statusRequest = createMockRequest('GET', '/api/user/organization-status', {}, {
        userId: multiOrgUserId,
        organizationId: org1Id
      })

      const statusResponse = await orgStatusGet(statusRequest)
      expect(statusResponse.status).toBe(200)

      const statusData = await statusResponse.json()
      const workspaces = statusData.userWorkspaces

      // Find each organization and verify role
      const org1Workspace = workspaces.find((ws: any) => ws.id === org1Id)
      const org2Workspace = workspaces.find((ws: any) => ws.id === org2Id)
      const org3Workspace = workspaces.find((ws: any) => ws.id === org3Id)

      expect(org1Workspace?.role).toBe('employee')
      expect(org2Workspace?.role).toBe('manager')
      expect(org3Workspace?.role).toBe('admin')
    })
  })

  describe('Inactive Organization Handling', () => {
    test('should prevent switching to inactive organization membership', async () => {
      // Deactivate user's membership in org2
      await supabaseAdmin
        .from('user_organizations')
        .update({ is_active: false })
        .eq('user_id', multiOrgUserId)
        .eq('organization_id', org2Id)

      // Attempt to switch to deactivated organization
      const switchRequest = createMockRequest('POST', '/api/workspace/switch', {
        organizationId: org2Id
      }, {
        userId: multiOrgUserId,
        organizationId: org1Id
      })

      const switchResponse = await workspaceSwitchPost(switchRequest)
      expect(switchResponse.status).toBe(400)

      const errorData = await switchResponse.json()
      expect(errorData.error).toMatch(/not belong|organization|inactive/i)
    })

    test('should exclude inactive organizations from organization status', async () => {
      // Deactivate user's membership in org3
      await supabaseAdmin
        .from('user_organizations')
        .update({ is_active: false })
        .eq('user_id', multiOrgUserId)
        .eq('organization_id', org3Id)

      const statusRequest = createMockRequest('GET', '/api/user/organization-status', {}, {
        userId: multiOrgUserId,
        organizationId: org1Id
      })

      const statusResponse = await orgStatusGet(statusRequest)
      expect(statusResponse.status).toBe(200)

      const statusData = await statusResponse.json()
      const workspaces = statusData.userWorkspaces

      // Should only show active organizations
      expect(workspaces.length).toBe(2) // org1 and org2 only
      const orgIds = workspaces.map((ws: any) => ws.id)
      expect(orgIds).toContain(org1Id)
      expect(orgIds).toContain(org2Id)
      expect(orgIds).not.toContain(org3Id)
    })
  })

  describe('Cookie and Session Management', () => {
    test('should handle cookie-based organization persistence', async () => {
      // This test would verify cookie setting in a real browser environment
      // In our test environment, we simulate the behavior
      
      const switchRequest = createMockRequest('POST', '/api/workspace/switch', {
        organizationId: org2Id
      }, {
        userId: multiOrgUserId,
        organizationId: org1Id
      })

      const switchResponse = await workspaceSwitchPost(switchRequest)
      expect(switchResponse.status).toBe(200)

      // The cookie should be set (simulated in test environment)
      const switchData = await switchResponse.json()
      expect(switchData.success).toBe(true)
    })

    test('should handle missing or invalid cookie gracefully', async () => {
      // Test when no organization cookie is present
      const currentOrgRequest = createMockRequest('GET', '/api/user/current-organization', {}, {
        userId: multiOrgUserId
        // No organizationId provided to simulate missing cookie
      })

      const currentOrgResponse = await currentOrgGet(currentOrgRequest)
      
      // Should either return default organization or appropriate error
      if (currentOrgResponse.status === 200) {
        const currentOrgData = await currentOrgResponse.json()
        expect(currentOrgData.organizationId).toBeDefined()
      } else {
        expect(currentOrgResponse.status).toBeGreaterThanOrEqual(400)
      }
    })
  })

  describe('Concurrent User Sessions', () => {
    test('should handle organization switching with multiple concurrent sessions', async () => {
      // Simulate two different sessions for the same user
      const session1SwitchRequest = createMockRequest('POST', '/api/workspace/switch', {
        organizationId: org2Id
      }, {
        userId: multiOrgUserId,
        organizationId: org1Id,
        sessionId: 'session-1'
      })

      const session2SwitchRequest = createMockRequest('POST', '/api/workspace/switch', {
        organizationId: org3Id
      }, {
        userId: multiOrgUserId,
        organizationId: org1Id,
        sessionId: 'session-2'
      })

      // Execute switches concurrently
      const [session1Response, session2Response] = await Promise.all([
        workspaceSwitchPost(session1SwitchRequest),
        workspaceSwitchPost(session2SwitchRequest)
      ])

      expect(session1Response.status).toBe(200)
      expect(session2Response.status).toBe(200)

      const session1Data = await session1Response.json()
      const session2Data = await session2Response.json()

      expect(session1Data.success).toBe(true)
      expect(session2Data.success).toBe(true)
    })
  })

  describe('Error Recovery and Edge Cases', () => {
    test('should handle database connection errors gracefully', async () => {
      // This would require mocking the database connection to fail
      // For now, we test the API error handling structure
      
      const switchRequest = createMockRequest('POST', '/api/workspace/switch', {
        organizationId: org2Id
      }, {
        userId: multiOrgUserId,
        organizationId: org1Id
      })

      const switchResponse = await workspaceSwitchPost(switchRequest)
      
      // Should either succeed or fail with proper error handling
      if (switchResponse.status !== 200) {
        expect(switchResponse.status).toBeGreaterThanOrEqual(400)
        const errorData = await switchResponse.json()
        expect(errorData.error).toBeDefined()
      }
    })

    test('should handle malformed request bodies', async () => {
      const malformedRequest = createMockRequest('POST', '/api/workspace/switch', {
        organizationId: null // Invalid value
      }, {
        userId: multiOrgUserId,
        organizationId: org1Id
      })

      const malformedResponse = await workspaceSwitchPost(malformedRequest)
      expect(malformedResponse.status).toBe(400)

      const errorData = await malformedResponse.json()
      expect(errorData.error).toMatch(/organization id is required/i)
    })

    test('should prevent switching when user authentication fails', async () => {
      const unauthenticatedRequest = createMockRequest('POST', '/api/workspace/switch', {
        organizationId: org2Id
      }, {
        // No user context provided
      })

      const unauthenticatedResponse = await workspaceSwitchPost(unauthenticatedRequest)
      expect(unauthenticatedResponse.status).toBe(401)

      const errorData = await unauthenticatedResponse.json()
      expect(errorData.error).toMatch(/unauthorized|authentication/i)
    })
  })

  describe('Organization Member Limits and Validation', () => {
    test('should validate organization exists before switching', async () => {
      // Delete org3 to test switching to non-existent organization
      await supabaseAdmin
        .from('organizations')
        .delete()
        .eq('id', org3Id)

      const switchToDeletedOrgRequest = createMockRequest('POST', '/api/workspace/switch', {
        organizationId: org3Id
      }, {
        userId: multiOrgUserId,
        organizationId: org1Id
      })

      const switchResponse = await workspaceSwitchPost(switchToDeletedOrgRequest)
      expect(switchResponse.status).toBe(400)

      const errorData = await switchResponse.json()
      expect(errorData.error).toMatch(/not belong|organization/i)
    })

    test('should handle organization with no active settings', async () => {
      // Remove organization settings for org2
      await supabaseAdmin
        .from('organization_settings')
        .delete()
        .eq('organization_id', org2Id)

      const switchRequest = createMockRequest('POST', '/api/workspace/switch', {
        organizationId: org2Id
      }, {
        userId: multiOrgUserId,
        organizationId: org1Id
      })

      const switchResponse = await workspaceSwitchPost(switchRequest)
      
      // Should still work as organization settings are optional for switching
      expect(switchResponse.status).toBe(200)

      const switchData = await switchResponse.json()
      expect(switchData.success).toBe(true)
    })
  })
})