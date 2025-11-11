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
      // Mock API response for variant
      const mockVariantResponse = {
        data: {
          attributes: {
            price: 1299, // Base price (not tier 4+ price)
            price_formatted: undefined,
            interval: 'month',
            name: 'Monthly - Per User'
          }
        }
      }

      // Mock API response for price-model with graduated tiers
      const mockPriceModelResponse = {
        data: {
          attributes: {
            tiers: [
              {
                last_unit: 3,
                unit_price: 0,
                fixed_fee: 0
              },
              {
                last_unit: 'inf',
                unit_price: 1000, // Tier 4+ price: 1000 cents = 10.00 PLN
                fixed_fee: 0
              }
            ]
          }
        }
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockVariantResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPriceModelResponse
        })

      const result = await getVariantPrice('972634')

      expect(result).toEqual({
        price: 10.00, // Extracted from tier 4+
        currency: 'PLN',
        interval: 'month',
        name: 'Monthly - Per User'
      })

      // Verify both API calls were made
      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(global.fetch).toHaveBeenNthCalledWith(1,
        'https://api.lemonsqueezy.com/v1/variants/972634',
        {
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Accept': 'application/vnd.api+json'
          }
        }
      )
      expect(global.fetch).toHaveBeenNthCalledWith(2,
        'https://api.lemonsqueezy.com/v1/variants/972634/price-model',
        {
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Accept': 'application/vnd.api+json'
          }
        }
      )
    })

    it('should fetch yearly variant with graduated pricing (96 PLN)', async () => {
      // Mock API response for variant
      const mockVariantResponse = {
        data: {
          attributes: {
            price: 12999, // Base price (not tier 4+ price)
            price_formatted: undefined,
            interval: 'year',
            name: 'Yearly - Per User (Save 20%)'
          }
        }
      }

      // Mock API response for price-model with graduated tiers
      const mockPriceModelResponse = {
        data: {
          attributes: {
            tiers: [
              {
                last_unit: 3,
                unit_price: 0,
                fixed_fee: 0
              },
              {
                last_unit: 'inf',
                unit_price: 9600, // Tier 4+ price: 9600 cents = 96.00 PLN
                fixed_fee: 0
              }
            ]
          }
        }
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockVariantResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPriceModelResponse
        })

      const result = await getVariantPrice('972635')

      expect(result).toEqual({
        price: 96.00, // Extracted from tier 4+
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

    it('should fallback to base price if price-model fetch fails', async () => {
      const mockVariantResponse = {
        data: {
          attributes: {
            price: 1299,
            price_formatted: undefined,
            interval: 'month',
            name: 'Monthly - Per User'
          }
        }
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockVariantResponse
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500
        })

      const result = await getVariantPrice('972634')

      // Should fallback to base variant price
      expect(result).toEqual({
        price: 12.99, // Base price from variant
        currency: 'PLN',
        interval: 'month',
        name: 'Monthly - Per User'
      })
    })
  })

  describe('getDynamicPricing()', () => {
    it('should fetch both variants and return correct pricing info', async () => {
      // Mock responses for monthly variant + price-model
      const monthlyVariantResponse = {
        data: {
          attributes: {
            price: 1299,
            price_formatted: undefined,
            interval: 'month',
            name: 'Monthly - Per User'
          }
        }
      }

      const monthlyPriceModelResponse = {
        data: {
          attributes: {
            tiers: [
              { last_unit: 3, unit_price: 0, fixed_fee: 0 },
              { last_unit: 'inf', unit_price: 1000, fixed_fee: 0 }
            ]
          }
        }
      }

      // Mock responses for yearly variant + price-model
      const yearlyVariantResponse = {
        data: {
          attributes: {
            price: 12999,
            price_formatted: undefined,
            interval: 'year',
            name: 'Yearly - Per User'
          }
        }
      }

      const yearlyPriceModelResponse = {
        data: {
          attributes: {
            tiers: [
              { last_unit: 3, unit_price: 0, fixed_fee: 0 },
              { last_unit: 'inf', unit_price: 9600, fixed_fee: 0 }
            ]
          }
        }
      }

      // Note: Promise.all() makes concurrent requests, so mocks are consumed as fetches complete
      // The order is: both variant fetches happen first, then both price-model fetches
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => monthlyVariantResponse })  // 1st: monthly variant
        .mockResolvedValueOnce({ ok: true, json: async () => yearlyVariantResponse })   // 2nd: yearly variant (concurrent)
        .mockResolvedValueOnce({ ok: true, json: async () => monthlyPriceModelResponse }) // 3rd: monthly price-model
        .mockResolvedValueOnce({ ok: true, json: async () => yearlyPriceModelResponse }) // 4th: yearly price-model

      const result = await getDynamicPricing()

      expect(result).toEqual({
        monthlyPricePerSeat: 10.00,
        annualPricePerSeat: 8.00, // 96 / 12 months
        currency: 'PLN',
        monthlyVariantId: '972634',
        yearlyVariantId: '972635'
      })

      // Verify all API calls were made (2 per variant = 4 total)
      expect(global.fetch).toHaveBeenCalledTimes(4)
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

      const monthlyVariantResponse = {
        data: {
          attributes: {
            price: 1299,
            price_formatted: undefined,
            interval: 'month',
            name: 'Monthly - Per User'
          }
        }
      }

      const monthlyPriceModelResponse = {
        data: {
          attributes: {
            tiers: [
              { last_unit: 3, unit_price: 0, fixed_fee: 0 },
              { last_unit: 'inf', unit_price: 1000, fixed_fee: 0 }
            ]
          }
        }
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => monthlyVariantResponse })
        .mockResolvedValueOnce({ ok: true, json: async () => monthlyPriceModelResponse })
        .mockResolvedValueOnce({ ok: false, status: 500 }) // Yearly variant fails

      const result = await getDynamicPricing()

      // Should use fallback since yearly variant failed
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
