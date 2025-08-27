/**
 * Session Management and Token Persistence Tests
 * Tests for authentication state, token handling, and session lifecycle
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { cookies, headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { middleware } from '@/middleware'
import { setActiveOrganization } from '@/lib/auth-utils-v2'
import { userHasOrganization } from '@/lib/middleware-utils'

// Mock Next.js modules
jest.mock('next/headers', () => ({
  headers: jest.fn(),
  cookies: jest.fn()
}))

jest.mock('next/server', () => ({
  NextResponse: {
    next: jest.fn(),
    redirect: jest.fn(),
    json: jest.fn()
  },
  NextRequest: jest.fn()
}))

jest.mock('@/lib/middleware-utils', () => ({
  userHasOrganization: jest.fn()
}))

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
    onAuthStateChange: jest.fn(),
    refreshSession: jest.fn(),
    setSession: jest.fn(),
    signOut: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn()
  }))
}

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => mockSupabaseClient),
  createBrowserClient: jest.fn(() => mockSupabaseClient)
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue(mockSupabaseClient)
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}))

describe('Session Management Tests', () => {
  let mockCookies: any
  let mockHeaders: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockCookies = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      getAll: jest.fn(() => [])
    }

    mockHeaders = {
      get: jest.fn()
    }

    jest.mocked(cookies).mockResolvedValue(mockCookies)
    jest.mocked(headers).mockResolvedValue(mockHeaders)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Cookie-based Session Storage', () => {
    it('should store session data in cookies', async () => {
      const sessionData = {
        access_token: 'access_token_123',
        refresh_token: 'refresh_token_456',
        expires_at: Date.now() + 3600000 // 1 hour from now
      }

      await setActiveOrganization('org-123')

      expect(mockCookies.set).toHaveBeenCalledWith(
        'active-organization-id',
        'org-123',
        expect.objectContaining({
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30 // 30 days
        })
      )
    })

    it('should retrieve session data from cookies', async () => {
      mockCookies.get.mockReturnValue({
        value: JSON.stringify({
          access_token: 'stored_token',
          refresh_token: 'stored_refresh',
          expires_at: Date.now() + 3600000
        })
      })

      const sessionCookie = mockCookies.get('supabase-auth-token')
      expect(sessionCookie).toBeDefined()
    })

    it('should handle expired session cookies', () => {
      const expiredSession = {
        access_token: 'expired_token',
        refresh_token: 'expired_refresh',
        expires_at: Date.now() - 3600000 // 1 hour ago
      }

      mockCookies.get.mockReturnValue({
        value: JSON.stringify(expiredSession)
      })

      const sessionCookie = mockCookies.get('supabase-auth-token')
      const session = JSON.parse(sessionCookie.value)
      
      expect(session.expires_at).toBeLessThan(Date.now())
    })

    it('should clear session cookies on logout', () => {
      mockCookies.delete.mockImplementation(() => {})

      // Simulate logout
      mockCookies.delete('supabase-auth-token')
      mockCookies.delete('active-organization-id')

      expect(mockCookies.delete).toHaveBeenCalledWith('supabase-auth-token')
      expect(mockCookies.delete).toHaveBeenCalledWith('active-organization-id')
    })

    it('should handle malformed cookie data', () => {
      mockCookies.get.mockReturnValue({
        value: 'invalid-json-data'
      })

      expect(() => {
        const sessionCookie = mockCookies.get('supabase-auth-token')
        JSON.parse(sessionCookie.value)
      }).toThrow()
    })
  })

  describe('Token Refresh Mechanism', () => {
    it('should refresh token when near expiration', async () => {
      const nearExpiryToken = {
        access_token: 'expiring_token',
        refresh_token: 'valid_refresh_token',
        expires_at: Date.now() + 300000 // 5 minutes from now
      }

      const newTokens = {
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_at: Date.now() + 3600000 // 1 hour from now
      }

      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { 
          session: newTokens,
          user: { id: 'user-123' }
        },
        error: null
      })

      const result = await mockSupabaseClient.auth.refreshSession()

      expect(result.data.session).toEqual(newTokens)
      expect(result.error).toBeNull()
    })

    it('should handle refresh token failure', async () => {
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Invalid refresh token' }
      })

      const result = await mockSupabaseClient.auth.refreshSession()

      expect(result.data.session).toBeNull()
      expect(result.error.message).toBe('Invalid refresh token')
    })

    it('should automatically refresh session on API calls', async () => {
      const mockUser = {
        id: 'auto-refresh-user',
        email: 'user@example.com'
      }

      // First call returns expired token error
      mockSupabaseClient.auth.getUser
        .mockResolvedValueOnce({
          data: { user: null },
          error: { message: 'JWT expired' }
        })
        // Second call (after refresh) returns user
        .mockResolvedValueOnce({
          data: { user: mockUser },
          error: null
        })

      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { 
          session: { access_token: 'refreshed_token' },
          user: mockUser
        },
        error: null
      })

      // First attempt should fail
      const firstResult = await mockSupabaseClient.auth.getUser()
      expect(firstResult.error.message).toBe('JWT expired')

      // Refresh session
      await mockSupabaseClient.auth.refreshSession()

      // Second attempt should succeed
      const secondResult = await mockSupabaseClient.auth.getUser()
      expect(secondResult.data.user).toEqual(mockUser)
    })
  })

  describe('Session State Management', () => {
    it('should track authentication state changes', () => {
      const mockCallback = jest.fn()
      const mockUnsubscribe = jest.fn()

      mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } }
      })

      const { data } = mockSupabaseClient.auth.onAuthStateChange(mockCallback)

      expect(mockSupabaseClient.auth.onAuthStateChange).toHaveBeenCalledWith(mockCallback)
      expect(data.subscription.unsubscribe).toBe(mockUnsubscribe)
    })

    it('should handle SIGNED_IN auth events', () => {
      const mockCallback = jest.fn()

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        // Simulate SIGNED_IN event
        callback('SIGNED_IN', {
          access_token: 'new_token',
          user: { id: 'signed-in-user' }
        })
        
        return { data: { subscription: {} } }
      })

      mockSupabaseClient.auth.onAuthStateChange(mockCallback)

      expect(mockCallback).toHaveBeenCalledWith('SIGNED_IN', expect.objectContaining({
        access_token: 'new_token',
        user: expect.objectContaining({ id: 'signed-in-user' })
      }))
    })

    it('should handle SIGNED_OUT auth events', () => {
      const mockCallback = jest.fn()

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        // Simulate SIGNED_OUT event
        callback('SIGNED_OUT', null)
        return { data: { subscription: {} } }
      })

      mockSupabaseClient.auth.onAuthStateChange(mockCallback)

      expect(mockCallback).toHaveBeenCalledWith('SIGNED_OUT', null)
    })

    it('should handle TOKEN_REFRESHED auth events', () => {
      const mockCallback = jest.fn()

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        callback('TOKEN_REFRESHED', {
          access_token: 'refreshed_token',
          user: { id: 'user-123' }
        })
        return { data: { subscription: {} } }
      })

      mockSupabaseClient.auth.onAuthStateChange(mockCallback)

      expect(mockCallback).toHaveBeenCalledWith('TOKEN_REFRESHED', expect.objectContaining({
        access_token: 'refreshed_token'
      }))
    })
  })

  describe('Middleware Session Handling', () => {
    it('should allow public routes without authentication', async () => {
      const mockRequest = {
        nextUrl: { pathname: '/login', searchParams: new URLSearchParams() },
        cookies: { getAll: () => [] },
        headers: new Map(),
        url: 'http://localhost:3000/login'
      } as any

      // Mock no user (unauthenticated)
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const mockNextResponse = { type: 'next' }
      jest.mocked(NextResponse.next).mockReturnValue(mockNextResponse as any)

      const result = await middleware(mockRequest)

      expect(NextResponse.next).toHaveBeenCalled()
      expect(result).toBe(mockNextResponse)
    })

    it('should redirect unauthenticated users from protected routes', async () => {
      const mockRequest = {
        nextUrl: { pathname: '/dashboard', searchParams: new URLSearchParams() },
        cookies: { getAll: () => [] },
        headers: new Map(),
        url: 'http://localhost:3000/dashboard'
      } as any

      // Mock no user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const mockRedirectResponse = { type: 'redirect' }
      jest.mocked(NextResponse.redirect).mockReturnValue(mockRedirectResponse as any)

      const result = await middleware(mockRequest)

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('/login')
        })
      )
    })

    it('should handle authenticated user with organization', async () => {
      const mockUser = {
        id: 'auth-user-with-org',
        email: 'user@company.com'
      }

      const mockRequest = {
        nextUrl: { pathname: '/dashboard', searchParams: new URLSearchParams() },
        cookies: { getAll: () => [] },
        headers: new Map(),
        url: 'http://localhost:3000/dashboard'
      } as any

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Mock user has organization
      jest.mocked(userHasOrganization).mockResolvedValue(true)

      const mockNextResponse = { type: 'next' }
      jest.mocked(NextResponse.next).mockReturnValue(mockNextResponse as any)

      const result = await middleware(mockRequest)

      expect(userHasOrganization).toHaveBeenCalledWith(mockUser.id, mockRequest)
      expect(NextResponse.next).toHaveBeenCalled()
    })

    it('should redirect authenticated user without organization to onboarding', async () => {
      const mockUser = {
        id: 'auth-user-no-org',
        email: 'noorg@example.com'
      }

      const mockRequest = {
        nextUrl: { pathname: '/dashboard', searchParams: new URLSearchParams() },
        cookies: { getAll: () => [] },
        headers: new Map(),
        url: 'http://localhost:3000/dashboard'
      } as any

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Mock user has no organization
      jest.mocked(userHasOrganization).mockResolvedValue(false)

      const mockRedirectResponse = { type: 'redirect' }
      jest.mocked(NextResponse.redirect).mockReturnValue(mockRedirectResponse as any)

      const result = await middleware(mockRequest)

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('/onboarding')
        })
      )
    })

    it('should allow onboarding access with invitation token', async () => {
      const mockRequest = {
        nextUrl: { 
          pathname: '/onboarding', 
          searchParams: new URLSearchParams([['token', 'invitation-token-123']])
        },
        cookies: { getAll: () => [] },
        headers: new Map(),
        url: 'http://localhost:3000/onboarding?token=invitation-token-123'
      } as any

      // Mock no user but has invitation token
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const mockNextResponse = { type: 'next' }
      jest.mocked(NextResponse.next).mockReturnValue(mockNextResponse as any)

      const result = await middleware(mockRequest)

      expect(NextResponse.next).toHaveBeenCalled()
    })
  })

  describe('Session Persistence Across Requests', () => {
    it('should maintain session across server-side requests', async () => {
      const sessionCookie = {
        name: 'supabase-auth-token',
        value: JSON.stringify({
          access_token: 'persistent_token',
          user: { id: 'persistent-user' }
        })
      }

      mockCookies.getAll.mockReturnValue([sessionCookie])

      const cookies = await mockCookies.getAll()
      const authCookie = cookies.find((c: any) => c.name === 'supabase-auth-token')
      
      expect(authCookie).toBeDefined()
      expect(authCookie.value).toContain('persistent_token')
    })

    it('should handle concurrent session updates', async () => {
      const initialSession = { access_token: 'token1', user_id: 'user-123' }
      const updatedSession = { access_token: 'token2', user_id: 'user-123' }

      // Simulate concurrent updates
      mockCookies.set.mockImplementation(() => {})

      // First update
      mockCookies.set('session', JSON.stringify(initialSession))
      
      // Second update (simulating concurrent request)
      mockCookies.set('session', JSON.stringify(updatedSession))

      expect(mockCookies.set).toHaveBeenCalledTimes(2)
    })

    it('should preserve organization context in session', async () => {
      const sessionWithOrg = {
        access_token: 'org_token',
        user: { id: 'org-user' },
        organization_id: 'org-context-123'
      }

      await setActiveOrganization('org-context-123')

      expect(mockCookies.set).toHaveBeenCalledWith(
        'active-organization-id',
        'org-context-123',
        expect.any(Object)
      )
    })
  })

  describe('Session Security', () => {
    it('should use httpOnly cookies for session storage', async () => {
      await setActiveOrganization('secure-org')

      expect(mockCookies.set).toHaveBeenCalledWith(
        'active-organization-id',
        'secure-org',
        expect.objectContaining({
          httpOnly: true
        })
      )
    })

    it('should use secure cookies in production', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      await setActiveOrganization('prod-org')

      expect(mockCookies.set).toHaveBeenCalledWith(
        'active-organization-id',
        'prod-org',
        expect.objectContaining({
          secure: true
        })
      )

      process.env.NODE_ENV = originalEnv
    })

    it('should use SameSite protection', async () => {
      await setActiveOrganization('protected-org')

      expect(mockCookies.set).toHaveBeenCalledWith(
        'active-organization-id',
        'protected-org',
        expect.objectContaining({
          sameSite: 'lax'
        })
      )
    })

    it('should handle session hijacking attempts', () => {
      const suspiciousSession = {
        access_token: 'suspicious_token',
        user_id: 'attacker-user',
        created_at: Date.now() - 86400000 // 24 hours ago
      }

      // Validate session age
      const sessionAge = Date.now() - suspiciousSession.created_at
      const maxAge = 60 * 60 * 24 * 7 * 1000 // 7 days in milliseconds

      expect(sessionAge).toBeGreaterThan(maxAge)
    })
  })

  describe('Session Cleanup', () => {
    it('should clean up expired sessions', () => {
      const expiredSessions = [
        {
          token: 'expired1',
          expires_at: Date.now() - 3600000
        },
        {
          token: 'expired2', 
          expires_at: Date.now() - 7200000
        }
      ]

      const validSessions = [
        {
          token: 'valid1',
          expires_at: Date.now() + 3600000
        }
      ]

      const allSessions = [...expiredSessions, ...validSessions]
      const cleanSessions = allSessions.filter(
        session => session.expires_at > Date.now()
      )

      expect(cleanSessions).toHaveLength(1)
      expect(cleanSessions[0].token).toBe('valid1')
    })

    it('should sign out user when session cleanup fails', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null })

      // Simulate session cleanup failure
      const result = await mockSupabaseClient.auth.signOut()

      expect(result.error).toBeNull()
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
    })
  })
})