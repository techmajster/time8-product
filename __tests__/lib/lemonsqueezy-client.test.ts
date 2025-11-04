/**
 * @jest-environment node
 */

import { LemonSqueezyClient } from '@/lib/lemonsqueezy-client'

// Mock fetch globally
global.fetch = jest.fn()

describe('LemonSqueezyClient', () => {
  let client: LemonSqueezyClient
  const mockApiKey = 'test-api-key'

  beforeEach(() => {
    client = new LemonSqueezyClient(mockApiKey)
    jest.clearAllMocks()
  })

  describe('updateSubscriptionItem', () => {
    const subscriptionItemId = '123456'
    const quantity = 5

    it('should successfully update subscription item quantity', async () => {
      const mockResponse = {
        data: {
          type: 'subscription-items',
          id: subscriptionItemId,
          attributes: {
            quantity: 5,
            subscription_id: 789
          }
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await client.updateSubscriptionItem(subscriptionItemId, quantity)

      expect(global.fetch).toHaveBeenCalledWith(
        `https://api.lemonsqueezy.com/v1/subscription-items/${subscriptionItemId}`,
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Accept': 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
            'Authorization': `Bearer ${mockApiKey}`
          }),
          body: JSON.stringify({
            data: {
              type: 'subscription-items',
              id: subscriptionItemId,
              attributes: {
                quantity: 5,
                disable_prorations: true
              }
            }
          })
        })
      )

      expect(result).toEqual(mockResponse)
    })

    it('should retry on network failure', async () => {
      const mockResponse = {
        data: {
          type: 'subscription-items',
          id: subscriptionItemId,
          attributes: { quantity: 5 }
        }
      }

      // First call fails, second succeeds
      ;(global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse
        })

      const result = await client.updateSubscriptionItem(subscriptionItemId, quantity)

      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual(mockResponse)
    })

    it('should throw error after max retries', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      await expect(
        client.updateSubscriptionItem(subscriptionItemId, quantity)
      ).rejects.toThrow('Failed to update subscription item after 3 attempts')

      expect(global.fetch).toHaveBeenCalledTimes(3)
    })

    it('should throw error on API error response', async () => {
      const errorResponse = {
        errors: [
          {
            status: '422',
            detail: 'Invalid quantity'
          }
        ]
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => errorResponse
      })

      await expect(
        client.updateSubscriptionItem(subscriptionItemId, quantity)
      ).rejects.toThrow('Lemon Squeezy API error: Invalid quantity')

      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should handle missing error detail', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({})
      })

      await expect(
        client.updateSubscriptionItem(subscriptionItemId, quantity)
      ).rejects.toThrow('Lemon Squeezy API error: Internal Server Error')
    })
  })

  describe('getSubscriptionItem', () => {
    const subscriptionItemId = '123456'

    it('should successfully fetch subscription item', async () => {
      const mockResponse = {
        data: {
          type: 'subscription-items',
          id: subscriptionItemId,
          attributes: {
            quantity: 10,
            subscription_id: 789,
            price_id: 456,
            created_at: '2025-01-01T00:00:00Z'
          }
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await client.getSubscriptionItem(subscriptionItemId)

      expect(global.fetch).toHaveBeenCalledWith(
        `https://api.lemonsqueezy.com/v1/subscription-items/${subscriptionItemId}`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Accept': 'application/vnd.api+json',
            'Authorization': `Bearer ${mockApiKey}`
          })
        })
      )

      expect(result).toEqual(mockResponse)
    })

    it('should retry on network failure', async () => {
      const mockResponse = {
        data: {
          type: 'subscription-items',
          id: subscriptionItemId,
          attributes: { quantity: 10 }
        }
      }

      ;(global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse
        })

      const result = await client.getSubscriptionItem(subscriptionItemId)

      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual(mockResponse)
    })

    it('should throw error after max retries', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      await expect(
        client.getSubscriptionItem(subscriptionItemId)
      ).rejects.toThrow('Failed to get subscription item after 3 attempts')

      expect(global.fetch).toHaveBeenCalledTimes(3)
    })

    it('should throw error on 404 not found', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          errors: [{ detail: 'Subscription item not found' }]
        })
      })

      await expect(
        client.getSubscriptionItem(subscriptionItemId)
      ).rejects.toThrow('Lemon Squeezy API error: Subscription item not found')
    })
  })

  describe('getSubscription', () => {
    const subscriptionId = '789'

    it('should successfully fetch subscription', async () => {
      const mockResponse = {
        data: {
          type: 'subscriptions',
          id: subscriptionId,
          attributes: {
            quantity: 10,
            status: 'active',
            renews_at: '2025-12-01T00:00:00Z'
          }
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await client.getSubscription(subscriptionId)

      expect(global.fetch).toHaveBeenCalledWith(
        `https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Accept': 'application/vnd.api+json',
            'Authorization': `Bearer ${mockApiKey}`
          })
        })
      )

      expect(result).toEqual(mockResponse)
    })

    it('should retry on network failure', async () => {
      const mockResponse = {
        data: {
          type: 'subscriptions',
          id: subscriptionId,
          attributes: { quantity: 10 }
        }
      }

      ;(global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse
        })

      const result = await client.getSubscription(subscriptionId)

      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('API call logging', () => {
    const subscriptionItemId = '123456'
    let consoleSpy: jest.SpyInstance

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    })

    afterEach(() => {
      consoleSpy.mockRestore()
    })

    it('should log successful API calls', async () => {
      const mockResponse = {
        data: {
          type: 'subscription-items',
          id: subscriptionItemId,
          attributes: { quantity: 5 }
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      await client.updateSubscriptionItem(subscriptionItemId, 5)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[LemonSqueezy] PATCH /subscription-items/123456'),
        expect.any(Object)
      )
    })

    it('should log failed API calls', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({
          errors: [{ detail: 'Invalid quantity' }]
        })
      })

      await expect(
        client.updateSubscriptionItem(subscriptionItemId, 5)
      ).rejects.toThrow()

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[LemonSqueezy] ERROR PATCH /subscription-items/123456'),
        expect.any(Object)
      )
    })

    it('should log retry attempts', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

      ;(global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: {} })
        })

      await client.updateSubscriptionItem(subscriptionItemId, 5)

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[LemonSqueezy] Retry 1/3 for PATCH'),
        expect.any(String)
      )

      consoleWarnSpy.mockRestore()
    })
  })

  describe('constructor', () => {
    it('should throw error if API key is missing', () => {
      expect(() => new LemonSqueezyClient('')).toThrow('Lemon Squeezy API key is required')
    })

    it('should accept custom configuration', () => {
      const customClient = new LemonSqueezyClient(mockApiKey, {
        maxRetries: 5,
        retryDelay: 2000
      })

      expect(customClient).toBeInstanceOf(LemonSqueezyClient)
    })
  })
})
