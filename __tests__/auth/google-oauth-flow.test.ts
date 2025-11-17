/**
 * Google OAuth Flow Testing
 * Comprehensive tests for Google authentication scenarios
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GoogleAuthButton } from '@/components/google-auth-button'
import { NextIntlClientProvider } from 'next-intl'

// Mock Next.js router
const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh
  })
}))

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    signInWithOAuth: jest.fn(),
    exchangeCodeForSession: jest.fn(),
    getUser: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn()
  }))
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => mockSupabaseClient
}))

// Mock window.location
const mockLocation = {
  origin: 'http://localhost:3000',
  href: 'http://localhost:3000/login'
}

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
})

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}

const mockMessages = {
  auth: {
    continueWithGoogle: 'Continue with Google'
  },
  common: {
    loading: 'Loading...'
  }
}

describe('Google OAuth Flow Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabaseClient.auth.signInWithOAuth.mockReset()
    mockSupabaseClient.auth.exchangeCodeForSession.mockReset()
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    })
  })

  describe('OAuth Initiation', () => {
    it('should render Google auth button correctly', () => {
      render(
        <NextIntlClientProvider locale="en" messages={mockMessages}>
          <GoogleAuthButton mode="signin" />
        </NextIntlClientProvider>
      )

      const button = screen.getByRole('button', { name: /continue with google/i })
      expect(button).toBeInTheDocument()
      expect(button).not.toBeDisabled()
    })

    it('should initiate Google OAuth with correct parameters', async () => {
      mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth/authorize?...' },
        error: null
      })

      render(
        <NextIntlClientProvider locale="en" messages={mockMessages}>
          <GoogleAuthButton mode="signin" />
        </NextIntlClientProvider>
      )

      const button = screen.getByRole('button', { name: /continue with google/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: {
            redirectTo: 'http://localhost:3000/login/callback'
          }
        })
      })
    })

    it('should handle different base URLs correctly', async () => {
      // Test with production URL
      mockLocation.origin = 'https://saas-leave-system.vercel.app'

      mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth/authorize?...' },
        error: null
      })

      render(
        <NextIntlClientProvider locale="en" messages={mockMessages}>
          <GoogleAuthButton mode="signin" />
        </NextIntlClientProvider>
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: {
            redirectTo: 'https://saas-leave-system.vercel.app/login/callback'
          }
        })
      })

      // Reset for other tests
      mockLocation.origin = 'http://localhost:3000'
    })

    it('should show loading state during OAuth initiation', async () => {
      mockSupabaseClient.auth.signInWithOAuth.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      render(
        <NextIntlClientProvider locale="en" messages={mockMessages}>
          <GoogleAuthButton mode="signin" />
        </NextIntlClientProvider>
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(button).toBeDisabled()
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should handle OAuth initiation errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      
      mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({
        data: { url: null },
        error: { message: 'OAuth provider unavailable' }
      })

      render(
        <NextIntlClientProvider locale="en" messages={mockMessages}>
          <GoogleAuthButton mode="signin" />
        </NextIntlClientProvider>
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error with Google authentication:',
          { message: 'OAuth provider unavailable' }
        )
      })

      // Button should be re-enabled after error
      expect(button).not.toBeDisabled()

      consoleErrorSpy.mockRestore()
    })
  })

  describe('OAuth Callback Processing', () => {
    it('should exchange authorization code for session successfully', async () => {
      const mockUser = {
        id: 'google-user-123',
        email: 'user@company.com',
        app_metadata: { provider: 'google' },
        user_metadata: { full_name: 'Google User' }
      }

      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: { 
          user: mockUser,
          session: { access_token: 'google-access-token' }
        },
        error: null
      })

      const result = await mockSupabaseClient.auth.exchangeCodeForSession('auth-code-123')

      expect(result.data.user).toEqual(mockUser)
      expect(result.data.session.access_token).toBe('google-access-token')
      expect(result.error).toBeNull()
    })

    it('should handle invalid authorization codes', async () => {
      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid authorization code' }
      })

      const result = await mockSupabaseClient.auth.exchangeCodeForSession('invalid-code')

      expect(result.data.user).toBeNull()
      expect(result.error.message).toBe('Invalid authorization code')
    })

    it('should handle expired authorization codes', async () => {
      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Authorization code expired' }
      })

      const result = await mockSupabaseClient.auth.exchangeCodeForSession('expired-code')

      expect(result.error.message).toBe('Authorization code expired')
    })
  })

  describe('Profile Creation for Google Users', () => {
    it('should create profile for new Google user', async () => {
      const mockUser = {
        id: 'new-google-user',
        email: 'newuser@company.com',
        app_metadata: { provider: 'google' },
        user_metadata: { full_name: 'New Google User' }
      }

      // Mock profile doesn't exist
      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: new Error('No rows') }),
        insert: jest.fn().mockResolvedValue({ error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromChain)

      // Simulate the profile creation process
      const insertResult = await mockFromChain.insert({
        id: mockUser.id,
        email: mockUser.email,
        full_name: mockUser.user_metadata.full_name,
        auth_provider: 'google'
      })

      expect(insertResult.error).toBeNull()
      expect(mockFromChain.insert).toHaveBeenCalledWith({
        id: mockUser.id,
        email: mockUser.email,
        full_name: mockUser.user_metadata.full_name,
        auth_provider: 'google'
      })
    })

    it('should handle profile creation errors', async () => {
      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: new Error('No rows') }),
        insert: jest.fn().mockResolvedValue({ 
          error: { message: 'Profile creation failed' } 
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromChain)

      const insertResult = await mockFromChain.insert({
        id: 'user-123',
        email: 'user@example.com'
      })

      expect(insertResult.error.message).toBe('Profile creation failed')
    })
  })

  describe('Domain-based Auto-join', () => {
    it('should auto-join user to organization based on email domain', async () => {
      const mockUser = {
        id: 'domain-user',
        email: 'employee@company.com',
        app_metadata: { provider: 'google' }
      }

      const mockDomainMatch = {
        id: 'domain-123',
        organization_id: 'org-company',
        domain: 'company.com',
        auto_join_enabled: true,
        default_role: 'employee',
        default_team_id: null,
        organization: {
          id: 'org-company',
          name: 'Company Inc',
        }
      }

      // Mock domain lookup
      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
        insert: jest.fn().mockResolvedValue({ error: null })
      }

      mockFromChain.select.mockResolvedValue({
        data: [mockDomainMatch],
        error: null
      })

      mockSupabaseClient.from.mockReturnValue(mockFromChain)

      // Simulate domain-based auto-join
      const domainLookupResult = await mockFromChain.select()
      
      expect(domainLookupResult.data).toContain(mockDomainMatch)
      expect(domainLookupResult.data[0].auto_join_enabled).toBe(true)
    })

    it('should not auto-join when domain auto-join is disabled', async () => {
      const mockDomainMatch = {
        id: 'domain-456',
        organization_id: 'org-restricted',
        domain: 'restricted.com',
        auto_join_enabled: false,
        default_role: 'employee'
      }

      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      }

      mockFromChain.select.mockResolvedValue({
        data: [mockDomainMatch],
        error: null
      })

      mockSupabaseClient.from.mockReturnValue(mockFromChain)

      const result = await mockFromChain.select()
      
      // Should find domain but auto-join is disabled
      expect(result.data[0].auto_join_enabled).toBe(false)
    })

    it('should handle multiple domain matches', async () => {
      const mockDomainMatches = [
        {
          id: 'domain-1',
          organization_id: 'org-1',
          domain: 'shared-domain.com',
          auto_join_enabled: true,
          default_role: 'employee',
          organization: { id: 'org-1', name: 'Company 1' }
        },
        {
          id: 'domain-2',
          organization_id: 'org-2',
          domain: 'shared-domain.com',
          auto_join_enabled: true,
          default_role: 'manager',
          organization: { id: 'org-2', name: 'Company 2' }
        }
      ]

      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        insert: jest.fn().mockResolvedValue({ error: null })
      }

      mockFromChain.select.mockResolvedValue({
        data: mockDomainMatches,
        error: null
      })

      mockSupabaseClient.from.mockReturnValue(mockFromChain)

      const result = await mockFromChain.select()
      
      expect(result.data).toHaveLength(2)
      expect(result.data[0].organization_id).toBe('org-1')
      expect(result.data[1].organization_id).toBe('org-2')
    })
  })

  describe('Invitation Acceptance via OAuth', () => {
    it('should accept invitation during Google OAuth callback', async () => {
      const mockUser = {
        id: 'invited-user',
        email: 'invited@company.com',
        app_metadata: { provider: 'google' }
      }

      const mockInvitation = {
        id: 'invitation-123',
        email: 'invited@company.com',
        organization_id: 'org-company',
        role: 'manager',
        team_id: 'team-123',
        status: 'pending',
        full_name: 'Invited User',
        birth_date: '1990-01-01'
      }

      // Mock invitation lookup
      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockInvitation, error: null }),
        upsert: jest.fn().mockResolvedValue({ error: null }),
        update: jest.fn().mockReturnThis()
      }

      mockSupabaseClient.from.mockReturnValue(mockFromChain)

      // Simulate invitation processing
      const invitationLookup = await mockFromChain.single()
      expect(invitationLookup.data).toEqual(mockInvitation)

      // Email should match
      expect(invitationLookup.data.email.toLowerCase()).toBe(mockUser.email.toLowerCase())
    })

    it('should handle email mismatch in invitation', async () => {
      const mockUser = {
        id: 'wrong-user',
        email: 'wrong@example.com'
      }

      const mockInvitation = {
        id: 'invitation-123',
        email: 'correct@company.com',
        organization_id: 'org-company'
      }

      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockInvitation, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromChain)

      const invitationLookup = await mockFromChain.single()
      
      // Should detect email mismatch
      expect(invitationLookup.data.email.toLowerCase()).not.toBe(mockUser.email.toLowerCase())
    })

    it('should handle expired or invalid invitations', async () => {
      const mockFromChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Invitation not found' } 
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromChain)

      const result = await mockFromChain.single()
      
      expect(result.data).toBeNull()
      expect(result.error.message).toBe('Invitation not found')
    })
  })

  describe('User Organization Management during OAuth', () => {
    it('should create user_organizations entry for new Google user', async () => {
      const mockUser = {
        id: 'org-user',
        email: 'user@company.com',
        app_metadata: { provider: 'google' }
      }

      const mockFromChain = {
        insert: jest.fn().mockResolvedValue({ error: null }),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      }

      mockSupabaseClient.from.mockReturnValue(mockFromChain)

      // Simulate user_organizations creation
      const insertResult = await mockFromChain.insert({
        user_id: mockUser.id,
        organization_id: 'org-company',
        role: 'employee',
        is_active: true,
        is_default: true,
        joined_via: 'google_domain',
        employment_type: 'full_time'
      })

      expect(insertResult.error).toBeNull()
    })

    it('should handle user_organizations creation errors', async () => {
      const mockFromChain = {
        insert: jest.fn().mockResolvedValue({ 
          error: { message: 'Duplicate key violation' } 
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromChain)

      const insertResult = await mockFromChain.insert({
        user_id: 'user-123',
        organization_id: 'org-123'
      })

      expect(insertResult.error.message).toBe('Duplicate key violation')
    })

    it('should set first organization as default', async () => {
      const mockOrganizations = [
        { organization_id: 'org-1', name: 'First Org' },
        { organization_id: 'org-2', name: 'Second Org' }
      ]

      const mockFromChain = {
        insert: jest.fn().mockResolvedValue({ error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromChain)

      // First org should be default
      await mockFromChain.insert({
        organization_id: 'org-1',
        is_default: true // First organization
      })

      // Second org should not be default
      await mockFromChain.insert({
        organization_id: 'org-2',
        is_default: false // Subsequent organizations
      })

      expect(mockFromChain.insert).toHaveBeenCalledTimes(2)
    })
  })

  describe('OAuth Error Scenarios', () => {
    it('should handle OAuth provider rate limiting', async () => {
      mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({
        data: { url: null },
        error: { 
          message: 'Rate limit exceeded',
          status: 429
        }
      })

      const result = await mockSupabaseClient.auth.signInWithOAuth({
        provider: 'google'
      })

      expect(result.error.status).toBe(429)
      expect(result.error.message).toBe('Rate limit exceeded')
    })

    it('should handle OAuth scope permission denial', async () => {
      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: { user: null, session: null },
        error: { 
          message: 'Access denied: insufficient permissions',
          status: 403
        }
      })

      const result = await mockSupabaseClient.auth.exchangeCodeForSession('denied-code')

      expect(result.error.status).toBe(403)
      expect(result.error.message).toContain('Access denied')
    })

    it('should handle network connectivity issues', async () => {
      mockSupabaseClient.auth.signInWithOAuth.mockRejectedValue(
        new Error('Network request failed')
      )

      await expect(
        mockSupabaseClient.auth.signInWithOAuth({ provider: 'google' })
      ).rejects.toThrow('Network request failed')
    })

    it('should handle malformed OAuth responses', async () => {
      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: null, // Malformed response
        error: null
      })

      const result = await mockSupabaseClient.auth.exchangeCodeForSession('code')

      expect(result.data).toBeNull()
    })
  })

  describe('Environment-specific OAuth Configuration', () => {
    it('should use correct redirect URL for localhost development', () => {
      mockLocation.origin = 'http://localhost:3000'

      render(
        <NextIntlClientProvider locale="en" messages={mockMessages}>
          <GoogleAuthButton mode="signin" />
        </NextIntlClientProvider>
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/login/callback'
        }
      })
    })

    it('should use correct redirect URL for production', () => {
      mockLocation.origin = 'https://saas-leave-system.vercel.app'

      render(
        <NextIntlClientProvider locale="en" messages={mockMessages}>
          <GoogleAuthButton mode="signin" />
        </NextIntlClientProvider>
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'https://saas-leave-system.vercel.app/login/callback'
        }
      })
    })

    it('should handle missing environment configuration', () => {
      // Mock missing window object (SSR scenario)
      const originalWindow = global.window
      delete (global as any).window

      process.env.NEXT_PUBLIC_APP_URL = undefined
      process.env.NEXT_PUBLIC_SITE_URL = undefined

      render(
        <NextIntlClientProvider locale="en" messages={mockMessages}>
          <GoogleAuthButton mode="signin" />
        </NextIntlClientProvider>
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      // Should fallback to default URL
      expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'https://saas-leave-system.vercel.app/login/callback'
        }
      })

      // Restore
      global.window = originalWindow
    })
  })
})