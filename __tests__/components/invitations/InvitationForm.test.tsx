import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InvitationForm } from '@/components/invitations/invitation-form'

describe('InvitationForm', () => {
  const mockOnSubmit = jest.fn()
  const defaultProps = {
    organizationId: 'org-123',
    availableSeats: 5,
    onSubmit: mockOnSubmit,
    isSubmitting: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render form with all fields', () => {
      render(<InvitationForm {...defaultProps} />)

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/imię i nazwisko/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/rola/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/wiadomość/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /wyślij zaproszenia/i })).toBeInTheDocument()
    })

    it('should render team selector when teams are provided', () => {
      const teams = [
        { id: 'team-1', name: 'Engineering' },
        { id: 'team-2', name: 'Marketing' }
      ]

      render(<InvitationForm {...defaultProps} teams={teams} />)

      expect(screen.getByLabelText(/zespół/i)).toBeInTheDocument()
    })

    it('should not render team selector when no teams provided', () => {
      render(<InvitationForm {...defaultProps} />)

      expect(screen.queryByLabelText(/zespół/i)).not.toBeInTheDocument()
    })

    it('should display available seats count', () => {
      render(<InvitationForm {...defaultProps} availableSeats={3} />)

      expect(screen.getByText(/dostępne miejsca: 3/i)).toBeInTheDocument()
    })
  })

  describe('Email Input', () => {
    it('should accept single email address', async () => {
      const user = userEvent.setup()
      render(<InvitationForm {...defaultProps} />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'test@example.com')

      expect(emailInput).toHaveValue('test@example.com')
    })

    it('should accept multiple comma-separated emails', async () => {
      const user = userEvent.setup()
      render(<InvitationForm {...defaultProps} />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'user1@example.com, user2@example.com')

      expect(emailInput).toHaveValue('user1@example.com, user2@example.com')
    })

    it('should show email count badge when multiple emails entered', async () => {
      const user = userEvent.setup()
      render(<InvitationForm {...defaultProps} />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'user1@example.com, user2@example.com, user3@example.com')

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument()
      })
    })

    it('should show validation error for invalid email format', async () => {
      const user = userEvent.setup()
      render(<InvitationForm {...defaultProps} />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'invalid-email')

      const submitButton = screen.getByRole('button', { name: /wyślij zaproszenia/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/nieprawidłowy format email/i)).toBeInTheDocument()
      })
    })

    it('should show validation error for duplicate emails', async () => {
      const user = userEvent.setup()
      render(<InvitationForm {...defaultProps} />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'test@example.com, test@example.com')

      const submitButton = screen.getByRole('button', { name: /wyślij zaproszenia/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/duplikat email/i)).toBeInTheDocument()
      })
    })
  })

  describe('Role Selection', () => {
    it('should render role dropdown', () => {
      render(<InvitationForm {...defaultProps} />)

      const roleSelect = screen.getByLabelText(/rola/i)
      expect(roleSelect).toBeInTheDocument()
    })

    it('should default to employee role', () => {
      render(<InvitationForm {...defaultProps} />)

      const roleSelect = screen.getByLabelText(/rola/i)
      expect(roleSelect).toHaveTextContent('Pracownik')
    })
  })

  describe('Team Selection', () => {
    const teams = [
      { id: 'team-1', name: 'Engineering' },
      { id: 'team-2', name: 'Marketing' },
      { id: 'team-3', name: 'Sales' }
    ]

    it('should show "Brak" (None) option by default', () => {
      render(<InvitationForm {...defaultProps} teams={teams} />)

      const teamSelect = screen.getByLabelText(/zespół/i)
      expect(teamSelect).toHaveTextContent('Brak')
    })

    it('should render team selector when teams are provided', () => {
      render(<InvitationForm {...defaultProps} teams={teams} />)

      const teamSelect = screen.getByLabelText(/zespół/i)
      expect(teamSelect).toBeInTheDocument()
    })
  })

  describe('Personal Message', () => {
    it('should accept personal message text', async () => {
      const user = userEvent.setup()
      render(<InvitationForm {...defaultProps} />)

      const messageTextarea = screen.getByLabelText(/wiadomość/i)
      await user.type(messageTextarea, 'Welcome to the team!')

      expect(messageTextarea).toHaveValue('Welcome to the team!')
    })

    it('should show character count for personal message', async () => {
      const user = userEvent.setup()
      render(<InvitationForm {...defaultProps} />)

      const messageTextarea = screen.getByLabelText(/wiadomość/i)
      await user.type(messageTextarea, 'Test message')

      await waitFor(() => {
        expect(screen.getByText(/12 \/ 500/)).toBeInTheDocument()
      })
    })

    it('should enforce 500 character limit', async () => {
      const user = userEvent.setup()
      render(<InvitationForm {...defaultProps} />)

      const longMessage = 'a'.repeat(501)
      const messageTextarea = screen.getByLabelText(/wiadomość/i)
      const emailInput = screen.getByLabelText(/email/i)

      // Need valid email to trigger form validation
      await user.type(emailInput, 'test@example.com')
      await user.type(messageTextarea, longMessage)

      const submitButton = screen.getByRole('button', { name: /wyślij zaproszenia/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/maksymalnie 500 znaków/i)).toBeInTheDocument()
      })
    })
  })

  describe('Seat Validation', () => {
    it('should show warning when emails exceed available seats', async () => {
      const user = userEvent.setup()
      render(<InvitationForm {...defaultProps} availableSeats={2} />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'user1@example.com, user2@example.com, user3@example.com')

      await waitFor(() => {
        // Check for badge text (case-insensitive)
        const badges = screen.getAllByText(/za dużo zaproszeń/i)
        expect(badges.length).toBeGreaterThan(0)
      })
    })

    it('should disable submit button when seats exceeded', async () => {
      const user = userEvent.setup()
      render(<InvitationForm {...defaultProps} availableSeats={1} />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'user1@example.com, user2@example.com')

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /wyślij zaproszenia/i })
        expect(submitButton).toBeDisabled()
      })
    })

    it('should show seats required vs seats available', async () => {
      const user = userEvent.setup()
      render(<InvitationForm {...defaultProps} availableSeats={5} />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'user1@example.com, user2@example.com, user3@example.com')

      await waitFor(() => {
        expect(screen.getByText(/potrzebne: 3/i)).toBeInTheDocument()
        expect(screen.getByText(/dostępne miejsca: 5/i)).toBeInTheDocument()
      })
    })

    it('should update seat validation in real-time as emails are added', async () => {
      const user = userEvent.setup()
      render(<InvitationForm {...defaultProps} availableSeats={3} />)

      const emailInput = screen.getByLabelText(/email/i)

      // Add 2 emails - should be OK
      await user.type(emailInput, 'user1@example.com, user2@example.com')
      await waitFor(() => {
        expect(screen.getByText(/potrzebne: 2/i)).toBeInTheDocument()
        expect(screen.getByText('OK')).toBeInTheDocument()
      })

      // Add 3rd email - should still be OK
      await user.type(emailInput, ', user3@example.com')
      await waitFor(() => {
        expect(screen.getByText(/potrzebne: 3/i)).toBeInTheDocument()
        expect(screen.getByText('OK')).toBeInTheDocument()
      })

      // Add 4th email - should show warning
      await user.type(emailInput, ', user4@example.com')
      await waitFor(() => {
        const badges = screen.getAllByText(/za dużo zaproszeń/i)
        expect(badges.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Form Submission', () => {
    it('should call onSubmit with form data when valid', async () => {
      const user = userEvent.setup()
      render(<InvitationForm {...defaultProps} />)

      const emailInput = screen.getByLabelText(/email/i)
      const fullNameInput = screen.getByLabelText(/imię i nazwisko/i)

      await user.type(emailInput, 'test@example.com')
      await user.type(fullNameInput, 'Test User')

      const submitButton = screen.getByRole('button', { name: /wyślij zaproszenia/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          invitations: [{
            email: 'test@example.com',
            fullName: 'Test User',
            role: 'employee',
            teamId: undefined,
            personalMessage: undefined
          }]
        })
      })
    })

    it('should handle multiple emails correctly', async () => {
      const user = userEvent.setup()
      render(<InvitationForm {...defaultProps} />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'user1@example.com, user2@example.com')

      const submitButton = screen.getByRole('button', { name: /wyślij zaproszenia/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          invitations: [
            { email: 'user1@example.com', fullName: undefined, role: 'employee', teamId: undefined, personalMessage: undefined },
            { email: 'user2@example.com', fullName: undefined, role: 'employee', teamId: undefined, personalMessage: undefined }
          ]
        })
      })
    })

    it('should submit with default values when team not selected', async () => {
      const user = userEvent.setup()
      const teams = [{ id: 'team-1', name: 'Engineering' }]
      render(<InvitationForm {...defaultProps} teams={teams} />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByRole('button', { name: /wyślij zaproszenia/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          invitations: [{
            email: 'test@example.com',
            fullName: undefined,
            role: 'employee',
            teamId: undefined,
            personalMessage: undefined
          }]
        })
      })
    })

    it('should disable submit button when submitting', () => {
      render(<InvitationForm {...defaultProps} isSubmitting={true} />)

      const submitButton = screen.getByRole('button', { name: /wysyłanie/i })
      expect(submitButton).toBeDisabled()
    })

    it('should show loading state when submitting', () => {
      render(<InvitationForm {...defaultProps} isSubmitting={true} />)

      expect(screen.getByRole('button', { name: /wysyłanie/i })).toBeInTheDocument()
    })

    it('should not submit when form is invalid', async () => {
      const user = userEvent.setup()
      render(<InvitationForm {...defaultProps} />)

      // Don't fill in email
      const submitButton = screen.getByRole('button', { name: /wyślij zaproszenia/i })
      await user.click(submitButton)

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })

  describe('Error Display', () => {
    it('should display API errors when provided', () => {
      const error = 'Nie udało się wysłać zaproszeń'
      render(<InvitationForm {...defaultProps} error={error} />)

      expect(screen.getByText(error)).toBeInTheDocument()
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('should not display error banner when no error', () => {
      render(<InvitationForm {...defaultProps} />)

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<InvitationForm {...defaultProps} />)

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/imię i nazwisko/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/rola/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/wiadomość/i)).toBeInTheDocument()
    })

    it('should have aria-invalid on fields with errors', async () => {
      const user = userEvent.setup()
      render(<InvitationForm {...defaultProps} />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'invalid-email')

      const submitButton = screen.getByRole('button', { name: /wyślij zaproszenia/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(emailInput).toHaveAttribute('aria-invalid', 'true')
      })
    })

    it('should have aria-describedby linking to error messages', async () => {
      const user = userEvent.setup()
      render(<InvitationForm {...defaultProps} />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'invalid-email')

      const submitButton = screen.getByRole('button', { name: /wyślij zaproszenia/i })
      await user.click(submitButton)

      await waitFor(() => {
        const ariaDescribedBy = emailInput.getAttribute('aria-describedby')
        expect(ariaDescribedBy).toBeTruthy()
      })
    })
  })

  describe('Form Reset', () => {
    it('should clear form after successful submission', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<InvitationForm {...defaultProps} />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByRole('button', { name: /wyślij zaproszenia/i })
      await user.click(submitButton)

      // Simulate successful submission by passing resetForm trigger
      rerender(<InvitationForm {...defaultProps} resetForm={true} />)

      await waitFor(() => {
        expect(emailInput).toHaveValue('')
      })
    })
  })
})
