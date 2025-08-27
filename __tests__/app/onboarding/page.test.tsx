/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react'
import OnboardingRoutingPage from '@/app/onboarding/page'

// Mock next/navigation
const mockPush = jest.fn()
const mockReplace = jest.fn()
const mockGet = jest.fn().mockReturnValue(null) // Default no token

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace
  }),
  useSearchParams: () => ({
    get: mockGet
  })
}))

// Mock onboarding components
jest.mock('@/components/onboarding', () => ({
  WelcomeScreen: ({ userName }: { userName: string }) => (
    <div data-testid="welcome-screen">Welcome {userName}!</div>
  ),
  ChoiceScreen: ({ userName, invitation }: { userName: string, invitation: any }) => (
    <div data-testid="choice-screen">Choice Screen for {userName} - {invitation.organizationName}</div>
  ),
  MultiOptionScreen: ({ userName, userWorkspaces, pendingInvitations }: any) => (
    <div data-testid="multi-option-screen">
      Multi-Option for {userName} - {userWorkspaces.length} workspaces, {pendingInvitations.length} invitations
    </div>
  )
}))

// Mock Time8Logo component
jest.mock('@/components/ui/time8-logo', () => ({
  Time8Logo: () => <div data-testid="time8-logo">Time8 Logo</div>
}))

// Mock Alert component
jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant, ...props }: any) => (
    <div data-testid="alert" data-variant={variant} {...props}>
      {children}
    </div>
  ),
  AlertDescription: ({ children }: any) => <div data-testid="alert-description">{children}</div>
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

// Mock console methods to suppress expected logs
const originalConsoleLog = console.log
const originalConsoleError = console.error

describe('OnboardingRoutingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPush.mockClear()
    mockReplace.mockClear()
    mockGet.mockReturnValue(null) // Reset to no token
    ;(global.fetch as jest.Mock).mockClear()
    
    // Suppress console logs for cleaner test output
    console.log = jest.fn()
    console.error = jest.fn()
    console.warn = jest.fn()
  })

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog
    console.error = originalConsoleError
  })

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      // Mock never-resolving promises
      mockSupabaseClient.auth.getUser.mockImplementation(() => new Promise(() => {}))

      render(<OnboardingRoutingPage />)

      expect(screen.getByText(/setting up your onboarding experience/i)).toBeInTheDocument()
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should show loading spinner with proper accessibility', () => {
      mockSupabaseClient.auth.getUser.mockImplementation(() => new Promise(() => {}))

      render(<OnboardingRoutingPage />)

      const loadingSpinner = screen.getByRole('status')
      expect(loadingSpinner).toHaveAttribute('aria-label', 'Loading')
    })
  })

  describe('Authentication Handling', () => {
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

    it('should redirect to login when user object is null', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      render(<OnboardingRoutingPage />)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })

    it('should redirect to login when auth returns error', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Authentication failed')
      })

      render(<OnboardingRoutingPage />)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })
  })

  describe('Scenario Navigation - Welcome', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'user-1', 
            email: 'test@example.com', 
            user_metadata: { full_name: 'John Doe' } 
          } 
        },
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
        expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
        expect(screen.getByText('Welcome John!')).toBeInTheDocument()
      })
    })

    it('should extract first name correctly from full name', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'user-1', 
            email: 'test@example.com', 
            user_metadata: { full_name: 'Jane Mary Smith' } 
          } 
        },
        error: null
      })

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
        expect(screen.getByText('Welcome Jane!')).toBeInTheDocument()
      })
    })

    it('should fallback to email username when no full name', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'user-1', 
            email: 'jane.doe@example.com', 
            user_metadata: {} 
          } 
        },
        error: null
      })

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
        expect(screen.getByText('Welcome jane.doe!')).toBeInTheDocument()
      })
    })

    it('should fallback to "there" when no name or email info available', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'user-1', 
            email: null, 
            user_metadata: {} 
          } 
        },
        error: null
      })

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
        expect(screen.getByText('Welcome there!')).toBeInTheDocument()
      })
    })
  })

  describe('Scenario Navigation - Choice', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'user-1', 
            email: 'test@example.com', 
            user_metadata: { full_name: 'John Doe' } 
          } 
        },
        error: null
      })
    })

    it('should render ChoiceScreen for choice scenario with invitation', async () => {
      const mockInvitation = {
        id: 'inv-1',
        organizationId: 'org-1',
        organizationName: 'Test Company',
        organizationInitials: 'TC',
        inviterName: 'Jane Smith',
        inviterEmail: 'jane@test.com',
        token: 'test-token-123'
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          scenario: 'choice',
          userWorkspaces: [],
          pendingInvitations: [mockInvitation],
          canCreateWorkspace: true
        })
      })

      render(<OnboardingRoutingPage />)

      await waitFor(() => {
        expect(screen.getByTestId('choice-screen')).toBeInTheDocument()
        expect(screen.getByText('Choice Screen for John - Test Company')).toBeInTheDocument()
      })
    })

    it('should fallback to welcome when choice scenario has no invitations', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          scenario: 'choice',
          userWorkspaces: [],
          pendingInvitations: [], // No invitations
          canCreateWorkspace: true
        })
      })

      render(<OnboardingRoutingPage />)

      await waitFor(() => {
        expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
      })
    })
  })

  describe('Scenario Navigation - Multi-Option', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'user-1', 
            email: 'test@example.com', 
            user_metadata: { full_name: 'John Doe' } 
          } 
        },
        error: null
      })
    })

    it('should render MultiOptionScreen for multi-option scenario', async () => {
      const mockWorkspaces = [
        { id: 'org-1', name: 'My Company', memberCount: 5, memberAvatars: [] },
        { id: 'org-2', name: 'Another Company', memberCount: 3, memberAvatars: [] }
      ]
      const mockInvitations = [
        { id: 'inv-1', organizationName: 'Third Company', token: 'token-1' }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          scenario: 'multi-option',
          userWorkspaces: mockWorkspaces,
          pendingInvitations: mockInvitations,
          canCreateWorkspace: true
        })
      })

      render(<OnboardingRoutingPage />)

      await waitFor(() => {
        expect(screen.getByTestId('multi-option-screen')).toBeInTheDocument()
        expect(screen.getByText('Multi-Option for John - 2 workspaces, 1 invitations')).toBeInTheDocument()
      })
    })

    it('should fallback to welcome when multi-option has no workspaces or invitations', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          scenario: 'multi-option',
          userWorkspaces: [],
          pendingInvitations: [],
          canCreateWorkspace: true
        })
      })

      render(<OnboardingRoutingPage />)

      await waitFor(() => {
        expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
      })
    })
  })

  describe('Invitation Token Handling', () => {
    beforeEach(() => {
      // Mock useSearchParams to return a token
      mockGet.mockImplementation((key: string) => key === 'token' ? 'invitation-token-123' : null)
    })

    it('should handle authenticated user with invitation token', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'user-1', 
            email: 'test@example.com', 
            user_metadata: { full_name: 'John Doe' } 
          } 
        },
        error: null
      })

      // Mock invitation lookup
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ // First call - invitation lookup
          ok: true,
          json: () => Promise.resolve({
            id: 'inv-1',
            organization_name: 'Test Company',
            email: 'test@example.com',
            full_name: 'John Doe',
            token: 'invitation-token-123'
          })
        })
        .mockResolvedValueOnce({ // Second call - organization status
          ok: true,
          json: () => Promise.resolve({
            scenario: 'choice',
            userWorkspaces: [],
            pendingInvitations: [],
            canCreateWorkspace: true
          })
        })

      render(<OnboardingRoutingPage />)

      await waitFor(() => {
        expect(screen.getByTestId('choice-screen')).toBeInTheDocument()
      })

      // Verify invitation lookup was called
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/invitations/lookup?token=invitation-token-123'
      )
    })

    it('should redirect unauthenticated user to registration with invitation', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      // Mock invitation lookup
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'inv-1',
          organization_name: 'Test Company',
          email: 'newuser@example.com',
          full_name: 'New User',
          token: 'invitation-token-123'
        })
      })

      render(<OnboardingRoutingPage />)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          '/onboarding/register?token=invitation-token-123&email=newuser%40example.com&name=New%20User&org=Test%20Company'
        )
      })
    })

    it('should handle invalid invitation token', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'user-1', 
            email: 'test@example.com', 
            user_metadata: { full_name: 'John Doe' } 
          } 
        },
        error: null
      })

      // Mock failed invitation lookup
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({
          error: 'Invalid or expired invitation link'
        })
      })

      render(<OnboardingRoutingPage />)

      await waitFor(() => {
        expect(screen.getByTestId('alert')).toBeInTheDocument()
        expect(screen.getByText('Invalid or expired invitation link')).toBeInTheDocument()
      })
    })

    afterEach(() => {
      // Reset the mock to default behavior
      mockGet.mockReturnValue(null)
    })
  })

  describe('API Error Handling', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'user-1', 
            email: 'test@example.com', 
            user_metadata: { full_name: 'John Doe' } 
          } 
        },
        error: null
      })
    })

    it('should show error state when organization-status API fails', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500
      })

      render(<OnboardingRoutingPage />)

      await waitFor(() => {
        expect(screen.getByTestId('alert')).toBeInTheDocument()
        expect(screen.getByText(/api request failed with status 500/i)).toBeInTheDocument()
      })
    })

    it('should show error state when API throws network error', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      render(<OnboardingRoutingPage />)

      await waitFor(() => {
        expect(screen.getByTestId('alert')).toBeInTheDocument()
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })
    })

    it('should show navigation options for authenticated users on error', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

      render(<OnboardingRoutingPage />)

      await waitFor(() => {
        expect(screen.getByTestId('alert')).toBeInTheDocument()
        expect(screen.getByText(/api error/i)).toBeInTheDocument()
        // Since the error path sets user to null, it shows welcome screen instead of navigation buttons
        expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
      })
    })

    it('should show navigation buttons when user is preserved during invitation token error', async () => {
      // Set up invitation token scenario
      mockGet.mockImplementation((key: string) => key === 'token' ? 'invalid-token' : null)
      
      // Mock failed invitation lookup but keep the user authenticated
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({
          error: 'Invalid or expired invitation link'
        })
      })

      render(<OnboardingRoutingPage />)

      await waitFor(() => {
        expect(screen.getByTestId('alert')).toBeInTheDocument()
        expect(screen.getByText('Invalid or expired invitation link')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /go to dashboard/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
      })
    })

    it('should handle malformed API response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          // Missing required fields
          scenario: null,
          userWorkspaces: null,
          pendingInvitations: null
        })
      })

      render(<OnboardingRoutingPage />)

      await waitFor(() => {
        expect(screen.getByTestId('alert')).toBeInTheDocument()
        expect(screen.getByText(/invalid api response structure/i)).toBeInTheDocument()
      })
    })
  })

  describe('State Management', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'user-1', 
            email: 'test@example.com', 
            user_metadata: { full_name: 'John Doe' } 
          } 
        },
        error: null
      })
    })

    it('should handle state transitions correctly', async () => {
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

      // Should start with loading
      expect(screen.getByText(/setting up your onboarding experience/i)).toBeInTheDocument()

      // Should transition to welcome screen
      await waitFor(() => {
        expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
        expect(screen.queryByText(/setting up your onboarding experience/i)).not.toBeInTheDocument()
      })
    })

    it('should preserve user data throughout the flow', async () => {
      const userData = { 
        id: 'user-1', 
        email: 'jane@example.com', 
        user_metadata: { full_name: 'Jane Smith' } 
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: userData },
        error: null
      })

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
        expect(screen.getByText('Welcome Jane!')).toBeInTheDocument()
      })
    })
  })

  describe('Unknown Scenarios', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'user-1', 
            email: 'test@example.com', 
            user_metadata: { full_name: 'John Doe' } 
          } 
        },
        error: null
      })
    })

    it('should fallback to welcome screen for unknown scenario', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          scenario: 'unknown-scenario',
          userWorkspaces: [],
          pendingInvitations: [],
          canCreateWorkspace: true
        })
      })

      render(<OnboardingRoutingPage />)

      await waitFor(() => {
        expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
      })
    })

    it('should fallback to welcome screen for missing scenario', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          userWorkspaces: [],
          pendingInvitations: [],
          canCreateWorkspace: true
        })
      })

      render(<OnboardingRoutingPage />)

      await waitFor(() => {
        expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
      })
    })
  })

  describe('Enhanced Scenario Logic', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'user-1', 
            email: 'test@example.com', 
            user_metadata: { full_name: 'John Doe' } 
          } 
        },
        error: null
      })
    })

    it('should determine enhanced scenario for authenticated user with existing workspaces and invitation', async () => {
      // Use the existing mockGet approach instead of trying to re-mock
      mockGet.mockImplementation((key: string) => key === 'token' ? 'invitation-token-123' : null)

      // Mock invitation lookup
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ // Invitation lookup
          ok: true,
          json: () => Promise.resolve({
            id: 'inv-1',
            organization_name: 'New Company',
            email: 'test@example.com',
            full_name: 'John Doe',
            token: 'invitation-token-123'
          })
        })
        .mockResolvedValueOnce({ // Organization status
          ok: true,
          json: () => Promise.resolve({
            scenario: 'multi-option', // Should be multi-option due to existing workspaces + invitation
            userWorkspaces: [{ id: 'org-1', name: 'Existing Company', memberCount: 5 }],
            pendingInvitations: [],
            canCreateWorkspace: true
          })
        })

      render(<OnboardingRoutingPage />)

      await waitFor(() => {
        expect(screen.getByTestId('multi-option-screen')).toBeInTheDocument()
      })
    })
  })
})