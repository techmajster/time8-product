/**
 * SubscriptionWidget Component Test Suite
 *
 * Tests the subscription widget that displays seat allocation and billing details
 */

import { describe, test, expect } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { SubscriptionWidget } from '@/components/admin/SubscriptionWidget'

describe('SubscriptionWidget', () => {
  describe('Basic rendering', () => {
    test('should render current seats', () => {
      render(<SubscriptionWidget currentSeats={5} />)
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('Current Seats')).toBeInTheDocument()
    })

    test('should render subscription title', () => {
      render(<SubscriptionWidget currentSeats={3} />)
      expect(screen.getByText('Subscription')).toBeInTheDocument()
    })
  })

  describe('Pending changes', () => {
    test('should show pending increase alert', () => {
      render(<SubscriptionWidget currentSeats={3} pendingSeats={5} />)
      expect(screen.getByText(/Changing to/)).toBeInTheDocument()
      expect(screen.getByText(/5/)).toBeInTheDocument()
    })

    test('should show pending decrease alert', () => {
      render(<SubscriptionWidget currentSeats={10} pendingSeats={7} />)
      expect(screen.getByText(/Changing to/)).toBeInTheDocument()
      expect(screen.getByText(/7/)).toBeInTheDocument()
    })

    test('should not show alert when pending equals current', () => {
      render(<SubscriptionWidget currentSeats={5} pendingSeats={5} />)
      expect(screen.queryByText(/Changing to/)).not.toBeInTheDocument()
    })

    test('should not show alert when pending is null', () => {
      render(<SubscriptionWidget currentSeats={5} pendingSeats={null} />)
      expect(screen.queryByText(/Changing to/)).not.toBeInTheDocument()
    })
  })

  describe('Renewal date', () => {
    test('should display renewal date when provided', () => {
      const renewsAt = '2025-12-31T00:00:00Z'
      render(<SubscriptionWidget currentSeats={5} renewsAt={renewsAt} />)
      expect(screen.getByText('Next Renewal')).toBeInTheDocument()
      expect(screen.getByText(/Dec 31, 2025/)).toBeInTheDocument()
    })

    test('should not display renewal date when not provided', () => {
      render(<SubscriptionWidget currentSeats={5} />)
      expect(screen.queryByText('Next Renewal')).not.toBeInTheDocument()
    })
  })

  describe('Status badges', () => {
    test('should show active badge by default', () => {
      render(<SubscriptionWidget currentSeats={5} />)
      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    test('should show trial badge when status is on_trial', () => {
      render(<SubscriptionWidget currentSeats={5} status="on_trial" />)
      expect(screen.getByText('Trial')).toBeInTheDocument()
    })

    test('should show past due badge when status is past_due', () => {
      render(<SubscriptionWidget currentSeats={5} status="past_due" />)
      expect(screen.getByText('Past Due')).toBeInTheDocument()
    })

    test('should show cancelled badge when status is cancelled', () => {
      render(<SubscriptionWidget currentSeats={5} status="cancelled" />)
      expect(screen.getByText('Cancelled')).toBeInTheDocument()
    })
  })

  describe('Custom className', () => {
    test('should apply custom className', () => {
      const { container } = render(
        <SubscriptionWidget currentSeats={5} className="custom-class" />
      )
      const card = container.firstChild
      expect(card).toHaveClass('custom-class')
    })
  })
})
