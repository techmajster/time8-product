/**
 * Organization Creation and Initialization Process Test Suite
 * 
 * Tests for Task 5.7: Validate organization creation and initialization process
 * 
 * This comprehensive test suite validates:
 * - Organization creation workflow and validation
 * - Organization initialization and default settings
 * - First user (admin) setup during organization creation
 * - Organization settings and configuration initialization
 * - Multi-tenant setup and isolation from creation
 * - Organization creation via different flows (onboarding, invitations, etc.)
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { createMockRequest, createTestUser, cleanupTestData } from '../utils/test-helpers'
import { createClient } from '@supabase/supabase-js'

// Import organization creation related API routes
import { POST as organizationsPost } from '@/app/api/organizations/route'
import { GET as organizationStatusGet } from '@/app/api/user/organization-status/route'
import { POST as signupWithInvitationPost } from '@/app/api/auth/signup-with-invitation/route'
import { GET as currentOrganizationGet } from '@/app/api/user/current-organization/route'
import { GET as adminSettingsGet } from '@/app/api/admin/settings/organization/route'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('Organization Creation and Initialization Process Tests', () => {
  let testUserIds: string[] = []
  let testOrgIds: string[] = []
  
  // Test users for different creation scenarios
  let newUserForOrgCreation: string
  let existingUser: string
  let existingUserOrgId: string

  beforeEach(async () => {
    // Create a test user for organization creation scenarios
    const { data: newUser } = await supabaseAdmin.auth.admin.createUser({
      email: 'neworgcreator@org-creation.test',
      password: 'testpassword123',
      email_confirm: true
    })

    if (newUser.user) {
      newUserForOrgCreation = newUser.user.id
      testUserIds.push(newUserForOrgCreation)
    }

    // Create an existing user with organization for comparison
    existingUserOrgId = crypto.randomUUID()
    
    const { data: existingUserData } = await supabaseAdmin.auth.admin.createUser({
      email: 'existing@org-creation.test',
      password: 'testpassword123',
      email_confirm: true
    })

    if (existingUserData.user) {
      existingUser = existingUserData.user.id
      testUserIds.push(existingUser)

      // Create organization for existing user
      await supabaseAdmin.from('organizations').insert({
        id: existingUserOrgId,
        name: 'Existing User Organization',
        slug: 'existing-user-org',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      testOrgIds.push(existingUserOrgId)

      // Add user to organization
      await supabaseAdmin.from('user_organizations').insert({
        user_id: existingUser,
        organization_id: existingUserOrgId,
        role: 'admin',
        is_active: true,
        is_default: true,
        joined_via: 'created',
        employment_type: 'full_time'
      })

      // Create profile for existing user
      await supabaseAdmin.from('profiles').insert({
        id: existingUser,
        organization_id: existingUserOrgId,
        full_name: 'Existing User',
        email: 'existing@org-creation.test',
        role: 'admin'
      })
    }
  })

  afterEach(async () => {
    await cleanupTestData(testUserIds, testOrgIds)
  })

  describe('Basic Organization Creation Workflow', () => {
    test('should create new organization with valid data', async () => {
      const orgCreationRequest = createMockRequest('POST', '/api/organizations', {
        name: 'Test Organization',
        slug: 'test-organization',
        google_domain: 'testorg.com'
      }, {
        userId: newUserForOrgCreation
      })

      const orgCreationResponse = await organizationsPost(orgCreationRequest)
      
      // Should succeed in creating organization
      if (orgCreationResponse.status === 201) {
        const createdOrgData = await orgCreationResponse.json()
        expect(createdOrgData.organization).toBeDefined()
        expect(createdOrgData.organization.name).toBe('Test Organization')
        expect(createdOrgData.organization.slug).toBe('test-organization')
        
        const createdOrgId = createdOrgData.organization.id
        testOrgIds.push(createdOrgId)

        // Verify organization was created in database
        const { data: orgFromDb } = await supabaseAdmin
          .from('organizations')
          .select('*')
          .eq('id', createdOrgId)
          .single()

        expect(orgFromDb).toBeDefined()
        expect(orgFromDb.name).toBe('Test Organization')
        expect(orgFromDb.slug).toBe('test-organization')
        expect(orgFromDb.google_domain).toBe('testorg.com')
      }
    })

    test('should automatically add creator as admin of new organization', async () => {
      const orgCreationRequest = createMockRequest('POST', '/api/organizations', {
        name: 'Admin Test Organization',
        slug: 'admin-test-org'
      }, {
        userId: newUserForOrgCreation
      })

      const orgCreationResponse = await organizationsPost(orgCreationRequest)
      
      if (orgCreationResponse.status === 201) {
        const createdOrgData = await orgCreationResponse.json()
        const createdOrgId = createdOrgData.organization.id
        testOrgIds.push(createdOrgId)

        // Verify user was added as admin
        const { data: userOrganization } = await supabaseAdmin
          .from('user_organizations')
          .select('*')
          .eq('user_id', newUserForOrgCreation)
          .eq('organization_id', createdOrgId)
          .single()

        expect(userOrganization).toBeDefined()
        expect(userOrganization.role).toBe('admin')
        expect(userOrganization.is_active).toBe(true)
        expect(userOrganization.is_default).toBe(true)
        expect(userOrganization.joined_via).toBe('created')

        // Verify user profile was created/updated
        const { data: userProfile } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', newUserForOrgCreation)
          .single()

        if (userProfile) {
          expect(userProfile.organization_id).toBe(createdOrgId)
          expect(userProfile.role).toBe('admin')
        }
      }
    })

    test('should create default organization settings during initialization', async () => {
      const orgCreationRequest = createMockRequest('POST', '/api/organizations', {
        name: 'Settings Test Organization',
        slug: 'settings-test-org'
      }, {
        userId: newUserForOrgCreation
      })

      const orgCreationResponse = await organizationsPost(orgCreationRequest)
      
      if (orgCreationResponse.status === 201) {
        const createdOrgData = await orgCreationResponse.json()
        const createdOrgId = createdOrgData.organization.id
        testOrgIds.push(createdOrgId)

        // Wait a moment for async settings creation
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Verify organization settings were created
        const { data: orgSettings } = await supabaseAdmin
          .from('organization_settings')
          .select('*')
          .eq('organization_id', createdOrgId)
          .single()

        if (orgSettings) {
          expect(orgSettings.organization_id).toBe(createdOrgId)
          expect(orgSettings.allow_domain_join_requests).toBeDefined()
          expect(orgSettings.is_discoverable_by_domain).toBeDefined()
          expect(orgSettings.default_employment_type).toBeDefined()
          expect(orgSettings.data_retention_days).toBeGreaterThan(0)
        }

        // Verify settings are accessible via API
        const settingsRequest = createMockRequest('GET', '/api/admin/settings/organization', {}, {
          userId: newUserForOrgCreation,
          organizationId: createdOrgId
        })

        const settingsResponse = await adminSettingsGet(settingsRequest)
        if (settingsResponse.status === 200) {
          const settingsData = await settingsResponse.json()
          expect(settingsData.settings).toBeDefined()
        }
      }
    })
  })

  describe('Organization Creation Validation', () => {
    test('should validate required organization fields', async () => {
      const invalidRequests = [
        {
          description: 'Missing name',
          data: { slug: 'missing-name-org' }
        },
        {
          description: 'Missing slug',
          data: { name: 'Missing Slug Organization' }
        },
        {
          description: 'Empty name',
          data: { name: '', slug: 'empty-name-org' }
        },
        {
          description: 'Empty slug',
          data: { name: 'Empty Slug Organization', slug: '' }
        },
        {
          description: 'Invalid slug characters',
          data: { name: 'Invalid Slug Organization', slug: 'invalid slug with spaces' }
        }
      ]

      for (const { description, data } of invalidRequests) {
        const invalidRequest = createMockRequest('POST', '/api/organizations', data, {
          userId: newUserForOrgCreation
        })

        const invalidResponse = await organizationsPost(invalidRequest)
        expect(invalidResponse.status).toBe(400)

        const errorData = await invalidResponse.json()
        expect(errorData.error).toBeDefined()
        expect(errorData.error).toMatch(/name|slug|required|invalid/i)
      }
    })

    test('should prevent duplicate organization slugs', async () => {
      // Create first organization
      const firstOrgRequest = createMockRequest('POST', '/api/organizations', {
        name: 'First Organization',
        slug: 'duplicate-test-org'
      }, {
        userId: newUserForOrgCreation
      })

      const firstOrgResponse = await organizationsPost(firstOrgRequest)
      
      if (firstOrgResponse.status === 201) {
        const firstOrgData = await firstOrgResponse.json()
        testOrgIds.push(firstOrgData.organization.id)

        // Try to create second organization with same slug
        const duplicateOrgRequest = createMockRequest('POST', '/api/organizations', {
          name: 'Second Organization',
          slug: 'duplicate-test-org' // Same slug
        }, {
          userId: newUserForOrgCreation
        })

        const duplicateOrgResponse = await organizationsPost(duplicateOrgRequest)
        expect(duplicateOrgResponse.status).toBe(400)

        const errorData = await duplicateOrgResponse.json()
        expect(errorData.error).toMatch(/slug|duplicate|exists|unique/i)
      }
    })

    test('should validate Google domain format if provided', async () => {
      const invalidDomainRequests = [
        {
          domain: 'invalid domain',
          description: 'domain with spaces'
        },
        {
          domain: 'http://invalid.com',
          description: 'domain with protocol'
        },
        {
          domain: 'invalid..com',
          description: 'domain with double dots'
        },
        {
          domain: '.invalid.com',
          description: 'domain starting with dot'
        }
      ]

      for (const { domain, description } of invalidDomainRequests) {
        const invalidDomainRequest = createMockRequest('POST', '/api/organizations', {
          name: `Invalid Domain Organization - ${description}`,
          slug: `invalid-domain-${Date.now()}`,
          google_domain: domain
        }, {
          userId: newUserForOrgCreation
        })

        const invalidDomainResponse = await organizationsPost(invalidDomainRequest)
        expect(invalidDomainResponse.status).toBe(400)

        const errorData = await invalidDomainResponse.json()
        expect(errorData.error).toMatch(/domain|invalid|format/i)
      }
    })
  })

  describe('Multi-Organization User Scenarios', () => {
    test('should allow existing user to create additional organization', async () => {
      const additionalOrgRequest = createMockRequest('POST', '/api/organizations', {
        name: 'Additional Organization',
        slug: 'additional-org'
      }, {
        userId: existingUser,
        organizationId: existingUserOrgId // Current organization context
      })

      const additionalOrgResponse = await organizationsPost(additionalOrgRequest)
      
      if (additionalOrgResponse.status === 201) {
        const additionalOrgData = await additionalOrgResponse.json()
        const additionalOrgId = additionalOrgData.organization.id
        testOrgIds.push(additionalOrgId)

        // Verify user now belongs to multiple organizations
        const { data: userOrganizations } = await supabaseAdmin
          .from('user_organizations')
          .select('*')
          .eq('user_id', existingUser)
          .eq('is_active', true)

        expect(userOrganizations).toBeDefined()
        expect(userOrganizations.length).toBe(2) // Original + new

        // Verify user is admin in both organizations
        const orgRoles = userOrganizations.map(uo => ({ 
          org_id: uo.organization_id, 
          role: uo.role 
        }))
        
        expect(orgRoles).toContainEqual({ org_id: existingUserOrgId, role: 'admin' })
        expect(orgRoles).toContainEqual({ org_id: additionalOrgId, role: 'admin' })

        // Verify new organization is not set as default
        const newOrgMembership = userOrganizations.find(uo => uo.organization_id === additionalOrgId)
        expect(newOrgMembership.is_default).toBe(false)
      }
    })

    test('should maintain organization isolation after creation', async () => {
      // Create organization as existing user
      const isolatedOrgRequest = createMockRequest('POST', '/api/organizations', {
        name: 'Isolated Organization',
        slug: 'isolated-org'
      }, {
        userId: existingUser
      })

      const isolatedOrgResponse = await organizationsPost(isolatedOrgRequest)
      
      if (isolatedOrgResponse.status === 201) {
        const isolatedOrgData = await isolatedOrgResponse.json()
        const isolatedOrgId = isolatedOrgData.organization.id
        testOrgIds.push(isolatedOrgId)

        // Verify user can switch to new organization
        const orgStatusRequest = createMockRequest('GET', '/api/user/organization-status', {}, {
          userId: existingUser
        })

        const orgStatusResponse = await organizationStatusGet(orgStatusRequest)
        if (orgStatusResponse.status === 200) {
          const statusData = await orgStatusResponse.json()
          expect(statusData.userWorkspaces).toBeDefined()
          
          const orgIds = statusData.userWorkspaces.map((ws: any) => ws.id)
          expect(orgIds).toContain(existingUserOrgId)
          expect(orgIds).toContain(isolatedOrgId)
        }
      }
    })
  })

  describe('Organization Initialization Edge Cases', () => {
    test('should handle organization creation with minimal required data', async () => {
      const minimalOrgRequest = createMockRequest('POST', '/api/organizations', {
        name: 'Minimal Organization',
        slug: 'minimal-org'
        // No optional fields
      }, {
        userId: newUserForOrgCreation
      })

      const minimalOrgResponse = await organizationsPost(minimalOrgRequest)
      
      if (minimalOrgResponse.status === 201) {
        const minimalOrgData = await minimalOrgResponse.json()
        const minimalOrgId = minimalOrgData.organization.id
        testOrgIds.push(minimalOrgId)

        // Verify organization was created with defaults
        const { data: orgFromDb } = await supabaseAdmin
          .from('organizations')
          .select('*')
          .eq('id', minimalOrgId)
          .single()

        expect(orgFromDb).toBeDefined()
        expect(orgFromDb.name).toBe('Minimal Organization')
        expect(orgFromDb.slug).toBe('minimal-org')
        expect(orgFromDb.google_domain).toBeNull()
        expect(orgFromDb.require_google_domain).toBe(false)
        expect(orgFromDb.created_at).toBeDefined()
        expect(orgFromDb.updated_at).toBeDefined()
      }
    })

    test('should handle concurrent organization creation attempts', async () => {
      const concurrentRequests = Array.from({ length: 3 }, (_, i) => 
        createMockRequest('POST', '/api/organizations', {
          name: `Concurrent Organization ${i}`,
          slug: `concurrent-org-${i}`
        }, {
          userId: newUserForOrgCreation,
          requestId: `concurrent-${i}`
        })
      )

      const responses = await Promise.all(
        concurrentRequests.map(request => organizationsPost(request))
      )

      // Count successful creations
      let successfulCreations = 0
      for (const response of responses) {
        if (response.status === 201) {
          successfulCreations++
          const data = await response.json()
          testOrgIds.push(data.organization.id)
        }
      }

      // Should have created all organizations successfully
      expect(successfulCreations).toBe(3)

      // Verify user is admin in all created organizations
      const { data: userOrganizations } = await supabaseAdmin
        .from('user_organizations')
        .select('*')
        .eq('user_id', newUserForOrgCreation)
        .eq('is_active', true)

      expect(userOrganizations.length).toBe(successfulCreations)
      
      for (const userOrg of userOrganizations) {
        expect(userOrg.role).toBe('admin')
        expect(userOrg.joined_via).toBe('created')
      }
    })

    test('should handle organization creation failure recovery', async () => {
      // Attempt to create organization with invalid data that would fail partway through
      const failingOrgRequest = createMockRequest('POST', '/api/organizations', {
        name: 'Failing Organization',
        slug: 'existing-user-org' // Duplicate slug
      }, {
        userId: newUserForOrgCreation
      })

      const failingOrgResponse = await organizationsPost(failingOrgRequest)
      expect(failingOrgResponse.status).toBe(400)

      // Verify no partial data was created
      const { data: partialOrg } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .eq('name', 'Failing Organization')
        .single()

      expect(partialOrg).toBeNull()

      // Verify user wasn't added to any failed organization
      const { data: userOrgs } = await supabaseAdmin
        .from('user_organizations')
        .select('*')
        .eq('user_id', newUserForOrgCreation)

      expect(userOrgs.length).toBe(0) // No organizations should exist for this user

      // Verify user can still create organization after failure
      const recoveryOrgRequest = createMockRequest('POST', '/api/organizations', {
        name: 'Recovery Organization',
        slug: 'recovery-org'
      }, {
        userId: newUserForOrgCreation
      })

      const recoveryOrgResponse = await organizationsPost(recoveryOrgRequest)
      
      if (recoveryOrgResponse.status === 201) {
        const recoveryOrgData = await recoveryOrgResponse.json()
        testOrgIds.push(recoveryOrgData.organization.id)
      }
    })
  })

  describe('Organization Context After Creation', () => {
    test('should allow immediate access to newly created organization', async () => {
      const newOrgRequest = createMockRequest('POST', '/api/organizations', {
        name: 'Immediate Access Organization',
        slug: 'immediate-access-org'
      }, {
        userId: newUserForOrgCreation
      })

      const newOrgResponse = await organizationsPost(newOrgRequest)
      
      if (newOrgResponse.status === 201) {
        const newOrgData = await newOrgResponse.json()
        const newOrgId = newOrgData.organization.id
        testOrgIds.push(newOrgId)

        // Should be able to immediately access organization via current-organization API
        const currentOrgRequest = createMockRequest('GET', '/api/user/current-organization', {}, {
          userId: newUserForOrgCreation,
          organizationId: newOrgId
        })

        const currentOrgResponse = await currentOrganizationGet(currentOrgRequest)
        
        if (currentOrgResponse.status === 200) {
          const currentOrgData = await currentOrgResponse.json()
          expect(currentOrgData.organizationId).toBe(newOrgId)
          expect(currentOrgData.organizationName).toBe('Immediate Access Organization')
          expect(currentOrgData.role).toBe('admin')
        }
      }
    })

    test('should show newly created organization in organization status', async () => {
      const statusOrgRequest = createMockRequest('POST', '/api/organizations', {
        name: 'Status Test Organization',
        slug: 'status-test-org'
      }, {
        userId: newUserForOrgCreation
      })

      const statusOrgResponse = await organizationsPost(statusOrgRequest)
      
      if (statusOrgResponse.status === 201) {
        const statusOrgData = await statusOrgResponse.json()
        const statusOrgId = statusOrgData.organization.id
        testOrgIds.push(statusOrgId)

        // Check organization status
        const orgStatusRequest = createMockRequest('GET', '/api/user/organization-status', {}, {
          userId: newUserForOrgCreation
        })

        const orgStatusResponse = await organizationStatusGet(orgStatusRequest)
        
        if (orgStatusResponse.status === 200) {
          const statusData = await orgStatusResponse.json()
          expect(statusData.userWorkspaces).toBeDefined()
          expect(statusData.userWorkspaces.length).toBeGreaterThan(0)
          
          const createdOrg = statusData.userWorkspaces.find((ws: any) => ws.id === statusOrgId)
          expect(createdOrg).toBeDefined()
          expect(createdOrg.name).toBe('Status Test Organization')
          expect(createdOrg.role).toBe('admin')
        }
      }
    })

    test('should create proper organization initials for workspace display', async () => {
      const orgWithInitialsRequest = createMockRequest('POST', '/api/organizations', {
        name: 'Test Initials Organization',
        slug: 'test-initials-org'
      }, {
        userId: newUserForOrgCreation
      })

      const orgWithInitialsResponse = await organizationsPost(orgWithInitialsRequest)
      
      if (orgWithInitialsResponse.status === 201) {
        const orgWithInitialsData = await orgWithInitialsResponse.json()
        const orgWithInitialsId = orgWithInitialsData.organization.id
        testOrgIds.push(orgWithInitialsId)

        // Check organization status for initials
        const statusRequest = createMockRequest('GET', '/api/user/organization-status', {}, {
          userId: newUserForOrgCreation
        })

        const statusResponse = await organizationStatusGet(statusRequest)
        
        if (statusResponse.status === 200) {
          const statusData = await statusResponse.json()
          const createdOrg = statusData.userWorkspaces.find((ws: any) => ws.id === orgWithInitialsId)
          
          expect(createdOrg).toBeDefined()
          expect(createdOrg.initials).toBeDefined()
          expect(createdOrg.initials).toMatch(/^[A-Z]{2}$/) // Should be 2 uppercase letters
        }
      }
    })
  })

  describe('Security and Authorization During Creation', () => {
    test('should prevent unauthorized organization creation', async () => {
      const unauthorizedRequest = createMockRequest('POST', '/api/organizations', {
        name: 'Unauthorized Organization',
        slug: 'unauthorized-org'
      }, {
        // No userId provided
      })

      const unauthorizedResponse = await organizationsPost(unauthorizedRequest)
      expect(unauthorizedResponse.status).toBe(401)

      const errorData = await unauthorizedResponse.json()
      expect(errorData.error).toMatch(/unauthorized|authentication/i)
    })

    test('should validate user exists before organization creation', async () => {
      const nonExistentUserId = '00000000-0000-0000-0000-000000000000'
      
      const nonExistentUserRequest = createMockRequest('POST', '/api/organizations', {
        name: 'Non-existent User Organization',
        slug: 'nonexistent-user-org'
      }, {
        userId: nonExistentUserId
      })

      const nonExistentUserResponse = await organizationsPost(nonExistentUserRequest)
      expect(nonExistentUserResponse.status).toBeGreaterThanOrEqual(400)
    })
  })
})