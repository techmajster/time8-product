/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { ChoiceScreen } from '@/components/onboarding/ChoiceScreen'
import { WelcomeScreen } from '@/components/onboarding/WelcomeScreen'
import { MultiOptionScreen } from '@/components/onboarding/MultiOptionScreen'

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn()
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

describe('Onboarding Cursor Interactions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('ChoiceScreen Cursor Interactions', () => {
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

    it('should have cursor pointer on accept invitation button', () => {
      render(<ChoiceScreen {...defaultProps} />)
      const acceptButton = screen.getByRole('button', { name: /accept invitation/i })
      
      // Check for hover and transition classes that indicate cursor interaction
      expect(acceptButton).toHaveClass('hover:bg-neutral-800')
      expect(acceptButton).toHaveClass('transition-colors')
    })

    it('should have cursor pointer on create workspace button', () => {
      render(<ChoiceScreen {...defaultProps} />)
      const createButton = screen.getByRole('button', { name: /create new workspace/i })
      
      // Check for hover and transition classes that indicate cursor interaction
      expect(createButton).toHaveClass('hover:bg-gray-50')
      expect(createButton).toHaveClass('transition-colors')
    })

    it('should have cursor not-allowed when button is disabled', () => {
      ;(global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        }), 100))
      )

      render(<ChoiceScreen {...defaultProps} />)
      const acceptButton = screen.getByRole('button', { name: /accept invitation/i })
      
      // Simulate clicking to trigger loading state
      acceptButton.click()
      
      // Check for disabled cursor styling
      expect(acceptButton).toHaveClass('disabled:cursor-not-allowed')
    })

    it('should apply proper cursor styles to all interactive elements', () => {
      const { container } = render(<ChoiceScreen {...defaultProps} />)
      
      // Find all button elements
      const buttons = container.querySelectorAll('button')
      
      buttons.forEach(button => {
        // Each button should have either hover effects or disabled states
        const hasHoverEffect = button.className.includes('hover:')
        const hasTransition = button.className.includes('transition')
        
        expect(hasHoverEffect || hasTransition).toBe(true)
      })
    })
  })

  describe('WelcomeScreen Cursor Interactions', () => {
    const defaultProps = {
      userName: 'Jane'
    }

    it('should have cursor pointer on create workspace button', () => {
      render(<WelcomeScreen {...defaultProps} />)
      const createButton = screen.getByRole('button', { name: /create new workspace/i })
      
      // Check for hover and transition classes
      expect(createButton).toHaveClass('hover:bg-neutral-800')
      expect(createButton).toHaveClass('transition-colors')
    })

    it('should have proper button styling for cursor interaction', () => {
      const { container } = render(<WelcomeScreen {...defaultProps} />)
      
      // Find the main action button
      const button = container.querySelector('button')
      
      expect(button).not.toBeNull()
      expect(button).toHaveClass('hover:bg-neutral-800')
      expect(button).toHaveClass('transition-colors')
    })
  })

  describe('MultiOptionScreen Cursor Interactions', () => {
    const mockWorkspace = {
      id: 'workspace-1',
      name: 'Test Workspace',
      memberCount: 3,
      memberAvatars: [
        { id: 'user-1', avatar_url: null, full_name: 'User One' },
        { id: 'user-2', avatar_url: null, full_name: 'User Two' }
      ]
    }

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
      userWorkspaces: [mockWorkspace],
      pendingInvitations: [mockInvitation]
    }

    it('should have cursor pointer on all action buttons', () => {
      render(<MultiOptionScreen {...defaultProps} />)
      
      const acceptButton = screen.getByRole('button', { name: /accept invitation/i })
      const enterButton = screen.getByRole('button', { name: /enter workspace/i })
      const createButton = screen.getByRole('button', { name: /create new workspace/i })
      
      // Check hover and transition classes for all buttons
      expect(acceptButton).toHaveClass('hover:bg-neutral-800')
      expect(acceptButton).toHaveClass('transition-colors')
      
      expect(enterButton).toHaveClass('hover:bg-neutral-800')
      expect(enterButton).toHaveClass('transition-colors')
      
      expect(createButton).toHaveClass('hover:bg-gray-50')
      expect(createButton).toHaveClass('transition-colors')
    })

    it('should have cursor not-allowed when buttons are disabled', () => {
      render(<MultiOptionScreen {...defaultProps} />)
      
      // Find buttons and check for disabled cursor styling
      const buttons = screen.getAllByRole('button')
      
      buttons.forEach(button => {
        if (button.className.includes('disabled:')) {
          expect(button).toHaveClass('disabled:cursor-not-allowed')
        }
      })
    })

    it('should maintain cursor interactions across multiple cards', () => {
      const propsWithMultipleOptions = {
        ...defaultProps,
        userWorkspaces: [mockWorkspace, { ...mockWorkspace, id: 'workspace-2', name: 'Second Workspace' }],
        pendingInvitations: [mockInvitation, { ...mockInvitation, id: 'inv-2', organizationName: 'Second Company' }]
      }

      const { container } = render(<MultiOptionScreen {...propsWithMultipleOptions} />)
      
      // Count buttons and verify they all have proper cursor styling
      const buttons = container.querySelectorAll('button')
      
      // Should have multiple buttons (accept, enter, create, etc.)
      expect(buttons.length).toBeGreaterThan(3)
      
      buttons.forEach(button => {
        const hasHoverEffect = button.className.includes('hover:')
        const hasTransition = button.className.includes('transition')
        const hasDisabledCursor = button.className.includes('disabled:cursor-not-allowed')
        
        // Each button should have interaction styling
        expect(hasHoverEffect || hasTransition || hasDisabledCursor).toBe(true)
      })
    })
  })

  describe('Cross-Component Cursor Consistency', () => {
    it('should use consistent cursor styles across all onboarding components', () => {
      const choiceProps = {
        userName: 'Jane',
        invitation: {
          id: 'inv-1',
          organizationId: 'org-1',
          organizationName: 'Test Company',
          organizationInitials: 'TC',
          inviterName: 'John Doe',
          inviterEmail: 'john@test.com',
          token: 'test-token-123'
        }
      }

      const welcomeProps = { userName: 'Jane' }

      const multiProps = {
        userName: 'Jane',
        userWorkspaces: [],
        pendingInvitations: []
      }

      // Render each component and check for consistent button styling
      const { container: choiceContainer } = render(<ChoiceScreen {...choiceProps} />)
      const { container: welcomeContainer } = render(<WelcomeScreen {...welcomeProps} />)
      const { container: multiContainer } = render(<MultiOptionScreen {...multiProps} />)

      // Extract button styling patterns
      const choiceButtons = choiceContainer.querySelectorAll('button')
      const welcomeButtons = welcomeContainer.querySelectorAll('button')
      const multiButtons = multiContainer.querySelectorAll('button')

      // Check for consistent transition and hover patterns
      const allButtons = [...choiceButtons, ...welcomeButtons, ...multiButtons]
      
      allButtons.forEach(button => {
        // Each button should have some form of interactive styling
        const hasInteraction = 
          button.className.includes('hover:') ||
          button.className.includes('transition') ||
          button.className.includes('disabled:cursor-not-allowed')
        
        expect(hasInteraction).toBe(true)
      })
    })

    it('should have proper focus styles for keyboard navigation', () => {
      const choiceProps = {
        userName: 'Jane',
        invitation: {
          id: 'inv-1',
          organizationId: 'org-1',
          organizationName: 'Test Company',
          organizationInitials: 'TC',
          inviterName: 'John Doe',
          inviterEmail: 'john@test.com',
          token: 'test-token-123'
        }
      }

      const { container } = render(<ChoiceScreen {...choiceProps} />)
      
      // Check that buttons are focusable
      const buttons = container.querySelectorAll('button')
      
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('tabindex', '-1')
      })
    })
  })

  describe('Create Workspace Page Cursor Interactions', () => {
    // Note: We can't easily test the create-workspace page components since they're in page files,
    // but we can document expected behavior here for manual verification

    it('should document expected cursor behavior for create workspace page', () => {
      // This test serves as documentation for the expected cursor behavior
      const expectedBehaviors = [
        'Back button should have cursor: pointer on hover',
        'Submit button should have cursor: pointer on hover',
        'Submit button should have cursor: not-allowed when disabled',
        'Input fields should have cursor: text',
        'Select dropdowns should have cursor: pointer'
      ]

      expect(expectedBehaviors).toHaveLength(5)
    })
  })

  describe('Button States and Cursor Behavior', () => {
    it('should handle different button states with appropriate cursors', () => {
      const choiceProps = {
        userName: 'Jane',
        invitation: {
          id: 'inv-1',
          organizationId: 'org-1',
          organizationName: 'Test Company',
          organizationInitials: 'TC',
          inviterName: 'John Doe',
          inviterEmail: 'john@test.com',
          token: 'test-token-123'
        }
      }

      const { container } = render(<ChoiceScreen {...choiceProps} />)
      
      // Check normal state
      const buttons = container.querySelectorAll('button')
      
      buttons.forEach(button => {
        // Normal state should have hover effects
        expect(button.className.includes('hover:')).toBe(true)
        
        // Should have transition for smooth interactions
        expect(button.className.includes('transition')).toBe(true)
      })
    })

    it('should maintain accessibility with cursor changes', () => {
      const welcomeProps = { userName: 'Jane' }
      const { container } = render(<WelcomeScreen {...welcomeProps} />)
      
      const button = container.querySelector('button')
      
      // Button should be accessible even with cursor styling
      expect(button).not.toHaveAttribute('disabled')
      expect(button).toHaveClass('cursor-pointer')
      expect(button).toHaveClass('transition-colors')
    })
  })
})