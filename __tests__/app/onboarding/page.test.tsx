/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react'
import OnboardingRoutingPage from '@/app/onboarding/page'

// Mock next/navigation
const mockPush = jest.fn()
const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace
  })
}))

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key
}))

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn()
  }
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient
}))

// Mock fetch
global.fetch = jest.fn()

describe('OnboardingRoutingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPush.mockClear()
    mockReplace.mockClear()
  })

  describe('Authentication', () => {
    it('should redirect to login when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      })

      render(<OnboardingRoutingPage />)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })

    it('should redirect to login when user object is missing', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      render(<OnboardingRoutingPage />)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })
  })

  describe('Scenario Routing', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com', user_metadata: { full_name: 'Test User' } } },
        error: null
      })
    })

    it('should render WelcomeScreen for welcome scenario', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          scenario: 'welcome',
          userWorkspaces: [],
          pendingInvitations: [],
          canCreateWorkspace: true
        })
      })

      render(<OnboardingRoutingPage />)

      await waitFor(() => {
        expect(screen.getByText('onboarding.welcome.title')).toBeInTheDocument()
      })
    })

    it('should render ChoiceScreen for choice scenario', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          scenario: 'choice',
          userWorkspaces: [],
          pendingInvitations: [{
            id: 'inv-1',
            organizationName: 'Test Company',
            organizationInitials: 'TC',
            inviterName: 'John Doe',
            inviterEmail: 'john@test.com',
            token: 'test-token'
          }],
          canCreateWorkspace: true
        })
      })

      render(<OnboardingRoutingPage />)

      await waitFor(() => {
        expect(screen.getByText('onboarding.choice.title')).toBeInTheDocument()
      })
    })

    it('should render MultiOptionScreen for multi-option scenario', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          scenario: 'multi-option',
          userWorkspaces: [{
            id: 'org-1',
            name: 'My Company',
            initials: 'MC',
            memberCount: 5,
            role: 'admin'
          }],
          pendingInvitations: [],
          canCreateWorkspace: true
        })
      })

      render(<OnboardingRoutingPage />)

      await waitFor(() => {
        expect(screen.getByText('Welcome Test User!')).toBeInTheDocument()
        expect(screen.getByText('My Company')).toBeInTheDocument()
      })
    })

    it('should redirect to dashboard when user already has organizations', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          scenario: 'has_organizations',
          userWorkspaces: [{
            id: 'org-1',
            name: 'My Company',
            initials: 'MC',
            memberCount: 5,
            role: 'admin'
          }],
          pendingInvitations: [],
          canCreateWorkspace: true
        })
      })

      render(<OnboardingRoutingPage />)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com', user_metadata: { full_name: 'Test User' } } },
        error: null
      })
    })

    it('should show fallback to welcome screen when API fails', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500
      })

      render(<OnboardingRoutingPage />)

      await waitFor(() => {
        expect(screen.getByText('onboarding.welcome.title')).toBeInTheDocument()
      })
    })

    it('should show error message when API returns error', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      render(<OnboardingRoutingPage />)

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument()
      })
    })

    it('should show loading state initially', () => {
      ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<OnboardingRoutingPage />)

      expect(screen.getByText(/setting up/i)).toBeInTheDocument()
      expect(screen.getByRole('status')).toBeInTheDocument() // Loading spinner
    })
  })
})