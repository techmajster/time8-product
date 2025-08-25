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

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key
}))

// Mock Supabase
const mockSupabaseClient = {
  from: jest.fn(() => ({
    insert: jest.fn(() => ({
      select: jest.fn(() => Promise.resolve({ data: null, error: null }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }))
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient
}))

describe('ChoiceScreen', () => {
  const mockInvitation = {
    id: 'inv-1',
    organizationName: 'Test Company',
    organizationInitials: 'TC',
    inviterName: 'John Doe',
    inviterEmail: 'john@test.com',
    token: 'test-token'
  }

  const defaultProps = {
    userName: 'Jane Doe',
    invitation: mockInvitation
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render welcome message with user name', () => {
    render(<ChoiceScreen {...defaultProps} />)
    expect(screen.getByText('onboarding.choice.title')).toBeInTheDocument()
  })

  it('should render invitation details', () => {
    render(<ChoiceScreen {...defaultProps} />)
    expect(screen.getByText('Test Company')).toBeInTheDocument()
    expect(screen.getByText('TC')).toBeInTheDocument()
    expect(screen.getByText(/john@test.com/)).toBeInTheDocument()
  })

  it('should render accept invitation button', () => {
    render(<ChoiceScreen {...defaultProps} />)
    const acceptButton = screen.getByRole('button', { name: /onboarding.choice.invitations.accept/i })
    expect(acceptButton).toBeInTheDocument()
  })

  it('should render create workspace button', () => {
    render(<ChoiceScreen {...defaultProps} />)
    const createButton = screen.getByRole('button', { name: /onboarding.choice.createOwn.cta/i })
    expect(createButton).toBeInTheDocument()
  })

  it('should navigate to create workspace when create button is clicked', () => {
    render(<ChoiceScreen {...defaultProps} />)
    const createButton = screen.getByRole('button', { name: /onboarding.choice.createOwn.cta/i })
    
    fireEvent.click(createButton)
    
    expect(mockPush).toHaveBeenCalledWith('/onboarding/create-workspace')
  })

  it('should show loading state when accepting invitation', async () => {
    render(<ChoiceScreen {...defaultProps} />)
    const acceptButton = screen.getByRole('button', { name: /onboarding.choice.invitations.accept/i })
    
    fireEvent.click(acceptButton)
    
    expect(screen.getByText('onboarding.choice.invitations.accepting')).toBeInTheDocument()
  })

  it('should handle invitation acceptance success', async () => {
    mockSupabaseClient.from.mockImplementation(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({ data: [{}], error: null }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }))

    render(<ChoiceScreen {...defaultProps} />)
    const acceptButton = screen.getByRole('button', { name: /onboarding.choice.invitations.accept/i })
    
    fireEvent.click(acceptButton)
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('should handle invitation acceptance error', async () => {
    mockSupabaseClient.from.mockImplementation(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({ data: null, error: { message: 'Database error' } }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }))

    render(<ChoiceScreen {...defaultProps} />)
    const acceptButton = screen.getByRole('button', { name: /onboarding.choice.invitations.accept/i })
    
    fireEvent.click(acceptButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Database error/)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<ChoiceScreen {...defaultProps} />)
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toBeInTheDocument()
    })

    it('should have accessible buttons', () => {
      render(<ChoiceScreen {...defaultProps} />)
      const acceptButton = screen.getByRole('button', { name: /onboarding.choice.invitations.accept/i })
      const createButton = screen.getByRole('button', { name: /onboarding.choice.createOwn.cta/i })
      
      expect(acceptButton).toBeInTheDocument()
      expect(createButton).toBeInTheDocument()
    })
  })
})