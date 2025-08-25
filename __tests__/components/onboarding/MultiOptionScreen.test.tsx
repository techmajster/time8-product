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

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key
}))

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(() => Promise.resolve({ 
      data: { user: { id: 'user-1' } }, 
      error: null 
    }))
  },
  from: jest.fn(() => ({
    insert: jest.fn(() => ({
      select: jest.fn(() => Promise.resolve({ data: [{}], error: null }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }))
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient
}))

describe('MultiOptionScreen', () => {
  const mockWorkspace = {
    id: 'org-1',
    name: 'My Company',
    initials: 'MC',
    memberCount: 5,
    role: 'admin'
  }

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
    userWorkspaces: [mockWorkspace],
    pendingInvitations: [mockInvitation]
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render welcome message with user name', () => {
    render(<MultiOptionScreen {...defaultProps} />)
    expect(screen.getByText('Welcome Jane Doe!')).toBeInTheDocument()
  })

  it('should render user workspaces', () => {
    render(<MultiOptionScreen {...defaultProps} />)
    expect(screen.getByText('My Company')).toBeInTheDocument()
    expect(screen.getByText('MC')).toBeInTheDocument()
    expect(screen.getByText('Role: admin')).toBeInTheDocument()
  })

  it('should render pending invitations', () => {
    render(<MultiOptionScreen {...defaultProps} />)
    expect(screen.getByText('Test Company')).toBeInTheDocument()
    expect(screen.getByText('TC')).toBeInTheDocument()
    expect(screen.getByText('by John Doe')).toBeInTheDocument()
  })

  it('should render create workspace option', () => {
    render(<MultiOptionScreen {...defaultProps} />)
    expect(screen.getByText('Do you want to create a new workspace?')).toBeInTheDocument()
    expect(screen.getByText('Create new workspace')).toBeInTheDocument()
  })

  it('should handle workspace entry', () => {
    render(<MultiOptionScreen {...defaultProps} />)
    const enterButton = screen.getByRole('button', { name: /enter workspace/i })
    
    fireEvent.click(enterButton)
    
    expect(mockPush).toHaveBeenCalledWith('/dashboard?org=org-1')
  })

  it('should handle create workspace navigation', () => {
    render(<MultiOptionScreen {...defaultProps} />)
    const createButton = screen.getByRole('button', { name: /create new workspace/i })
    
    fireEvent.click(createButton)
    
    expect(mockPush).toHaveBeenCalledWith('/onboarding/create-workspace')
  })

  it('should handle invitation acceptance', async () => {
    render(<MultiOptionScreen {...defaultProps} />)
    const acceptButton = screen.getByRole('button', { name: /accept invitation/i })
    
    fireEvent.click(acceptButton)
    
    expect(screen.getByText('Accepting...')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('should handle multiple workspaces', () => {
    const propsWithMultipleWorkspaces = {
      ...defaultProps,
      userWorkspaces: [
        mockWorkspace,
        { id: 'org-2', name: 'Another Company', initials: 'AC', memberCount: 3, role: 'employee' }
      ]
    }

    render(<MultiOptionScreen {...propsWithMultipleWorkspaces} />)
    
    expect(screen.getByText('My Company')).toBeInTheDocument()
    expect(screen.getByText('Another Company')).toBeInTheDocument()
    expect(screen.getAllByText(/enter workspace/i)).toHaveLength(2)
  })

  it('should handle multiple invitations', () => {
    const propsWithMultipleInvitations = {
      ...defaultProps,
      pendingInvitations: [
        mockInvitation,
        { 
          id: 'inv-2', 
          organizationName: 'Second Company', 
          organizationInitials: 'SC',
          inviterName: 'Jane Smith',
          inviterEmail: 'jane@second.com',
          token: 'token-2'
        }
      ]
    }

    render(<MultiOptionScreen {...propsWithMultipleInvitations} />)
    
    expect(screen.getByText('Test Company')).toBeInTheDocument()
    expect(screen.getByText('Second Company')).toBeInTheDocument()
    expect(screen.getAllByText(/accept invitation/i)).toHaveLength(2)
  })

  it('should handle no workspaces scenario', () => {
    const propsNoWorkspaces = {
      ...defaultProps,
      userWorkspaces: []
    }

    render(<MultiOptionScreen {...propsNoWorkspaces} />)
    
    expect(screen.queryByText('My Company')).not.toBeInTheDocument()
    expect(screen.getByText('Test Company')).toBeInTheDocument() // invitation still shown
    expect(screen.getByText('Create new workspace')).toBeInTheDocument()
  })

  describe('Error Handling', () => {
    it('should display error message when invitation acceptance fails', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => Promise.resolve({ data: null, error: { message: 'Database error' } }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))

      render(<MultiOptionScreen {...defaultProps} />)
      const acceptButton = screen.getByRole('button', { name: /accept invitation/i })
      
      fireEvent.click(acceptButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Database error/)).toBeInTheDocument()
      })
    })
  })

  describe('Grid Layout', () => {
    it('should use appropriate grid layout for multiple items', () => {
      const propsWithManyItems = {
        ...defaultProps,
        userWorkspaces: [mockWorkspace, mockWorkspace],
        pendingInvitations: [mockInvitation, mockInvitation]
      }

      const { container } = render(<MultiOptionScreen {...propsWithManyItems} />)
      const gridContainer = container.querySelector('.grid')
      expect(gridContainer).toHaveClass('grid-cols-2')
    })
  })
})