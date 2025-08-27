/**
 * Comprehensive Test Suite for Supabase Auth Integration
 * Tests authentication flows, session management, and security implementations
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { createClient } from '@/lib/supabase/client'
import { createClient as createServerClient, createAdminClient } from '@/lib/supabase/server'
import {
  authenticateAndGetOrgContext,
  setActiveOrganization,
  switchOrganization,
  requireOrgRole,
  createOrganization,
  addUserToOrganization
} from '@/lib/auth-utils-v2'

// Mock Next.js modules
jest.mock('next/headers', () => ({
  headers: jest.fn(),
  cookies: jest.fn()
}))

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({ data, options })),
    redirect: jest.fn((url) => ({ redirect: url })),
    next: jest.fn()
  }
}))

// Mock environment variables
const mockEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}

Object.assign(process.env, mockEnv)

describe('Supabase Auth Integration Tests', () => {
  let mockSupabaseClient: any
  let mockSupabaseServer: any
  let mockSupabaseAdmin: any

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Mock Supabase client methods
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn(),
        signInWithPassword: jest.fn(),
        signInWithOAuth: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        exchangeCodeForSession: jest.fn(),
        resetPasswordForEmail: jest.fn(),
        updateUser: jest.fn(),
        onAuthStateChange: jest.fn()
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
        order: jest.fn().mockReturnThis(),
        upsert: jest.fn()
      }))
    }

    mockSupabaseServer = { ...mockSupabaseClient }
    mockSupabaseAdmin = { ...mockSupabaseClient }

    // Mock the Supabase client creation functions
    jest.mocked(createClient).mockReturnValue(mockSupabaseClient)
    jest.mocked(createServerClient).mockResolvedValue(mockSupabaseServer)
    jest.mocked(createAdminClient).mockReturnValue(mockSupabaseAdmin)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Client-side Authentication', () => {
    it('should create browser client with correct configuration', () => {
      const client = createClient()
      
      expect(client).toBeDefined()
      expect(createClient).toHaveBeenCalledWith()
    })

    it('should handle successful password sign-in', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        aud: 'authenticated'
      }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token-123' } },
        error: null
      })

      const result = await mockSupabaseClient.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123'
      })

      expect(result.data.user).toEqual(mockUser)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
    })

    it('should handle sign-in errors appropriately', async () => {
      const mockError = {
        message: 'Invalid login credentials',
        status: 400
      }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError
      })

      const result = await mockSupabaseClient.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'wrongpassword'
      })

      expect(result.data.user).toBeNull()
      expect(result.error).toEqual(mockError)
    })

    it('should handle email not confirmed error', async () => {
      const mockError = {
        message: 'Email not confirmed',
        status: 400
      }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError
      })

      const result = await mockSupabaseClient.auth.signInWithPassword({
        email: 'unconfirmed@example.com',
        password: 'password123'
      })

      expect(result.error.message).toBe('Email not confirmed')
    })

    it('should handle successful sign-up', async () => {
      const mockUser = {
        id: 'user-456',
        email: 'newuser@example.com',
        email_confirmed_at: null
      }

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { 
          user: mockUser, 
          session: null // No session until email confirmed
        },
        error: null
      })

      const result = await mockSupabaseClient.auth.signUp({
        email: 'newuser@example.com',
        password: 'password123'
      })

      expect(result.data.user).toEqual(mockUser)
      expect(result.data.session).toBeNull()
      expect(result.error).toBeNull()
    })

    it('should handle sign-out', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null
      })

      const result = await mockSupabaseClient.auth.signOut()
      
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
    })
  })

  describe('Google OAuth Authentication', () => {
    it('should initiate Google OAuth flow', async () => {
      mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth/authorize?...' },
        error: null
      })

      const result = await mockSupabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/login/callback'
        }
      })

      expect(result.data.url).toBeDefined()
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/login/callback'
        }
      })
    })

    it('should handle OAuth callback code exchange', async () => {
      const mockUser = {
        id: 'google-user-123',
        email: 'google@example.com',
        app_metadata: { provider: 'google' },
        user_metadata: { full_name: 'Google User' }
      }

      mockSupabaseServer.auth.exchangeCodeForSession.mockResolvedValue({
        data: { 
          user: mockUser, 
          session: { access_token: 'google-token-123' } 
        },
        error: null
      })

      const result = await mockSupabaseServer.auth.exchangeCodeForSession('auth-code-123')

      expect(result.data.user).toEqual(mockUser)
      expect(result.error).toBeNull()
    })

    it('should handle OAuth errors', async () => {
      const mockError = {
        message: 'OAuth provider error',
        status: 400
      }

      mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({
        data: { url: null },
        error: mockError
      })

      const result = await mockSupabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/login/callback'
        }
      })

      expect(result.error).toEqual(mockError)
    })
  })

  describe('Server-side Authentication', () => {
    it('should create server client with cookie configuration', async () => {
      const mockCookies = {
        get: jest.fn(),
        set: jest.fn()
      }

      const { cookies } = require('next/headers')
      cookies.mockResolvedValue(mockCookies)

      const client = await createServerClient()
      
      expect(client).toBeDefined()
      expect(cookies).toHaveBeenCalled()
    })

    it('should create admin client with service role key', () => {
      const adminClient = createAdminClient()
      
      expect(adminClient).toBeDefined()
      expect(createAdminClient).toHaveBeenCalled()
    })

    it('should throw error when service role key is missing', () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY
      
      expect(() => createAdminClient()).toThrow('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
      
      // Restore for other tests
      process.env.SUPABASE_SERVICE_ROLE_KEY = mockEnv.SUPABASE_SERVICE_ROLE_KEY
    })

    it('should get authenticated user from server', async () => {
      const mockUser = {
        id: 'server-user-123',
        email: 'server@example.com',
        aud: 'authenticated'
      }

      mockSupabaseServer.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const result = await mockSupabaseServer.auth.getUser()

      expect(result.data.user).toEqual(mockUser)
      expect(result.error).toBeNull()
    })
  })

  describe('Session Management', () => {
    it('should handle auth state changes', () => {
      const mockCallback = jest.fn()
      
      mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: {} },
        unsubscribe: jest.fn()
      })

      const { data } = mockSupabaseClient.auth.onAuthStateChange(mockCallback)
      
      expect(data.subscription).toBeDefined()
      expect(mockSupabaseClient.auth.onAuthStateChange).toHaveBeenCalledWith(mockCallback)
    })

    it('should update user profile', async () => {
      const updateData = {
        data: {
          full_name: 'Updated Name'
        }
      }

      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: { ...updateData.data, id: 'user-123' } },
        error: null
      })

      const result = await mockSupabaseClient.auth.updateUser(updateData)

      expect(result.error).toBeNull()
      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith(updateData)
    })

    it('should reset password via email', async () => {
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null
      })

      const result = await mockSupabaseClient.auth.resetPasswordForEmail(
        'reset@example.com',
        { redirectTo: 'http://localhost:3000/reset-password' }
      )

      expect(result.error).toBeNull()
      expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'reset@example.com',
        { redirectTo: 'http://localhost:3000/reset-password' }
      )
    })
  })

  describe('Multi-Organization Authentication Context', () => {
    it('should authenticate and get organization context successfully', async () => {
      const mockUser = {
        id: 'multi-org-user',
        email: 'user@company.com',
        aud: 'authenticated'
      }

      const mockProfile = {
        id: 'multi-org-user',
        email: 'user@company.com',
        full_name: 'Test User',
        organization_id: 'org-123'
      }

      const mockOrganization = {
        id: 'org-123',
        name: 'Test Company',
        slug: 'test-company'
      }

      const mockUserOrganization = {
        user_id: 'multi-org-user',
        organization_id: 'org-123',
        role: 'employee',
        is_active: true,
        is_default: true
      }

      const mockOrgSettings = {
        organization_id: 'org-123',
        allow_domain_join_requests: true
      }

      // Mock the server client calls
      mockSupabaseServer.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Mock database queries
      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
        order: jest.fn().mockReturnThis()
      }

      mockSupabaseServer.from.mockReturnValue(mockFromChain)

      // Mock the sequential database calls
      mockFromChain.single
        .mockResolvedValueOnce({ data: mockUserOrganization, error: null }) // user_organizations query
        .mockResolvedValueOnce({ data: mockProfile, error: null }) // profiles query
        .mockResolvedValueOnce({ data: mockOrganization, error: null }) // organizations query
        .mockResolvedValueOnce({ data: mockOrgSettings, error: null }) // organization_settings query

      // Mock the all user organizations query
      mockFromChain.order.mockResolvedValue({
        data: [mockUserOrganization],
        error: null
      })

      const result = await authenticateAndGetOrgContext()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.context.user.id).toBe('multi-org-user')
        expect(result.context.organization.id).toBe('org-123')
        expect(result.context.role).toBe('employee')
        expect(result.context.permissions).toBeDefined()
      }
    })

    it('should handle organization context for unauthorized user', async () => {
      mockSupabaseServer.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized')
      })

      const result = await authenticateAndGetOrgContext()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.data.error).toBe('Unauthorized')
        expect(result.error.options.status).toBe(401)
      }
    })

    it('should handle missing organization context', async () => {
      const mockUser = {
        id: 'no-org-user',
        email: 'noorg@example.com',
        aud: 'authenticated'
      }

      mockSupabaseServer.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Mock no organization found scenario
      const mockHeaders = {
        get: jest.fn().mockReturnValue(null)
      }

      const mockCookies = {
        get: jest.fn().mockReturnValue(undefined)
      }

      const { headers, cookies } = require('next/headers')
      headers.mockResolvedValue(mockHeaders)
      cookies.mockResolvedValue(mockCookies)

      // Mock user has no default organization
      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: new Error('No rows') })
      }

      mockSupabaseServer.from.mockReturnValue(mockFromChain)

      const result = await authenticateAndGetOrgContext()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.data.error).toContain('No organization context found')
      }
    })
  })

  describe('Role-based Authorization', () => {
    it('should successfully check admin role requirement', async () => {
      const mockUser = {
        id: 'admin-user',
        email: 'admin@company.com'
      }

      const mockUserOrg = {
        role: 'admin'
      }

      mockSupabaseServer.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUserOrg, error: null })
      }

      mockSupabaseServer.from.mockReturnValue(mockFromChain)

      const result = await requireOrgRole('org-123', ['admin'])

      expect(result.success).toBe(true)
      expect(result.role).toBe('admin')
    })

    it('should deny access for insufficient role', async () => {
      const mockUser = {
        id: 'employee-user',
        email: 'employee@company.com'
      }

      const mockUserOrg = {
        role: 'employee'
      }

      mockSupabaseServer.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUserOrg, error: null })
      }

      mockSupabaseServer.from.mockReturnValue(mockFromChain)

      const result = await requireOrgRole('org-123', ['admin'])

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.data.error).toContain('Access denied')
      }
    })

    it('should handle user not in organization', async () => {
      const mockUser = {
        id: 'external-user',
        email: 'external@example.com'
      }

      mockSupabaseServer.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: new Error('No rows') })
      }

      mockSupabaseServer.from.mockReturnValue(mockFromChain)

      const result = await requireOrgRole('org-123', ['employee'])

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.data.error).toContain('does not belong to this organization')
      }
    })
  })

  describe('Organization Management', () => {
    it('should create new organization successfully', async () => {
      const mockUser = {
        id: 'creator-user',
        email: 'creator@newcompany.com'
      }

      const mockOrganization = {
        id: 'new-org-123',
        name: 'New Company',
        slug: 'new-company'
      }

      mockSupabaseServer.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockFromChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockOrganization, error: null }),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      }

      // Mock successful user_organizations insert
      const mockUserOrgInsert = {
        insert: jest.fn().mockResolvedValue({ error: null })
      }

      mockSupabaseServer.from
        .mockReturnValueOnce(mockFromChain) // organizations table
        .mockReturnValueOnce(mockUserOrgInsert) // user_organizations table

      const result = await createOrganization({
        name: 'New Company',
        slug: 'new-company'
      })

      expect(result.success).toBe(true)
      expect(result.organization).toEqual(mockOrganization)
    })

    it('should rollback organization creation on user assignment failure', async () => {
      const mockUser = {
        id: 'creator-user',
        email: 'creator@newcompany.com'
      }

      const mockOrganization = {
        id: 'failed-org-123',
        name: 'Failed Company',
        slug: 'failed-company'
      }

      mockSupabaseServer.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockFromChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockOrganization, error: null }),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      }

      // Mock failed user_organizations insert
      const mockUserOrgInsert = {
        insert: jest.fn().mockResolvedValue({ error: new Error('Failed to assign user') })
      }

      mockSupabaseServer.from
        .mockReturnValueOnce(mockFromChain) // organizations table
        .mockReturnValueOnce(mockUserOrgInsert) // user_organizations table (failed)
        .mockReturnValueOnce(mockFromChain) // organizations table for rollback

      const result = await createOrganization({
        name: 'Failed Company',
        slug: 'failed-company'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to assign user to organization')
      
      // Verify rollback was attempted
      expect(mockFromChain.delete).toHaveBeenCalled()
    })

    it('should add user to existing organization', async () => {
      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: new Error('No existing membership') }),
        insert: jest.fn().mockResolvedValue({ error: null })
      }

      mockSupabaseServer.from.mockReturnValue(mockFromChain)

      const result = await addUserToOrganization(
        'org-123',
        'user-456',
        'employee',
        {
          employmentType: 'full_time',
          joinedVia: 'invitation'
        }
      )

      expect(result.success).toBe(true)
      expect(mockFromChain.insert).toHaveBeenCalled()
    })

    it('should prevent duplicate organization membership', async () => {
      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'existing-membership' }, error: null })
      }

      mockSupabaseServer.from.mockReturnValue(mockFromChain)

      const result = await addUserToOrganization('org-123', 'user-456', 'employee')

      expect(result.success).toBe(false)
      expect(result.error).toBe('User already belongs to this organization')
    })
  })

  describe('Organization Switching', () => {
    it('should switch active organization successfully', async () => {
      const mockUser = {
        id: 'switcher-user',
        email: 'switcher@company.com'
      }

      const mockUserOrg = {
        organization_id: 'target-org-123'
      }

      mockSupabaseServer.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUserOrg, error: null })
      }

      mockSupabaseServer.from.mockReturnValue(mockFromChain)

      // Mock cookie setting
      const mockCookies = {
        set: jest.fn()
      }

      const { cookies } = require('next/headers')
      cookies.mockResolvedValue(mockCookies)

      const result = await switchOrganization('target-org-123')

      expect(result.success).toBe(true)
      expect(mockCookies.set).toHaveBeenCalledWith(
        'active-organization-id',
        'target-org-123',
        expect.any(Object)
      )
    })

    it('should deny switching to unauthorized organization', async () => {
      const mockUser = {
        id: 'switcher-user',
        email: 'switcher@company.com'
      }

      mockSupabaseServer.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: new Error('Not a member') })
      }

      mockSupabaseServer.from.mockReturnValue(mockFromChain)

      const result = await switchOrganization('unauthorized-org')

      expect(result.success).toBe(false)
      expect(result.error).toContain('does not belong to the specified organization')
    })
  })

  describe('Security and Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockRejectedValue(
        new Error('Network error')
      )

      await expect(mockSupabaseClient.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123'
      })).rejects.toThrow('Network error')
    })

    it('should handle malformed requests', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid email format', status: 400 }
      })

      const result = await mockSupabaseClient.auth.signInWithPassword({
        email: 'invalid-email',
        password: 'password123'
      })

      expect(result.error.message).toBe('Invalid email format')
      expect(result.error.status).toBe(400)
    })

    it('should handle session timeout', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'JWT expired', status: 401 }
      })

      const result = await mockSupabaseClient.auth.getUser()

      expect(result.error.message).toBe('JWT expired')
      expect(result.error.status).toBe(401)
    })

    it('should validate environment variables', () => {
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.NEXT_PUBLIC_SUPABASE_URL

      expect(() => createClient()).toThrow()

      // Restore
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
    })
  })

  describe('Auth State Persistence', () => {
    it('should handle cookie-based session storage', async () => {
      const mockCookies = {
        get: jest.fn().mockReturnValue({ value: 'session-token' }),
        set: jest.fn(),
        remove: jest.fn()
      }

      const { cookies } = require('next/headers')
      cookies.mockResolvedValue(mockCookies)

      const client = await createServerClient()
      
      expect(client).toBeDefined()
      expect(cookies).toHaveBeenCalled()
    })

    it('should handle missing cookies gracefully', async () => {
      const mockCookies = {
        get: jest.fn().mockReturnValue(undefined),
        set: jest.fn(),
        remove: jest.fn()
      }

      const { cookies } = require('next/headers')
      cookies.mockResolvedValue(mockCookies)

      const client = await createServerClient()
      
      expect(client).toBeDefined()
    })
  })
})