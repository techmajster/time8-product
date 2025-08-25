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

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key
}))

describe('WelcomeScreen', () => {
  const defaultProps = {
    userName: 'John Doe'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render welcome message with user name', () => {
    render(<WelcomeScreen {...defaultProps} />)
    expect(screen.getByText('onboarding.welcome.title')).toBeInTheDocument()
  })

  it('should render create workspace button', () => {
    render(<WelcomeScreen {...defaultProps} />)
    const createButton = screen.getByRole('button', { name: /onboarding.welcome.cta/i })
    expect(createButton).toBeInTheDocument()
  })

  it('should navigate to create workspace when button is clicked', () => {
    render(<WelcomeScreen {...defaultProps} />)
    const createButton = screen.getByRole('button', { name: /onboarding.welcome.cta/i })
    
    fireEvent.click(createButton)
    
    expect(mockPush).toHaveBeenCalledWith('/onboarding/create-workspace')
  })

  it('should render feature list', () => {
    render(<WelcomeScreen {...defaultProps} />)
    expect(screen.getByText('onboarding.welcome.features.manage')).toBeInTheDocument()
    expect(screen.getByText('onboarding.welcome.features.invite')).toBeInTheDocument()
    expect(screen.getByText('onboarding.welcome.features.track')).toBeInTheDocument()
  })

  it('should display free plan information', () => {
    render(<WelcomeScreen {...defaultProps} />)
    expect(screen.getByText('onboarding.welcome.footer')).toBeInTheDocument()
  })

  it('should render with proper styling classes', () => {
    const { container } = render(<WelcomeScreen {...defaultProps} />)
    const mainContainer = container.firstChild
    expect(mainContainer).toHaveClass('min-h-screen', 'flex', 'items-center', 'justify-center')
  })

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<WelcomeScreen {...defaultProps} />)
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toBeInTheDocument()
    })

    it('should have accessible create workspace button', () => {
      render(<WelcomeScreen {...defaultProps} />)
      const button = screen.getByRole('button', { name: /onboarding.welcome.cta/i })
      expect(button).toHaveAttribute('type', 'button')
    })
  })
})