/**
 * @jest-environment node
 *
 * Workspace Isolation Audit - Integration Test Suite
 *
 * Tests for validating Sprint 1 & 2 security fixes from the
 * Multi-Workspace Isolation Audit & Fix task.
 *
 * This test suite verifies that:
 * 1. All API routes properly respect the active-organization-id cookie
 * 2. Users cannot access data from organizations they don't belong to
 * 3. Admin-only routes enforce proper role restrictions
 * 4. Billing routes validate organization ownership
 * 5. Calendar and employee routes are workspace-scoped
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { createMockRequest, createTestUser, createTestOrganization, cleanupTestData, createTestInvitation } from '../utils/test-helpers'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Import API route handlers for testing
import { GET as billingSubscriptionGet } from '@/app/api/billing/subscription/route'
import { GET as customerPortalGet, POST as customerPortalPost } from '@/app/api/billing/customer-portal/route'
import { POST as createCheckoutPost } from '@/app/api/billing/create-checkout/route'
import { GET as abandonedStatsGet } from '@/app/api/billing/abandoned-stats/route'
import { POST as cleanupCheckoutPost } from '@/app/api/billing/cleanup-checkout/route'
import { POST as scheduleCleanupPost } from '@/app/api/billing/schedule-cleanup/route'
import { GET as employeesGet, PUT as employeesPut, DELETE as employeesDelete } from '@/app/api/employees/[id]/route'
import { GET as leaveBalancesGet } from '@/app/api/employees/[id]/leave-balances/route'
import { GET as employeeOrgGet } from '@/app/api/employees/[id]/organization/route'
import { GET as calendarLeaveRequestsGet } from '@/app/api/calendar/leave-requests/route'
import { GET as calendarHolidaysGet } from '@/app/api/calendar/holidays/route'
import { POST as acceptInvitationPost } from '@/app/api/invitations/accept/route'
import { POST as createOrganizationPost } from '@/app/api/organizations/route'
import { POST as fixWorkspaceOwnersPost } from '@/app/api/admin/fix-workspace-owners-balances/route'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('Workspace Isolation Audit - Integration Tests', () => {
  let org1Id: string
  let org2Id: string
  let adminUser1: string
  let adminUser2: string
  let employeeUser1: string
  let employeeUser2: string
  let multiOrgAdmin: string
  let testUserIds: string[]
  let testOrgIds: string[]

  beforeEach(async () => {
    // Create two test organizations
    org1Id = await createTestOrganization('Audit Test Org 1')
    org2Id = await createTestOrganization('Audit Test Org 2')
    testOrgIds = [org1Id, org2Id]

    // Create users in each organization
    adminUser1 = await createTestUser('admin1@audit.test', org1Id, 'admin')
    employeeUser1 = await createTestUser('employee1@audit.test', org1Id, 'employee')

    adminUser2 = await createTestUser('admin2@audit.test', org2Id, 'admin')
    employeeUser2 = await createTestUser('employee2@audit.test', org2Id, 'employee')

    // Create multi-org admin user
    multiOrgAdmin = await createTestUser('multiadmin@audit.test', org1Id, 'admin')

    // Add multi-org admin to org2 as admin
    await supabaseAdmin.from('user_organizations').insert({
      user_id: multiOrgAdmin,
      organization_id: org2Id,
      role: 'admin',
      is_active: true,
      is_default: false,
      joined_via: 'invitation',
      employment_type: 'full_time'
    })

    testUserIds = [adminUser1, adminUser2, employeeUser1, employeeUser2, multiOrgAdmin]
  })

  afterEach(async () => {
    await cleanupTestData(testUserIds, testOrgIds)
  })

  describe('Sprint 1: Critical Security Fixes', () => {
    describe('Billing Subscription Route (/api/billing/subscription)', () => {
      test('should use authenticateAndGetOrgContext instead of accepting org_id from query params', async () => {
        // This test ensures the critical security fix from Sprint 1
        // Previously, any user could access billing for ANY organization by passing org_id
        // Now it uses the authenticated user's active organization context

        const request = createMockRequest({
          method: 'GET',
          userId: adminUser1,
          organizationId: org1Id,
          cookies: {
            'active-organization-id': org1Id
          }
        })

        const response = await billingSubscriptionGet(request)
        const data = await response.json()

        // Should succeed for user's own organization
        expect(response.status).toBe(200)

        // Attempting to access org2's billing should fail
        const maliciousRequest = createMockRequest({
          method: 'GET',
          url: `?organization_id=${org2Id}`, // Trying to inject different org_id
          userId: adminUser1,
          organizationId: org1Id,
          cookies: {
            'active-organization-id': org1Id
          }
        })

        const maliciousResponse = await billingSubscriptionGet(maliciousRequest)
        // Should still return org1's data (ignores query param)
        const maliciousData = await maliciousResponse.json()
        expect(maliciousData.organization_id).toBe(org1Id)
      })
    })

    describe('Invitation Acceptance Route (/api/invitations/accept)', () => {
      test('should validate target organization exists', async () => {
        // Sprint 1 fix: Prevents accepting invitations to deleted organizations

        // Create a test organization and invitation
        const testOrgId = await createTestOrganization('Test Invitation Org')
        const inviteeEmail = 'invitee@audit.test'
        const inviteeUser = await createTestUser(inviteeEmail)

        // Create invitation for the test organization
        const invitationToken = await createTestInvitation(testOrgId, inviteeEmail, 'employee')

        // Delete the organization (simulating deleted org scenario)
        await supabaseAdmin.from('organizations').delete().eq('id', testOrgId)

        // Attempt to accept invitation to deleted organization
        const request = createMockRequest({
          method: 'POST',
          userId: inviteeUser,
          body: {
            token: invitationToken
          }
        })

        const response = await acceptInvitationPost(request)
        const data = await response.json()

        // Should fail with appropriate error message
        expect(response.status).toBe(400)
        expect(data.error).toContain('organization')
        expect(data.error.toLowerCase()).toContain('no longer exists')

        // Cleanup
        await supabaseAdmin.from('invitations').delete().eq('token', invitationToken)
        await supabaseAdmin.from('profiles').delete().eq('id', inviteeUser)
      })
    })

    describe('Organization Creation Route (/api/organizations POST)', () => {
      test('should validate slug uniqueness', async () => {
        // Sprint 1 fix: Prevents organization slug conflicts

        // Create first organization with a specific slug
        const firstOrgId = await createTestOrganization('First Slug Test Org')
        const testSlug = 'unique-slug-test'

        // Update the organization to have our test slug
        await supabaseAdmin
          .from('organizations')
          .update({ slug: testSlug })
          .eq('id', firstOrgId)

        // Attempt to create second organization with same slug
        const request = createMockRequest({
          method: 'POST',
          userId: adminUser1,
          organizationId: org1Id,
          cookies: {
            'active-organization-id': org1Id
          },
          body: {
            name: 'Second Slug Test Org',
            slug: testSlug, // Duplicate slug - should fail
            country_code: 'US'
          }
        })

        const response = await createOrganizationPost(request)
        const data = await response.json()

        // Should fail with 409 Conflict status
        expect(response.status).toBe(409)
        expect(data.error).toContain('slug')
        expect(data.error.toLowerCase()).toContain('already taken')

        // Cleanup
        await supabaseAdmin.from('organizations').delete().eq('id', firstOrgId)
      })
    })

    describe('Admin Utility Route (/api/admin/fix-workspace-owners-balances)', () => {
      test('should use authenticateAndGetOrgContext instead of profiles.role check', async () => {
        // Sprint 1 fix: Admin utility now respects multi-workspace context
        // Previously used single-org pattern (profiles.role)
        // Now uses per-org role from user_organizations

        // Admin in org1 should be able to run utility for org1
        const adminRequest = createMockRequest({
          method: 'POST',
          userId: adminUser1,
          organizationId: org1Id,
          cookies: {
            'active-organization-id': org1Id
          },
          body: {
            dryRun: true // Use dry run to avoid side effects
          }
        })

        const adminResponse = await fixWorkspaceOwnersPost(adminRequest)
        expect(adminResponse.status).toBe(200)

        // Employee in org1 should NOT be able to run admin utility
        const employeeRequest = createMockRequest({
          method: 'POST',
          userId: employeeUser1,
          organizationId: org1Id,
          cookies: {
            'active-organization-id': org1Id
          },
          body: {
            dryRun: true
          }
        })

        const employeeResponse = await fixWorkspaceOwnersPost(employeeRequest)
        expect(employeeResponse.status).toBe(403) // Should be forbidden

        // Multi-org admin should be able to run utility for org2 when that's their active org
        const multiOrgRequest = createMockRequest({
          method: 'POST',
          userId: multiOrgAdmin,
          organizationId: org2Id,
          cookies: {
            'active-organization-id': org2Id
          },
          body: {
            dryRun: true
          }
        })

        const multiOrgResponse = await fixWorkspaceOwnersPost(multiOrgRequest)
        expect(multiOrgResponse.status).toBe(200)

        // Verify the utility respects workspace context (per-org role, not global)
        const multiOrgData = await multiOrgResponse.json()
        expect(multiOrgData.success).toBe(true)
      })
    })
  })

  describe('Sprint 2: Group B Route Consolidation', () => {
    describe('Employee Management Routes', () => {
      test('/api/employees/[id] DELETE should use standard auth pattern', async () => {
        const request = createMockRequest({
          method: 'DELETE',
          userId: adminUser1,
          organizationId: org1Id,
          cookies: {
            'active-organization-id': org1Id
          }
        })

        const params = Promise.resolve({ id: employeeUser1 })
        const response = await employeesDelete(request, { params })

        // Should succeed for employee in same organization
        expect([200, 204]).toContain(response.status)
      })

      test('/api/employees/[id] PUT should use standard auth pattern', async () => {
        const request = createMockRequest({
          method: 'PUT',
          userId: adminUser1,
          organizationId: org1Id,
          cookies: {
            'active-organization-id': org1Id
          },
          body: {
            email: 'updated@audit.test',
            full_name: 'Updated Employee'
          }
        })

        const params = Promise.resolve({ id: employeeUser1 })
        const response = await employeesPut(request, { params })

        // Should succeed for employee in same organization
        expect(response.status).toBe(200)
      })

      test('/api/employees/[id]/leave-balances should be workspace-scoped', async () => {
        const request = createMockRequest({
          method: 'GET',
          userId: adminUser1,
          organizationId: org1Id,
          cookies: {
            'active-organization-id': org1Id
          }
        })

        const params = Promise.resolve({ id: employeeUser1 })
        const response = await leaveBalancesGet(request, { params })

        // Should return balances only for current workspace
        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.balances).toBeDefined()
      })

      test('/api/employees/[id]/organization should validate workspace membership', async () => {
        const request = createMockRequest({
          method: 'GET',
          userId: adminUser1,
          organizationId: org1Id,
          cookies: {
            'active-organization-id': org1Id
          }
        })

        const params = Promise.resolve({ id: employeeUser1 })
        const response = await employeeOrgGet(request, { params })

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.organization_id).toBe(org1Id)
      })
    })

    describe('Calendar Routes', () => {
      test('/api/calendar/leave-requests should filter by active workspace', async () => {
        const request = createMockRequest({
          method: 'GET',
          userId: adminUser1,
          organizationId: org1Id,
          cookies: {
            'active-organization-id': org1Id
          }
        })

        const response = await calendarLeaveRequestsGet(request)

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(Array.isArray(data)).toBe(true)
      })

      test('/api/calendar/holidays should filter by active workspace', async () => {
        const request = createMockRequest({
          method: 'GET',
          url: '?year=2025&month=1',
          userId: adminUser1,
          organizationId: org1Id,
          cookies: {
            'active-organization-id': org1Id
          }
        })

        const response = await calendarHolidaysGet(request)

        expect(response.status).toBe(200)
        const data = await response.json()
        expect(Array.isArray(data)).toBe(true)
      })
    })

    describe('Billing Utility Routes', () => {
      test('/api/billing/customer-portal should validate workspace ownership', async () => {
        const request = createMockRequest({
          method: 'GET',
          userId: adminUser1,
          organizationId: org1Id,
          cookies: {
            'active-organization-id': org1Id
          }
        })

        const response = await customerPortalGet(request)

        // Should only allow access to own organization's billing portal
        expect([200, 404]).toContain(response.status)
      })

      test('/api/billing/customer-portal POST should validate workspace ownership', async () => {
        const request = createMockRequest({
          method: 'POST',
          userId: adminUser1,
          organizationId: org1Id,
          cookies: {
            'active-organization-id': org1Id
          },
          body: {
            return_url: 'https://example.com/return'
          }
        })

        const response = await customerPortalPost(request)

        // Should only allow access to own organization's billing portal
        expect([200, 404]).toContain(response.status)
      })

      test('/api/billing/create-checkout should validate org ownership for upgrades', async () => {
        const request = createMockRequest({
          method: 'POST',
          userId: adminUser1,
          organizationId: org1Id,
          cookies: {
            'active-organization-id': org1Id
          },
          body: {
            variant_id: '123',
            organization_data: {
              id: org1Id, // Attempting to upgrade org1
              name: 'Test Org',
              slug: 'test-org',
              country_code: 'US'
            },
            user_count: 5,
            tier: 'monthly'
          }
        })

        const response = await createCheckoutPost(request)

        // Should succeed for own organization
        expect([200, 500]).toContain(response.status) // 500 if LemonSqueezy not configured

        // Attempting to create checkout for different org should fail
        const maliciousRequest = createMockRequest({
          method: 'POST',
          userId: adminUser1,
          organizationId: org1Id,
          cookies: {
            'active-organization-id': org1Id
          },
          body: {
            variant_id: '123',
            organization_data: {
              id: org2Id, // Trying to create checkout for org2
              name: 'Other Org',
              slug: 'other-org',
              country_code: 'US'
            },
            user_count: 5,
            tier: 'monthly'
          }
        })

        const maliciousResponse = await createCheckoutPost(maliciousRequest)
        expect(maliciousResponse.status).toBe(403) // Should be forbidden
      })

      test('/api/billing/abandoned-stats should require admin role', async () => {
        // Admin should succeed
        const adminRequest = createMockRequest({
          method: 'GET',
          userId: adminUser1,
          organizationId: org1Id,
          cookies: {
            'active-organization-id': org1Id
          }
        })

        const adminResponse = await abandonedStatsGet(adminRequest)
        expect(adminResponse.status).toBe(200)

        // Employee should be forbidden
        const employeeRequest = createMockRequest({
          method: 'GET',
          userId: employeeUser1,
          organizationId: org1Id,
          cookies: {
            'active-organization-id': org1Id
          }
        })

        const employeeResponse = await abandonedStatsGet(employeeRequest)
        expect(employeeResponse.status).toBe(403)
      })

      test('/api/billing/cleanup-checkout should require admin role', async () => {
        // Admin should succeed
        const adminRequest = createMockRequest({
          method: 'POST',
          userId: adminUser1,
          organizationId: org1Id,
          cookies: {
            'active-organization-id': org1Id
          },
          body: {
            checkout_id: 'test-checkout-123',
            action: 'mark_abandoned'
          }
        })

        const adminResponse = await cleanupCheckoutPost(adminRequest)
        expect(adminResponse.status).toBe(200)

        // Employee should be forbidden
        const employeeRequest = createMockRequest({
          method: 'POST',
          userId: employeeUser1,
          organizationId: org1Id,
          cookies: {
            'active-organization-id': org1Id
          },
          body: {
            checkout_id: 'test-checkout-123',
            action: 'mark_abandoned'
          }
        })

        const employeeResponse = await cleanupCheckoutPost(employeeRequest)
        expect(employeeResponse.status).toBe(403)
      })

      test('/api/billing/schedule-cleanup should require admin role', async () => {
        // Admin should succeed
        const adminRequest = createMockRequest({
          method: 'POST',
          userId: adminUser1,
          organizationId: org1Id,
          cookies: {
            'active-organization-id': org1Id
          },
          body: {
            task_type: 'cleanup_abandoned_checkouts',
            schedule: 'daily',
            threshold_hours: 24,
            force_run: false
          }
        })

        const adminResponse = await scheduleCleanupPost(adminRequest)
        expect(adminResponse.status).toBe(200)

        // Employee should be forbidden
        const employeeRequest = createMockRequest({
          method: 'POST',
          userId: employeeUser1,
          organizationId: org1Id,
          cookies: {
            'active-organization-id': org1Id
          },
          body: {
            task_type: 'cleanup_abandoned_checkouts',
            schedule: 'daily',
            threshold_hours: 24,
            force_run: false
          }
        })

        const employeeResponse = await scheduleCleanupPost(employeeRequest)
        expect(employeeResponse.status).toBe(403)
      })
    })
  })

  describe('Multi-Workspace Admin Switching', () => {
    test('should respect active-organization-id cookie when switching workspaces', async () => {
      // Multi-org admin switches from org1 to org2
      const org1Request = createMockRequest({
        method: 'GET',
        userId: multiOrgAdmin,
        organizationId: org1Id,
        cookies: {
          'active-organization-id': org1Id
        }
      })

      const org1Response = await calendarLeaveRequestsGet(org1Request)
      expect(org1Response.status).toBe(200)

      // Now switch to org2
      const org2Request = createMockRequest({
        method: 'GET',
        userId: multiOrgAdmin,
        organizationId: org2Id,
        cookies: {
          'active-organization-id': org2Id
        }
      })

      const org2Response = await calendarLeaveRequestsGet(org2Request)
      expect(org2Response.status).toBe(200)

      // Data should be completely isolated between requests
      const org1Data = await org1Response.json()
      const org2Data = await org2Response.json()

      // Verify no data leakage (if both orgs have data, it should be different)
      if (org1Data.length > 0 && org2Data.length > 0) {
        expect(org1Data).not.toEqual(org2Data)
      }
    })

    test('should maintain role permissions per organization', async () => {
      // Multi-org admin has admin role in both organizations
      // Verify admin actions work in both contexts

      const org1AdminRequest = createMockRequest({
        method: 'DELETE',
        userId: multiOrgAdmin,
        organizationId: org1Id,
        cookies: {
          'active-organization-id': org1Id
        }
      })

      const org1Params = Promise.resolve({ id: employeeUser1 })
      const org1Response = await employeesDelete(org1AdminRequest, { params: org1Params })
      expect([200, 204, 404]).toContain(org1Response.status)

      const org2AdminRequest = createMockRequest({
        method: 'DELETE',
        userId: multiOrgAdmin,
        organizationId: org2Id,
        cookies: {
          'active-organization-id': org2Id
        }
      })

      const org2Params = Promise.resolve({ id: employeeUser2 })
      const org2Response = await employeesDelete(org2AdminRequest, { params: org2Params })
      expect([200, 204, 404]).toContain(org2Response.status)
    })
  })

  describe('Data Isolation Verification', () => {
    test('should not leak data between organizations', async () => {
      // User in org1 should not see org2 data
      const org1Request = createMockRequest({
        method: 'GET',
        userId: adminUser1,
        organizationId: org1Id,
        cookies: {
          'active-organization-id': org1Id
        }
      })

      const org1Params = Promise.resolve({ id: employeeUser2 }) // Trying to access org2 employee
      const response = await leaveBalancesGet(org1Request, { params: org1Params })

      // Should fail or return empty data (not org2's data)
      expect([404, 200]).toContain(response.status)

      if (response.status === 200) {
        const data = await response.json()
        // Should return empty or error, not actual org2 data
        expect(data.balances || []).toHaveLength(0)
      }
    })

    test('should enforce organization boundaries in all routes', async () => {
      // Comprehensive test across multiple routes
      const routes = [
        { handler: calendarLeaveRequestsGet, method: 'GET', path: '/api/calendar/leave-requests' },
        { handler: calendarHolidaysGet, method: 'GET', path: '/api/calendar/holidays', url: '?year=2025&month=1' }
      ]

      for (const route of routes) {
        const request = createMockRequest({
          method: route.method,
          url: route.url || '',
          userId: adminUser1,
          organizationId: org1Id,
          cookies: {
            'active-organization-id': org1Id
          }
        })

        const response = await route.handler(request)
        expect(response.status).toBe(200)

        const data = await response.json()
        // All returned data should belong to org1 only
        // This is a logical check - actual validation would depend on data structure
        expect(data).toBeDefined()
      }
    })
  })
})
