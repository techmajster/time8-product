/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/cron/apply-pending-subscription-changes/route'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        not: jest.fn(() => ({
          gte: jest.fn(() => ({
            lte: jest.fn(() => ({
              eq: jest.fn(() => ({
                in: jest.fn(() => ({
                  data: [],
                  error: null
                }))
              }))
            }))
          }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: {},
          error: null
        }))
      })),
      insert: jest.fn(() => ({
        data: {},
        error: null
      }))
    }))
  }))
}))

// Mock fetch for Lemon Squeezy API
global.fetch = jest.fn()

describe('ApplyPendingSubscriptionChangesJob', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeAll(() => {
    originalEnv = process.env
  })

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      CRON_SECRET: 'test-secret',
      LEMONSQUEEZY_API_KEY: 'test-api-key'
    }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('POST /api/cron/apply-pending-subscription-changes', () => {
    it('should require authorization', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/apply-pending-subscription-changes', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer wrong-secret'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should require Lemon Squeezy API configuration', async () => {
      delete process.env.LEMONSQUEEZY_API_KEY

      const request = new NextRequest('http://localhost:3000/api/cron/apply-pending-subscription-changes', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer test-secret'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.error).toBe('Lemon Squeezy API not configured')
    })

    it('should return success when no pending changes exist', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/apply-pending-subscription-changes', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer test-secret'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.processed).toBe(0)
      expect(data.message).toContain('No pending subscription changes')
    })
  })

  describe('GET /api/cron/apply-pending-subscription-changes', () => {
    it('should require authorization for manual trigger', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/apply-pending-subscription-changes', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer wrong-secret'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should allow manual trigger with proper auth', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/apply-pending-subscription-changes', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer test-secret'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})
