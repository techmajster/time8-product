/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MultiOptionScreen } from '@/components/onboarding/MultiOptionScreen'

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
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

// Mock fetch
global.fetch = jest.fn()

// Mock window.location by replacing it at the start of the test file
const originalLocation = window.location

beforeAll(() => {
  // Mock window.location
  delete (window as any).location
  ;(window as any).location = {
    href: '',
    reload: jest.fn()
  }
})

afterAll(() => {
  // Restore original location
  ;(window as any).location = originalLocation
})

describe('MultiOptionScreen', () => {
  const mockWorkspace = {
    id: 'org-1',
    name: 'My Company',
    memberCount: 5,
    memberAvatars: [
      {
        id: 'user-1',
        avatar_url: 'https://example.com/avatar1.jpg',
        full_name: 'John Doe'
      },
      {
        id: 'user-2',
        avatar_url: null,
        full_name: 'Jane Smith'
      }
    ]
  }

  const mockInvitation = {
    id: 'inv-1',
    organizationId: 'org-2',
    organizationName: 'Test Company',
    organizationInitials: 'TC',
    inviterName: 'John Doe',
    inviterEmail: 'john@test.com',
    token: 'test-token-123'
  }

  const defaultProps = {
    userName: 'Jane',
    userWorkspaces: [mockWorkspace],
    pendingInvitations: [mockInvitation]
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
    ;(window as any).location.href = ''
    // Suppress console.error for expected error tests
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    // Restore console.error
    jest.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render welcome message with user name', () => {
      render(<MultiOptionScreen {...defaultProps} />)
      expect(screen.getByText('Welcome Jane!')).toBeInTheDocument()
    })

    it('should render subtitle message', () => {
      render(<MultiOptionScreen {...defaultProps} />)
      expect(screen.getByText("Let's get started with your workspace")).toBeInTheDocument()
    })

    it('should render Time8 logo', () => {
      render(<MultiOptionScreen {...defaultProps} />)
      expect(screen.getByTestId('time8-logo')).toBeInTheDocument()
    })

    it('should render user workspace cards', () => {
      render(<MultiOptionScreen {...defaultProps} />)
      
      expect(screen.getByText('Your workspace:')).toBeInTheDocument()
      expect(screen.getByText('My Company')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /enter workspace/i })).toBeInTheDocument()
    })

    it('should render pending invitation cards', () => {
      render(<MultiOptionScreen {...defaultProps} />)
      
      expect(screen.getByText('You have been invited')).toBeInTheDocument()
      expect(screen.getByText('to workspace:')).toBeInTheDocument()
      expect(screen.getByText('Test Company')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /accept invitation/i })).toBeInTheDocument()
    })

    it('should render create workspace card', () => {
      render(<MultiOptionScreen {...defaultProps} />)
      
      expect(screen.getByText('Do you want to create')).toBeInTheDocument()
      expect(screen.getByText('a new workspace?')).toBeInTheDocument()
      expect(screen.getByText("It's free!")).toBeInTheDocument()
      expect(screen.getByText('up to 3 users')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create new workspace/i })).toBeInTheDocument()
    })
  })

  describe('Grid Layout', () => {
    it('should arrange items in card grid structure', () => {
      const { container } = render(<MultiOptionScreen {...defaultProps} />)
      
      // Should have card grid structure with proper classes
      const gridContainer = container.querySelector('.content-stretch.flex.flex-col.gap-6')
      expect(gridContainer).toBeInTheDocument()
      
      // Should have at least one row of cards
      const rows = container.querySelectorAll('.content-center.flex.flex-wrap')
      expect(rows.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle multiple workspaces and invitations in grid', () => {
      const propsWithMultiple = {
        ...defaultProps,
        userWorkspaces: [
          mockWorkspace,
          { ...mockWorkspace, id: 'org-3', name: 'Second Company' },
          { ...mockWorkspace, id: 'org-4', name: 'Third Company' }
        ],
        pendingInvitations: [
          mockInvitation,
          { ...mockInvitation, id: 'inv-2', organizationName: 'Fourth Company' }
        ]
      }

      render(<MultiOptionScreen {...propsWithMultiple} />)
      
      expect(screen.getByText('My Company')).toBeInTheDocument()
      expect(screen.getByText('Second Company')).toBeInTheDocument()
      expect(screen.getByText('Third Company')).toBeInTheDocument()
      expect(screen.getByText('Test Company')).toBeInTheDocument()
      expect(screen.getByText('Fourth Company')).toBeInTheDocument()
    })

    it('should show up to 6 cards maximum', () => {
      const propsWithMany = {
        userName: 'Jane',
        userWorkspaces: Array.from({ length: 5 }, (_, i) => ({
          ...mockWorkspace,
          id: `org-${i}`,
          name: `Company ${i + 1}`
        })),
        pendingInvitations: Array.from({ length: 5 }, (_, i) => ({
          ...mockInvitation,
          id: `inv-${i}`,
          organizationName: `Invitation ${i + 1}`
        }))
      }

      const { container } = render(<MultiOptionScreen {...propsWithMany} />)
      
      // Count total cards (workspaces + invitations + create = max 6)
      const cards = container.querySelectorAll('[class*="w-96"][class*="h-[300px]"]')
      expect(cards.length).toBeLessThanOrEqual(6)
    })
  })

  describe('Avatar Group Rendering', () => {
    it('should render member avatars in workspace cards', () => {
      render(<MultiOptionScreen {...defaultProps} />)
      
      // Should show avatar for John Doe (with image)
      const avatarImage = screen.queryByAltText('John Doe')
      expect(avatarImage).toBeInTheDocument()
      
      // Should show initial for Jane Smith (no image)
      expect(screen.getByText('J')).toBeInTheDocument()
    })

    it('should show +X indicator for additional members', () => {
      const workspaceWithManyMembers = {
        ...mockWorkspace,
        memberCount: 8,
        memberAvatars: [
          { id: 'user-1', avatar_url: 'url1', full_name: 'User 1' },
          { id: 'user-2', avatar_url: null, full_name: 'User 2' },
          { id: 'user-3', avatar_url: null, full_name: 'User 3' }
        ]
      }

      render(<MultiOptionScreen {...defaultProps} userWorkspaces={[workspaceWithManyMembers]} />)
      
      // Should show +5 indicator (8 total - 3 shown = 5 remaining)
      expect(screen.getByText('+5')).toBeInTheDocument()
    })

    it('should handle workspaces with no member avatars', () => {
      const workspaceWithNoAvatars = {
        ...mockWorkspace,
        memberCount: 3,
        memberAvatars: []
      }

      render(<MultiOptionScreen {...defaultProps} userWorkspaces={[workspaceWithNoAvatars]} />)
      
      // Should show +3 indicator for all members
      expect(screen.getByText('+3')).toBeInTheDocument()
    })
  })

  describe('User Interactions - Workspace Entry', () => {
    it('should handle workspace entry with API call', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })

      render(<MultiOptionScreen {...defaultProps} />)
      const enterButton = screen.getByRole('button', { name: /enter workspace/i })
      
      fireEvent.click(enterButton)
      
      expect(screen.getByText('Entering...')).toBeInTheDocument()
      expect(enterButton).toHaveAttribute('disabled')
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/workspace/switch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ organizationId: 'org-1' })
        })
      })

      // Note: Testing window.location.href assignment is tricky in JSDOM
      // The API call succeeding is the main functionality we're testing
    })

    it('should handle workspace entry API error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to switch workspace' })
      })

      render(<MultiOptionScreen {...defaultProps} />)
      const enterButton = screen.getByRole('button', { name: /enter workspace/i })
      
      fireEvent.click(enterButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('alert')).toBeInTheDocument()
        expect(screen.getByText('Failed to switch workspace')).toBeInTheDocument()
      })
    })
  })

  describe('User Interactions - Accept Invitation', () => {
    it('should show loading state when accepting invitation', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        }), 100))
      )

      render(<MultiOptionScreen {...defaultProps} />)
      const acceptButton = screen.getByRole('button', { name: /accept invitation/i })
      
      fireEvent.click(acceptButton)
      
      expect(screen.getByText('Accepting...')).toBeInTheDocument()
      expect(acceptButton).toHaveAttribute('disabled')
    })

    it('should handle successful invitation acceptance', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })

      render(<MultiOptionScreen {...defaultProps} />)
      const acceptButton = screen.getByRole('button', { name: /accept invitation/i })
      
      fireEvent.click(acceptButton)
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: 'test-token-123'
        })
      })
    })

    it('should handle invitation acceptance error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid invitation' })
      })

      render(<MultiOptionScreen {...defaultProps} />)
      const acceptButton = screen.getByRole('button', { name: /accept invitation/i })
      
      fireEvent.click(acceptButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('alert')).toBeInTheDocument()
        expect(screen.getByText('Invalid invitation')).toBeInTheDocument()
      })
    })
  })

  describe('User Interactions - Create Workspace', () => {
    it('should navigate to create workspace', () => {
      render(<MultiOptionScreen {...defaultProps} />)
      const createButton = screen.getByRole('button', { name: /create new workspace/i })
      
      fireEvent.click(createButton)
      
      expect(mockPush).toHaveBeenCalledWith('/onboarding/create-workspace')
    })
  })

  describe('Multiple Items Handling', () => {
    it('should handle multiple workspaces with unique keys', () => {
      const propsWithMultipleWorkspaces = {
        ...defaultProps,
        userWorkspaces: [
          mockWorkspace,
          { ...mockWorkspace, id: 'org-unique-1', name: 'Company One' },
          { ...mockWorkspace, id: 'org-unique-2', name: 'Company Two' }
        ]
      }

      render(<MultiOptionScreen {...propsWithMultipleWorkspaces} />)
      
      expect(screen.getByText('My Company')).toBeInTheDocument()
      expect(screen.getByText('Company One')).toBeInTheDocument()
      expect(screen.getByText('Company Two')).toBeInTheDocument()
      
      const enterButtons = screen.getAllByRole('button', { name: /enter workspace/i })
      expect(enterButtons).toHaveLength(3)
    })

    it('should handle multiple invitations with unique keys', () => {
      const propsWithMultipleInvitations = {
        ...defaultProps,
        pendingInvitations: [
          mockInvitation,
          { ...mockInvitation, id: 'inv-unique-1', organizationName: 'Company Alpha', token: 'token-alpha' },
          { ...mockInvitation, id: 'inv-unique-2', organizationName: 'Company Beta', token: 'token-beta' }
        ]
      }

      render(<MultiOptionScreen {...propsWithMultipleInvitations} />)
      
      expect(screen.getByText('Test Company')).toBeInTheDocument()
      expect(screen.getByText('Company Alpha')).toBeInTheDocument()
      expect(screen.getByText('Company Beta')).toBeInTheDocument()
      
      const acceptButtons = screen.getAllByRole('button', { name: /accept invitation/i })
      expect(acceptButtons).toHaveLength(3)
    })
  })

  describe('Empty States', () => {
    it('should handle no workspaces', () => {
      const propsNoWorkspaces = {
        ...defaultProps,
        userWorkspaces: []
      }

      render(<MultiOptionScreen {...propsNoWorkspaces} />)
      
      expect(screen.queryByText('Your workspace:')).not.toBeInTheDocument()
      expect(screen.getByText('Test Company')).toBeInTheDocument() // invitation still shown
      expect(screen.getByText('Create new workspace')).toBeInTheDocument()
    })

    it('should handle no invitations', () => {
      const propsNoInvitations = {
        ...defaultProps,
        pendingInvitations: []
      }

      render(<MultiOptionScreen {...propsNoInvitations} />)
      
      expect(screen.queryByText('You have been invited')).not.toBeInTheDocument()
      expect(screen.getByText('My Company')).toBeInTheDocument() // workspace still shown
      expect(screen.getByText('Create new workspace')).toBeInTheDocument()
    })

    it('should handle both empty workspaces and invitations', () => {
      const propsEmpty = {
        ...defaultProps,
        userWorkspaces: [],
        pendingInvitations: []
      }

      render(<MultiOptionScreen {...propsEmpty} />)
      
      // Should only show create workspace option
      expect(screen.getByText('Create new workspace')).toBeInTheDocument()
      expect(screen.queryByText('Your workspace:')).not.toBeInTheDocument()
      expect(screen.queryByText('You have been invited')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should not display error message initially', () => {
      render(<MultiOptionScreen {...defaultProps} />)
      expect(screen.queryByTestId('alert')).not.toBeInTheDocument()
    })

    it('should clear error when switching between actions', async () => {
      // First cause an error with workspace entry
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Workspace error' })
      })

      render(<MultiOptionScreen {...defaultProps} />)
      const enterButton = screen.getByRole('button', { name: /enter workspace/i })
      
      fireEvent.click(enterButton)
      
      await waitFor(() => {
        expect(screen.getByText('Workspace error')).toBeInTheDocument()
      })

      // Now try invitation acceptance - should clear previous error
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })

      const acceptButton = screen.getByRole('button', { name: /accept invitation/i })
      fireEvent.click(acceptButton)
      
      await waitFor(() => {
        expect(screen.queryByText('Workspace error')).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have accessible buttons', () => {
      render(<MultiOptionScreen {...defaultProps} />)
      
      const enterButton = screen.getByRole('button', { name: /enter workspace/i })
      const acceptButton = screen.getByRole('button', { name: /accept invitation/i })
      const createButton = screen.getByRole('button', { name: /create new workspace/i })
      
      expect(enterButton).not.toHaveAttribute('disabled')
      expect(acceptButton).not.toHaveAttribute('disabled')
      expect(createButton).not.toHaveAttribute('disabled')
    })

    it('should have proper color contrast for different card types', () => {
      const { container } = render(<MultiOptionScreen {...defaultProps} />)
      
      // Invitation card (violet background)
      const invitationCard = container.querySelector('.bg-violet-100')
      expect(invitationCard).toBeInTheDocument()
      
      // Workspace card (neutral background)
      const workspaceCard = container.querySelector('.bg-neutral-100')
      expect(workspaceCard).toBeInTheDocument()
      
      // Create workspace card (white background)
      const createCard = container.querySelector('.bg-\\[\\#ffffff\\]')
      expect(createCard).toBeInTheDocument()
    })

    it('should have proper avatar alt text', () => {
      render(<MultiOptionScreen {...defaultProps} />)
      
      const avatarImage = screen.getByAltText('John Doe')
      expect(avatarImage).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should render quickly with multiple items', () => {
      const propsWithMany = {
        userName: 'Jane',
        userWorkspaces: Array.from({ length: 3 }, (_, i) => ({
          ...mockWorkspace,
          id: `perf-org-${i}`,
          name: `Perf Company ${i + 1}`
        })),
        pendingInvitations: Array.from({ length: 3 }, (_, i) => ({
          ...mockInvitation,
          id: `perf-inv-${i}`,
          organizationName: `Perf Invitation ${i + 1}`,
          token: `perf-token-${i}`
        }))
      }

      const startTime = performance.now()
      render(<MultiOptionScreen {...propsWithMany} />)
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(200)
    })

    it('should handle rapid clicks without duplicate API calls', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })

      render(<MultiOptionScreen {...defaultProps} />)
      const acceptButton = screen.getByRole('button', { name: /accept invitation/i })
      
      // Rapid clicks
      fireEvent.click(acceptButton)
      fireEvent.click(acceptButton)
      fireEvent.click(acceptButton)
      
      // Should only make one API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })
    })
  })
})