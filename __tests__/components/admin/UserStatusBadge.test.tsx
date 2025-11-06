/**
 * UserStatusBadge Component Test Suite
 *
 * Tests the user status badge component that displays user subscription status
 */

import { describe, test, expect } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { UserStatusBadge } from '@/components/admin/UserStatusBadge'

describe('UserStatusBadge', () => {
  describe('Active status', () => {
    test('should render active badge', () => {
      render(<UserStatusBadge status="active" />)
      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    test('should have green styling for active status', () => {
      const { container } = render(<UserStatusBadge status="active" />)
      const badge = container.firstChild
      expect(badge).toHaveClass('text-green-700')
    })
  })

  describe('Pending removal status', () => {
    test('should render pending removal badge', () => {
      render(<UserStatusBadge status="pending_removal" />)
      expect(screen.getByText(/Pending Removal/)).toBeInTheDocument()
    })

    test('should display removal date when provided', () => {
      const removalDate = '2025-12-31T00:00:00Z'
      render(<UserStatusBadge status="pending_removal" removalDate={removalDate} />)

      // Check that the date is displayed (format: 12/31/2025)
      expect(screen.getByText(/12\/31\/2025/)).toBeInTheDocument()
    })

    test('should not display date when not provided', () => {
      const { container } = render(<UserStatusBadge status="pending_removal" />)
      expect(container.textContent).toBe('Pending Removal')
    })

    test('should have orange styling for pending removal status', () => {
      const { container } = render(<UserStatusBadge status="pending_removal" />)
      const badge = container.firstChild
      expect(badge).toHaveClass('text-orange-700')
    })
  })

  describe('Archived status', () => {
    test('should render archived badge', () => {
      render(<UserStatusBadge status="archived" />)
      expect(screen.getByText('Archived')).toBeInTheDocument()
    })

    test('should have gray styling for archived status', () => {
      const { container } = render(<UserStatusBadge status="archived" />)
      const badge = container.firstChild
      expect(badge).toHaveClass('text-gray-600')
    })
  })

  describe('Invited status', () => {
    test('should render invited badge', () => {
      render(<UserStatusBadge status="invited" />)
      expect(screen.getByText('Invited')).toBeInTheDocument()
    })

    test('should have blue styling for invited status', () => {
      const { container } = render(<UserStatusBadge status="invited" />)
      const badge = container.firstChild
      expect(badge).toHaveClass('text-blue-700')
    })
  })

  describe('Custom className', () => {
    test('should apply custom className', () => {
      const { container } = render(
        <UserStatusBadge status="active" className="custom-class" />
      )
      const badge = container.firstChild
      expect(badge).toHaveClass('custom-class')
    })
  })
})
