/**
 * Invite Users Dialog Payment Flow Tests
 *
 * Tests for the payment flow when inviting users:
 * - Uses update-subscription-quantity for existing subscriptions
 * - Shows payment processing state
 * - Handles payment confirmation via webhook
 * - Falls back to checkout for new subscriptions
 *
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InviteUsersDialog, SeatInfo } from '@/components/invitations/invite-users-dialog'

// Mock fetch
global.fetch = jest.fn()

// Mock sessionStorage
const mockSessionStorage: Record<string, string> = {}
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: jest.fn((key: string) => mockSessionStorage[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      mockSessionStorage[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete mockSessionStorage[key]
    }),
    clear: jest.fn(() => {
      Object.keys(mockSessionStorage).forEach(key => delete mockSessionStorage[key])
    })
  },
  writable: true
})

describe('InviteUsersDialog Payment Flow', () => {
  const mockSeatInfo: SeatInfo = {
    currentSeats: 9,
    maxSeats: 9, // No available seats - force payment for any new invitation
    availableSeats: 0,
    freeTierSeats: 3,
    paidSeats: 9,
    pendingInvitations: 0,
    usersMarkedForRemoval: 0,
    plan: 'business',
    billingCycle: 'monthly',
    pricePerSeat: 10.00,
    currency: 'PLN'
  }

  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    organizationId: 'org-123',
    organizationName: 'Test Organization',
    seatInfo: mockSeatInfo,
    onInviteSent: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    Object.keys(mockSessionStorage).forEach(key => delete mockSessionStorage[key])
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Existing Subscription - Update Flow', () => {
    it('should use update-subscription-quantity for existing active subscriptions', async () => {
      const user = userEvent.setup()

      // Mock subscription check - active subscription exists
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            subscription: {
              status: 'active',
              lemonsqueezy_subscription_id: 'sub-123'
            }
          })
        })
        // Mock update-subscription-quantity response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            payment_status: 'processing',
            subscription_id: 'sub-123',
            message: 'Payment processing'
          })
        })

      render(<InviteUsersDialog {...defaultProps} />)

      // Add an invitation that requires payment
      const emailInput = screen.getByPlaceholderText('Wpisz adres email')
      await user.type(emailInput, 'newuser@example.com')
      await user.click(screen.getByText('Dodaj'))

      // Click payment button
      await user.click(screen.getByText('Przejdź do płatności'))

      await waitFor(() => {
        // Should call subscription check
        expect(global.fetch).toHaveBeenCalledWith('/api/billing/subscription')

        // Should call update-subscription-quantity instead of create-checkout
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/billing/update-subscription-quantity',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('newuser@example.com')
          })
        )
      })
    })

    it('should NOT call create-checkout when subscription exists', async () => {
      const user = userEvent.setup()

      // Mock active subscription
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            subscription: { status: 'active' }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            payment_status: 'processing'
          })
        })

      render(<InviteUsersDialog {...defaultProps} />)

      const emailInput = screen.getByPlaceholderText('Wpisz adres email')
      await user.type(emailInput, 'user@example.com')
      await user.click(screen.getByText('Dodaj'))
      await user.click(screen.getByText('Przejdź do płatności'))

      await waitFor(() => {
        const fetchCalls = (global.fetch as jest.Mock).mock.calls
        const checkoutCalls = fetchCalls.filter(call =>
          call[0].includes('create-checkout')
        )
        expect(checkoutCalls.length).toBe(0)
      })
    })

    it('should send queued_invitations to update-subscription-quantity', async () => {
      const user = userEvent.setup()

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ subscription: { status: 'active' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            payment_status: 'processing'
          })
        })

      render(<InviteUsersDialog {...defaultProps} />)

      // Add multiple invitations
      const emailInput = screen.getByPlaceholderText('Wpisz adres email')
      await user.type(emailInput, 'user1@example.com')
      await user.click(screen.getByText('Dodaj'))
      await user.clear(emailInput)
      await user.type(emailInput, 'user2@example.com')
      await user.click(screen.getByText('Dodaj'))

      await user.click(screen.getByText('Przejdź do płatności'))

      await waitFor(() => {
        const updateCall = (global.fetch as jest.Mock).mock.calls.find(call =>
          call[0].includes('update-subscription-quantity')
        )
        expect(updateCall).toBeDefined()

        const body = JSON.parse(updateCall[1].body)
        expect(body.queued_invitations).toHaveLength(2)
        expect(body.queued_invitations[0].email).toBe('user1@example.com')
        expect(body.queued_invitations[1].email).toBe('user2@example.com')
      })
    })

    it('should calculate correct new_quantity based on required seats', async () => {
      const user = userEvent.setup()

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ subscription: { status: 'active' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, payment_status: 'processing' })
        })

      render(<InviteUsersDialog {...defaultProps} />)

      // Current: 9 seats, Add 1 user = 10 total needed
      const emailInput = screen.getByPlaceholderText('Wpisz adres email')
      await user.type(emailInput, 'newuser@example.com')
      await user.click(screen.getByText('Dodaj'))
      await user.click(screen.getByText('Przejdź do płatności'))

      await waitFor(() => {
        const updateCall = (global.fetch as jest.Mock).mock.calls.find(call =>
          call[0].includes('update-subscription-quantity')
        )
        const body = JSON.parse(updateCall[1].body)
        expect(body.new_quantity).toBe(10) // 9 current + 1 new
      })
    })
  })

  describe('Payment Processing State', () => {
    it('should close dialog and call onInviteSent after successful payment initiation', async () => {
      const user = userEvent.setup()
      const onInviteSent = jest.fn()
      const onOpenChange = jest.fn()

      // Mock window.alert
      const alertMock = jest.spyOn(window, 'alert').mockImplementation()

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ subscription: { status: 'active' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            payment_status: 'processing',
            message: 'Payment processing'
          })
        })

      render(<InviteUsersDialog {...defaultProps} onInviteSent={onInviteSent} onOpenChange={onOpenChange} />)

      const emailInput = screen.getByPlaceholderText('Wpisz adres email')
      await user.type(emailInput, 'user@example.com')
      await user.click(screen.getByText('Dodaj'))
      await user.click(screen.getByText('Przejdź do płatności'))

      await waitFor(() => {
        expect(onInviteSent).toHaveBeenCalled()
        expect(onOpenChange).toHaveBeenCalledWith(false)
      })

      alertMock.mockRestore()
    })

    it('should disable buttons during payment processing', async () => {
      const user = userEvent.setup()

      // Delay the second fetch to keep the button in loading state
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ subscription: { status: 'active' } })
        })
        .mockImplementationOnce(() =>
          new Promise(resolve =>
            setTimeout(() => resolve({
              ok: true,
              json: async () => ({ success: true, payment_status: 'processing' })
            }), 100)
          )
        )

      render(<InviteUsersDialog {...defaultProps} />)

      const emailInput = screen.getByPlaceholderText('Wpisz adres email')
      await user.type(emailInput, 'user@example.com')
      await user.click(screen.getByText('Dodaj'))

      const paymentButton = screen.getByText('Przejdź do płatności')
      await user.click(paymentButton)

      // Button should show loading state
      expect(screen.getByText('Przetwarzanie...')).toBeInTheDocument()
    })
  })

  describe('New Subscription - Checkout Flow', () => {
    it('should use create-checkout when no active subscription exists', async () => {
      const user = userEvent.setup()

      // Mock no subscription
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({ error: 'No subscription found' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            checkout_url: 'https://lemonsqueezy.com/checkout/123'
          })
        })

      // Mock window.location.href
      delete (window as any).location
      window.location = { href: '' } as any

      render(<InviteUsersDialog {...defaultProps} />)

      const emailInput = screen.getByPlaceholderText('Wpisz adres email')
      await user.type(emailInput, 'user@example.com')
      await user.click(screen.getByText('Dodaj'))
      await user.click(screen.getByText('Przejdź do płatności'))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/billing/create-checkout',
          expect.any(Object)
        )
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error when update-subscription-quantity fails', async () => {
      const user = userEvent.setup()

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ subscription: { status: 'active' } })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({
            error: 'Payment processing failed'
          })
        })

      render(<InviteUsersDialog {...defaultProps} />)

      const emailInput = screen.getByPlaceholderText('Wpisz adres email')
      await user.type(emailInput, 'user@example.com')
      await user.click(screen.getByText('Dodaj'))
      await user.click(screen.getByText('Przejdź do płatności'))

      await waitFor(() => {
        // Error should be displayed in the red error box
        expect(screen.getByText(/Błąd płatności/i)).toBeInTheDocument()
        expect(screen.getAllByText(/Payment processing failed/i).length).toBeGreaterThan(0)
      })
    })

    it('should allow retry after error', async () => {
      const user = userEvent.setup()

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ subscription: { status: 'active' } })
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Network error' })
        })

      render(<InviteUsersDialog {...defaultProps} />)

      const emailInput = screen.getByPlaceholderText('Wpisz adres email')
      await user.type(emailInput, 'user@example.com')
      await user.click(screen.getByText('Dodaj'))
      await user.click(screen.getByText('Przejdź do płatności'))

      await waitFor(() => {
        expect(screen.getByText(/Błąd płatności/i)).toBeInTheDocument()
        expect(screen.getAllByText(/Network error/i).length).toBeGreaterThan(0)
      })

      // Button should be enabled for retry
      await waitFor(() => {
        const paymentButton = screen.getByText('Przejdź do płatności')
        expect(paymentButton).not.toBeDisabled()
      })
    })
  })

  describe('Invoice Immediately Flag', () => {
    it('should set invoice_immediately to true for immediate upgrades', async () => {
      const user = userEvent.setup()

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ subscription: { status: 'active' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, payment_status: 'processing' })
        })

      render(<InviteUsersDialog {...defaultProps} />)

      const emailInput = screen.getByPlaceholderText('Wpisz adres email')
      await user.type(emailInput, 'user@example.com')
      await user.click(screen.getByText('Dodaj'))
      await user.click(screen.getByText('Przejdź do płatności'))

      await waitFor(() => {
        const updateCall = (global.fetch as jest.Mock).mock.calls.find(call =>
          call[0].includes('update-subscription-quantity')
        )
        const body = JSON.parse(updateCall[1].body)
        expect(body.invoice_immediately).toBe(true)
      })
    })
  })
})
