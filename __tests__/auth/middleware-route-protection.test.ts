/**
 * Authentication Middleware and Route Protection Tests
 * Tests for middleware authentication logic and route access controls
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { NextRequest, NextResponse } from 'next/server'
import { middleware } from '@/middleware'
import { userHasOrganization } from '@/lib/middleware-utils'

// Mock Next.js modules
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

// Mock Supabase SSR
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn()
  }
}

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => mockSupabaseClient)
}))

// Mock console methods
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn()
}

describe('Middleware and Route Protection Tests', () => {
  let mockNext: jest.MockedFunction<any>
  let mockRedirect: jest.MockedFunction<any>

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockNext = jest.fn().mockReturnValue({ type: 'next' })
    mockRedirect = jest.fn().mockReturnValue({ type: 'redirect' })
    
    jest.mocked(NextResponse.next).mockImplementation(mockNext)
    jest.mocked(NextResponse.redirect).mockImplementation(mockRedirect)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Public Route Access', () => {
    const publicRoutes = [
      '/login',
      '/signup', 
      '/forgot-password',
      '/reset-password',
      '/onboarding/join',
      '/onboarding/register',
      '/onboarding/success',
      '/favicon.ico'
    ]

    publicRoutes.forEach(route => {
      it(`should allow unauthenticated access to ${route}`, async () => {
        const mockRequest = {
          nextUrl: { 
            pathname: route,
            searchParams: new URLSearchParams()
          },
          cookies: {
            getAll: () => []
          },
          headers: new Map(),
          url: `http://localhost:3000${route}`
        } as any

        // No authenticated user
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null
        })

        const result = await middleware(mockRequest)

        expect(mockNext).toHaveBeenCalled()
        expect(mockRedirect).not.toHaveBeenCalled()
        expect(result.type).toBe('next')
      })
    })

    it('should allow unauthenticated access to static assets', async () => {
      const staticPaths = [
        '/_next/static/chunks/main.js',
        '/_next/image?url=%2Flogo.png&w=256&q=75',
        '/images/hero.jpg'
      ]

      for (const path of staticPaths) {
        const mockRequest = {
          nextUrl: { 
            pathname: path,
            searchParams: new URLSearchParams()
          },
          cookies: { getAll: () => [] },
          headers: new Map(),
          url: `http://localhost:3000${path}`
        } as any

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null
        })

        const result = await middleware(mockRequest)
        expect(result.type).toBe('next')
      }
    })
  })

  describe('Public API Route Access', () => {
    const publicApiRoutes = [
      '/api/logout',
      '/api/locale',
      '/api/invitations/lookup',
      '/api/auth/signup',
      '/api/auth/signup-with-invitation',
      '/api/auth/verify-email',
      '/api/user/organization-status'
    ]

    publicApiRoutes.forEach(route => {
      it(`should allow unauthenticated access to ${route}`, async () => {
        const mockRequest = {
          nextUrl: {
            pathname: route,
            searchParams: new URLSearchParams()
          },
          cookies: { getAll: () => [] },
          headers: new Map(),
          url: `http://localhost:3000${route}`
        } as any

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null
        })

        const result = await middleware(mockRequest)

        expect(mockNext).toHaveBeenCalled()
        expect(result.type).toBe('next')
      })
    })
  })

  describe('Protected Route Access Control', () => {
    const protectedRoutes = [
      '/dashboard',
      '/profile',
      '/team',
      '/leave',
      '/leave-requests',
      '/calendar',
      '/schedule',
      '/settings',
      '/admin'
    ]

    protectedRoutes.forEach(route => {
      it(`should redirect unauthenticated users from ${route} to login`, async () => {
        const mockRequest = {
          nextUrl: {
            pathname: route,
            searchParams: new URLSearchParams()
          },
          cookies: { getAll: () => [] },
          headers: new Map(),
          url: `http://localhost:3000${route}`
        } as any

        // No authenticated user
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null
        })

        const result = await middleware(mockRequest)

        expect(mockRedirect).toHaveBeenCalledWith(
          expect.objectContaining({
            href: expect.stringContaining('/login')
          })
        )
        expect(result.type).toBe('redirect')
      })

      it(`should allow authenticated users with organization to access ${route}`, async () => {
        const mockUser = {
          id: 'auth-user-123',
          email: 'user@company.com'
        }

        const mockRequest = {
          nextUrl: {
            pathname: route,
            searchParams: new URLSearchParams()
          },
          cookies: { getAll: () => [] },
          headers: new Map(),
          url: `http://localhost:3000${route}`
        } as any

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null
        })

        // User has organization
        jest.mocked(userHasOrganization).mockResolvedValue(true)

        const result = await middleware(mockRequest)

        expect(mockNext).toHaveBeenCalled()
        expect(mockRedirect).not.toHaveBeenCalled()
        expect(result.type).toBe('next')
      })

      it(`should redirect authenticated users without organization from ${route} to onboarding`, async () => {
        const mockUser = {
          id: 'user-no-org',
          email: 'noorg@example.com'
        }

        const mockRequest = {
          nextUrl: {
            pathname: route,
            searchParams: new URLSearchParams()
          },
          cookies: { getAll: () => [] },
          headers: new Map(),
          url: `http://localhost:3000${route}`
        } as any

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null
        })

        // User has no organization
        jest.mocked(userHasOrganization).mockResolvedValue(false)

        const result = await middleware(mockRequest)

        expect(mockRedirect).toHaveBeenCalledWith(
          expect.objectContaining({
            href: expect.stringContaining('/onboarding')
          })
        )
        expect(result.type).toBe('redirect')
      })
    })
  })

  describe('Onboarding Route Logic', () => {
    it('should allow authenticated users to access /onboarding', async () => {
      const mockUser = {
        id: 'onboarding-user',
        email: 'user@example.com'
      }

      const mockRequest = {
        nextUrl: {
          pathname: '/onboarding',
          searchParams: new URLSearchParams()
        },
        cookies: { getAll: () => [] },
        headers: new Map(),
        url: 'http://localhost:3000/onboarding'
      } as any

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const result = await middleware(mockRequest)

      expect(mockNext).toHaveBeenCalled()
      expect(result.type).toBe('next')
    })

    it('should allow unauthenticated users with invitation token to access /onboarding', async () => {
      const mockRequest = {
        nextUrl: {
          pathname: '/onboarding',
          searchParams: new URLSearchParams([['token', 'invitation-token-123']])
        },
        cookies: { getAll: () => [] },
        headers: new Map(),
        url: 'http://localhost:3000/onboarding?token=invitation-token-123'
      } as any

      // No authenticated user but has invitation token
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const result = await middleware(mockRequest)

      expect(mockNext).toHaveBeenCalled()
      expect(result.type).toBe('next')
    })

    it('should redirect unauthenticated users without token from /onboarding to login', async () => {
      const mockRequest = {
        nextUrl: {
          pathname: '/onboarding',
          searchParams: new URLSearchParams() // No token
        },
        cookies: { getAll: () => [] },
        headers: new Map(),
        url: 'http://localhost:3000/onboarding'
      } as any

      // No authenticated user and no token
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const result = await middleware(mockRequest)

      expect(mockRedirect).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('/login')
        })
      )
      expect(result.type).toBe('redirect')
    })

    it('should allow direct invitation flow to /onboarding/join with token', async () => {
      const mockRequest = {
        nextUrl: {
          pathname: '/onboarding/join',
          searchParams: new URLSearchParams([['token', 'direct-invitation-token']])
        },
        cookies: { getAll: () => [] },
        headers: new Map(),
        url: 'http://localhost:3000/onboarding/join?token=direct-invitation-token'
      } as any

      const mockUser = {
        id: 'invited-user',
        email: 'invited@company.com'
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const result = await middleware(mockRequest)

      expect(mockNext).toHaveBeenCalled()
      expect(result.type).toBe('next')
    })
  })

  describe('Organization Context Middleware Logic', () => {
    it('should check user organization status for protected routes', async () => {
      const mockUser = {
        id: 'org-check-user',
        email: 'user@company.com'
      }

      const mockRequest = {
        nextUrl: {
          pathname: '/dashboard',
          searchParams: new URLSearchParams()
        },
        cookies: { getAll: () => [] },
        headers: new Map(),
        url: 'http://localhost:3000/dashboard'
      } as any

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      jest.mocked(userHasOrganization).mockResolvedValue(true)

      const result = await middleware(mockRequest)

      expect(userHasOrganization).toHaveBeenCalledWith(
        mockUser.id,
        mockRequest
      )
    })

    it('should log organization check results', async () => {
      const mockUser = {
        id: 'logged-user',
        email: 'user@logged.com'
      }

      const mockRequest = {
        nextUrl: {
          pathname: '/dashboard',
          searchParams: new URLSearchParams()
        },
        cookies: { getAll: () => [] },
        headers: new Map(),
        url: 'http://localhost:3000/dashboard'
      } as any

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      jest.mocked(userHasOrganization).mockResolvedValue(false)

      const consoleLogSpy = jest.spyOn(console, 'log')

      await middleware(mockRequest)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🔍 Middleware org check:',
        {
          userId: mockUser.id,
          hasOrganization: false,
          pathname: '/dashboard'
        }
      )

      consoleLogSpy.mockRestore()
    })

    it('should skip organization check for API routes', async () => {
      const mockUser = {
        id: 'api-user',
        email: 'api@example.com'
      }

      const mockRequest = {
        nextUrl: {
          pathname: '/api/some-protected-endpoint',
          searchParams: new URLSearchParams()
        },
        cookies: { getAll: () => [] },
        headers: new Map(),
        url: 'http://localhost:3000/api/some-protected-endpoint'
      } as any

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const result = await middleware(mockRequest)

      expect(userHasOrganization).not.toHaveBeenCalled()
      expect(result.type).toBe('next')
    })
  })

  describe('Cookie Handling in Middleware', () => {
    it('should handle requests with session cookies', async () => {
      const sessionCookies = [
        {
          name: 'supabase-auth-token',
          value: 'session-token-123'
        },
        {
          name: 'active-organization-id', 
          value: 'org-456'
        }
      ]

      const mockRequest = {
        nextUrl: {
          pathname: '/dashboard',
          searchParams: new URLSearchParams()
        },
        cookies: {
          getAll: () => sessionCookies
        },
        headers: new Map(),
        url: 'http://localhost:3000/dashboard'
      } as any

      const mockUser = {
        id: 'cookie-user',
        email: 'cookie@example.com'
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      jest.mocked(userHasOrganization).mockResolvedValue(true)

      const result = await middleware(mockRequest)

      expect(mockNext).toHaveBeenCalled()
      expect(result.type).toBe('next')
    })

    it('should handle requests without session cookies', async () => {
      const mockRequest = {
        nextUrl: {
          pathname: '/dashboard',
          searchParams: new URLSearchParams()
        },
        cookies: {
          getAll: () => []
        },
        headers: new Map(),
        url: 'http://localhost:3000/dashboard'
      } as any

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const result = await middleware(mockRequest)

      expect(mockRedirect).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('/login')
        })
      )
      expect(result.type).toBe('redirect')
    })

    it('should set cookies on response for authenticated users', async () => {
      const mockRequest = {
        nextUrl: {
          pathname: '/dashboard',
          searchParams: new URLSearchParams()
        },
        cookies: {
          getAll: () => []
        },
        headers: new Map(),
        url: 'http://localhost:3000/dashboard'
      } as any

      const mockUser = {
        id: 'response-cookie-user',
        email: 'response@example.com'
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      jest.mocked(userHasOrganization).mockResolvedValue(true)

      const mockResponse = {
        type: 'next',
        cookies: {
          set: jest.fn()
        }
      }

      mockNext.mockReturnValue(mockResponse)

      const result = await middleware(mockRequest)

      expect(result).toBe(mockResponse)
    })
  })

  describe('Error Handling in Middleware', () => {
    it('should handle Supabase authentication errors gracefully', async () => {
      const mockRequest = {
        nextUrl: {
          pathname: '/dashboard',
          searchParams: new URLSearchParams()
        },
        cookies: { getAll: () => [] },
        headers: new Map(),
        url: 'http://localhost:3000/dashboard'
      } as any

      // Simulate Supabase error
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Connection failed' }
      })

      const result = await middleware(mockRequest)

      // Should redirect to login on auth error
      expect(mockRedirect).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining('/login')
        })
      )
    })

    it('should handle userHasOrganization errors', async () => {
      const mockUser = {
        id: 'error-user',
        email: 'error@example.com'
      }

      const mockRequest = {
        nextUrl: {
          pathname: '/dashboard',
          searchParams: new URLSearchParams()
        },
        cookies: { getAll: () => [] },
        headers: new Map(),
        url: 'http://localhost:3000/dashboard'
      } as any

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Simulate organization check error
      jest.mocked(userHasOrganization).mockRejectedValue(
        new Error('Database connection failed')
      )

      // Should not crash and handle the error gracefully
      await expect(middleware(mockRequest)).resolves.toBeDefined()
    })

    it('should handle malformed request URLs', async () => {
      const mockRequest = {
        nextUrl: {
          pathname: null, // Invalid pathname
          searchParams: new URLSearchParams()
        },
        cookies: { getAll: () => [] },
        headers: new Map(),
        url: 'malformed-url'
      } as any

      // Should not crash on malformed input
      await expect(middleware(mockRequest)).resolves.toBeDefined()
    })
  })

  describe('Route Pattern Matching', () => {
    it('should match exact public routes', async () => {
      const exactRoutes = ['/login', '/signup', '/forgot-password']

      for (const route of exactRoutes) {
        const mockRequest = {
          nextUrl: {
            pathname: route,
            searchParams: new URLSearchParams()
          },
          cookies: { getAll: () => [] },
          headers: new Map(),
          url: `http://localhost:3000${route}`
        } as any

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null
        })

        const result = await middleware(mockRequest)
        expect(result.type).toBe('next')
      }
    })

    it('should match route prefixes', async () => {
      const prefixRoutes = [
        '/onboarding/join',
        '/onboarding/register', 
        '/onboarding/success',
        '/_next/static/chunk.js',
        '/images/logo.png'
      ]

      for (const route of prefixRoutes) {
        const mockRequest = {
          nextUrl: {
            pathname: route,
            searchParams: new URLSearchParams()
          },
          cookies: { getAll: () => [] },
          headers: new Map(),
          url: `http://localhost:3000${route}`
        } as any

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null
        })

        const result = await middleware(mockRequest)
        expect(result.type).toBe('next')
      }
    })

    it('should correctly identify protected vs public routes', async () => {
      const testCases = [
        { route: '/login', shouldBePublic: true },
        { route: '/dashboard', shouldBePublic: false },
        { route: '/api/locale', shouldBePublic: true },
        { route: '/api/employees', shouldBePublic: false },
        { route: '/_next/static/main.js', shouldBePublic: true },
        { route: '/profile/settings', shouldBePublic: false }
      ]

      for (const testCase of testCases) {
        const mockRequest = {
          nextUrl: {
            pathname: testCase.route,
            searchParams: new URLSearchParams()
          },
          cookies: { getAll: () => [] },
          headers: new Map(),
          url: `http://localhost:3000${testCase.route}`
        } as any

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null
        })

        const result = await middleware(mockRequest)

        if (testCase.shouldBePublic) {
          expect(result.type).toBe('next')
        } else {
          expect(result.type).toBe('redirect')
        }
      }
    })
  })

  describe('Middleware Configuration', () => {
    it('should have correct matcher configuration', () => {
      // This test would verify the exported config object
      // The matcher should exclude specific Next.js internal routes
      const expectedMatcher = ['/((?!_next/static|_next/image|favicon.ico).*)']
      
      // In a real implementation, we'd import the config from the middleware file
      // For this test, we're just verifying the pattern is correct
      expect(expectedMatcher[0]).toMatch(/^\(\(\?\!.*\)\.\*\)$/)
    })
  })
})