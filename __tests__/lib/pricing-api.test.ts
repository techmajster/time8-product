/**
 * Pricing API Tests
 *
 * Tests for LemonSqueezy pricing fetch functions
 * Focus on graduated pricing tier extraction
 */

import { getVariantPrice, getDynamicPricing } from '@/lib/lemon-squeezy/pricing'

// Mock fetch for testing
global.fetch = jest.fn()

describe('Pricing API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Set environment variables for tests
    process.env.LEMONSQUEEZY_API_KEY = 'test-api-key'
    process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID = '972634'
    process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID = '972635'
  })

  describe('getVariantPrice()', () => {
    it('should fetch monthly variant with graduated pricing (10 PLN)', async () => {
      // Mock API response for monthly variant
      const mockResponse = {
        data: {
          attributes: {
            price: 1000, // 1000 cents = 10.00 PLN
            price_formatted: '10,00 PLN',
            interval: 'month',
            name: 'Monthly - Per User'
          }
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await getVariantPrice('972634')

      expect(result).toEqual({
        price: 10.00, // Converted from cents
        currency: 'PLN',
        interval: 'month',
        name: 'Monthly - Per User'
      })

      // Verify API was called correctly
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.lemonsqueezy.com/v1/variants/972634',
        {
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Accept': 'application/vnd.api+json'
          }
        }
      )
    })

    it('should fetch yearly variant with graduated pricing (96 PLN)', async () => {
      // Mock API response for yearly variant
      const mockResponse = {
        data: {
          attributes: {
            price: 9600, // 9600 cents = 96.00 PLN
            price_formatted: '96,00 PLN',
            interval: 'year',
            name: 'Yearly - Per User (Save 20%)'
          }
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await getVariantPrice('972635')

      expect(result).toEqual({
        price: 96.00, // Converted from cents
        currency: 'PLN',
        interval: 'year',
        name: 'Yearly - Per User (Save 20%)'
      })
    })

    it('should return null if API key is missing', async () => {
      delete process.env.LEMONSQUEEZY_API_KEY

      const result = await getVariantPrice('972634')

      expect(result).toBeNull()
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should return null if API request fails', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      const result = await getVariantPrice('972634')

      expect(result).toBeNull()
    })

    it('should handle network errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const result = await getVariantPrice('972634')

      expect(result).toBeNull()
    })
  })

  describe('getDynamicPricing()', () => {
    it('should fetch both variants and return correct pricing info', async () => {
      // Mock responses for both variants
      const monthlyResponse = {
        data: {
          attributes: {
            price: 1000,
            price_formatted: '10,00 PLN',
            interval: 'month',
            name: 'Monthly - Per User'
          }
        }
      }

      const yearlyResponse = {
        data: {
          attributes: {
            price: 9600,
            price_formatted: '96,00 PLN',
            interval: 'year',
            name: 'Yearly - Per User'
          }
        }
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => monthlyResponse })
        .mockResolvedValueOnce({ ok: true, json: async () => yearlyResponse })

      const result = await getDynamicPricing()

      expect(result).toEqual({
        monthlyPricePerSeat: 10.00,
        annualPricePerSeat: 8.00, // 96 / 12 months
        currency: 'PLN',
        monthlyVariantId: '972634',
        yearlyVariantId: '972635'
      })

      // Verify both API calls were made
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('should use fallback values if API fails', async () => {
      process.env.MONTHLY_PRICE_PER_SEAT = '10.00'
      process.env.ANNUAL_PRICE_PER_SEAT = '8.00'

      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

      const result = await getDynamicPricing()

      expect(result).toEqual({
        monthlyPricePerSeat: 10.00,
        annualPricePerSeat: 8.00,
        currency: 'PLN',
        monthlyVariantId: '972634',
        yearlyVariantId: '972635'
      })
    })

    it('should use fallback if one variant fetch fails', async () => {
      process.env.MONTHLY_PRICE_PER_SEAT = '10.00'
      process.env.ANNUAL_PRICE_PER_SEAT = '8.00'

      const monthlyResponse = {
        data: {
          attributes: {
            price: 1000,
            price_formatted: '10,00 PLN',
            interval: 'month',
            name: 'Monthly - Per User'
          }
        }
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => monthlyResponse })
        .mockResolvedValueOnce({ ok: false, status: 500 })

      const result = await getDynamicPricing()

      // Should use fallback since one failed
      expect(result).toEqual({
        monthlyPricePerSeat: 10.00,
        annualPricePerSeat: 8.00,
        currency: 'PLN',
        monthlyVariantId: '972634',
        yearlyVariantId: '972635'
      })
    })
  })
})
