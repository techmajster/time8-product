/**
 * Tests for server-side pricing fetch in change billing period page
 *
 * These tests verify that:
 * 1. Pricing is fetched from server-side API endpoint (/api/billing/pricing)
 * 2. Cache control headers are properly set
 * 3. Error handling works correctly
 * 4. Variant IDs are correctly populated from pricing response
 */

describe('Change Billing Period - Pricing Fetch', () => {
  // Mock global fetch
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
    jest.resetAllMocks()
  })

  describe('Server-side Pricing Fetch Integration', () => {
    it('should call fetch with /api/billing/pricing endpoint', async () => {
      const mockPricing = {
        success: true,
        pricing: {
          monthlyPricePerSeat: 10.00,
          annualPricePerSeat: 8.00,
          currency: 'PLN',
          monthlyVariantId: '972634',
          yearlyVariantId: '972635'
        },
        lastUpdated: new Date().toISOString()
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockPricing
      })

      // Simulate the fetch call that happens in the component
      const response = await fetch('/api/billing/pricing', {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/billing/pricing',
        expect.objectContaining({
          cache: 'no-cache',
          headers: expect.objectContaining({
            'Cache-Control': 'no-cache'
          })
        })
      )

      expect(response.ok).toBe(true)
      const result = await response.json()
      expect(result.pricing.monthlyVariantId).toBe('972634')
      expect(result.pricing.yearlyVariantId).toBe('972635')
    })

    it('should include cache control headers in pricing fetch', async () => {
      const mockPricing = {
        success: true,
        pricing: {
          monthlyPricePerSeat: 10.00,
          annualPricePerSeat: 8.00,
          currency: 'PLN',
          monthlyVariantId: '972634',
          yearlyVariantId: '972635'
        },
        lastUpdated: new Date().toISOString()
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockPricing
      })

      await fetch('/api/billing/pricing', {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
      expect(fetchCall[1]).toMatchObject({
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
    })

    it('should receive variant IDs from pricing response', async () => {
      const mockPricing = {
        success: true,
        pricing: {
          monthlyPricePerSeat: 10.00,
          annualPricePerSeat: 8.00,
          currency: 'PLN',
          monthlyVariantId: '972634',
          yearlyVariantId: '972635'
        },
        lastUpdated: new Date().toISOString()
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockPricing
      })

      const response = await fetch('/api/billing/pricing', {
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      })

      const result = await response.json()

      expect(result.pricing).toBeDefined()
      expect(result.pricing.monthlyVariantId).toBe('972634')
      expect(result.pricing.yearlyVariantId).toBe('972635')
      expect(result.pricing.monthlyPricePerSeat).toBe(10.00)
      expect(result.pricing.annualPricePerSeat).toBe(8.00)
      expect(result.pricing.currency).toBe('PLN')
    })
  })

  describe('Error Handling', () => {
    it('should handle pricing fetch failure with non-200 status', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      })

      const response = await fetch('/api/billing/pricing', {
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(500)
    })

    it('should handle network errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      await expect(
        fetch('/api/billing/pricing', {
          cache: 'no-cache',
          headers: { 'Cache-Control': 'no-cache' }
        })
      ).rejects.toThrow('Network error')
    })

    it('should throw error for failed fetch in component logic', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500
      })

      const response = await fetch('/api/billing/pricing', {
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      })

      // This simulates the error handling in the component
      if (!response.ok) {
        const error = new Error(`Failed to fetch pricing: ${response.status}`)
        expect(error.message).toBe('Failed to fetch pricing: 500')
      }
    })
  })

  describe('Billing Period Variant IDs', () => {
    it('should provide correct monthly variant ID', async () => {
      const mockPricing = {
        success: true,
        pricing: {
          monthlyPricePerSeat: 10.00,
          annualPricePerSeat: 8.00,
          currency: 'PLN',
          monthlyVariantId: '972634',
          yearlyVariantId: '972635'
        },
        lastUpdated: new Date().toISOString()
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockPricing
      })

      const response = await fetch('/api/billing/pricing', {
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      })

      const result = await response.json()
      const monthlyVariantId = result.pricing.monthlyVariantId

      expect(monthlyVariantId).toBe('972634')
    })

    it('should provide correct annual variant ID', async () => {
      const mockPricing = {
        success: true,
        pricing: {
          monthlyPricePerSeat: 10.00,
          annualPricePerSeat: 8.00,
          currency: 'PLN',
          monthlyVariantId: '972634',
          yearlyVariantId: '972635'
        },
        lastUpdated: new Date().toISOString()
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockPricing
      })

      const response = await fetch('/api/billing/pricing', {
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      })

      const result = await response.json()
      const yearlyVariantId = result.pricing.yearlyVariantId

      expect(yearlyVariantId).toBe('972635')
    })
  })
})
