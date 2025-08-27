/**
 * Auth State Hydration and Page Navigation Tests
 * Tests for authentication state persistence, hydration, and navigation flows
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { render, screen, waitFor, act } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import React from 'react'

// Mock Next.js modules
const mockPush = jest.fn()
const mockReplace = jest.fn()
const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
    replace: mockReplace,
    refresh: mockRefresh
  })),
  usePathname: jest.fn(() => '/dashboard'),
  useSearchParams: jest.fn(() => new URLSearchParams())
}))

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
    refreshSession: jest.fn(),
    setSession: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn()
  }))
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient
}))

// Mock auth utils
jest.mock('@/lib/auth-utils-v2', () => ({
  authenticateAndGetOrgContext: jest.fn(),
  setActiveOrganization: jest.fn()
}))

// Test component that uses auth state
const TestAuthComponent: React.FC<{ requireAuth?: boolean }> = ({ requireAuth = true }) => {
  const router = useRouter()
  const [user, setUser] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [organizationId, setOrganizationId] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        const { data: { user }, error } = await mockSupabaseClient.auth.getUser()
        
        if (!mounted) return

        if (error) {
          console.error('Auth error:', error)
          if (requireAuth) {
            router.push('/login')
          }
          return
        }

        if (user) {
          setUser(user)
          
          // Check for organization context
          const orgCookie = document.cookie
            .split('; ')
            .find(row => row.startsWith('active-organization-id='))
            ?.split('=')[1]
          
          setOrganizationId(orgCookie || null)
        } else if (requireAuth) {
          router.push('/login')
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (requireAuth) {
          router.push('/login')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    // Set up auth state change listener
    const { data: { subscription } } = mockSupabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        console.log('Auth state change:', event, session?.user?.id)
        
        switch (event) {
          case 'SIGNED_IN':
            setUser(session?.user || null)
            break
          case 'SIGNED_OUT':
            setUser(null)
            setOrganizationId(null)
            if (requireAuth) {
              router.push('/login')
            }
            break
          case 'TOKEN_REFRESHED':
            setUser(session?.user || null)
            break
        }
      }
    )

    initAuth()

    return () => {
      mounted = false
      subscription?.unsubscribe?.()
    }
  }, [requireAuth, router])

  if (loading) {
    return <div data-testid="auth-loading">Loading...</div>
  }

  if (requireAuth && !user) {
    return <div data-testid="auth-redirecting">Redirecting...</div>
  }

  return (
    <div data-testid="auth-content">
      <div data-testid="user-id">{user?.id || 'No user'}</div>
      <div data-testid="organization-id">{organizationId || 'No organization'}</div>
      <div data-testid="auth-status">{user ? 'Authenticated' : 'Not authenticated'}</div>
    </div>
  )
}

describe('Auth State Hydration and Navigation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset document.cookie
    document.cookie = ''
    
    // Mock auth state change subscription
    mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: jest.fn()
        }
      }
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Initial Auth State Hydration', () => {
    it('should hydrate authenticated user state correctly', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        aud: 'authenticated'
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      document.cookie = 'active-organization-id=org-456'

      render(<TestAuthComponent />)

      expect(screen.getByTestId('auth-loading')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByTestId('user-id')).toHaveTextContent('user-123')
        expect(screen.getByTestId('organization-id')).toHaveTextContent('org-456')
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
      })

      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should handle unauthenticated state and redirect', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      render(<TestAuthComponent requireAuth={true} />)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })

    it('should handle auth errors during hydration', async () => {
      const authError = new Error('Authentication failed')
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: authError
      })

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      render(<TestAuthComponent />)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Auth error:', authError)
        expect(mockPush).toHaveBeenCalledWith('/login')
      })

      consoleErrorSpy.mockRestore()
    })

    it('should handle missing organization context', async () => {
      const mockUser = {
        id: 'user-no-org',
        email: 'noorg@example.com'
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // No organization cookie
      document.cookie = ''

      render(<TestAuthComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('user-id')).toHaveTextContent('user-no-org')
        expect(screen.getByTestId('organization-id')).toHaveTextContent('No organization')
      })
    })
  })

  describe('Auth State Change Handling', () => {
    it('should handle SIGNED_IN auth state change', async () => {
      const mockUser = {
        id: 'new-user-123',
        email: 'newuser@example.com'
      }

      // Initially no user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      let authStateCallback: any

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn()
            }
          }
        }
      })

      render(<TestAuthComponent requireAuth={false} />)

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Not authenticated')
      })

      // Simulate sign-in event
      act(() => {
        authStateCallback('SIGNED_IN', { user: mockUser })
      })

      await waitFor(() => {
        expect(screen.getByTestId('user-id')).toHaveTextContent('new-user-123')
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
      })
    })

    it('should handle SIGNED_OUT auth state change', async () => {
      const mockUser = {
        id: 'signing-out-user',
        email: 'signout@example.com'
      }

      // Initially authenticated
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      let authStateCallback: any

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn()
            }
          }
        }
      })

      render(<TestAuthComponent requireAuth={true} />)

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
      })

      // Simulate sign-out event
      act(() => {
        authStateCallback('SIGNED_OUT', null)
      })

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })

    it('should handle TOKEN_REFRESHED auth state change', async () => {
      const mockUser = {
        id: 'refresh-user',
        email: 'refresh@example.com'
      }

      const refreshedUser = {
        ...mockUser,
        updated_at: new Date().toISOString()
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      let authStateCallback: any

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn()
            }
          }
        }
      })

      render(<TestAuthComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
      })

      // Simulate token refresh event
      act(() => {
        authStateCallback('TOKEN_REFRESHED', { user: refreshedUser })
      })

      await waitFor(() => {
        expect(screen.getByTestId('user-id')).toHaveTextContent('refresh-user')
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
      })
    })
  })

  describe('Navigation Flow Integration', () => {
    it('should preserve auth state during navigation', async () => {
      const mockUser = {
        id: 'nav-user',
        email: 'nav@example.com'
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const { rerender } = render(<TestAuthComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
      })

      // Simulate navigation by re-rendering
      rerender(<TestAuthComponent />)

      // Auth state should be preserved
      await waitFor(() => {
        expect(screen.getByTestId('user-id')).toHaveTextContent('nav-user')
      })

      // Should not trigger additional auth calls
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledTimes(1)
    })

    it('should handle page refresh with valid session', async () => {
      const mockUser = {
        id: 'refresh-session-user',
        email: 'session@example.com'
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: mockUser,
            access_token: 'valid-token',
            expires_at: Date.now() + 3600000 // 1 hour from now
          }
        },
        error: null
      })

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      render(<TestAuthComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
      })
    })

    it('should handle page refresh with expired session', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: null,
            access_token: 'expired-token',
            expires_at: Date.now() - 3600000 // 1 hour ago
          }
        },
        error: null
      })

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'JWT expired' }
      })

      render(<TestAuthComponent />)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })
  })

  describe('Organization Context Hydration', () => {
    it('should hydrate organization context from cookies', async () => {
      const mockUser = {
        id: 'org-context-user',
        email: 'org@company.com'
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      document.cookie = 'active-organization-id=org-company-123'

      render(<TestAuthComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('organization-id')).toHaveTextContent('org-company-123')
      })
    })

    it('should handle multiple organization cookies', async () => {
      const mockUser = {
        id: 'multi-org-user',
        email: 'multi@example.com'
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Multiple cookies, should use the active one
      document.cookie = 'old-organization-id=org-old; active-organization-id=org-active'

      render(<TestAuthComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('organization-id')).toHaveTextContent('org-active')
      })
    })

    it('should handle corrupted organization cookie', async () => {
      const mockUser = {
        id: 'corrupted-cookie-user',
        email: 'corrupted@example.com'
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Corrupted cookie value
      document.cookie = 'active-organization-id=%invalid%'

      render(<TestAuthComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('organization-id')).toHaveTextContent('No organization')
      })
    })
  })

  describe('Session Recovery and Persistence', () => {
    it('should recover session from localStorage', async () => {
      const mockSession = {
        access_token: 'stored-token',
        refresh_token: 'stored-refresh',
        user: {
          id: 'stored-user',
          email: 'stored@example.com'
        },
        expires_at: Date.now() + 3600000
      }

      // Mock localStorage
      const localStorageMock = {
        getItem: jest.fn().mockReturnValue(JSON.stringify(mockSession)),
        setItem: jest.fn(),
        removeItem: jest.fn()
      }

      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock
      })

      mockSupabaseClient.auth.setSession.mockResolvedValue({
        data: { session: mockSession, user: mockSession.user },
        error: null
      })

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockSession.user },
        error: null
      })

      render(<TestAuthComponent />)

      await waitFor(() => {
        expect(localStorageMock.getItem).toHaveBeenCalledWith('supabase.auth.token')
        expect(mockSupabaseClient.auth.setSession).toHaveBeenCalledWith(mockSession)
        expect(screen.getByTestId('user-id')).toHaveTextContent('stored-user')
      })
    })

    it('should handle invalid localStorage session data', async () => {
      const localStorageMock = {
        getItem: jest.fn().mockReturnValue('invalid-json'),
        setItem: jest.fn(),
        removeItem: jest.fn()
      }

      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock
      })

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      render(<TestAuthComponent />)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })

      // Should clean up invalid data
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('supabase.auth.token')
    })

    it('should persist session updates to localStorage', async () => {
      const mockUser = {
        id: 'persist-user',
        email: 'persist@example.com'
      }

      const localStorageMock = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn()
      }

      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock
      })

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      let authStateCallback: any

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn()
            }
          }
        }
      })

      render(<TestAuthComponent />)

      // Simulate token refresh
      const newSession = {
        access_token: 'new-token',
        user: mockUser,
        expires_at: Date.now() + 3600000
      }

      act(() => {
        authStateCallback('TOKEN_REFRESHED', newSession)
      })

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'supabase.auth.token',
          JSON.stringify(newSession)
        )
      })
    })
  })

  describe('Component Lifecycle and Cleanup', () => {
    it('should unsubscribe from auth state changes on unmount', async () => {
      const mockUnsubscribe = jest.fn()

      mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
        data: {
          subscription: {
            unsubscribe: mockUnsubscribe
          }
        }
      })

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const { unmount } = render(<TestAuthComponent requireAuth={false} />)

      unmount()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })

    it('should handle rapid mount/unmount cycles', async () => {
      mockSupabaseClient.auth.getUser.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          data: { user: null },
          error: null
        }), 100))
      )

      const { unmount } = render(<TestAuthComponent requireAuth={false} />)
      
      // Unmount before auth resolution
      unmount()

      // Should not cause state updates after unmount
      await new Promise(resolve => setTimeout(resolve, 150))

      // No errors should be thrown
    })

    it('should handle concurrent auth operations', async () => {
      let resolveAuth: (value: any) => void
      const authPromise = new Promise(resolve => {
        resolveAuth = resolve
      })

      mockSupabaseClient.auth.getUser.mockReturnValue(authPromise)

      render(<TestAuthComponent />)

      // Trigger multiple concurrent operations
      mockSupabaseClient.auth.refreshSession()
      mockSupabaseClient.auth.getSession()

      resolveAuth({
        data: { 
          user: { 
            id: 'concurrent-user',
            email: 'concurrent@example.com'
          }
        },
        error: null
      })

      await waitFor(() => {
        expect(screen.getByTestId('user-id')).toHaveTextContent('concurrent-user')
      })
    })
  })
})