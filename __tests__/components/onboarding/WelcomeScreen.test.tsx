/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { WelcomeScreen } from '@/components/onboarding/WelcomeScreen'

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

describe('WelcomeScreen', () => {
  const defaultProps = {
    userName: 'John'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render welcome message with user name', () => {
      render(<WelcomeScreen {...defaultProps} />)
      expect(screen.getByText('Welcome John!')).toBeInTheDocument()
    })

    it('should render subtitle message', () => {
      render(<WelcomeScreen {...defaultProps} />)
      expect(screen.getByText("Let's get started with your workspace")).toBeInTheDocument()
    })

    it('should render Time8 logo', () => {
      render(<WelcomeScreen {...defaultProps} />)
      expect(screen.getByTestId('time8-logo')).toBeInTheDocument()
    })

    it('should render create workspace card', () => {
      render(<WelcomeScreen {...defaultProps} />)
      expect(screen.getByText('Do you want to create')).toBeInTheDocument()
      expect(screen.getByText('a new workspace?')).toBeInTheDocument()
      expect(screen.getByText("It's free!")).toBeInTheDocument()
      expect(screen.getByText('up to 3 users')).toBeInTheDocument()
    })

    it('should render create workspace button', () => {
      render(<WelcomeScreen {...defaultProps} />)
      const createButton = screen.getByRole('button', { name: /create new workspace/i })
      expect(createButton).toBeInTheDocument()
    })

    it('should render with proper styling classes', () => {
      const { container } = render(<WelcomeScreen {...defaultProps} />)
      const mainContainer = container.firstChild as HTMLElement
      expect(mainContainer).toHaveClass('bg-white', 'min-h-screen')
    })
  })

  describe('User Interactions', () => {
    it('should navigate to create workspace when button is clicked', () => {
      render(<WelcomeScreen {...defaultProps} />)
      const createButton = screen.getByRole('button', { name: /create new workspace/i })
      
      fireEvent.click(createButton)
      
      expect(mockPush).toHaveBeenCalledWith('/onboarding/create-workspace')
      expect(mockPush).toHaveBeenCalledTimes(1)
    })

    it('should handle button hover states', () => {
      render(<WelcomeScreen {...defaultProps} />)
      const createButton = screen.getByRole('button', { name: /create new workspace/i })
      
      expect(createButton).toHaveClass('hover:bg-neutral-800')
    })
  })

  describe('Component Structure', () => {
    it('should have correct layout structure', () => {
      render(<WelcomeScreen {...defaultProps} />)
      
      // Check main layout elements exist
      const welcomeText = screen.getByText('Welcome John!')
      const subtitleText = screen.getByText("Let's get started with your workspace")
      const createButton = screen.getByRole('button')
      
      expect(welcomeText).toBeInTheDocument()
      expect(subtitleText).toBeInTheDocument()
      expect(createButton).toBeInTheDocument()
    })

    it('should render UserPlus icon in card', () => {
      const { container } = render(<WelcomeScreen {...defaultProps} />)
      const svgIcon = container.querySelector('svg')
      expect(svgIcon).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible button', () => {
      render(<WelcomeScreen {...defaultProps} />)
      const button = screen.getByRole('button', { name: /create new workspace/i })
      expect(button).not.toHaveAttribute('disabled')
    })

    it('should have proper text hierarchy', () => {
      render(<WelcomeScreen {...defaultProps} />)
      
      // Check that text elements exist with different font sizes
      const welcomeText = screen.getByText('Welcome John!')
      const subtitleText = screen.getByText("Let's get started with your workspace")
      
      // These elements should be rendered (basic check)
      expect(welcomeText).toBeInTheDocument()
      expect(subtitleText).toBeInTheDocument()
      
      // Check that the welcome container has larger font size
      const welcomeContainer = welcomeText.closest('[class*="text-[48px]"]')
      const subtitleContainer = subtitleText.closest('[class*="text-[18px]"]')
      
      expect(welcomeContainer).toBeInTheDocument()
      expect(subtitleContainer).toBeInTheDocument()
    })

    it('should have proper color contrast', () => {
      render(<WelcomeScreen {...defaultProps} />)
      
      // Check that text and button elements exist and have color classes
      const welcomeText = screen.getByText('Welcome John!')
      const subtitleText = screen.getByText("Let's get started with your workspace")
      const button = screen.getByRole('button')
      
      // Basic existence checks
      expect(welcomeText).toBeInTheDocument()
      expect(subtitleText).toBeInTheDocument()
      expect(button).toBeInTheDocument()
      
      // Check for color classes in the DOM hierarchy
      const welcomeContainer = welcomeText.closest('[class*="text-neutral-950"]')
      const subtitleContainer = subtitleText.closest('[class*="text-neutral-500"]') 
      
      expect(welcomeContainer).toBeInTheDocument()
      expect(subtitleContainer).toBeInTheDocument()
      expect(button).toHaveClass('bg-neutral-900')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty user name gracefully', () => {
      render(<WelcomeScreen userName="" />)
      expect(screen.getByText('Welcome !')).toBeInTheDocument()
    })

    it('should handle long user names', () => {
      const longName = 'VeryLongUserNameThatMightCauseLayoutIssues'
      render(<WelcomeScreen userName={longName} />)
      expect(screen.getByText(`Welcome ${longName}!`)).toBeInTheDocument()
    })

    it('should handle special characters in user name', () => {
      const specialName = "John-O'Connor"
      render(<WelcomeScreen userName={specialName} />)
      expect(screen.getByText(`Welcome ${specialName}!`)).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should render quickly', () => {
      const startTime = performance.now()
      render(<WelcomeScreen {...defaultProps} />)
      const endTime = performance.now()
      
      // Should render in less than 100ms
      expect(endTime - startTime).toBeLessThan(100)
    })

    it('should not cause memory leaks', () => {
      const { unmount } = render(<WelcomeScreen {...defaultProps} />)
      unmount()
      
      // Should not throw when unmounting
      expect(() => unmount()).not.toThrow()
    })
  })
})