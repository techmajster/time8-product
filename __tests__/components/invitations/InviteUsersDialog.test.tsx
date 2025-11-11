import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InviteUsersDialog } from '@/components/invitations/invite-users-dialog'

describe('InviteUsersDialog', () => {
  const mockOnOpenChange = jest.fn()
  const mockOnInviteSent = jest.fn()

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    organizationId: 'org-123',
    organizationName: 'Test Organization',
    seatInfo: {
      currentSeats: 1,
      maxSeats: 3,
      freeSeats: 2,
      pendingInvitations: 0,
      usersMarkedForRemoval: 0,
      plan: 'free' as const
    },
    onInviteSent: mockOnInviteSent
  }

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    Storage.prototype.setItem = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render dialog with title', () => {
      render(<InviteUsersDialog {...defaultProps} />)

      expect(
        screen.getByRole('heading', { name: /zaproś nowych użytkowników/i })
      ).toBeInTheDocument()
    })

    it('should render seat information for free plan', () => {
      render(<InviteUsersDialog {...defaultProps} />)

      expect(
        screen.getByText(/masz 2\/3 wolne zaproszenia w twoim planie hobby/i)
      ).toBeInTheDocument()
    })

    it('should render seat information for business plan', () => {
      render(
        <InviteUsersDialog
          {...defaultProps}
          seatInfo={{
            ...defaultProps.seatInfo,
            plan: 'business',
            maxSeats: 10,
            freeSeats: 8
          }}
        />
      )

      expect(
        screen.getByText(/masz 8\/10 wolne zaproszenia w twoim planie pro/i)
      ).toBeInTheDocument()
    })

    it('should render seat blocks with correct counts', () => {
      render(<InviteUsersDialog {...defaultProps} />)

      // Check occupied seats
      expect(screen.getByText('Ty')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()

      // Check free seats
      expect(screen.getByText('Wolne')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('should render email input and add button', () => {
      render(<InviteUsersDialog {...defaultProps} />)

      expect(
        screen.getByPlaceholderText(/wpisz adres email/i)
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /dodaj/i })).toBeInTheDocument()
    })

    it('should not render invitation list when no invitations queued', () => {
      render(<InviteUsersDialog {...defaultProps} />)

      expect(
        screen.queryByText(/do zaproszenia/i)
      ).not.toBeInTheDocument()
    })
  })

  describe('Adding Invitations', () => {
    it('should add email to queue when add button clicked', async () => {
      const user = userEvent.setup()
      render(<InviteUsersDialog {...defaultProps} />)

      const emailInput = screen.getByPlaceholderText(/wpisz adres email/i)
      await user.type(emailInput, 'test@example.com')
      await user.click(screen.getByRole('button', { name: /dodaj/i }))

      await waitFor(() => {
        expect(screen.getByText(/do zaproszenia/i)).toBeInTheDocument()
        expect(screen.getByText('test@example.com')).toBeInTheDocument()
      })
    })

    it('should add email to queue when Enter key pressed', async () => {
      const user = userEvent.setup()
      render(<InviteUsersDialog {...defaultProps} />)

      const emailInput = screen.getByPlaceholderText(/wpisz adres email/i)
      await user.type(emailInput, 'test@example.com{Enter}')

      await waitFor(() => {
        expect(screen.getByText(/do zaproszenia/i)).toBeInTheDocument()
        expect(screen.getByText('test@example.com')).toBeInTheDocument()
      })
    })

    it('should clear email input after adding', async () => {
      const user = userEvent.setup()
      render(<InviteUsersDialog {...defaultProps} />)

      const emailInput = screen.getByPlaceholderText(/wpisz adres email/i)
      await user.type(emailInput, 'test@example.com')
      await user.click(screen.getByRole('button', { name: /dodaj/i }))

      await waitFor(() => {
        expect(emailInput).toHaveValue('')
      })
    })

    it('should show error for invalid email format', async () => {
      const user = userEvent.setup()
      render(<InviteUsersDialog {...defaultProps} />)

      const emailInput = screen.getByPlaceholderText(/wpisz adres email/i)
      await user.type(emailInput, 'invalid-email')
      await user.click(screen.getByRole('button', { name: /dodaj/i }))

      await waitFor(() => {
        expect(
          screen.getByText(/nieprawidłowy format adresu email/i)
        ).toBeInTheDocument()
      })
    })

    it('should show error for duplicate email', async () => {
      const user = userEvent.setup()
      render(<InviteUsersDialog {...defaultProps} />)

      const emailInput = screen.getByPlaceholderText(/wpisz adres email/i)

      // Add first email
      await user.type(emailInput, 'test@example.com')
      await user.click(screen.getByRole('button', { name: /dodaj/i }))

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument()
      })

      // Try to add same email again
      await user.type(emailInput, 'test@example.com')
      await user.click(screen.getByRole('button', { name: /dodaj/i }))

      await waitFor(() => {
        expect(
          screen.getByText(/ten adres email jest już na liście/i)
        ).toBeInTheDocument()
      })
    })

    it('should mark invitation as paid when within free seats', async () => {
      const user = userEvent.setup()
      render(<InviteUsersDialog {...defaultProps} />)

      const emailInput = screen.getByPlaceholderText(/wpisz adres email/i)
      await user.type(emailInput, 'test@example.com')
      await user.click(screen.getByRole('button', { name: /dodaj/i }))

      await waitFor(() => {
        expect(screen.getByText(/opłacony/i)).toBeInTheDocument()
      })
    })

    it('should mark invitation as unpaid when exceeding free seats', async () => {
      const user = userEvent.setup()
      render(
        <InviteUsersDialog
          {...defaultProps}
          seatInfo={{
            ...defaultProps.seatInfo,
            currentSeats: 3,
            freeSeats: 0
          }}
        />
      )

      const emailInput = screen.getByPlaceholderText(/wpisz adres email/i)
      await user.type(emailInput, 'test@example.com')
      await user.click(screen.getByRole('button', { name: /dodaj/i }))

      await waitFor(() => {
        const priceElements = screen.getAllByText(/\+10\.99 euro/i)
        expect(priceElements.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Removing Invitations', () => {
    it('should remove invitation when delete button clicked', async () => {
      const user = userEvent.setup()
      render(<InviteUsersDialog {...defaultProps} />)

      // Add an invitation
      const emailInput = screen.getByPlaceholderText(/wpisz adres email/i)
      await user.type(emailInput, 'test@example.com')
      await user.click(screen.getByRole('button', { name: /dodaj/i }))

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument()
      })

      // Remove the invitation
      const deleteButton = screen.getByRole('button', {
        name: /usuń zaproszenie dla test@example\.com/i
      })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(
          screen.queryByText('test@example.com')
        ).not.toBeInTheDocument()
      })
    })
  })

  describe('Sending Invitations', () => {
    it('should send invitations when send button clicked (free seats available)', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, sent: 1 })
      })

      render(<InviteUsersDialog {...defaultProps} />)

      // Add an invitation
      const emailInput = screen.getByPlaceholderText(/wpisz adres email/i)
      await user.type(emailInput, 'test@example.com')
      await user.click(screen.getByRole('button', { name: /dodaj/i }))

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument()
      })

      // Send invitations
      const sendButton = screen.getByRole('button', {
        name: /wyślij zaproszenia/i
      })
      await user.click(sendButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/organizations/org-123/invitations',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              invitations: [
                {
                  email: 'test@example.com',
                  role: 'employee'
                }
              ]
            })
          })
        )
      })
    })

    it('should call onInviteSent and close dialog on success', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, sent: 1 })
      })

      render(<InviteUsersDialog {...defaultProps} />)

      // Add and send invitation
      const emailInput = screen.getByPlaceholderText(/wpisz adres email/i)
      await user.type(emailInput, 'test@example.com')
      await user.click(screen.getByRole('button', { name: /dodaj/i }))

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument()
      })

      const sendButton = screen.getByRole('button', {
        name: /wyślij zaproszenia/i
      })
      await user.click(sendButton)

      await waitFor(() => {
        expect(mockOnInviteSent).toHaveBeenCalledTimes(1)
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('should show error message on send failure', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Failed to send invitations' })
      })

      render(<InviteUsersDialog {...defaultProps} />)

      // Add and send invitation
      const emailInput = screen.getByPlaceholderText(/wpisz adres email/i)
      await user.type(emailInput, 'test@example.com')
      await user.click(screen.getByRole('button', { name: /dodaj/i }))

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument()
      })

      const sendButton = screen.getByRole('button', {
        name: /wyślij zaproszenia/i
      })
      await user.click(sendButton)

      await waitFor(() => {
        expect(
          screen.getByText(/failed to send invitations/i)
        ).toBeInTheDocument()
      })
    })
  })

  describe('Payment Flow', () => {
    it('should show payment button when unpaid invitations exist', async () => {
      const user = userEvent.setup()
      render(
        <InviteUsersDialog
          {...defaultProps}
          seatInfo={{
            ...defaultProps.seatInfo,
            currentSeats: 3,
            freeSeats: 0
          }}
        />
      )

      // Add an invitation (will be unpaid)
      const emailInput = screen.getByPlaceholderText(/wpisz adres email/i)
      await user.type(emailInput, 'test@example.com')
      await user.click(screen.getByRole('button', { name: /dodaj/i }))

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /przejdź do płatności/i })
        ).toBeInTheDocument()
      })
    })

    it('should show summary row with total cost for unpaid invitations', async () => {
      const user = userEvent.setup()
      render(
        <InviteUsersDialog
          {...defaultProps}
          seatInfo={{
            ...defaultProps.seatInfo,
            currentSeats: 3,
            freeSeats: 0
          }}
        />
      )

      // Add two unpaid invitations
      const emailInput = screen.getByPlaceholderText(/wpisz adres email/i)

      await user.type(emailInput, 'test1@example.com')
      await user.click(screen.getByRole('button', { name: /dodaj/i }))

      await waitFor(() => {
        expect(screen.getByText('test1@example.com')).toBeInTheDocument()
      })

      await user.type(emailInput, 'test2@example.com')
      await user.click(screen.getByRole('button', { name: /dodaj/i }))

      await waitFor(() => {
        expect(screen.getByText('test2@example.com')).toBeInTheDocument()
        expect(screen.getByText(/podsumowanie/i)).toBeInTheDocument()
        expect(screen.getByText(/\+21\.98 euro/i)).toBeInTheDocument()
      })
    })

    it('should show payment notice for unpaid invitations', async () => {
      const user = userEvent.setup()
      render(
        <InviteUsersDialog
          {...defaultProps}
          seatInfo={{
            ...defaultProps.seatInfo,
            currentSeats: 3,
            freeSeats: 0
          }}
        />
      )

      const emailInput = screen.getByPlaceholderText(/wpisz adres email/i)
      await user.type(emailInput, 'test@example.com')
      await user.click(screen.getByRole('button', { name: /dodaj/i }))

      await waitFor(() => {
        expect(
          screen.getByText(
            /wszystkie zaproszenia zostaną wysłane po opłaceniu dodatkowych użytkowników/i
          )
        ).toBeInTheDocument()
      })
    })

    it('should store invitations in session storage and create checkout session', async () => {
      const user = userEvent.setup()

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          checkoutUrl: 'https://checkout.example.com'
        })
      })

      render(
        <InviteUsersDialog
          {...defaultProps}
          seatInfo={{
            ...defaultProps.seatInfo,
            currentSeats: 3,
            freeSeats: 0
          }}
        />
      )

      // Add unpaid invitation
      const emailInput = screen.getByPlaceholderText(/wpisz adres email/i)
      await user.type(emailInput, 'test@example.com')
      await user.click(screen.getByRole('button', { name: /dodaj/i }))

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument()
      })

      // Click payment button
      const paymentButton = screen.getByRole('button', {
        name: /przejdź do płatności/i
      })
      await user.click(paymentButton)

      await waitFor(() => {
        // Check session storage
        expect(sessionStorage.setItem).toHaveBeenCalledWith(
          'queued_invitations',
          JSON.stringify({
            organizationId: 'org-123',
            invitations: [
              {
                email: 'test@example.com',
                role: 'employee'
              }
            ]
          })
        )

        // Check checkout API call
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/billing/create-checkout',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              organizationId: 'org-123',
              userCount: 4, // 3 current + 1 new
              billingCycle: 'monthly',
              variantId: '972634'
            })
          })
        )
      })
    })
  })

  describe('Dialog Controls', () => {
    it('should call onOpenChange when cancel button clicked', async () => {
      const user = userEvent.setup()
      render(<InviteUsersDialog {...defaultProps} />)

      const cancelButton = screen.getByRole('button', { name: /anuluj/i })
      await user.click(cancelButton)

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('should disable buttons when loading', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      )

      render(<InviteUsersDialog {...defaultProps} />)

      // Add invitation and start sending
      const emailInput = screen.getByPlaceholderText(/wpisz adres email/i)
      await user.type(emailInput, 'test@example.com')
      await user.click(screen.getByRole('button', { name: /dodaj/i }))

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument()
      })

      const sendButton = screen.getByRole('button', {
        name: /wyślij zaproszenia/i
      })
      await user.click(sendButton)

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /przetwarzanie/i })
        ).toBeDisabled()
        expect(
          screen.getByRole('button', { name: /anuluj/i })
        ).toBeDisabled()
      })
    })
  })
})
