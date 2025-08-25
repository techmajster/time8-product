import { render, screen } from '@testing-library/react'
import { WorkspaceAvatar } from '@/components/onboarding/WorkspaceAvatar'

describe('WorkspaceAvatar', () => {
  const defaultProps = {
    name: 'Test Company',
    initials: 'TC',
    memberCount: 5
  }

  it('should render workspace name', () => {
    render(<WorkspaceAvatar {...defaultProps} />)
    expect(screen.getByText('Test Company')).toBeInTheDocument()
  })

  it('should render initials in avatar', () => {
    render(<WorkspaceAvatar {...defaultProps} />)
    expect(screen.getByText('TC')).toBeInTheDocument()
  })

  it('should render member count badge', () => {
    render(<WorkspaceAvatar {...defaultProps} />)
    expect(screen.getByText('+5')).toBeInTheDocument()
  })

  it('should handle single member count', () => {
    render(<WorkspaceAvatar {...defaultProps} memberCount={1} />)
    // Should not show +1 badge for single member
    expect(screen.queryByText('+1')).not.toBeInTheDocument()
  })

  it('should handle zero member count', () => {
    render(<WorkspaceAvatar {...defaultProps} memberCount={0} />)
    expect(screen.queryByText('+0')).not.toBeInTheDocument()
  })

  it('should render member count for multiple members', () => {
    render(<WorkspaceAvatar {...defaultProps} memberCount={12} />)
    expect(screen.getByText('+12')).toBeInTheDocument()
  })

  it('should handle long organization names', () => {
    render(<WorkspaceAvatar {...defaultProps} name="Very Long Organization Name That Should Be Handled" />)
    expect(screen.getByText('Very Long Organization Name That Should Be Handled')).toBeInTheDocument()
  })

  it('should handle custom initials', () => {
    render(<WorkspaceAvatar {...defaultProps} name="Amazing Business Bureau" initials="AB" />)
    expect(screen.getByText('AB')).toBeInTheDocument()
  })

  it('should apply proper CSS classes for styling', () => {
    const { container } = render(<WorkspaceAvatar {...defaultProps} />)
    const avatar = container.querySelector('[data-testid="workspace-avatar"]')
    expect(avatar).toHaveClass('relative', 'flex', 'items-center', 'justify-center')
  })

  it('should render avatar with proper circular styling', () => {
    const { container } = render(<WorkspaceAvatar {...defaultProps} />)
    const avatarCircle = container.querySelector('[data-testid="avatar-circle"]')
    expect(avatarCircle).toHaveClass('rounded-full')
  })

  it('should render member badge with proper positioning', () => {
    const { container } = render(<WorkspaceAvatar {...defaultProps} memberCount={3} />)
    const memberBadge = container.querySelector('[data-testid="member-badge"]')
    expect(memberBadge).toHaveClass('absolute', 'bottom-0', 'right-0')
  })

  describe('Accessibility', () => {
    it('should have proper aria-label for avatar', () => {
      render(<WorkspaceAvatar {...defaultProps} />)
      expect(screen.getByLabelText(`${defaultProps.name} workspace with ${defaultProps.memberCount} members`)).toBeInTheDocument()
    })

    it('should be keyboard accessible', () => {
      const { container } = render(<WorkspaceAvatar {...defaultProps} />)
      const avatar = container.querySelector('[data-testid="workspace-avatar"]')
      expect(avatar).toHaveAttribute('tabIndex', '0')
    })
  })

  describe('Responsive Design', () => {
    it('should apply responsive text sizing', () => {
      const { container } = render(<WorkspaceAvatar {...defaultProps} />)
      const initialsElement = screen.getByText('TC')
      expect(initialsElement).toHaveClass('text-sm')
    })

    it('should apply responsive avatar sizing', () => {
      const { container } = render(<WorkspaceAvatar {...defaultProps} />)
      const avatarCircle = container.querySelector('[data-testid="avatar-circle"]')
      expect(avatarCircle).toHaveClass('w-10', 'h-10')
    })
  })
})