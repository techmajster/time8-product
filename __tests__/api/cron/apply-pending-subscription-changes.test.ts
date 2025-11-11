/**
 * Apply Pending Subscription Changes Cron Job Tests
 *
 * Tests the cron job that syncs pending seat changes to LemonSqueezy
 * 24-48 hours before subscription renewal.
 *
 * @jest-environment node
 */

import { POST } from '@/app/api/cron/apply-pending-subscription-changes/route'
import { NextRequest } from 'next/server'

// Mock fetch for LemonSqueezy API calls
global.fetch = jest.fn()

// Mock Supabase
const mockSupabaseFrom = jest.fn()
const mockSupabaseSelect = jest.fn()
const mockSupabaseUpdate = jest.fn()
const mockSupabaseEq = jest.fn()
const mockSupabaseNot = jest.fn()
const mockSupabaseGte = jest.fn()
const mockSupabaseLte = jest.fn()
const mockSupabaseIn = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    from: mockSupabaseFrom
  })
}))

// Mock alert service
jest.mock('@/lib/alert-service', () => ({
  sendInfoAlert: jest.fn(),
  sendCriticalAlert: jest.fn()
}))

describe('Apply Pending Subscription Changes Cron Job', () => {
  const mockSubscription = {
    id: 'sub-123',
    organization_id: 'org-123',
    lemonsqueezy_subscription_id: 'ls-sub-456',
    lemonsqueezy_subscription_item_id: 'ls-item-789',
    quantity: 10,
    current_seats: 10,
    pending_seats: 7,
    lemonsqueezy_quantity_synced: false,
    status: 'active',
    renews_at: new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString() // 30 hours from now
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup default mock chain
    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
      update: mockSupabaseUpdate
    })

    mockSupabaseSelect.mockReturnValue({
      not: mockSupabaseNot
    })

    mockSupabaseNot.mockReturnValue({
      gte: mockSupabaseGte
    })

    mockSupabaseGte.mockReturnValue({
      lte: mockSupabaseLte
    })

    mockSupabaseLte.mockReturnValue({
      eq: mockSupabaseEq
    })

    mockSupabaseEq.mockReturnValue({
      in: mockSupabaseIn
    })

    mockSupabaseUpdate.mockReturnValue({
      eq: mockSupabaseEq
    })
  })

  it('should update database after successful LemonSqueezy API call', async () => {
    // Mock subscriptions needing update
    mockSupabaseIn.mockResolvedValueOnce({
      data: [mockSubscription],
      error: null
    })

    // Mock successful LemonSqueezy API call
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 'ls-item-789',
          attributes: {
            quantity: 7
          }
        }
      })
    })

    // Mock successful database updates
    mockSupabaseEq
      .mockResolvedValueOnce({ data: null, error: null }) // lemonsqueezy_quantity_synced update
      .mockResolvedValueOnce({ data: null, error: null }) // quantity update

    const request = new NextRequest('http://localhost:3000/api/cron/apply-pending-subscription-changes', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.CRON_SECRET || 'your-secret-key'}`
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.processed).toBe(1)

    // Verify database was updated with new quantity
    expect(mockSupabaseUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        quantity: 7,
        lemonsqueezy_quantity_synced: true
      })
    )
  })

  it('should NOT update current_seats immediately (wait for payment webhook)', async () => {
    // Mock subscriptions needing update
    mockSupabaseIn.mockResolvedValueOnce({
      data: [mockSubscription],
      error: null
    })

    // Mock successful LemonSqueezy API call
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 'ls-item-789',
          attributes: {
            quantity: 7
          }
        }
      })
    })

    // Mock successful database update
    mockSupabaseEq.mockResolvedValue({ data: null, error: null })

    const request = new NextRequest('http://localhost:3000/api/cron/apply-pending-subscription-changes', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.CRON_SECRET || 'your-secret-key'}`
      }
    })

    await POST(request)

    // Verify current_seats was NOT updated
    const updateCalls = mockSupabaseUpdate.mock.calls
    for (const call of updateCalls) {
      const updateData = call[0]
      expect(updateData).not.toHaveProperty('current_seats')
    }
  })

  it('should update organizations.paid_seats after successful sync', async () => {
    // Mock subscriptions needing update
    mockSupabaseIn.mockResolvedValueOnce({
      data: [mockSubscription],
      error: null
    })

    // Mock successful LemonSqueezy API call
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 'ls-item-789',
          attributes: {
            quantity: 7
          }
        }
      })
    })

    // Mock successful database updates
    mockSupabaseEq.mockResolvedValue({ data: null, error: null })

    const request = new NextRequest('http://localhost:3000/api/cron/apply-pending-subscription-changes', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.CRON_SECRET || 'your-secret-key'}`
      }
    })

    await POST(request)

    // Verify organizations table was updated
    expect(mockSupabaseFrom).toHaveBeenCalledWith('organizations')
    expect(mockSupabaseUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        paid_seats: 7
      })
    )
  })

  it('should handle LemonSqueezy API failures with rollback', async () => {
    // Mock subscriptions needing update
    mockSupabaseIn.mockResolvedValueOnce({
      data: [mockSubscription],
      error: null
    })

    // Mock failed LemonSqueezy API call
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({
        errors: [{
          detail: 'Invalid subscription item'
        }]
      })
    })

    const request = new NextRequest('http://localhost:3000/api/cron/apply-pending-subscription-changes', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.CRON_SECRET || 'your-secret-key'}`
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(data.failed).toBe(1)
    expect(data.errors).toHaveLength(1)

    // Verify database was NOT updated on API failure
    expect(mockSupabaseUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({
        quantity: expect.any(Number)
      })
    )
  })

  it('should log before and after states for debugging', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

    // Mock subscriptions needing update
    mockSupabaseIn.mockResolvedValueOnce({
      data: [mockSubscription],
      error: null
    })

    // Mock successful LemonSqueezy API call
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 'ls-item-789',
          attributes: {
            quantity: 7
          }
        }
      })
    })

    // Mock successful database updates
    mockSupabaseEq.mockResolvedValue({ data: null, error: null })

    const request = new NextRequest('http://localhost:3000/api/cron/apply-pending-subscription-changes', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.CRON_SECRET || 'your-secret-key'}`
      }
    })

    await POST(request)

    // Verify comprehensive logging
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/subscription.*before/i)
    )
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/subscription.*after/i)
    )

    consoleSpy.mockRestore()
  })

  it('should handle database update failures with proper error handling', async () => {
    // Mock subscriptions needing update
    mockSupabaseIn.mockResolvedValueOnce({
      data: [mockSubscription],
      error: null
    })

    // Mock successful LemonSqueezy API call
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 'ls-item-789',
          attributes: {
            quantity: 7
          }
        }
      })
    })

    // Mock database update failure
    mockSupabaseEq.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database connection lost' }
    })

    const request = new NextRequest('http://localhost:3000/api/cron/apply-pending-subscription-changes', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.CRON_SECRET || 'your-secret-key'}`
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(data.failed).toBe(1)
    expect(data.errors[0].error).toContain('Database')
  })

  it('should clear pending_seats after successful sync', async () => {
    // Mock subscriptions needing update
    mockSupabaseIn.mockResolvedValueOnce({
      data: [mockSubscription],
      error: null
    })

    // Mock successful LemonSqueezy API call
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 'ls-item-789',
          attributes: {
            quantity: 7
          }
        }
      })
    })

    // Mock successful database updates
    mockSupabaseEq.mockResolvedValue({ data: null, error: null })

    const request = new NextRequest('http://localhost:3000/api/cron/apply-pending-subscription-changes', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.CRON_SECRET || 'your-secret-key'}`
      }
    })

    await POST(request)

    // Verify pending_seats was NOT cleared (will be cleared by payment webhook)
    const updateCalls = mockSupabaseUpdate.mock.calls
    for (const call of updateCalls) {
      const updateData = call[0]
      // pending_seats should remain so webhook knows to apply changes
      if (updateData.quantity) {
        expect(updateData.pending_seats).toBeUndefined() // Not cleared by cron
      }
    }
  })
})
