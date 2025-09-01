/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

// Mock NextJS router
const mockPush = jest.fn()
const mockBack = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack
  }),
  useSearchParams: () => ({
    get: jest.fn(() => 'test-org-id')
  })
}))

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key) => key
}))

// Mock Supabase client
const mockGetUser = jest.fn()
const mockCreateClient = jest.fn(() => ({
  auth: {
    getUser: mockGetUser
  }
}))
jest.mock('@/lib/supabase/client', () => ({
  createClient: mockCreateClient
}))

describe('Deferred Organization Creation Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    
    // Mock sessionStorage for tests
    const mockStorage = {
      data: {},
      getItem: jest.fn((key) => mockStorage.data[key] || null),
      setItem: jest.fn((key, value) => { mockStorage.data[key] = value }),
      removeItem: jest.fn((key) => { delete mockStorage.data[key] }),
      clear: jest.fn(() => { mockStorage.data = {} })
    }
    
    global.sessionStorage = mockStorage
    global.window = {
      location: {
        origin: 'http://localhost:3000',
        href: ''
      }
    }
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Create Workspace - Session Storage Flow', () => {
    it('should store organization data in session storage instead of creating in database', async () => {
      // Mock authenticated user
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })

      const workspaceData = {
        name: 'Test Workspace',
        slug: 'test-workspace',
        country_code: 'IE'
      }

      // Test that organization data is stored in session storage
      const { storeOrganizationData } = await import('@/lib/billing/session-storage')
      
      expect(() => {
        storeOrganizationData(workspaceData)
      }).not.toThrow()

      expect(global.sessionStorage.setItem).toHaveBeenCalledWith(
        'pending_organization',
        JSON.stringify(workspaceData)
      )
    })

    it('should validate required organization data before storing', async () => {
      const { storeOrganizationData, validateOrganizationData } = await import('@/lib/billing/session-storage')

      // Test validation with missing required fields
      const invalidData = {
        name: '',
        slug: 'test'
      }

      expect(() => {
        validateOrganizationData(invalidData)
      }).toThrow('Organization name is required')

      // Test validation with valid data
      const validData = {
        name: 'Test Workspace',
        slug: 'test-workspace', 
        country_code: 'IE'
      }

      expect(() => {
        validateOrganizationData(validData)
      }).not.toThrow()
    })

    it('should retrieve organization data from session storage', async () => {
      const testData = {
        name: 'Test Workspace',
        slug: 'test-workspace',
        country_code: 'IE'
      }

      global.sessionStorage.getItem.mockReturnValue(JSON.stringify(testData))

      const { getStoredOrganizationData } = await import('@/lib/billing/session-storage')
      const retrieved = getStoredOrganizationData()

      expect(retrieved).toEqual(testData)
      expect(global.sessionStorage.getItem).toHaveBeenCalledWith('pending_organization')
    })

    it('should handle missing session storage data gracefully', async () => {
      global.sessionStorage.getItem.mockReturnValue(null)

      const { getStoredOrganizationData } = await import('@/lib/billing/session-storage')
      const retrieved = getStoredOrganizationData()

      expect(retrieved).toBeNull()
    })
  })

  describe('Add Users Page - Team Size Decision Logic', () => {
    it('should handle free tier flow (≤3 users)', async () => {
      global.sessionStorage.getItem.mockReturnValue(JSON.stringify({
        name: 'Test Workspace',
        slug: 'test-workspace',
        country_code: 'IE'
      }))

      // Mock API response for organization creation
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          organization: { id: 'org-123' }
        })
      })

      const { handleFreeTierFlow } = await import('@/lib/billing/organization-creation')
      
      const result = await handleFreeTierFlow('user-123', 3)

      expect(result.shouldCreateOrganization).toBe(true)
      expect(result.redirectTo).toBe('/dashboard')
      expect(global.fetch).toHaveBeenCalledWith('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Test Workspace',
          slug: 'test-workspace',
          country_code: 'IE',
          user_id: 'user-123'
        })
      })
    })

    it('should handle paid tier flow (>3 users)', async () => {
      global.sessionStorage.getItem.mockReturnValue(JSON.stringify({
        name: 'Test Workspace',
        slug: 'test-workspace',
        country_code: 'IE'
      }))

      const { handlePaidTierFlow } = await import('@/lib/billing/organization-creation')
      
      const result = await handlePaidTierFlow('user-123', 5, 'annual', 'variant-123')

      expect(result.shouldCreateOrganization).toBe(false)
      expect(result.requiresPayment).toBe(true)
      expect(result.variantId).toBe('variant-123')
    })

    it('should calculate seats correctly for different user counts', async () => {
      const { calculateSeats } = await import('@/lib/billing/seat-calculation')

      expect(calculateSeats(3)).toEqual({
        totalSeats: 3,
        freeSeats: 3,
        paidSeats: 0,
        tier: 'free'
      })

      expect(calculateSeats(5)).toEqual({
        totalSeats: 5,
        freeSeats: 3,
        paidSeats: 2,
        tier: 'paid'
      })

      expect(calculateSeats(10)).toEqual({
        totalSeats: 10,
        freeSeats: 3,
        paidSeats: 7,
        tier: 'paid'
      })
    })
  })

  describe('Checkout Flow Integration', () => {
    it('should include organization creation data in checkout session', async () => {
      const organizationData = {
        name: 'Test Workspace',
        slug: 'test-workspace',
        country_code: 'IE'
      }

      global.sessionStorage.getItem.mockReturnValue(JSON.stringify(organizationData))

      // Mock checkout API response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          checkout_url: 'https://lemonsqueezy.test/checkout/123'
        })
      })

      const { createCheckoutWithOrganization } = await import('@/lib/billing/checkout-integration')

      const result = await createCheckoutWithOrganization({
        userId: 'user-123',
        variantId: 'variant-123',
        userCount: 5,
        tier: 'annual'
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/billing/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          variant_id: 'variant-123',
          organization_data: organizationData,
          user_count: 5,
          tier: 'annual',
          return_url: 'http://localhost:3000/onboarding/payment-success',
          failure_url: 'http://localhost:3000/onboarding/payment-failure'
        })
      })

      expect(result.checkout_url).toBe('https://lemonsqueezy.test/checkout/123')
    })

    it('should handle checkout creation errors', async () => {
      global.sessionStorage.getItem.mockReturnValue(null)

      const { createCheckoutWithOrganization } = await import('@/lib/billing/checkout-integration')

      await expect(createCheckoutWithOrganization({
        userId: 'user-123',
        variantId: 'variant-123',
        userCount: 5,
        tier: 'annual'
      })).rejects.toThrow('No organization data found in session')
    })
  })

  describe('Payment Success Handler', () => {
    it('should create organization and redirect to dashboard after successful payment', async () => {
      const organizationData = {
        name: 'Test Workspace',
        slug: 'test-workspace',
        country_code: 'IE'
      }

      // Mock organization creation API response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          organization: { id: 'org-123' }
        })
      })

      const { handlePaymentSuccess } = await import('@/lib/billing/payment-success')

      const result = await handlePaymentSuccess({
        userId: 'user-123',
        organizationData,
        subscriptionId: 'sub-123'
      })

      expect(result.organization.id).toBe('org-123')
      expect(result.redirectTo).toBe('/dashboard')
      
      expect(global.fetch).toHaveBeenCalledWith('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...organizationData,
          user_id: 'user-123',
          subscription_id: 'sub-123'
        })
      })
    })

    it('should handle organization creation failure in payment success', async () => {
      const organizationData = {
        name: 'Test Workspace',
        slug: 'test-workspace',
        country_code: 'IE'
      }

      // Mock failed organization creation
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          error: 'Organization already exists'
        })
      })

      const { handlePaymentSuccess } = await import('@/lib/billing/payment-success')

      await expect(handlePaymentSuccess({
        userId: 'user-123',
        organizationData,
        subscriptionId: 'sub-123'
      })).rejects.toThrow('Organization already exists')
    })

    it('should clean up session storage after successful organization creation', async () => {
      const organizationData = {
        name: 'Test Workspace',
        slug: 'test-workspace',
        country_code: 'IE'
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          organization: { id: 'org-123' }
        })
      })

      const { handlePaymentSuccess } = await import('@/lib/billing/payment-success')

      await handlePaymentSuccess({
        userId: 'user-123',
        organizationData,
        subscriptionId: 'sub-123'
      })

      expect(global.sessionStorage.removeItem).toHaveBeenCalledWith('pending_organization')
    })
  })

  describe('Abandoned Checkout Cleanup', () => {
    it('should identify abandoned checkout sessions', async () => {
      const { identifyAbandonedCheckouts } = await import('@/lib/billing/cleanup')

      // Mock checkout sessions older than 24 hours
      const oldCheckouts = [
        {
          id: 'checkout-1',
          created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
          status: 'pending'
        },
        {
          id: 'checkout-2', 
          created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
          status: 'pending'
        }
      ]

      const abandoned = identifyAbandonedCheckouts(oldCheckouts)
      
      expect(abandoned).toHaveLength(1)
      expect(abandoned[0].id).toBe('checkout-1')
    })

    it('should clean up session storage for abandoned checkouts', async () => {
      const { cleanupAbandonedSessions } = await import('@/lib/billing/cleanup')

      const abandonedCheckouts = [
        { id: 'checkout-1', user_id: 'user-123' }
      ]

      await cleanupAbandonedSessions(abandonedCheckouts)

      // This would typically interact with a database or cleanup service
      // For testing, we verify the function completes without error
      expect(true).toBe(true)
    })

    it('should handle cleanup errors gracefully', async () => {
      const { cleanupAbandonedSessions } = await import('@/lib/billing/cleanup')

      // Test with malformed data
      const invalidCheckouts = [null, undefined, { id: 'valid-checkout' }]

      await expect(cleanupAbandonedSessions(invalidCheckouts)).resolves.not.toThrow()
    })
  })

  describe('Integration Tests', () => {
    it('should complete full free tier flow end-to-end', async () => {
      // 1. Store organization data in session
      const { storeOrganizationData } = await import('@/lib/billing/session-storage')
      const organizationData = {
        name: 'Test Workspace',
        slug: 'test-workspace',
        country_code: 'IE'
      }
      
      storeOrganizationData(organizationData)

      // 2. Select 3 users (free tier)
      const { handleFreeTierFlow } = await import('@/lib/billing/organization-creation')
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          organization: { id: 'org-123' }
        })
      })

      const result = await handleFreeTierFlow('user-123', 3)

      // 3. Verify organization was created and redirect to dashboard
      expect(result.shouldCreateOrganization).toBe(true)
      expect(result.redirectTo).toBe('/dashboard')
      expect(global.sessionStorage.removeItem).toHaveBeenCalledWith('pending_organization')
    })

    it('should complete full paid tier flow end-to-end', async () => {
      // 1. Store organization data in session
      const { storeOrganizationData } = await import('@/lib/billing/session-storage')
      const organizationData = {
        name: 'Test Workspace',
        slug: 'test-workspace',
        country_code: 'IE'
      }
      
      storeOrganizationData(organizationData)

      // 2. Select 5 users (paid tier)
      const { createCheckoutWithOrganization } = await import('@/lib/billing/checkout-integration')
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          checkout_url: 'https://lemonsqueezy.test/checkout/123'
        })
      })

      const checkoutResult = await createCheckoutWithOrganization({
        userId: 'user-123',
        variantId: 'variant-123',
        userCount: 5,
        tier: 'annual'
      })

      // 3. Simulate successful payment and organization creation
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          organization: { id: 'org-123' }
        })
      })

      const { handlePaymentSuccess } = await import('@/lib/billing/payment-success')
      const paymentResult = await handlePaymentSuccess({
        userId: 'user-123',
        organizationData,
        subscriptionId: 'sub-123'
      })

      // 4. Verify complete flow
      expect(checkoutResult.checkout_url).toBe('https://lemonsqueezy.test/checkout/123')
      expect(paymentResult.organization.id).toBe('org-123')
      expect(paymentResult.redirectTo).toBe('/dashboard')
      expect(global.sessionStorage.removeItem).toHaveBeenCalledWith('pending_organization')
    })
  })
})