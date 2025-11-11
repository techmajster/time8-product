import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UpgradePrompt } from '@/components/invitations/upgrade-prompt'

describe('UpgradePrompt', () => {
  const mockOnUpgrade = jest.fn()
  const defaultProps = {
    currentSeats: 3,
    requiredSeats: 5,
    organizationId: 'org-123',
    organizationName: 'Test Organization',
    onUpgrade: mockOnUpgrade,
    isLoading: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock fetch for pricing API
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render upgrade prompt with seat information', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          pricing: {
            monthlyPricePerSeat: 10.0,
            annualPricePerSeat: 8.0,
            currency: 'PLN',
            monthlyVariantId: '972634',
            yearlyVariantId: '972635'
          }
        })
      })

      render(<UpgradePrompt {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/niewystarczająca liczba miejsc/i)).toBeInTheDocument()
      })
    })

    it('should display current and required seats', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          pricing: {
            monthlyPricePerSeat: 10.0,
            annualPricePerSeat: 8.0,
            currency: 'PLN',
            monthlyVariantId: '972634',
            yearlyVariantId: '972635'
          }
        })
      })

      render(<UpgradePrompt {...defaultProps} currentSeats={3} requiredSeats={7} />)

      await waitFor(() => {
        expect(screen.getByText('Aktualne miejsca')).toBeInTheDocument()
        expect(screen.getByText('Potrzebne miejsca')).toBeInTheDocument()
      })

      // Check for seat numbers
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('7')).toBeInTheDocument()
    })

    it('should show loading state when fetching pricing', () => {
      ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))

      render(<UpgradePrompt {...defaultProps} />)

      expect(screen.getByText(/ładowanie cen/i)).toBeInTheDocument()
    })
  })

  describe('Pricing Display', () => {
    it('should display monthly pricing option', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          pricing: {
            monthlyPricePerSeat: 10.0,
            annualPricePerSeat: 8.0,
            currency: 'PLN',
            monthlyVariantId: '972634',
            yearlyVariantId: '972635'
          }
        })
      })

      render(<UpgradePrompt {...defaultProps} requiredSeats={5} />)

      await waitFor(() => {
        expect(screen.getByText(/miesięczny/i)).toBeInTheDocument()
        const priceElements = screen.getAllByText(/50,00 zł/i)
        expect(priceElements.length).toBeGreaterThan(0) // 5 seats * 10 PLN
      })
    })

    it('should display annual pricing option', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          pricing: {
            monthlyPricePerSeat: 10.0,
            annualPricePerSeat: 8.0,
            currency: 'PLN',
            monthlyVariantId: '972634',
            yearlyVariantId: '972635'
          }
        })
      })

      render(<UpgradePrompt {...defaultProps} requiredSeats={5} />)

      await waitFor(() => {
        expect(screen.getByText(/roczny/i)).toBeInTheDocument()
        expect(screen.getByText(/480,00 zł/i)).toBeInTheDocument() // 5 seats * 8 PLN * 12 months
      })
    })

    it('should show savings for annual plan', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          pricing: {
            monthlyPricePerSeat: 10.0,
            annualPricePerSeat: 8.0,
            currency: 'PLN',
            monthlyVariantId: '972634',
            yearlyVariantId: '972635'
          }
        })
      })

      render(<UpgradePrompt {...defaultProps} requiredSeats={5} />)

      await waitFor(() => {
        expect(screen.getByText(/oszczędzasz 20%/i)).toBeInTheDocument()
      })
    })

    it('should use fallback pricing if API fails', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API error'))

      render(<UpgradePrompt {...defaultProps} requiredSeats={4} />)

      await waitFor(() => {
        // Should still show pricing using fallback
        expect(screen.getByText(/miesięczny/i)).toBeInTheDocument()
        const priceElements = screen.getAllByText(/40,00 zł/i)
        expect(priceElements.length).toBeGreaterThan(0) // 4 seats * 10 PLN fallback
      })
    })
  })

  describe('Tier Selection', () => {
    it('should default to monthly tier', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          pricing: {
            monthlyPricePerSeat: 10.0,
            annualPricePerSeat: 8.0,
            currency: 'PLN',
            monthlyVariantId: '972634',
            yearlyVariantId: '972635'
          }
        })
      })

      render(<UpgradePrompt {...defaultProps} />)

      await waitFor(() => {
        const monthlyOption = screen.getByRole('radio', { name: /miesięczny/i })
        expect(monthlyOption).toBeChecked()
      })
    })

    it('should allow switching to annual tier', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          pricing: {
            monthlyPricePerSeat: 10.0,
            annualPricePerSeat: 8.0,
            currency: 'PLN',
            monthlyVariantId: '972634',
            yearlyVariantId: '972635'
          }
        })
      })

      render(<UpgradePrompt {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('radio', { name: /miesięczny/i })).toBeInTheDocument()
      })

      const annualOption = screen.getByRole('radio', { name: /roczny/i })
      await user.click(annualOption)

      expect(annualOption).toBeChecked()
    })
  })

  describe('Upgrade Action', () => {
    it('should call onUpgrade with monthly tier when button clicked', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          pricing: {
            monthlyPricePerSeat: 10.0,
            annualPricePerSeat: 8.0,
            currency: 'PLN',
            monthlyVariantId: '972634',
            yearlyVariantId: '972635'
          }
        })
      })

      render(<UpgradePrompt {...defaultProps} requiredSeats={5} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /ulepsz i wyślij zaproszenia/i })).toBeInTheDocument()
      })

      const upgradeButton = screen.getByRole('button', { name: /ulepsz i wyślij zaproszenia/i })
      await user.click(upgradeButton)

      expect(mockOnUpgrade).toHaveBeenCalledWith({
        tier: 'monthly',
        userCount: 5,
        variantId: '972634'
      })
    })

    it('should call onUpgrade with annual tier when selected', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          pricing: {
            monthlyPricePerSeat: 10.0,
            annualPricePerSeat: 8.0,
            currency: 'PLN',
            monthlyVariantId: '972634',
            yearlyVariantId: '972635'
          }
        })
      })

      render(<UpgradePrompt {...defaultProps} requiredSeats={6} />)

      await waitFor(() => {
        expect(screen.getByRole('radio', { name: /roczny/i })).toBeInTheDocument()
      })

      const annualOption = screen.getByRole('radio', { name: /roczny/i })
      await user.click(annualOption)

      const upgradeButton = screen.getByRole('button', { name: /ulepsz i wyślij zaproszenia/i })
      await user.click(upgradeButton)

      expect(mockOnUpgrade).toHaveBeenCalledWith({
        tier: 'annual',
        userCount: 6,
        variantId: '972635'
      })
    })

    it('should disable upgrade button when loading', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          pricing: {
            monthlyPricePerSeat: 10.0,
            annualPricePerSeat: 8.0,
            currency: 'PLN',
            monthlyVariantId: '972634',
            yearlyVariantId: '972635'
          }
        })
      })

      render(<UpgradePrompt {...defaultProps} isLoading={true} />)

      await waitFor(() => {
        const upgradeButton = screen.getByRole('button', { name: /przetwarzanie/i })
        expect(upgradeButton).toBeDisabled()
      })
    })

    it('should show loading spinner when isLoading is true', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          pricing: {
            monthlyPricePerSeat: 10.0,
            annualPricePerSeat: 8.0,
            currency: 'PLN',
            monthlyVariantId: '972634',
            yearlyVariantId: '972635'
          }
        })
      })

      render(<UpgradePrompt {...defaultProps} isLoading={true} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /przetwarzanie/i })).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for radio buttons', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          pricing: {
            monthlyPricePerSeat: 10.0,
            annualPricePerSeat: 8.0,
            currency: 'PLN',
            monthlyVariantId: '972634',
            yearlyVariantId: '972635'
          }
        })
      })

      render(<UpgradePrompt {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('radio', { name: /miesięczny/i })).toHaveAttribute('aria-label')
        expect(screen.getByRole('radio', { name: /roczny/i })).toHaveAttribute('aria-label')
      })
    })

    it('should have proper role for pricing options group', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          pricing: {
            monthlyPricePerSeat: 10.0,
            annualPricePerSeat: 8.0,
            currency: 'PLN',
            monthlyVariantId: '972634',
            yearlyVariantId: '972635'
          }
        })
      })

      render(<UpgradePrompt {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('radiogroup')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message when provided', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          pricing: {
            monthlyPricePerSeat: 10.0,
            annualPricePerSeat: 8.0,
            currency: 'PLN',
            monthlyVariantId: '972634',
            yearlyVariantId: '972635'
          }
        })
      })

      const error = 'Nie udało się utworzyć sesji płatności'
      render(<UpgradePrompt {...defaultProps} error={error} />)

      await waitFor(() => {
        expect(screen.getByText(error)).toBeInTheDocument()
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })
  })
})
