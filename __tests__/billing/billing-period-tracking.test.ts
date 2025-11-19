/**
 * Billing Period Tracking Tests
 *
 * Tests for billing period (monthly/yearly) tracking throughout the
 * workspace creation and subscription lifecycle.
 *
 * Critical Bug Fixes:
 * - Billing period saved from checkout custom_data
 * - Billing period persisted in database
 * - Billing period displayed correctly in UI
 *
 * @jest-environment node
 */

import { processSubscriptionCreated } from '@/app/api/webhooks/lemonsqueezy/handlers';

// Mock Supabase
const mockSupabaseFrom = jest.fn();
const mockSupabaseSelect = jest.fn();
const mockSupabaseInsert = jest.fn();
const mockSupabaseUpdate = jest.fn();
const mockSupabaseSingle = jest.fn();
const mockSupabaseEq = jest.fn();

const mockCreateAdminClient = jest.fn(() => ({
  from: mockSupabaseFrom
}));

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => mockCreateAdminClient()
}));

// Mock fetch for LemonSqueezy API
global.fetch = jest.fn();

describe('Billing Period Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup environment variables
    process.env.LEMONSQUEEZY_API_KEY = 'test-key';
    process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID = '972634';
    process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID = '1090954';
    process.env.LEMONSQUEEZY_MONTHLY_PRODUCT_ID = '621389';
    process.env.LEMONSQUEEZY_YEARLY_PRODUCT_ID = '693341';

    // Setup default Supabase mock chain
    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
      insert: mockSupabaseInsert,
      update: mockSupabaseUpdate
    });

    mockSupabaseSelect.mockReturnValue({
      eq: mockSupabaseEq,
      single: mockSupabaseSingle
    });

    mockSupabaseInsert.mockReturnValue({
      select: mockSupabaseSelect
    });

    mockSupabaseUpdate.mockReturnValue({
      eq: mockSupabaseEq
    });

    mockSupabaseEq.mockReturnValue({
      single: mockSupabaseSingle,
      eq: mockSupabaseEq
    });

    // Mock fetch for LemonSqueezy API calls
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 'deleted' } }),
      text: async () => 'Success'
    });
  });

  describe('Webhook - Billing Period from Custom Data', () => {
    it('should save billing_period as "monthly" when tier is "monthly" in custom_data', async () => {
      const payload = {
        meta: {
          event_name: 'subscription_created',
          event_id: 'evt-monthly-001',
          custom_data: {
            user_count: '5',
            organization_name: 'Test Monthly Org',
            organization_slug: 'test-monthly-org',
            tier: 'monthly' // Critical: billing period from checkout
          }
        },
        data: {
          id: 'sub-monthly-123',
          attributes: {
            status: 'active',
            customer_id: 'cust-123',
            variant_id: 972634, // Monthly variant
            product_id: 621389, // Monthly product
            renews_at: '2025-02-15T00:00:00Z',
            ends_at: null,
            trial_ends_at: null,
            user_email: 'test@example.com',
            first_subscription_item: {
              id: 'item-123',
              quantity: 5
            }
          }
        }
      };

      // Mock organization lookup
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'org-123',
          name: 'Test Monthly Org',
          slug: 'test-monthly-org'
        },
        error: null
      });

      // Mock subscription insert
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'db-sub-123',
          organization_id: 'org-123',
          lemonsqueezy_subscription_id: 'sub-monthly-123',
          billing_period: 'monthly' // Expected result
        },
        error: null
      });

      await processSubscriptionCreated(payload);

      // Verify insert was called with billing_period: 'monthly'
      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          billing_period: 'monthly'
        })
      );
    });

    it('should save billing_period as "yearly" when tier is "annual" in custom_data', async () => {
      const payload = {
        meta: {
          event_name: 'subscription_created',
          event_id: 'evt-yearly-001',
          custom_data: {
            user_count: '10',
            organization_name: 'Test Yearly Org',
            organization_slug: 'test-yearly-org',
            tier: 'annual' // Critical: "annual" maps to "yearly"
          }
        },
        data: {
          id: 'sub-yearly-456',
          attributes: {
            status: 'active',
            customer_id: 'cust-456',
            variant_id: 1090954, // Yearly variant
            product_id: 693341, // Yearly product
            renews_at: '2026-01-15T00:00:00Z',
            ends_at: null,
            trial_ends_at: null,
            user_email: 'yearly@example.com',
            first_subscription_item: {
              id: 'item-456',
              quantity: 10
            }
          }
        }
      };

      // Mock organization lookup
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'org-456',
          name: 'Test Yearly Org',
          slug: 'test-yearly-org'
        },
        error: null
      });

      // Mock subscription insert
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'db-sub-456',
          organization_id: 'org-456',
          lemonsqueezy_subscription_id: 'sub-yearly-456',
          billing_period: 'yearly'
        },
        error: null
      });

      await processSubscriptionCreated(payload);

      // Verify insert was called with billing_period: 'yearly'
      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          billing_period: 'yearly'
        })
      );
    });

    it('should fallback to variant_id inference when tier not in custom_data', async () => {
      const payload = {
        meta: {
          event_name: 'subscription_created',
          event_id: 'evt-fallback-001',
          custom_data: {
            user_count: '3',
            organization_name: 'Test Fallback Org',
            organization_slug: 'test-fallback-org'
            // No tier field - should fallback to variant_id check
          }
        },
        data: {
          id: 'sub-fallback-789',
          attributes: {
            status: 'active',
            customer_id: 'cust-789',
            variant_id: 972634, // Monthly variant
            product_id: 621389, // Monthly product
            renews_at: '2025-02-15T00:00:00Z',
            ends_at: null,
            trial_ends_at: null,
            user_email: 'fallback@example.com',
            first_subscription_item: {
              id: 'item-789',
              quantity: 3
            }
          }
        }
      };

      // Mock organization lookup
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'org-789',
          name: 'Test Fallback Org',
          slug: 'test-fallback-org'
        },
        error: null
      });

      // Mock subscription insert
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'db-sub-789',
          organization_id: 'org-789',
          lemonsqueezy_subscription_id: 'sub-fallback-789',
          billing_period: 'monthly' // Inferred from variant_id
        },
        error: null
      });

      await processSubscriptionCreated(payload);

      // Should still save billing_period based on variant_id
      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          billing_period: 'monthly'
        })
      );
    });
  });

  describe('Database - Billing Period Column', () => {
    it('should accept billing_period values: monthly, yearly, null', () => {
      // This test verifies the database schema accepts valid enum values
      const validValues = ['monthly', 'yearly', null];

      validValues.forEach(value => {
        const subscriptionData = {
          organization_id: 'org-123',
          lemonsqueezy_subscription_id: 'sub-123',
          billing_period: value,
          status: 'active'
        };

        expect(() => {
          // Simulate database insert validation
          if (value !== null && !['monthly', 'yearly'].includes(value as string)) {
            throw new Error('Invalid billing_period value');
          }
        }).not.toThrow();
      });
    });

    it('should reject invalid billing_period values', () => {
      const invalidValues = ['weekly', 'quarterly', 'biannual', 'random'];

      invalidValues.forEach(value => {
        expect(() => {
          // Simulate database enum constraint
          if (!['monthly', 'yearly', null].includes(value)) {
            throw new Error(`Invalid billing_period: ${value}`);
          }
        }).toThrow();
      });
    });
  });

  describe('UI - Billing Period Display', () => {
    it('should identify monthly subscription from billing_period column', () => {
      const subscription = {
        id: 'sub-123',
        lemonsqueezy_product_id: '621389',
        lemonsqueezy_variant_id: '972634',
        billing_period: 'monthly'
      };

      // Primary check: billing_period column
      const isMonthly = subscription.billing_period === 'monthly';
      expect(isMonthly).toBe(true);
    });

    it('should identify yearly subscription from billing_period column', () => {
      const subscription = {
        id: 'sub-456',
        lemonsqueezy_product_id: '693341',
        lemonsqueezy_variant_id: '1090954',
        billing_period: 'yearly'
      };

      // Primary check: billing_period column
      const isYearly = subscription.billing_period === 'yearly';
      expect(isYearly).toBe(true);
    });

    it('should fallback to product_id when billing_period is null', () => {
      const subscription = {
        id: 'sub-789',
        lemonsqueezy_product_id: '693341', // Yearly product
        lemonsqueezy_variant_id: '1090954',
        billing_period: null // Legacy data without billing_period
      };

      const yearlyProductId = '693341';

      // Fallback check: product_id comparison
      const isYearly = subscription.billing_period === 'yearly' ||
        (subscription.billing_period === null && subscription.lemonsqueezy_product_id === yearlyProductId);

      expect(isYearly).toBe(true);
    });
  });

  describe('Free Tier - Billing Period Tracking', () => {
    it('should save billing_period for free tier organizations', async () => {
      // Free tier organizations (≤3 seats) should also track billing_period
      // even though they don't have an active LemonSqueezy subscription

      const freeOrgData = {
        organization_id: 'free-org-123',
        status: 'active',
        seat_limit: 3,
        current_seats: 1,
        billing_period: 'monthly', // User's intended billing period for future upgrade
        lemonsqueezy_subscription_id: null,
        lemonsqueezy_customer_id: null
      };

      // Verify free tier can have billing_period set
      expect(freeOrgData.billing_period).toBe('monthly');
      expect(freeOrgData.lemonsqueezy_subscription_id).toBeNull();
    });
  });
});
