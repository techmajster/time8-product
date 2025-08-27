/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChoiceScreen } from '@/components/onboarding/ChoiceScreen'

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

describe('ChoiceScreen', () => {
  const mockInvitation = {
    id: 'inv-1',
    organizationId: 'org-1',
    organizationName: 'Test Company',
    organizationInitials: 'TC',
    inviterName: 'John Doe',
    inviterEmail: 'john@test.com',
    token: 'test-token-123'
  }

  const defaultProps = {
    userName: 'Jane',
    invitation: mockInvitation
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
    // Suppress console.error for expected error tests
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    // Restore console.error
    jest.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render welcome message with user name', () => {
      render(<ChoiceScreen {...defaultProps} />)
      expect(screen.getByText('Welcome Jane!')).toBeInTheDocument()
    })

    it('should render subtitle message', () => {
      render(<ChoiceScreen {...defaultProps} />)
      expect(screen.getByText("Let's get started with your workspace")).toBeInTheDocument()
    })

    it('should render Time8 logo', () => {
      render(<ChoiceScreen {...defaultProps} />)
      expect(screen.getByTestId('time8-logo')).toBeInTheDocument()
    })

    it('should render invitation card with details', () => {
      render(<ChoiceScreen {...defaultProps} />)
      
      // Invitation card content
      expect(screen.getByText('You\'ve been invited')).toBeInTheDocument()
      expect(screen.getByText('to workspace:')).toBeInTheDocument()
      expect(screen.getByText('Test Company')).toBeInTheDocument()
    })

    it('should render create workspace card', () => {
      render(<ChoiceScreen {...defaultProps} />)
      
      expect(screen.getByText('Do you want to create')).toBeInTheDocument()
      expect(screen.getByText('a new workspace?')).toBeInTheDocument()
      expect(screen.getByText("It's free!")).toBeInTheDocument()
      expect(screen.getByText('up to 3 users')).toBeInTheDocument()
    })

    it('should render both action buttons', () => {
      render(<ChoiceScreen {...defaultProps} />)
      
      const acceptButton = screen.getByRole('button', { name: /accept invitation/i })
      const createButton = screen.getByRole('button', { name: /create new workspace/i })
      
      expect(acceptButton).toBeInTheDocument()
      expect(createButton).toBeInTheDocument()
    })

    it('should have different card styling for invitation vs create', () => {
      const { container } = render(<ChoiceScreen {...defaultProps} />)
      
      // Find cards by their background colors
      const invitationCard = container.querySelector('.bg-violet-100')
      const createCard = container.querySelector('.bg-white')
      
      expect(invitationCard).toBeInTheDocument()
      expect(createCard).toBeInTheDocument()
    })
  })

  describe('User Interactions - Create Workspace', () => {
    it('should navigate to create workspace when create button is clicked', () => {
      render(<ChoiceScreen {...defaultProps} />)
      const createButton = screen.getByRole('button', { name: /create new workspace/i })
      
      fireEvent.click(createButton)
      
      expect(mockPush).toHaveBeenCalledWith('/onboarding/create-workspace')
      expect(mockPush).toHaveBeenCalledTimes(1)
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

      render(<ChoiceScreen {...defaultProps} />)
      const acceptButton = screen.getByRole('button', { name: /accept invitation/i })
      
      fireEvent.click(acceptButton)
      
      // Check loading state
      expect(screen.getByText('Accepting...')).toBeInTheDocument()
      expect(acceptButton).toHaveAttribute('disabled')
      expect(acceptButton).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed')
    })

    it('should handle successful invitation acceptance', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          success: true, 
          message: 'Successfully joined Test Company' 
        })
      })

      render(<ChoiceScreen {...defaultProps} />)
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

    it('should handle API error during invitation acceptance', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ 
          error: 'Invalid or expired invitation' 
        })
      })

      render(<ChoiceScreen {...defaultProps} />)
      const acceptButton = screen.getByRole('button', { name: /accept invitation/i })
      
      fireEvent.click(acceptButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('alert')).toBeInTheDocument()
        expect(screen.getByText('Invalid or expired invitation')).toBeInTheDocument()
      })

      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should handle network error during invitation acceptance', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(<ChoiceScreen {...defaultProps} />)
      const acceptButton = screen.getByRole('button', { name: /accept invitation/i })
      
      fireEvent.click(acceptButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('alert')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })

      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should clear error when retrying after failed acceptance', async () => {
      // First attempt fails
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' })
      })

      render(<ChoiceScreen {...defaultProps} />)
      const acceptButton = screen.getByRole('button', { name: /accept invitation/i })
      
      fireEvent.click(acceptButton)
      
      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument()
      })

      // Second attempt succeeds
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })

      fireEvent.click(acceptButton)
      
      await waitFor(() => {
        expect(screen.queryByText('Server error')).not.toBeInTheDocument()
      })
    })
  })

  describe('Component Structure', () => {
    it('should render invitation card with mail icon', () => {
      const { container } = render(<ChoiceScreen {...defaultProps} />)
      const svgIcons = container.querySelectorAll('svg')
      
      // Should have at least one SVG icon (mail icon in invitation card)
      expect(svgIcons.length).toBeGreaterThan(0)
      
      // Check for mail icon path (partial match)
      const mailIcon = Array.from(svgIcons).find(svg => 
        svg.querySelector('path[d*="M21 10V3"]')
      )
      expect(mailIcon).toBeInTheDocument()
    })

    it('should render create workspace card with user plus icon', () => {
      const { container } = render(<ChoiceScreen {...defaultProps} />)
      const svgIcons = container.querySelectorAll('svg')
      
      // Check for user plus icon path (partial match)
      const userPlusIcon = Array.from(svgIcons).find(svg => 
        svg.querySelector('path[d*="M15 19V17"]')
      )
      expect(userPlusIcon).toBeInTheDocument()
    })

    it('should have proper card layout with flex structure', () => {
      const { container } = render(<ChoiceScreen {...defaultProps} />)
      
      // Check for cards container with gap
      const cardsContainer = container.querySelector('.gap-5')
      expect(cardsContainer).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should not display error message initially', () => {
      render(<ChoiceScreen {...defaultProps} />)
      expect(screen.queryByTestId('alert')).not.toBeInTheDocument()
    })

    it('should handle malformed API response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}) // No error field
      })

      render(<ChoiceScreen {...defaultProps} />)
      const acceptButton = screen.getByRole('button', { name: /accept invitation/i })
      
      fireEvent.click(acceptButton)
      
      await waitFor(() => {
        expect(screen.getByText('Failed to accept invitation')).toBeInTheDocument()
      })
    })

    it('should handle JSON parsing error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('Invalid JSON'))
      })

      render(<ChoiceScreen {...defaultProps} />)
      const acceptButton = screen.getByRole('button', { name: /accept invitation/i })
      
      fireEvent.click(acceptButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('alert')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have accessible buttons', () => {
      render(<ChoiceScreen {...defaultProps} />)
      
      const acceptButton = screen.getByRole('button', { name: /accept invitation/i })
      const createButton = screen.getByRole('button', { name: /create new workspace/i })
      
      expect(acceptButton).not.toHaveAttribute('disabled')
      expect(createButton).not.toHaveAttribute('disabled')
      
      // Buttons should be accessible
      expect(acceptButton).toBeInTheDocument()
      expect(createButton).toBeInTheDocument()
    })

    it('should have proper color contrast for buttons', () => {
      render(<ChoiceScreen {...defaultProps} />)
      
      const acceptButton = screen.getByRole('button', { name: /accept invitation/i })
      const createButton = screen.getByRole('button', { name: /create new workspace/i })
      
      // Accept button - dark background with light text
      expect(acceptButton).toHaveClass('bg-neutral-900')
      
      // Create button - light background with dark text  
      expect(createButton).toHaveClass('bg-white')
      
      // Check text colors separately by looking for text elements within buttons
      const acceptButtonText = acceptButton.querySelector('[class*="text-neutral-50"]')
      const createButtonText = createButton.querySelector('[class*="text-neutral-950"]')
      
      expect(acceptButtonText).toBeInTheDocument()
      expect(createButtonText).toBeInTheDocument()
    })

    it('should show loading state accessibility attributes', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        }), 100))
      )

      render(<ChoiceScreen {...defaultProps} />)
      const acceptButton = screen.getByRole('button', { name: /accept invitation/i })
      
      fireEvent.click(acceptButton)
      
      expect(acceptButton).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty user name gracefully', () => {
      render(<ChoiceScreen {...defaultProps} userName="" />)
      expect(screen.getByText('Welcome !')).toBeInTheDocument()
    })

    it('should handle long organization names', () => {
      const longOrgInvitation = {
        ...mockInvitation,
        organizationName: 'Very Long Organization Name That Might Cause Layout Issues'
      }
      
      render(<ChoiceScreen {...defaultProps} invitation={longOrgInvitation} />)
      expect(screen.getByText('Very Long Organization Name That Might Cause Layout Issues')).toBeInTheDocument()
    })

    it('should handle special characters in organization name', () => {
      const specialOrgInvitation = {
        ...mockInvitation,
        organizationName: "O'Reilly & Associates, Inc."
      }
      
      render(<ChoiceScreen {...defaultProps} invitation={specialOrgInvitation} />)
      expect(screen.getByText("O'Reilly & Associates, Inc.")).toBeInTheDocument()
    })

    it('should handle invitation without optional fields', () => {
      const minimalInvitation = {
        id: 'inv-minimal',
        organizationId: 'org-minimal',
        organizationName: 'Minimal Org',
        organizationInitials: 'MO',
        inviterName: '',
        inviterEmail: '',
        token: 'minimal-token'
      }
      
      render(<ChoiceScreen {...defaultProps} invitation={minimalInvitation} />)
      expect(screen.getByText('Minimal Org')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should render quickly', () => {
      const startTime = performance.now()
      render(<ChoiceScreen {...defaultProps} />)
      const endTime = performance.now()
      
      // Should render in less than 100ms
      expect(endTime - startTime).toBeLessThan(100)
    })

    it('should handle multiple rapid clicks gracefully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })

      render(<ChoiceScreen {...defaultProps} />)
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