/**
 * InviteUsersDialog Sheet Component Tests
 *
 * Tests for the invite users sheet (not dialog) component
 * Focus on seat calculations, pricing display, and email queue functionality
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { InviteUsersDialog, SeatInfo } from '@/components/invitations/invite-users-dialog'

// Mock fetch globally
global.fetch = jest.fn()

describe('InviteUsersDialog Sheet Component', () => {
  const mockOrganizationId = 'org-123'
  const mockOrganizationName = 'Test Organization'
  const mockOnInviteSent = jest.fn()
  const mockOnOpenChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Rendering Tests', () => {
    it('should render sheet with correct title when open', () => {
      const seatInfo: SeatInfo = {
        currentSeats: 2,
        maxSeats: 3,
        availableSeats: 1,
        freeTierSeats: 3,
        paidSeats: 0,
        pendingInvitations: 0,
        usersMarkedForRemoval: 0,
        plan: 'free'
      }

      render(
        <InviteUsersDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          organizationId={mockOrganizationId}
          organizationName={mockOrganizationName}
          seatInfo={seatInfo}
          onInviteSent={mockOnInviteSent}
        />
      )

      expect(screen.getByText('Zaproś użytkowników')).toBeInTheDocument()
    })

    it('should not render when open is false', () => {
      const seatInfo: SeatInfo = {
        currentSeats: 2,
        maxSeats: 3,
        availableSeats: 1,
        freeTierSeats: 3,
        paidSeats: 0,
        pendingInvitations: 0,
        usersMarkedForRemoval: 0,
        plan: 'free'
      }

      const { container } = render(
        <InviteUsersDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          organizationId={mockOrganizationId}
          organizationName={mockOrganizationName}
          seatInfo={seatInfo}
          onInviteSent={mockOnInviteSent}
        />
      )

      // Sheet should not be visible when open=false
      expect(container.querySelector('[data-state="open"]')).not.toBeInTheDocument()
    })

    it('should display default fallback pricing (10.00 PLN) when seatInfo has no pricing', () => {
      const seatInfo: SeatInfo = {
        currentSeats: 5,
        maxSeats: 10,
        availableSeats: 5,
        freeTierSeats: 3,
        paidSeats: 7,
        pendingInvitations: 0,
        usersMarkedForRemoval: 0,
        plan: 'business'
        // No pricePerSeat or currency provided
      }

      render(
        <InviteUsersDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          organizationId={mockOrganizationId}
          organizationName={mockOrganizationName}
          seatInfo={seatInfo}
          onInviteSent={mockOnInviteSent}
        />
      )

      // Component should default to 10.00 PLN
      expect(screen.getByText(/10\.00 PLN/)).toBeInTheDocument()
    })
  })

  describe('Seat Calculation Tests', () => {
    it('should display correct availableSeats for free tier (0-3 users)', () => {
      const seatInfo: SeatInfo = {
        currentSeats: 2,
        maxSeats: 3,
        availableSeats: 1,  // 3 - 2 = 1 available
        freeTierSeats: 3,
        paidSeats: 0,
        pendingInvitations: 0,
        usersMarkedForRemoval: 0,
        plan: 'free'
      }

      render(
        <InviteUsersDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          organizationId={mockOrganizationId}
          organizationName={mockOrganizationName}
          seatInfo={seatInfo}
          onInviteSent={mockOnInviteSent}
        />
      )

      // Should show 1 available seat out of 3 total
      expect(screen.getByText(/1\/3 wolnych miejsc/)).toBeInTheDocument()
    })

    it('should display correct availableSeats for paid tier (4+ users)', () => {
      const seatInfo: SeatInfo = {
        currentSeats: 8,
        maxSeats: 13,  // 10 paid + 3 free
        availableSeats: 5,  // 13 - 8 = 5 available
        freeTierSeats: 3,
        paidSeats: 10,
        pendingInvitations: 1,
        usersMarkedForRemoval: 0,
        plan: 'business',
        pricePerSeat: 10.00,
        currency: 'PLN',
        billingCycle: 'monthly'
      }

      render(
        <InviteUsersDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          organizationId={mockOrganizationId}
          organizationName={mockOrganizationName}
          seatInfo={seatInfo}
          onInviteSent={mockOnInviteSent}
        />
      )

      // Should show 5 available seats out of 13 total
      expect(screen.getByText(/5\/13 wolnych miejsc/)).toBeInTheDocument()
    })

    it('should show 0 available seats when at capacity', () => {
      const seatInfo: SeatInfo = {
        currentSeats: 10,
        maxSeats: 10,
        availableSeats: 0,  // At capacity
        freeTierSeats: 3,
        paidSeats: 7,
        pendingInvitations: 2,
        usersMarkedForRemoval: 0,
        plan: 'business',
        pricePerSeat: 10.00,
        currency: 'PLN',
        billingCycle: 'monthly'
      }

      render(
        <InviteUsersDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          organizationId={mockOrganizationId}
          organizationName={mockOrganizationName}
          seatInfo={seatInfo}
          onInviteSent={mockOnInviteSent}
        />
      )

      // Should show 0 available seats
      expect(screen.getByText(/0\/10 wolnych miejsc/)).toBeInTheDocument()
    })

    it('should handle null seatInfo gracefully', () => {
      render(
        <InviteUsersDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          organizationId={mockOrganizationId}
          organizationName={mockOrganizationName}
          seatInfo={null}
          onInviteSent={mockOnInviteSent}
        />
      )

      // Should render without crashing and show 0 seats
      expect(screen.getByText(/0\/0 wolnych miejsc/)).toBeInTheDocument()
    })
  })

  describe('Pricing Display Tests', () => {
    it('should display pricing from seatInfo when available (monthly)', () => {
      const seatInfo: SeatInfo = {
        currentSeats: 5,
        maxSeats: 10,
        availableSeats: 5,
        freeTierSeats: 3,
        paidSeats: 7,
        pendingInvitations: 0,
        usersMarkedForRemoval: 0,
        plan: 'business',
        pricePerSeat: 10.00,  // Correct PLN pricing from API
        currency: 'PLN',
        billingCycle: 'monthly'
      }

      render(
        <InviteUsersDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          organizationId={mockOrganizationId}
          organizationName={mockOrganizationName}
          seatInfo={seatInfo}
          onInviteSent={mockOnInviteSent}
        />
      )

      // Should show 10.00 PLN from seatInfo
      expect(screen.getByText(/10\.00 PLN/)).toBeInTheDocument()
    })

    it('should display pricing from seatInfo when available (yearly)', () => {
      const seatInfo: SeatInfo = {
        currentSeats: 5,
        maxSeats: 10,
        availableSeats: 5,
        freeTierSeats: 3,
        paidSeats: 7,
        pendingInvitations: 0,
        usersMarkedForRemoval: 0,
        plan: 'business',
        pricePerSeat: 96.00,  // Yearly pricing from API
        currency: 'PLN',
        billingCycle: 'yearly'
      }

      render(
        <InviteUsersDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          organizationId={mockOrganizationId}
          organizationName={mockOrganizationName}
          seatInfo={seatInfo}
          onInviteSent={mockOnInviteSent}
        />
      )

      // Should show 96.00 PLN from seatInfo
      expect(screen.getByText(/96\.00 PLN/)).toBeInTheDocument()
    })

    it('should fall back to 10.00 PLN when seatInfo.pricePerSeat is missing', () => {
      const seatInfo: SeatInfo = {
        currentSeats: 5,
        maxSeats: 10,
        availableSeats: 5,
        freeTierSeats: 3,
        paidSeats: 7,
        pendingInvitations: 0,
        usersMarkedForRemoval: 0,
        plan: 'business'
        // No pricePerSeat or currency
      }

      render(
        <InviteUsersDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          organizationId={mockOrganizationId}
          organizationName={mockOrganizationName}
          seatInfo={seatInfo}
          onInviteSent={mockOnInviteSent}
        />
      )

      // Should fall back to default 10.00 PLN
      expect(screen.getByText(/10\.00 PLN/)).toBeInTheDocument()
    })

    it('should display correct currency (PLN)', () => {
      const seatInfo: SeatInfo = {
        currentSeats: 5,
        maxSeats: 10,
        availableSeats: 5,
        freeTierSeats: 3,
        paidSeats: 7,
        pendingInvitations: 0,
        usersMarkedForRemoval: 0,
        plan: 'business',
        pricePerSeat: 10.00,
        currency: 'PLN',
        billingCycle: 'monthly'
      }

      render(
        <InviteUsersDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          organizationId={mockOrganizationId}
          organizationName={mockOrganizationName}
          seatInfo={seatInfo}
          onInviteSent={mockOnInviteSent}
        />
      )

      // Should show PLN currency
      expect(screen.getByText(/PLN/)).toBeInTheDocument()
    })
  })

  describe('Email Queue Functionality', () => {
    it('should validate email format before adding to queue', () => {
      const seatInfo: SeatInfo = {
        currentSeats: 2,
        maxSeats: 3,
        availableSeats: 1,
        freeTierSeats: 3,
        paidSeats: 0,
        pendingInvitations: 0,
        usersMarkedForRemoval: 0,
        plan: 'free'
      }

      render(
        <InviteUsersDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          organizationId={mockOrganizationId}
          organizationName={mockOrganizationName}
          seatInfo={seatInfo}
          onInviteSent={mockOnInviteSent}
        />
      )

      const emailInput = screen.getByPlaceholderText(/adres@email.com/i)
      const addButton = screen.getByRole('button', { name: /dodaj/i })

      // Try to add invalid email
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
      fireEvent.click(addButton)

      // Should show error message for invalid email
      expect(screen.getByText(/Nieprawidłowy format adresu email/i)).toBeInTheDocument()
    })

    it('should add valid email to queue', () => {
      const seatInfo: SeatInfo = {
        currentSeats: 2,
        maxSeats: 10,
        availableSeats: 8,
        freeTierSeats: 3,
        paidSeats: 7,
        pendingInvitations: 0,
        usersMarkedForRemoval: 0,
        plan: 'business',
        pricePerSeat: 10.00,
        currency: 'PLN'
      }

      render(
        <InviteUsersDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          organizationId={mockOrganizationId}
          organizationName={mockOrganizationName}
          seatInfo={seatInfo}
          onInviteSent={mockOnInviteSent}
        />
      )

      const emailInput = screen.getByPlaceholderText(/adres@email.com/i)
      const addButton = screen.getByRole('button', { name: /dodaj/i })

      // Add valid email
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(addButton)

      // Email should appear in queue
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    it('should prevent duplicate emails in queue', () => {
      const seatInfo: SeatInfo = {
        currentSeats: 2,
        maxSeats: 10,
        availableSeats: 8,
        freeTierSeats: 3,
        paidSeats: 7,
        pendingInvitations: 0,
        usersMarkedForRemoval: 0,
        plan: 'business',
        pricePerSeat: 10.00,
        currency: 'PLN'
      }

      render(
        <InviteUsersDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          organizationId={mockOrganizationId}
          organizationName={mockOrganizationName}
          seatInfo={seatInfo}
          onInviteSent={mockOnInviteSent}
        />
      )

      const emailInput = screen.getByPlaceholderText(/adres@email.com/i)
      const addButton = screen.getByRole('button', { name: /dodaj/i })

      // Add email first time
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(addButton)

      // Try to add same email again
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(addButton)

      // Should show error message
      expect(screen.getByText(/Ten adres email jest już na liście/i)).toBeInTheDocument()
    })

    it('should remove email from queue when delete button clicked', () => {
      const seatInfo: SeatInfo = {
        currentSeats: 2,
        maxSeats: 10,
        availableSeats: 8,
        freeTierSeats: 3,
        paidSeats: 7,
        pendingInvitations: 0,
        usersMarkedForRemoval: 0,
        plan: 'business',
        pricePerSeat: 10.00,
        currency: 'PLN'
      }

      render(
        <InviteUsersDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          organizationId={mockOrganizationId}
          organizationName={mockOrganizationName}
          seatInfo={seatInfo}
          onInviteSent={mockOnInviteSent}
        />
      )

      const emailInput = screen.getByPlaceholderText(/adres@email.com/i)
      const addButton = screen.getByRole('button', { name: /dodaj/i })

      // Add email
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(addButton)

      // Email should be in queue
      expect(screen.getByText('test@example.com')).toBeInTheDocument()

      // Click delete button
      const deleteButton = screen.getByTestId('remove-test@example.com')
      fireEvent.click(deleteButton)

      // Email should be removed
      expect(screen.queryByText('test@example.com')).not.toBeInTheDocument()
    })

    it('should calculate correct total cost for unpaid invitations', () => {
      const seatInfo: SeatInfo = {
        currentSeats: 5,
        maxSeats: 10,
        availableSeats: 5,
        freeTierSeats: 3,
        paidSeats: 7,
        pendingInvitations: 0,
        usersMarkedForRemoval: 0,
        plan: 'business',
        pricePerSeat: 10.00,
        currency: 'PLN',
        billingCycle: 'monthly'
      }

      render(
        <InviteUsersDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          organizationId={mockOrganizationId}
          organizationName={mockOrganizationName}
          seatInfo={seatInfo}
          onInviteSent={mockOnInviteSent}
        />
      )

      const emailInput = screen.getByPlaceholderText(/adres@email.com/i)
      const addButton = screen.getByRole('button', { name: /dodaj/i })

      // Add 3 emails to queue (should all be unpaid since we're over free tier)
      fireEvent.change(emailInput, { target: { value: 'user1@example.com' } })
      fireEvent.click(addButton)

      fireEvent.change(emailInput, { target: { value: 'user2@example.com' } })
      fireEvent.click(addButton)

      fireEvent.change(emailInput, { target: { value: 'user3@example.com' } })
      fireEvent.click(addButton)

      // Should show total cost: 3 * 10.00 = 30.00 PLN
      expect(screen.getByText(/30\.00 PLN/)).toBeInTheDocument()
    })
  })

  describe('Integration with Seat Info API', () => {
    it('should correctly use availableSeats field from API', () => {
      const seatInfo: SeatInfo = {
        currentSeats: 8,
        maxSeats: 13,
        availableSeats: 5,  // ✅ CLEAR - empty seats that can be filled
        freeTierSeats: 3,   // ✅ CLEAR - tier threshold (always 3)
        paidSeats: 10,
        pendingInvitations: 1,
        usersMarkedForRemoval: 0,
        plan: 'business',
        pricePerSeat: 10.00,
        currency: 'PLN',
        billingCycle: 'monthly'
      }

      render(
        <InviteUsersDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          organizationId={mockOrganizationId}
          organizationName={mockOrganizationName}
          seatInfo={seatInfo}
          onInviteSent={mockOnInviteSent}
        />
      )

      // Should display availableSeats correctly
      expect(screen.getByText(/5\/13 wolnych miejsc/)).toBeInTheDocument()
    })

    it('should correctly use freeTierSeats constant (3)', () => {
      const seatInfo: SeatInfo = {
        currentSeats: 2,
        maxSeats: 3,
        availableSeats: 1,
        freeTierSeats: 3,  // Always 3 for graduated pricing
        paidSeats: 0,
        pendingInvitations: 0,
        usersMarkedForRemoval: 0,
        plan: 'free'
      }

      render(
        <InviteUsersDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          organizationId={mockOrganizationId}
          organizationName={mockOrganizationName}
          seatInfo={seatInfo}
          onInviteSent={mockOnInviteSent}
        />
      )

      // Should show free tier seats (3) as max
      expect(screen.getByText(/1\/3 wolnych miejsc/)).toBeInTheDocument()
    })
  })
})
