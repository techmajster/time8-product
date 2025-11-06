/**
 * PendingChangesSection Component Test Suite
 *
 * Tests the pending changes section that displays users scheduled for removal
 */

import { describe, test, expect } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { PendingChangesSection } from '@/components/admin/PendingChangesSection'

describe('PendingChangesSection', () => {
  const mockUsers = [
    {
      id: '1',
      email: 'user1@example.com',
      full_name: 'John Doe',
      avatar_url: null,
      removal_effective_date: '2025-12-31T00:00:00Z',
      role: 'employee'
    },
    {
      id: '2',
      email: 'user2@example.com',
      full_name: 'Jane Smith',
      avatar_url: null,
      removal_effective_date: '2025-12-31T00:00:00Z',
      role: 'employee'
    }
  ]

  test('should render pending removals section with users', () => {
    render(<PendingChangesSection users={mockUsers} />)
    expect(screen.getByText('Pending Removals')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
  })

  test('should display user count badge', () => {
    render(<PendingChangesSection users={mockUsers} />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  test('should show removal dates', () => {
    render(<PendingChangesSection users={mockUsers} />)
    expect(screen.getAllByText(/Removed on/)).toHaveLength(2)
    expect(screen.getAllByText(/Dec 31, 2025/)).toHaveLength(2)
  })

  test('should not render when no users', () => {
    const { container } = render(<PendingChangesSection users={[]} />)
    expect(container.firstChild).toBeNull()
  })

  test('should render cancel buttons for each user', () => {
    render(<PendingChangesSection users={mockUsers} />)
    const cancelButtons = screen.getAllByText(/Cancel/)
    expect(cancelButtons).toHaveLength(2)
  })
})
