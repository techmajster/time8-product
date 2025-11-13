/**
 * Webhook Tests for Hybrid Billing System
 *
 * Tests billing_type detection and routing for subscription_created webhook:
 * - Monthly variant (513746) → usage_based billing → creates usage record
 * - Yearly variant (513747) → quantity_based billing → NO usage record
 * - Unknown variant → throws error
 *
 * CRITICAL: Monthly subscriptions must continue working unchanged
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { processSubscriptionCreated } from '@/app/api/webhooks/lemonsqueezy/handlers';

// Mock environment variables
process.env.LEMONSQUEEZY_API_KEY = 'test-api-key';
process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID = '513746';
process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID = '513747';

// Mock Supabase admin client
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
};

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => mockSupabase
}));

// Mock fetch for LemonSqueezy API calls
global.fetch = jest.fn();

describe('Webhook: Hybrid Billing - subscription_created', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default successful responses
    mockSupabase.single.mockResolvedValue({
      data: {
        id: 'customer-123',
        organization_id: 'org-456',
        lemonsqueezy_customer_id: '789'
      },
      error: null
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 'usage-rec-1' } })
    });
  });

  describe('Billing Type Detection', () => {
    it('should detect monthly variant and set billing_type to usage_based', async () => {
      const payload = createSubscriptionPayload({
        variant_id: 513746, // Monthly
        user_count: 6
      });

      // Mock customer lookup
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: 'customer-123',
            organization_id: 'org-456'
          },
          error: null
        })
        // Mock subscription insert
        .mockResolvedValueOnce({
          data: {
            id: 'sub-789',
            billing_type: 'usage_based'
          },
          error: null
        });

      const result = await processSubscriptionCreated(payload);

      expect(result.success).toBe(true);

      // Verify subscription was created with usage_based billing_type
      const insertCall = mockSupabase.insert.mock.calls[0][0];
      expect(insertCall.billing_type).toBe('usage_based');
      expect(insertCall.lemonsqueezy_variant_id).toBe(513746);
    });

    it('should detect yearly variant and set billing_type to quantity_based', async () => {
      const payload = createSubscriptionPayload({
        variant_id: 513747, // Yearly
        user_count: 6
      });

      // Mock customer lookup
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: 'customer-123',
            organization_id: 'org-456'
          },
          error: null
        })
        // Mock subscription insert
        .mockResolvedValueOnce({
          data: {
            id: 'sub-789',
            billing_type: 'quantity_based'
          },
          error: null
        });

      const result = await processSubscriptionCreated(payload);

      expect(result.success).toBe(true);

      // Verify subscription was created with quantity_based billing_type
      const insertCall = mockSupabase.insert.mock.calls[0][0];
      expect(insertCall.billing_type).toBe('quantity_based');
      expect(insertCall.lemonsqueezy_variant_id).toBe(513747);
    });

    it('should throw error for unknown variant_id', async () => {
      const payload = createSubscriptionPayload({
        variant_id: 999999, // Unknown
        user_count: 6
      });

      // Mock customer lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'customer-123',
          organization_id: 'org-456'
        },
        error: null
      });

      const result = await processSubscriptionCreated(payload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown variant');
      expect(result.error).toContain('999999');
    });
  });

  describe('Usage Record Creation Logic', () => {
    it('should create usage record for monthly subscriptions (usage_based)', async () => {
      const payload = createSubscriptionPayload({
        variant_id: 513746, // Monthly
        user_count: 6
      });

      // Mock customer lookup
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: 'customer-123',
            organization_id: 'org-456'
          },
          error: null
        })
        // Mock subscription insert
        .mockResolvedValueOnce({
          data: {
            id: 'sub-789',
            billing_type: 'usage_based'
          },
          error: null
        });

      const result = await processSubscriptionCreated(payload);

      expect(result.success).toBe(true);

      // Verify usage record was created
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/usage-records'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"quantity":6')
        })
      );
    });

    it('should NOT create usage record for yearly subscriptions (quantity_based)', async () => {
      const payload = createSubscriptionPayload({
        variant_id: 513747, // Yearly
        user_count: 6
      });

      // Mock customer lookup
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: 'customer-123',
            organization_id: 'org-456'
          },
          error: null
        })
        // Mock subscription insert
        .mockResolvedValueOnce({
          data: {
            id: 'sub-789',
            billing_type: 'quantity_based'
          },
          error: null
        });

      const result = await processSubscriptionCreated(payload);

      expect(result.success).toBe(true);

      // Verify NO usage record was created
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should create usage record with quantity 0 for monthly free tier (1-3 users)', async () => {
      const payload = createSubscriptionPayload({
        variant_id: 513746, // Monthly
        user_count: 3 // Free tier
      });

      // Mock customer lookup
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: 'customer-123',
            organization_id: 'org-456'
          },
          error: null
        })
        // Mock subscription insert
        .mockResolvedValueOnce({
          data: {
            id: 'sub-789',
            billing_type: 'usage_based'
          },
          error: null
        });

      const result = await processSubscriptionCreated(payload);

      expect(result.success).toBe(true);

      // Verify usage record created with quantity 0 (free tier)
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.data.attributes.quantity).toBe(0);
    });

    it('should NOT create usage record for yearly free tier (1-3 users)', async () => {
      const payload = createSubscriptionPayload({
        variant_id: 513747, // Yearly
        user_count: 3 // Free tier
      });

      // Mock customer lookup
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: 'customer-123',
            organization_id: 'org-456'
          },
          error: null
        })
        // Mock subscription insert
        .mockResolvedValueOnce({
          data: {
            id: 'sub-789',
            billing_type: 'quantity_based'
          },
          error: null
        });

      const result = await processSubscriptionCreated(payload);

      expect(result.success).toBe(true);

      // Verify NO usage record created (yearly subscriptions never use usage records)
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing subscription_item_id gracefully', async () => {
      const payload = createSubscriptionPayload({
        variant_id: 513746, // Monthly
        user_count: 6,
        subscription_item_id: null // Missing!
      });

      // Mock customer lookup
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: 'customer-123',
            organization_id: 'org-456'
          },
          error: null
        })
        // Mock subscription insert
        .mockResolvedValueOnce({
          data: {
            id: 'sub-789',
            billing_type: 'usage_based'
          },
          error: null
        });

      const result = await processSubscriptionCreated(payload);

      // Should succeed but skip usage record creation
      expect(result.success).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should log variant_id in all subscription creation events', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const payload = createSubscriptionPayload({
        variant_id: 513746,
        user_count: 6
      });

      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: 'customer-123',
            organization_id: 'org-456'
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            id: 'sub-789',
            billing_type: 'usage_based'
          },
          error: null
        });

      await processSubscriptionCreated(payload);

      // Verify variant_id is logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Webhook]'),
        expect.objectContaining({
          variant_id: 513746
        })
      );

      consoleSpy.mockRestore();
    });

    it('should handle usage record creation failure gracefully', async () => {
      const payload = createSubscriptionPayload({
        variant_id: 513746, // Monthly
        user_count: 6
      });

      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: 'customer-123',
            organization_id: 'org-456'
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            id: 'sub-789',
            billing_type: 'usage_based'
          },
          error: null
        });

      // Mock failed usage record creation
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        text: async () => 'API Error'
      });

      const result = await processSubscriptionCreated(payload);

      // Should still succeed (usage record failure doesn't break webhook)
      expect(result.success).toBe(true);
    });
  });

  describe('Backward Compatibility', () => {
    it('should preserve current_seats from user_count in custom_data', async () => {
      const payload = createSubscriptionPayload({
        variant_id: 513746,
        user_count: 8
      });

      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: 'customer-123',
            organization_id: 'org-456'
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            id: 'sub-789',
            billing_type: 'usage_based',
            current_seats: 8
          },
          error: null
        });

      const result = await processSubscriptionCreated(payload);

      expect(result.success).toBe(true);

      // Verify current_seats matches user_count from custom_data
      const insertCall = mockSupabase.insert.mock.calls[0][0];
      expect(insertCall.current_seats).toBe(8);
    });
  });
});

/**
 * Helper function to create subscription payloads
 */
function createSubscriptionPayload(options: {
  variant_id: number;
  user_count: number;
  subscription_item_id?: string | null;
}) {
  return {
    meta: {
      event_name: 'subscription_created',
      event_id: `evt-${Date.now()}`,
      custom_data: {
        user_count: options.user_count.toString(),
        organization_id: 'org-456',
        organization_name: 'Test Org'
      }
    },
    data: {
      id: '12345',
      type: 'subscriptions',
      attributes: {
        status: 'active',
        customer_id: 789,
        variant_id: options.variant_id,
        renews_at: '2025-12-01T00:00:00Z',
        ends_at: null,
        trial_ends_at: null,
        user_email: 'test@example.com',
        first_subscription_item: {
          id: options.subscription_item_id !== undefined ? options.subscription_item_id : 'item-123',
          quantity: options.user_count,
          is_usage_based: options.variant_id === 513746 // Monthly is usage-based
        }
      }
    }
  };
}
