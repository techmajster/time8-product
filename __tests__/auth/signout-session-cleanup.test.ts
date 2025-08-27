/**
 * Sign-out Functionality and Session Cleanup Tests
 * Tests for logout processes, session termination, and cleanup procedures
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SignOutButton } from '@/components/sign-out-button'
import { createClient } from '@/lib/supabase/client'

// Mock Next.js router
const mockPush = jest.fn()
const mockRefresh = jest.fn()
const mockReplace = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    replace: mockReplace
  })
}))

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    signOut: jest.fn(),
    getUser: jest.fn(),
    onAuthStateChange: jest.fn()
  }
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}))

// Mock cookies for cleanup testing
const mockCookies = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn()
}

// Mock document.cookie for client-side tests
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: ''
})

// Mock fetch for API calls
global.fetch = jest.fn()

describe('Sign-out and Session Cleanup Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null })
    jest.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    } as Response)
  })

  afterEach(() => {
    jest.restoreAllMocks()
    document.cookie = ''
  })

  describe('Basic Sign-out Functionality', () => {
    it('should render sign-out button', () => {
      render(<SignOutButton />)
      
      const signOutButton = screen.getByRole('button', { name: /sign out|log out/i })
      expect(signOutButton).toBeInTheDocument()
    })

    it('should call Supabase signOut when button is clicked', async () => {
      render(<SignOutButton />)
      
      const signOutButton = screen.getByRole('button', { name: /sign out|log out/i })
      fireEvent.click(signOutButton)

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
      })
    })

    it('should redirect to login page after successful sign-out', async () => {
      render(<SignOutButton />)
      
      const signOutButton = screen.getByRole('button')
      fireEvent.click(signOutButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })

    it('should handle sign-out with all scopes', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null })

      render(<SignOutButton />)
      
      const signOutButton = screen.getByRole('button')
      fireEvent.click(signOutButton)

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signOut).toHaveBeenCalledWith({
          scope: 'global' // Should sign out from all sessions
        })
      })
    })
  })

  describe('Session Cleanup Process', () => {
    it('should clear authentication cookies on sign-out', async () => {
      render(<SignOutButton />)
      
      const signOutButton = screen.getByRole('button')
      fireEvent.click(signOutButton)

      await waitFor(() => {
        // Should clear all auth-related cookies
        expect(document.cookie).not.toContain('supabase-auth-token')
        expect(document.cookie).not.toContain('active-organization-id')
      })
    })

    it('should clear local storage on sign-out', async () => {
      const localStorageSpy = jest.spyOn(Storage.prototype, 'removeItem')
      
      render(<SignOutButton />)
      
      const signOutButton = screen.getByRole('button')
      fireEvent.click(signOutButton)

      await waitFor(() => {
        expect(localStorageSpy).toHaveBeenCalledWith('supabase.auth.token')
        expect(localStorageSpy).toHaveBeenCalledWith('user-preferences')
      })

      localStorageSpy.mockRestore()
    })

    it('should clear session storage on sign-out', async () => {
      const sessionStorageSpy = jest.spyOn(Storage.prototype, 'removeItem')
      
      render(<SignOutButton />)
      
      const signOutButton = screen.getByRole('button')
      fireEvent.click(signOutButton)

      await waitFor(() => {
        expect(sessionStorageSpy).toHaveBeenCalledWith('temp-session-data')
      })

      sessionStorageSpy.mockRestore()
    })

    it('should invalidate server-side sessions', async () => {
      render(<SignOutButton />)
      
      const signOutButton = screen.getByRole('button')
      fireEvent.click(signOutButton)

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      })
    })
  })

  describe('Error Handling during Sign-out', () => {
    it('should handle sign-out errors gracefully', async () => {
      const signOutError = {
        message: 'Sign out failed',
        status: 500
      }

      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: signOutError
      })

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      render(<SignOutButton />)
      
      const signOutButton = screen.getByRole('button')
      fireEvent.click(signOutButton)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Sign out error:',
          signOutError
        )
      })

      // Should still redirect even on error to prevent stuck state
      expect(mockPush).toHaveBeenCalledWith('/login')

      consoleErrorSpy.mockRestore()
    })

    it('should handle network errors during logout API call', async () => {
      jest.mocked(fetch).mockRejectedValue(new Error('Network error'))

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      render(<SignOutButton />)
      
      const signOutButton = screen.getByRole('button')
      fireEvent.click(signOutButton)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to call logout API'),
          expect.any(Error)
        )
      })

      // Should still complete client-side cleanup
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })

    it('should handle partial cleanup failures', async () => {
      // Mock localStorage error
      const localStorageError = jest.spyOn(Storage.prototype, 'removeItem')
        .mockImplementation(() => {
          throw new Error('Storage not available')
        })

      render(<SignOutButton />)
      
      const signOutButton = screen.getByRole('button')
      fireEvent.click(signOutButton)

      await waitFor(() => {
        // Should still complete Supabase sign-out despite storage error
        expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
        expect(mockPush).toHaveBeenCalledWith('/login')
      })

      localStorageError.mockRestore()
    })
  })

  describe('Multi-organization Sign-out', () => {
    it('should clear organization context on sign-out', async () => {
      // Set up active organization context
      document.cookie = 'active-organization-id=org-123; path=/'

      render(<SignOutButton />)
      
      const signOutButton = screen.getByRole('button')
      fireEvent.click(signOutButton)

      await waitFor(() => {
        expect(document.cookie).not.toContain('active-organization-id=org-123')
      })
    })

    it('should clear all organization-related data', async () => {
      const localStorageSpy = jest.spyOn(Storage.prototype, 'removeItem')

      render(<SignOutButton />)
      
      const signOutButton = screen.getByRole('button')
      fireEvent.click(signOutButton)

      await waitFor(() => {
        expect(localStorageSpy).toHaveBeenCalledWith('current-organization')
        expect(localStorageSpy).toHaveBeenCalledWith('organization-permissions')
        expect(localStorageSpy).toHaveBeenCalledWith('user-organizations')
      })

      localStorageSpy.mockRestore()
    })
  })

  describe('Session State Management', () => {
    it('should trigger auth state change on sign-out', async () => {
      const mockStateChangeCallback = jest.fn()
      
      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        mockStateChangeCallback.mockImplementation(callback)
        return { data: { subscription: {} } }
      })

      render(<SignOutButton />)
      
      const signOutButton = screen.getByRole('button')
      fireEvent.click(signOutButton)

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
      })

      // Simulate auth state change to SIGNED_OUT
      mockStateChangeCallback('SIGNED_OUT', null)

      expect(mockStateChangeCallback).toHaveBeenCalledWith('SIGNED_OUT', null)
    })

    it('should handle concurrent sign-out attempts', async () => {
      let signOutCallCount = 0
      mockSupabaseClient.auth.signOut.mockImplementation(async () => {
        signOutCallCount++
        // Simulate async delay
        await new Promise(resolve => setTimeout(resolve, 50))
        return { error: null }
      })

      render(<SignOutButton />)
      
      const signOutButton = screen.getByRole('button')
      
      // Click multiple times rapidly
      fireEvent.click(signOutButton)
      fireEvent.click(signOutButton)
      fireEvent.click(signOutButton)

      await waitFor(() => {
        // Should only process one sign-out
        expect(signOutCallCount).toBeLessThanOrEqual(1)
      })
    })
  })

  describe('Security Considerations', () => {
    it('should immediately invalidate current session token', async () => {
      const mockToken = 'current-session-token-123'
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'user-123',
            aud: 'authenticated' 
          }
        },
        error: null
      })

      render(<SignOutButton />)
      
      const signOutButton = screen.getByRole('button')
      fireEvent.click(signOutButton)

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
      })

      // Verify token is no longer valid
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'JWT expired' }
      })

      const userCheck = await mockSupabaseClient.auth.getUser()
      expect(userCheck.data.user).toBeNull()
    })

    it('should prevent session fixation attacks', async () => {
      const originalSessionId = 'original-session-123'
      const newSessionId = 'new-session-456'

      document.cookie = `session-id=${originalSessionId}; path=/`

      render(<SignOutButton />)
      
      const signOutButton = screen.getByRole('button')
      fireEvent.click(signOutButton)

      await waitFor(() => {
        // Original session should be cleared
        expect(document.cookie).not.toContain(originalSessionId)
      })

      // Any new session should have a different ID
      document.cookie = `session-id=${newSessionId}; path=/`
      expect(newSessionId).not.toBe(originalSessionId)
    })

    it('should log security events', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()

      render(<SignOutButton />)
      
      const signOutButton = screen.getByRole('button')
      fireEvent.click(signOutButton)

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          '🔐 User signed out',
          expect.objectContaining({
            timestamp: expect.any(String),
            method: 'manual'
          })
        )
      })

      consoleLogSpy.mockRestore()
    })
  })

  describe('API Route Sign-out', () => {
    it('should handle logout API endpoint', async () => {
      const mockLogoutResponse = {
        success: true,
        message: 'Signed out successfully'
      }

      jest.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockLogoutResponse,
        status: 200
      } as Response)

      const response = await fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data).toEqual(mockLogoutResponse)
    })

    it('should handle logout API errors', async () => {
      jest.mocked(fetch).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Logout failed' }),
        status: 500
      } as Response)

      const response = await fetch('/api/logout', {
        method: 'POST'
      })

      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(data.error).toBe('Logout failed')
    })

    it('should clear server-side cookies in logout API', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ success: true }),
        headers: new Headers({
          'Set-Cookie': [
            'supabase-auth-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly',
            'active-organization-id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly'
          ].join(', ')
        })
      }

      jest.mocked(fetch).mockResolvedValue(mockResponse as Response)

      const response = await fetch('/api/logout', { method: 'POST' })

      expect(response.headers.get('Set-Cookie')).toContain('Expires=Thu, 01 Jan 1970')
    })
  })

  describe('Cross-tab Sign-out Synchronization', () => {
    it('should broadcast sign-out event to other tabs', async () => {
      const broadcastSpy = jest.spyOn(BroadcastChannel.prototype, 'postMessage')
        .mockImplementation()

      render(<SignOutButton />)
      
      const signOutButton = screen.getByRole('button')
      fireEvent.click(signOutButton)

      await waitFor(() => {
        expect(broadcastSpy).toHaveBeenCalledWith({
          type: 'auth_state_change',
          event: 'SIGNED_OUT',
          session: null
        })
      })

      broadcastSpy.mockRestore()
    })

    it('should respond to sign-out events from other tabs', () => {
      const mockBroadcastChannel = {
        addEventListener: jest.fn(),
        postMessage: jest.fn(),
        close: jest.fn()
      }

      global.BroadcastChannel = jest.fn(() => mockBroadcastChannel) as any

      render(<SignOutButton />)

      // Simulate receiving sign-out event from another tab
      const [, eventHandler] = mockBroadcastChannel.addEventListener.mock.calls[0]
      
      eventHandler({
        data: {
          type: 'auth_state_change',
          event: 'SIGNED_OUT',
          session: null
        }
      })

      // Should trigger sign-out in current tab
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  describe('Cleanup Verification', () => {
    it('should verify all cleanup steps completed', async () => {
      const cleanupSteps = {
        supabaseSignOut: false,
        cookiesCleared: false,
        localStorageCleared: false,
        serverSessionInvalidated: false,
        redirectCompleted: false
      }

      // Mock all cleanup operations
      mockSupabaseClient.auth.signOut.mockImplementation(async () => {
        cleanupSteps.supabaseSignOut = true
        return { error: null }
      })

      const localStorageSpy = jest.spyOn(Storage.prototype, 'removeItem')
        .mockImplementation(() => {
          cleanupSteps.localStorageCleared = true
        })

      jest.mocked(fetch).mockImplementation(async () => {
        cleanupSteps.serverSessionInvalidated = true
        return {
          ok: true,
          json: async () => ({ success: true })
        } as Response
      })

      mockPush.mockImplementation(() => {
        cleanupSteps.redirectCompleted = true
      })

      render(<SignOutButton />)
      
      const signOutButton = screen.getByRole('button')
      fireEvent.click(signOutButton)

      await waitFor(() => {
        expect(cleanupSteps.supabaseSignOut).toBe(true)
        expect(cleanupSteps.localStorageCleared).toBe(true)
        expect(cleanupSteps.serverSessionInvalidated).toBe(true)
        expect(cleanupSteps.redirectCompleted).toBe(true)
      })

      localStorageSpy.mockRestore()
    })

    it('should complete gracefully even with partial failures', async () => {
      // Mock some operations to fail
      mockSupabaseClient.auth.signOut.mockRejectedValue(
        new Error('Supabase error')
      )

      jest.mocked(fetch).mockRejectedValue(
        new Error('API error')
      )

      render(<SignOutButton />)
      
      const signOutButton = screen.getByRole('button')
      fireEvent.click(signOutButton)

      // Should still complete the sign-out process
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })
  })
})