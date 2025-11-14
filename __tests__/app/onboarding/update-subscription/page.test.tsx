/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import UpdateSubscriptionPage from '@/app/onboarding/update-subscription/page'

// Mock next/navigation
const mockPush = jest.fn()
const mockGet = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  }),
  useSearchParams: () => ({
    get: mockGet
  })
}))

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key
}))

// Mock UI components
jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant, className }: any) => (
    <div data-testid="alert" data-variant={variant} className={className}>
      {children}
    </div>
  ),
  AlertDescription: ({ children }: any) => <div data-testid="alert-description">{children}</div>
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, className }: any) => (
    <button
      data-testid={children?.toString().includes('Cancel') ? 'cancel-button' : children?.toString().includes('Update') || children?.toString().includes('Switch') ? 'update-button' : 'button'}
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      className={className}
    >
      {children}
    </button>
  )
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => <span data-testid="badge" className={className}>{children}</span>
}))

jest.mock('@/components/auth/DecorativeBackground', () => ({
  DecorativeBackground: () => <div data-testid="decorative-background" />
}))

jest.mock('@/components/auth/LanguageDropdown', () => ({
  LanguageDropdown: () => <div data-testid="language-dropdown" />
}))

jest.mock('@/components/OnboardingLogo', () => ({
  OnboardingLogo: () => <div data-testid="onboarding-logo" />
}))

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn()
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient
}))

// Mock fetch
global.fetch = jest.fn()

// Mock environment variables
process.env.NEXT_PUBLIC_LEMONSQUEEZY_YEARLY_PRODUCT_ID = '693341'
process.env.NEXT_PUBLIC_LEMONSQUEEZY_MONTHLY_VARIANT_ID = '972634'

describe('UpdateSubscriptionPage', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com'
  }

  const mockPricingData = {
    success: true,
    pricing: {
      monthlyPricePerSeat: 10.00,
      annualPricePerSeat: 8.00,
      currency: 'PLN',
      monthlyVariantId: '972634',
      yearlyVariantId: '1090954'
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockPush.mockClear()
    mockGet.mockClear()
    ;(global.fetch as jest.Mock).mockClear()

    // Default mocks
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })

    // Setup URL search params
    mockGet.mockImplementation((param: string) => {
      const params: Record<string, string> = {
        current_org: 'org-123',
        seats: '5'
      }
      return params[param] || null
    })

    console.log = jest.fn()
    console.error = jest.fn()
    console.warn = jest.fn()
  })

  describe('Authentication and Authorization', () => {
    it('should redirect to login if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      })

      render(<UpdateSubscriptionPage />)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })

    it('should redirect to billing settings if no organization ID provided', async () => {
      mockGet.mockReturnValue(null)

      render(<UpdateSubscriptionPage />)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/admin/settings?tab=billing')
      })
    })
  })

  describe('Monthly User Flow', () => {
    beforeEach(() => {
      // Mock monthly subscription
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  lemonsqueezy_subscription_id: 'sub-123',
                  lemonsqueezy_variant_id: '972634', // Monthly variant
                  lemonsqueezy_product_id: '621389', // Monthly product
                  current_seats: 5,
                  renews_at: '2025-12-31'
                },
                error: null
              })
            })
          })
        })
      })

      // Mock pricing API
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockPricingData
      })
    })

    it('should display both pricing cards as selectable for monthly users', async () => {
      render(<UpdateSubscriptionPage />)

      await waitFor(() => {
        expect(screen.queryByText(/only available at renewal/i)).not.toBeInTheDocument()
      })

      // Both cards should be clickable (no lock overlay)
      const cards = screen.getAllByText(/per month per user/i)
      expect(cards).toHaveLength(2)
    })

    it('should allow monthly users to switch to yearly', async () => {
      render(<UpdateSubscriptionPage />)

      await waitFor(() => {
        expect(screen.getByText('Yearly')).toBeInTheDocument()
      })

      // Click yearly card
      const yearlyCard = screen.getByText('Yearly').closest('div')
      if (yearlyCard) {
        fireEvent.click(yearlyCard)
      }

      // Click update button
      const updateButton = screen.getByTestId('update-button')
      expect(updateButton).toHaveTextContent('Switch to Yearly')
    })

    it('should call switch-to-yearly API when monthly user switches to yearly', async () => {
      const mockCheckoutUrl = 'https://checkout.lemonsqueezy.com/test'
      let fetchCallCount = 0
      ;(global.fetch as jest.Mock).mockImplementation(async (url: string) => {
        fetchCallCount++
        if (url === '/api/billing/pricing') {
          return { ok: true, json: async () => mockPricingData }
        }
        if (url === '/api/billing/switch-to-yearly') {
          return {
            ok: true,
            json: async () => ({
              checkout_url: mockCheckoutUrl,
              current_seats: 5,
              old_subscription_id: 'sub-123'
            })
          }
        }
        return { ok: false, json: async () => ({}) }
      })

      render(<UpdateSubscriptionPage />)

      await waitFor(() => {
        expect(screen.getByText('Yearly')).toBeInTheDocument()
      })

      // Select yearly
      const yearlyCard = screen.getByText('Yearly').closest('div')
      if (yearlyCard) {
        fireEvent.click(yearlyCard)
      }

      await waitFor(() => {
        const updateButton = screen.getByTestId('update-button')
        expect(updateButton).toBeEnabled()
      })

      // Click update
      const updateButton = screen.getByTestId('update-button')
      fireEvent.click(updateButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/billing/switch-to-yearly',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"seats":5')
          })
        )
      })
    })

    it('should call update-subscription-quantity when monthly user only changes seats', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockPricingData })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })

      render(<UpdateSubscriptionPage />)

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument()
      })

      // Increase seat count
      const plusButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-plus')
      )
      if (plusButton) {
        fireEvent.click(plusButton)
      }

      await waitFor(() => {
        expect(screen.getByText('6')).toBeInTheDocument()
      })

      // Click update
      const updateButton = screen.getByTestId('update-button')
      fireEvent.click(updateButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/billing/update-subscription-quantity',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"new_quantity":6')
          })
        )
      })
    })
  })

  describe('Yearly User Flow', () => {
    beforeEach(() => {
      // Mock yearly subscription
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  lemonsqueezy_subscription_id: 'sub-456',
                  lemonsqueezy_variant_id: '1090954', // Yearly variant
                  lemonsqueezy_product_id: '693341', // Yearly product
                  current_seats: 5,
                  renews_at: '2025-12-31T00:00:00Z'
                },
                error: null
              })
            })
          })
        })
      })

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockPricingData
      })
    })

    it('should display banner for yearly users about monthly switching restriction', async () => {
      render(<UpdateSubscriptionPage />)

      await waitFor(() => {
        expect(screen.getByText(/only available at renewal/i)).toBeInTheDocument()
      })
    })

    it('should display monthly card as locked for yearly users', async () => {
      render(<UpdateSubscriptionPage />)

      await waitFor(() => {
        expect(screen.getByText('Monthly')).toBeInTheDocument()
      })

      // Check for lock icon (lucide-react Lock component)
      const monthlyCard = screen.getByText('Monthly').closest('div')
      expect(monthlyCard).toHaveClass('cursor-not-allowed')
      expect(monthlyCard).toHaveClass('opacity-50')
    })

    it('should display formatted renewal date in banner', async () => {
      render(<UpdateSubscriptionPage />)

      await waitFor(() => {
        expect(screen.getByText(/December 31, 2025/i)).toBeInTheDocument()
      })
    })

    it('should allow yearly users to adjust seat count only', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockPricingData })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })

      render(<UpdateSubscriptionPage />)

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument()
      })

      // Increase seat count
      const plusButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-plus')
      )
      if (plusButton) {
        fireEvent.click(plusButton)
      }

      await waitFor(() => {
        expect(screen.getByText('6')).toBeInTheDocument()
      })

      // Click update
      const updateButton = screen.getByTestId('update-button')
      fireEvent.click(updateButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/billing/update-subscription-quantity',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"new_quantity":6')
          })
        )
      })
    })

    it('should not allow yearly users to click monthly card', async () => {
      render(<UpdateSubscriptionPage />)

      await waitFor(() => {
        expect(screen.getByText('Monthly')).toBeInTheDocument()
      })

      // Try to click monthly card
      const monthlyCard = screen.getByText('Monthly').closest('div')
      if (monthlyCard) {
        fireEvent.click(monthlyCard)
      }

      // Should still be on yearly
      await waitFor(() => {
        const yearlyCard = screen.getByText('Yearly').closest('div')
        expect(yearlyCard).toHaveClass('bg-violet-100')
      })
    })
  })

  describe('Seat Count Controls', () => {
    beforeEach(() => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  lemonsqueezy_subscription_id: 'sub-123',
                  lemonsqueezy_variant_id: '972634',
                  lemonsqueezy_product_id: '621389',
                  current_seats: 5,
                  renews_at: '2025-12-31'
                },
                error: null
              })
            })
          })
        })
      })

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockPricingData
      })
    })

    it('should increment seat count when plus button clicked', async () => {
      render(<UpdateSubscriptionPage />)

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument()
      })

      const plusButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-plus')
      )

      if (plusButton) {
        fireEvent.click(plusButton)
      }

      await waitFor(() => {
        expect(screen.getByText('6')).toBeInTheDocument()
      })
    })

    it('should decrement seat count when minus button clicked', async () => {
      render(<UpdateSubscriptionPage />)

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument()
      })

      const minusButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-minus')
      )

      if (minusButton) {
        fireEvent.click(minusButton)
      }

      await waitFor(() => {
        expect(screen.getByText('4')).toBeInTheDocument()
      })
    })

    it('should disable minus button at minimum (1 seat)', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  lemonsqueezy_subscription_id: 'sub-123',
                  lemonsqueezy_variant_id: '972634',
                  lemonsqueezy_product_id: '621389',
                  current_seats: 1,
                  renews_at: '2025-12-31'
                },
                error: null
              })
            })
          })
        })
      })

      render(<UpdateSubscriptionPage />)

      await waitFor(() => {
        const minusButton = screen.getAllByRole('button').find(btn =>
          btn.querySelector('svg')?.classList.contains('lucide-minus')
        )
        expect(minusButton).toBeDisabled()
      })
    })

    it('should disable plus button at maximum (50 seats)', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  lemonsqueezy_subscription_id: 'sub-123',
                  lemonsqueezy_variant_id: '972634',
                  lemonsqueezy_product_id: '621389',
                  current_seats: 50,
                  renews_at: '2025-12-31'
                },
                error: null
              })
            })
          })
        })
      })

      render(<UpdateSubscriptionPage />)

      await waitFor(() => {
        const plusButton = screen.getAllByRole('button').find(btn =>
          btn.querySelector('svg')?.classList.contains('lucide-plus')
        )
        expect(plusButton).toBeDisabled()
      })
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  lemonsqueezy_subscription_id: 'sub-123',
                  lemonsqueezy_variant_id: '972634',
                  lemonsqueezy_product_id: '621389',
                  current_seats: 5,
                  renews_at: '2025-12-31'
                },
                error: null
              })
            })
          })
        })
      })
    })

    it('should display error message when API call fails', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockPricingData })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Payment processing failed' })
        })

      render(<UpdateSubscriptionPage />)

      await waitFor(() => {
        expect(screen.getByText('Yearly')).toBeInTheDocument()
      })

      // Select yearly
      const yearlyCard = screen.getByText('Yearly').closest('div')
      if (yearlyCard) {
        fireEvent.click(yearlyCard)
      }

      // Click update
      const updateButton = screen.getByTestId('update-button')
      fireEvent.click(updateButton)

      await waitFor(() => {
        expect(screen.getByText(/Payment processing failed/i)).toBeInTheDocument()
      })
    })

    it('should use fallback pricing if pricing API fails', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      render(<UpdateSubscriptionPage />)

      await waitFor(() => {
        // Should still render with fallback pricing
        expect(screen.getByText('10.00 PLN')).toBeInTheDocument()
        expect(screen.getByText('8.00 PLN')).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('should show loading spinner while fetching data', () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockImplementation(() => new Promise(() => {}))
            })
          })
        })
      })

      ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))

      render(<UpdateSubscriptionPage />)

      expect(screen.getByTestId('decorative-background')).toBeInTheDocument()
    })

    it('should disable update button while processing', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  lemonsqueezy_subscription_id: 'sub-123',
                  lemonsqueezy_variant_id: '972634',
                  lemonsqueezy_product_id: '621389',
                  current_seats: 5,
                  renews_at: '2025-12-31'
                },
                error: null
              })
            })
          })
        })
      })

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockPricingData })
        .mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<UpdateSubscriptionPage />)

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument()
      })

      // Change seat count
      const plusButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-plus')
      )
      if (plusButton) {
        fireEvent.click(plusButton)
      }

      // Click update
      const updateButton = screen.getByTestId('update-button')
      fireEvent.click(updateButton)

      await waitFor(() => {
        expect(updateButton).toBeDisabled()
        expect(updateButton).toHaveTextContent('Updating...')
      })
    })
  })

  describe('Navigation', () => {
    beforeEach(() => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  lemonsqueezy_subscription_id: 'sub-123',
                  lemonsqueezy_variant_id: '972634',
                  lemonsqueezy_product_id: '621389',
                  current_seats: 5,
                  renews_at: '2025-12-31'
                },
                error: null
              })
            })
          })
        })
      })

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockPricingData
      })
    })

    it('should navigate back to billing settings when cancel button clicked', async () => {
      render(<UpdateSubscriptionPage />)

      await waitFor(() => {
        expect(screen.getByTestId('cancel-button')).toBeInTheDocument()
      })

      const cancelButton = screen.getByTestId('cancel-button')
      fireEvent.click(cancelButton)

      expect(mockPush).toHaveBeenCalledWith('/admin/settings?tab=billing')
    })

    it('should redirect to billing settings after successful seat update', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockPricingData })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })

      render(<UpdateSubscriptionPage />)

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument()
      })

      // Change seats
      const plusButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.classList.contains('lucide-plus')
      )
      if (plusButton) {
        fireEvent.click(plusButton)
      }

      // Click update
      const updateButton = screen.getByTestId('update-button')
      fireEvent.click(updateButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/admin/settings?tab=billing')
      })
    })
  })
})
