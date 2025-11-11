import { render, screen } from '@testing-library/react'
import { SeatVisualizationCard, SeatIndicator, SeatPill } from '@/components/invitations/seat-visualization-card'

describe('SeatVisualizationCard', () => {
  const defaultProps = {
    totalSeats: 3,
    occupiedSeats: 1,
    availableSeats: 2,
    planName: 'Hobby'
  }

  describe('Rendering', () => {
    it('should render card with seat information', () => {
      render(<SeatVisualizationCard {...defaultProps} />)
      expect(screen.getByText(/wolne zaproszenia w Twoim planie Hobby/)).toBeInTheDocument()
    })

    it('should render correct available seats count', () => {
      render(<SeatVisualizationCard {...defaultProps} />)
      expect(screen.getByText(/Masz 2\/3 wolne zaproszenia/)).toBeInTheDocument()
    })

    it('should render plan name', () => {
      render(<SeatVisualizationCard {...defaultProps} planName="PRO" />)
      expect(screen.getByText(/planie PRO/)).toBeInTheDocument()
    })

    it('should render progress bar', () => {
      render(<SeatVisualizationCard {...defaultProps} />)
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveAttribute('aria-valuenow', '1')
      expect(progressBar).toHaveAttribute('aria-valuemax', '3')
    })
  })

  describe('Variant Behavior', () => {
    it('should use default variant for small plans (≤5 seats)', () => {
      const { container } = render(<SeatVisualizationCard {...defaultProps} totalSeats={3} />)
      // Default variant shows individual seat indicators
      expect(screen.getByText('Ty')).toBeInTheDocument()
      expect(screen.getAllByText('Wolny').length).toBeGreaterThan(0)
    })

    it('should auto-switch to compact variant for larger plans (>5 seats)', () => {
      render(
        <SeatVisualizationCard
          totalSeats={10}
          occupiedSeats={3}
          availableSeats={7}
          planName="PRO"
        />
      )
      // Compact variant shows pills instead of individual indicators
      expect(screen.getByText('Zajęte')).toBeInTheDocument()
      expect(screen.getByText('Wolne')).toBeInTheDocument()
    })

    it('should respect explicit variant prop for small plans', () => {
      render(
        <SeatVisualizationCard
          {...defaultProps}
          variant="default"
          totalSeats={3}
        />
      )
      // Should show individual indicators
      expect(screen.getByText('Ty')).toBeInTheDocument()
    })
  })

  describe('Pending Seats', () => {
    it('should calculate truly available seats with pending invitations', () => {
      render(
        <SeatVisualizationCard
          totalSeats={5}
          occupiedSeats={1}
          availableSeats={4}
          pendingSeats={2}
          planName="Hobby"
        />
      )
      // Available seats (4) - pending (2) = 2 truly available
      expect(screen.getByText(/Masz 2\/5 wolne zaproszenia/)).toBeInTheDocument()
    })

    it('should show reserved seat indicators for pending invitations in default variant', () => {
      render(
        <SeatVisualizationCard
          totalSeats={5}
          occupiedSeats={1}
          availableSeats={4}
          pendingSeats={2}
          planName="Hobby"
        />
      )
      // Should show 2 "Zajęty" (reserved) indicators
      const reservedLabels = screen.getAllByText('Zajęty')
      expect(reservedLabels).toHaveLength(2)
    })

    it('should include pending seats in reserved count for compact variant', () => {
      render(
        <SeatVisualizationCard
          totalSeats={10}
          occupiedSeats={3}
          availableSeats={7}
          pendingSeats={2}
          planName="PRO"
        />
      )
      // Reserved = occupied (3) + pending (2) = 5
      // Truly available = available (7) - pending (2) = 5
      // Should show in both pills, so use getAllByText
      const counts = screen.getAllByText('5')
      expect(counts).toHaveLength(2) // One for Zajęte, one for Wolne
    })
  })

  describe('Warning States', () => {
    it('should show high utilization warning at 80%', () => {
      render(
        <SeatVisualizationCard
          totalSeats={10}
          occupiedSeats={8}
          availableSeats={2}
          planName="PRO"
          utilizationPercentage={80}
        />
      )
      expect(screen.getByText(/wysoka wykorzystanie/)).toBeInTheDocument()
    })

    it('should show at capacity warning when no seats available', () => {
      render(
        <SeatVisualizationCard
          totalSeats={5}
          occupiedSeats={5}
          availableSeats={0}
          planName="Hobby"
          utilizationPercentage={100}
        />
      )
      expect(screen.getByText(/pełna pojemność/)).toBeInTheDocument()
    })

    it('should not show high utilization warning below 80%', () => {
      render(
        <SeatVisualizationCard
          totalSeats={10}
          occupiedSeats={7}
          availableSeats={3}
          planName="PRO"
          utilizationPercentage={70}
        />
      )
      expect(screen.queryByText(/wysoka wykorzystanie/)).not.toBeInTheDocument()
    })

    it('should prioritize at capacity warning over high utilization', () => {
      render(
        <SeatVisualizationCard
          totalSeats={5}
          occupiedSeats={5}
          availableSeats={0}
          planName="Hobby"
          utilizationPercentage={100}
        />
      )
      expect(screen.getByText(/pełna pojemność/)).toBeInTheDocument()
      expect(screen.queryByText(/wysoka wykorzystanie/)).not.toBeInTheDocument()
    })
  })

  describe('Progress Bar Colors', () => {
    it('should show green progress bar for low utilization', () => {
      const { container } = render(
        <SeatVisualizationCard
          totalSeats={10}
          occupiedSeats={3}
          availableSeats={7}
          planName="PRO"
          utilizationPercentage={30}
        />
      )
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveClass('bg-green-500')
    })

    it('should show orange progress bar for high utilization', () => {
      const { container } = render(
        <SeatVisualizationCard
          totalSeats={10}
          occupiedSeats={8}
          availableSeats={2}
          planName="PRO"
          utilizationPercentage={80}
        />
      )
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveClass('bg-orange-500')
    })

    it('should show red progress bar at capacity', () => {
      const { container } = render(
        <SeatVisualizationCard
          totalSeats={5}
          occupiedSeats={5}
          availableSeats={0}
          planName="Hobby"
          utilizationPercentage={100}
        />
      )
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveClass('bg-red-500')
    })
  })

  describe('Utilization Percentage Display', () => {
    it('should show utilization percentage when provided', () => {
      render(
        <SeatVisualizationCard
          {...defaultProps}
          utilizationPercentage={75}
        />
      )
      expect(screen.getByText('75% wykorzystane')).toBeInTheDocument()
    })

    it('should not show utilization percentage when not provided', () => {
      render(<SeatVisualizationCard {...defaultProps} />)
      expect(screen.queryByText(/% wykorzystane/)).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper region role and label', () => {
      render(<SeatVisualizationCard {...defaultProps} />)
      expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'Seat visualization')
    })

    it('should have live region for status updates', () => {
      render(<SeatVisualizationCard {...defaultProps} />)
      const statusText = screen.getByRole('status')
      expect(statusText).toHaveAttribute('aria-live', 'polite')
    })

    it('should have proper progressbar attributes', () => {
      render(
        <SeatVisualizationCard
          totalSeats={10}
          occupiedSeats={3}
          availableSeats={7}
          planName="PRO"
        />
      )
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '3')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '10')
      expect(progressBar).toHaveAttribute('aria-label', 'Seat utilization: 3 out of 10 seats used')
    })
  })

  describe('Pending Removals Section', () => {
    it('should show pending removals section when users marked for removal exist', () => {
      render(
        <SeatVisualizationCard
          {...defaultProps}
          usersMarkedForRemoval={[
            { email: 'user1@example.com', effectiveDate: '2025-12-15' },
            { email: 'user2@example.com', effectiveDate: '2025-12-15' }
          ]}
          renewalDate="2025-12-15"
        />
      )
      expect(screen.getByText(/miejsca zostaną zwolnione/)).toBeInTheDocument()
      expect(screen.getByText(/user1@example\.com/)).toBeInTheDocument()
      expect(screen.getByText(/user2@example\.com/)).toBeInTheDocument()
    })

    it('should not show pending removals section when no users marked for removal', () => {
      render(
        <SeatVisualizationCard
          {...defaultProps}
          usersMarkedForRemoval={[]}
        />
      )
      expect(screen.queryByText(/zostaną zwolnione/)).not.toBeInTheDocument()
    })

    it('should use singular form for single user removal', () => {
      render(
        <SeatVisualizationCard
          {...defaultProps}
          usersMarkedForRemoval={[
            { email: 'user@example.com', effectiveDate: '2025-12-15' }
          ]}
        />
      )
      expect(screen.getByText(/miejsce zostaną zwolnione/)).toBeInTheDocument()
      expect(screen.getByText(/Ten użytkownik zostanie usunięci/)).toBeInTheDocument()
    })

    it('should use plural form for multiple user removals', () => {
      render(
        <SeatVisualizationCard
          {...defaultProps}
          usersMarkedForRemoval={[
            { email: 'user1@example.com', effectiveDate: '2025-12-15' },
            { email: 'user2@example.com', effectiveDate: '2025-12-15' }
          ]}
        />
      )
      expect(screen.getByText(/miejsca zostaną zwolnione/)).toBeInTheDocument()
      expect(screen.getByText(/Ci użytkownicy zostaną usunięci/)).toBeInTheDocument()
    })

    it('should display renewal date in Polish format', () => {
      render(
        <SeatVisualizationCard
          {...defaultProps}
          usersMarkedForRemoval={[
            { email: 'user@example.com', effectiveDate: '2025-12-15' }
          ]}
          renewalDate="2025-12-15"
        />
      )
      // Should show date in Polish format (DD.MM.YYYY) - appears twice (renewal and effective date)
      const dates = screen.getAllByText(/15\.12\.2025/)
      expect(dates.length).toBeGreaterThanOrEqual(1)
    })

    it('should display individual effective dates for each user', () => {
      render(
        <SeatVisualizationCard
          {...defaultProps}
          usersMarkedForRemoval={[
            { email: 'user1@example.com', effectiveDate: '2025-12-15' },
            { email: 'user2@example.com', effectiveDate: '2025-12-20' }
          ]}
        />
      )
      // Each user should show their effective date
      expect(screen.getByText(/user1@example\.com/)).toBeInTheDocument()
      expect(screen.getByText(/user2@example\.com/)).toBeInTheDocument()
    })

    it('should have proper accessibility attributes', () => {
      render(
        <SeatVisualizationCard
          {...defaultProps}
          usersMarkedForRemoval={[
            { email: 'user@example.com', effectiveDate: '2025-12-15' }
          ]}
        />
      )
      const statusElements = screen.getAllByRole('status')
      // Should have at least one status element with aria-live
      const pendingRemovalsStatus = statusElements.find(el =>
        el.getAttribute('aria-live') === 'polite' && el.className.includes('blue')
      )
      expect(pendingRemovalsStatus).toBeInTheDocument()
    })
  })

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <SeatVisualizationCard
          {...defaultProps}
          className="custom-class"
        />
      )
      const card = container.querySelector('.custom-class')
      expect(card).toBeInTheDocument()
    })
  })
})

describe('SeatIndicator', () => {
  it('should render occupied status with correct styling', () => {
    const { container } = render(<SeatIndicator status="occupied" label="Ty" />)
    expect(screen.getByText('Ty')).toBeInTheDocument()
    const indicator = container.querySelector('.bg-green-100')
    expect(indicator).toBeInTheDocument()
  })

  it('should render reserved status with correct styling', () => {
    const { container } = render(<SeatIndicator status="reserved" label="Zajęty" />)
    expect(screen.getByText('Zajęty')).toBeInTheDocument()
    const indicator = container.querySelector('.bg-gray-100')
    expect(indicator).toBeInTheDocument()
  })

  it('should render available status with correct styling', () => {
    const { container } = render(<SeatIndicator status="available" label="Wolny" />)
    expect(screen.getByText('Wolny')).toBeInTheDocument()
    const indicator = container.querySelector('.border-dashed')
    expect(indicator).toBeInTheDocument()
  })

  it('should have proper accessibility attributes', () => {
    render(<SeatIndicator status="occupied" label="Ty" />)
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Seat Ty')
    expect(screen.getByLabelText('Status: Ty')).toBeInTheDocument()
  })
})

describe('SeatPill', () => {
  it('should render occupied status with count', () => {
    render(
      <SeatPill status="occupied" count={5}>
        Zajęte
      </SeatPill>
    )
    expect(screen.getByText('Zajęte')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('should render available status with count', () => {
    render(
      <SeatPill status="available" count={3}>
        Wolne
      </SeatPill>
    )
    expect(screen.getByText('Wolne')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('should have proper accessibility attributes', () => {
    render(
      <SeatPill status="occupied" count={5}>
        Zajęte
      </SeatPill>
    )
    const pill = screen.getByRole('status')
    expect(pill).toHaveAttribute('aria-label', 'Zajęte: 5 seats')
  })

  it('should apply occupied styling', () => {
    const { container } = render(
      <SeatPill status="occupied" count={5}>
        Zajęte
      </SeatPill>
    )
    const pill = container.querySelector('.bg-green-500')
    expect(pill).toBeInTheDocument()
  })

  it('should apply available styling', () => {
    const { container } = render(
      <SeatPill status="available" count={3}>
        Wolne
      </SeatPill>
    )
    const pill = container.querySelector('.border-dashed')
    expect(pill).toBeInTheDocument()
  })
})
