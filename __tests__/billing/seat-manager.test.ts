/**
 * Test Suite for SeatManager Service
 *
 * Tests the routing logic for hybrid billing system:
 * - usage_based (monthly): Creates usage records, charged at end of period
 * - quantity_based (yearly): PATCH subscription quantity, charged immediately with proration
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Set environment variables BEFORE any imports
process.env.LEMONSQUEEZY_API_KEY = 'test-api-key';
process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID = '513746';
process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID = '513747';
process.env.YEARLY_PRICE_PER_SEAT = '1200';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

// Use the manual mock for Supabase
jest.mock('@/lib/supabase/server');

// Import the mock exports
import {
  mockSupabaseFrom,
  mockSupabaseSelect,
  mockSupabaseUpdate,
  mockSupabaseEq,
  mockSupabaseSingle,
  mockSupabaseClient
} from '@/lib/supabase/__mocks__/server';

// Mock fetch for LemonSqueezy API calls
global.fetch = jest.fn() as jest.Mock;

// Now import SeatManager after mocks are set up
import { SeatManager } from '@/lib/billing/seat-manager';

describe('SeatManager', () => {
  let seatManager: SeatManager;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset method chaining
    mockSupabaseFrom.mockReturnValue(mockSupabaseClient);
    mockSupabaseSelect.mockReturnValue(mockSupabaseClient);
    mockSupabaseUpdate.mockReturnValue(mockSupabaseClient);
    mockSupabaseEq.mockReturnValue(mockSupabaseClient);

    seatManager = new SeatManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addSeats() - Main Routing Logic', () => {
    it('should route to usage-based path for monthly subscriptions', async () => {
      // Mock subscription fetch (first .single() call)
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'sub-123',
          billing_type: 'usage_based',
          current_seats: 6,
          lemonsqueezy_subscription_item_id: 'item-456',
          organization_id: 'org-789'
        },
        error: null
      });

      // Mock successful usage record creation
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'usage-rec-1', attributes: { quantity: 8 } } })
      });

      // Mock database update (second .single() call)
      mockSupabaseSingle.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await seatManager.addSeats('sub-123', 8);

      expect(result.success).toBe(true);
      expect(result.billingType).toBe('usage_based');
      expect(result.chargedAt).toBe('end_of_period');
      expect(result.message).toContain('end of current billing period');
      expect(result.currentSeats).toBe(8);
    });

    it('should route to quantity-based path for yearly subscriptions', async () => {
      // Mock subscription with quantity_based billing
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'sub-123',
          billing_type: 'quantity_based',
          current_seats: 6,
          lemonsqueezy_subscription_item_id: 'item-456',
          lemonsqueezy_subscription_id: 'lemon-sub-789',
          organization_id: 'org-789'
        },
        error: null
      });

      // Mock LemonSqueezy GET subscription (for renews_at)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            attributes: {
              renews_at: new Date(Date.now() + 183 * 24 * 60 * 60 * 1000).toISOString() // 183 days from now
            }
          }
        })
      });

      // Mock LemonSqueezy PATCH subscription-items
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'item-456', attributes: { quantity: 8 } } })
      });

      // Mock database update
      mockSupabaseSingle.mockResolvedValueOnce({
        data: { current_seats: 8 },
        error: null
      });

      const result = await seatManager.addSeats('sub-123', 8);

      expect(result.success).toBe(true);
      expect(result.billingType).toBe('quantity_based');
      expect(result.chargedAt).toBe('immediately');
      expect(result.prorationAmount).toBeGreaterThan(0);
      expect(result.message).toContain('charged');
      expect(result.currentSeats).toBe(8);
    });

    it('should throw error for subscription not found', async () => {
      mockSupabaseSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Subscription not found' }
      });

      await expect(seatManager.addSeats('sub-nonexistent', 10))
        .rejects
        .toThrow('Subscription not found');
    });

    it('should throw error for unknown billing type', async () => {
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'sub-123',
          billing_type: 'volume', // Legacy type
          current_seats: 6,
          lemonsqueezy_subscription_item_id: 'item-456'
        },
        error: null
      });

      await expect(seatManager.addSeats('sub-123', 8))
        .rejects
        .toThrow('Unknown billing type');
    });
  });

  describe('addSeatsUsageBased() - Monthly Path', () => {
    it('should create usage record with correct quantity', async () => {
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'sub-123',
          billing_type: 'usage_based',
          current_seats: 6,
          lemonsqueezy_subscription_item_id: 'item-456',
          organization_id: 'org-789'
        },
        error: null
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'usage-rec-1', attributes: { quantity: 10, action: 'set' } } })
      });

      mockSupabaseSingle.mockResolvedValueOnce({
        data: { current_seats: 10 },
        error: null
      });

      const result = await seatManager.addSeats('sub-123', 10);

      // Verify usage records API was called correctly
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/subscription-items/item-456/usage-records'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/vnd.api+json'
          }),
          body: expect.stringContaining('"quantity":10')
        })
      );

      expect(result.success).toBe(true);
      expect(result.billingType).toBe('usage_based');
    });

    it('should handle LemonSqueezy API failure gracefully', async () => {
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'sub-123',
          billing_type: 'usage_based',
          current_seats: 6,
          lemonsqueezy_subscription_item_id: 'item-456',
          organization_id: 'org-789'
        },
        error: null
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 422,
        text: async () => 'Validation error'
      });

      await expect(seatManager.addSeats('sub-123', 10))
        .rejects
        .toThrow('Failed to create usage record');
    });

    it('should use action: "set" not "increment"', async () => {
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'sub-123',
          billing_type: 'usage_based',
          current_seats: 5,
          lemonsqueezy_subscription_item_id: 'item-456',
          organization_id: 'org-789'
        },
        error: null
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'usage-rec-1' } })
      });

      mockSupabaseSingle.mockResolvedValueOnce({
        data: { current_seats: 7 },
        error: null
      });

      await seatManager.addSeats('sub-123', 7);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.data.attributes.action).toBe('set');
      expect(body.data.attributes.quantity).toBe(7);
    });
  });

  describe('addSeatsQuantityBased() - Yearly Path', () => {
    it('should PATCH subscription-items with invoice_immediately: true', async () => {
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'sub-123',
          billing_type: 'quantity_based',
          current_seats: 6,
          lemonsqueezy_subscription_item_id: 'item-456',
          lemonsqueezy_subscription_id: 'lemon-sub-789',
          organization_id: 'org-789'
        },
        error: null
      });

      // Mock GET subscription for renews_at
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            attributes: {
              renews_at: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString()
            }
          }
        })
      });

      // Mock PATCH subscription-items
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'item-456', attributes: { quantity: 10 } } })
      });

      mockSupabaseSingle.mockResolvedValueOnce({
        data: { current_seats: 10 },
        error: null
      });

      const result = await seatManager.addSeats('sub-123', 10);

      // Verify PATCH was called correctly
      const patchCall = (global.fetch as jest.Mock).mock.calls[1]; // Second call after GET
      expect(patchCall[0]).toContain('/v1/subscription-items/item-456');
      expect(patchCall[1].method).toBe('PATCH');

      const body = JSON.parse(patchCall[1].body);
      expect(body.data.attributes.quantity).toBe(10);
      expect(body.data.attributes.invoice_immediately).toBe(true);

      expect(result.success).toBe(true);
      expect(result.billingType).toBe('quantity_based');
      expect(result.chargedAt).toBe('immediately');
    });

    it('should handle PATCH failure gracefully', async () => {
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'sub-123',
          billing_type: 'quantity_based',
          current_seats: 6,
          lemonsqueezy_subscription_item_id: 'item-456',
          lemonsqueezy_subscription_id: 'lemon-sub-789',
          organization_id: 'org-789'
        },
        error: null
      });

      // Mock GET subscription
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            attributes: {
              renews_at: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString()
            }
          }
        })
      });

      // Mock failed PATCH
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal server error'
      });

      await expect(seatManager.addSeats('sub-123', 10))
        .rejects
        .toThrow('Failed to update subscription quantity');
    });
  });

  describe('calculateProration()', () => {
    it('should calculate accurate proration for half year remaining', async () => {
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'sub-123',
          billing_type: 'quantity_based',
          current_seats: 6,
          lemonsqueezy_subscription_id: 'lemon-sub-789'
        },
        error: null
      });

      // Mock renews_at: exactly 183 days from now (half year)
      const renewsAt = new Date(Date.now() + 183 * 24 * 60 * 60 * 1000);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            attributes: {
              renews_at: renewsAt.toISOString()
            }
          }
        })
      });

      const proration = await seatManager.calculateProration('sub-123', 8);

      // Adding 2 seats (8 - 6) for 183 days at $1200/year per seat
      // Expected: (2 * 1200 * 183) / 365 ≈ $1200
      expect(proration.amount).toBeCloseTo(1200, 0);
      expect(proration.seatsAdded).toBe(2);
      expect(proration.daysRemaining).toBe(183);
    });

    it('should return zero proration for usage-based subscriptions', async () => {
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'sub-123',
          billing_type: 'usage_based',
          current_seats: 6
        },
        error: null
      });

      const proration = await seatManager.calculateProration('sub-123', 10);

      expect(proration.amount).toBe(0);
      expect(proration.message).toContain('not applicable for usage-based');
    });

    it('should handle seat removal (return zero with message)', async () => {
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'sub-123',
          billing_type: 'quantity_based',
          current_seats: 10,
          lemonsqueezy_subscription_id: 'lemon-sub-789'
        },
        error: null
      });

      const renewsAt = new Date(Date.now() + 100 * 24 * 60 * 60 * 1000);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            attributes: {
              renews_at: renewsAt.toISOString()
            }
          }
        })
      });

      const proration = await seatManager.calculateProration('sub-123', 8);

      expect(proration.amount).toBe(0);
      expect(proration.seatsAdded).toBe(0);
      expect(proration.message).toContain('Credit will be applied at next renewal');
    });

    it('should throw error if subscription not found', async () => {
      mockSupabaseSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' }
      });

      await expect(seatManager.calculateProration('sub-nonexistent', 10))
        .rejects
        .toThrow('Subscription not found');
    });

    it('should handle LemonSqueezy API failure when fetching renews_at', async () => {
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'sub-123',
          billing_type: 'quantity_based',
          current_seats: 6,
          lemonsqueezy_subscription_id: 'lemon-sub-789'
        },
        error: null
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      await expect(seatManager.calculateProration('sub-123', 10))
        .rejects
        .toThrow('Failed to fetch subscription from LemonSqueezy');
    });
  });

  describe('removeSeats()', () => {
    it('should create usage record with lower quantity for monthly subscriptions', async () => {
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'sub-123',
          billing_type: 'usage_based',
          current_seats: 10,
          lemonsqueezy_subscription_item_id: 'item-456',
          organization_id: 'org-789'
        },
        error: null
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'usage-rec-1', attributes: { quantity: 8 } } })
      });

      mockSupabaseSingle.mockResolvedValueOnce({
        data: { current_seats: 8 },
        error: null
      });

      const result = await seatManager.removeSeats('sub-123', 8);

      expect(result.success).toBe(true);
      expect(result.billingType).toBe('usage_based');
      expect(result.currentSeats).toBe(8);
    });

    it('should PATCH with lower quantity for yearly subscriptions', async () => {
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'sub-123',
          billing_type: 'quantity_based',
          current_seats: 10,
          lemonsqueezy_subscription_item_id: 'item-456',
          lemonsqueezy_subscription_id: 'lemon-sub-789',
          organization_id: 'org-789'
        },
        error: null
      });

      // Mock GET subscription
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            attributes: {
              renews_at: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString()
            }
          }
        })
      });

      // Mock PATCH
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'item-456', attributes: { quantity: 8 } } })
      });

      mockSupabaseSingle.mockResolvedValueOnce({
        data: { current_seats: 8 },
        error: null
      });

      const result = await seatManager.removeSeats('sub-123', 8);

      const patchCall = (global.fetch as jest.Mock).mock.calls[1];
      const body = JSON.parse(patchCall[1].body);

      expect(body.data.attributes.quantity).toBe(8);
      expect(result.success).toBe(true);
      expect(result.currentSeats).toBe(8);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing subscription_item_id', async () => {
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'sub-123',
          billing_type: 'usage_based',
          current_seats: 6,
          lemonsqueezy_subscription_item_id: null, // Missing!
          organization_id: 'org-789'
        },
        error: null
      });

      await expect(seatManager.addSeats('sub-123', 10))
        .rejects
        .toThrow('Missing subscription_item_id');
    });

    it('should handle adding zero seats', async () => {
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'sub-123',
          billing_type: 'usage_based',
          current_seats: 6,
          lemonsqueezy_subscription_item_id: 'item-456'
        },
        error: null
      });

      await expect(seatManager.addSeats('sub-123', 6))
        .rejects
        .toThrow('New quantity must be different');
    });
  });
});
