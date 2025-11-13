/**
 * Webhook Subscription Event Processing Tests
 * 
 * Tests for processing various Lemon Squeezy subscription webhook events:
 * - subscription.created
 * - subscription.updated 
 * - subscription.cancelled
 * 
 * @jest-environment node
 */

// Simple test without complex dependencies

// Mock Supabase client
const mockSupabaseFrom = jest.fn();
const mockSupabaseSelect = jest.fn();
const mockSupabaseInsert = jest.fn();
const mockSupabaseUpdate = jest.fn();
const mockSupabaseUpsert = jest.fn();
const mockSupabaseSingle = jest.fn();
const mockSupabaseEq = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    from: mockSupabaseFrom
  })
}));

// Mock billing event logging function
const mockLogBillingEvent = jest.fn();
jest.mock('@/lib/supabase/server', () => ({
  ...jest.requireActual('@/lib/supabase/server'),
  logBillingEvent: mockLogBillingEvent
}));

// Test webhook payloads
const mockSubscriptionCreatedPayload = {
  meta: {
    event_name: 'subscription_created',
    event_id: 'evt_123'
  },
  data: {
    id: '12345',
    type: 'subscriptions',
    attributes: {
      status: 'active',
      quantity: 5,
      renews_at: '2024-12-01T00:00:00Z',
      ends_at: null,
      trial_ends_at: null,
      customer_id: 67890,
      variant_id: 11111
    }
  }
};

const mockSubscriptionUpdatedPayload = {
  meta: {
    event_name: 'subscription_updated',
    event_id: 'evt_124'
  },
  data: {
    id: '12345',
    type: 'subscriptions', 
    attributes: {
      status: 'active',
      quantity: 8, // Quantity changed
      renews_at: '2025-01-01T00:00:00Z',
      ends_at: null,
      trial_ends_at: null,
      customer_id: 67890,
      variant_id: 11111
    }
  }
};

const mockSubscriptionCancelledPayload = {
  meta: {
    event_name: 'subscription_cancelled',
    event_id: 'evt_125'
  },
  data: {
    id: '12345',
    type: 'subscriptions',
    attributes: {
      status: 'cancelled',
      quantity: 8,
      renews_at: null,
      ends_at: '2024-12-31T23:59:59Z',
      trial_ends_at: null,
      customer_id: 67890,
      variant_id: 11111
    }
  }
};

describe('Webhook Subscription Event Processing', () => {
  const testCustomerData = {
    id: 'customer-uuid',
    organization_id: 'test-org-id',
    lemonsqueezy_customer_id: '67890',
    email: 'test@example.com'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock chain
    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
      insert: mockSupabaseInsert,
      update: mockSupabaseUpdate,
      upsert: mockSupabaseUpsert
    });

    mockSupabaseSelect.mockReturnValue({
      eq: mockSupabaseEq,
      single: mockSupabaseSingle
    });

    mockSupabaseInsert.mockReturnValue({
      select: mockSupabaseSelect,
      single: mockSupabaseSingle
    });

    mockSupabaseUpdate.mockReturnValue({
      eq: mockSupabaseEq,
      select: mockSupabaseSelect
    });

    mockSupabaseUpsert.mockReturnValue({
      eq: mockSupabaseEq,
      select: mockSupabaseSelect,
      single: mockSupabaseSingle
    });

    mockSupabaseEq.mockReturnValue({
      single: mockSupabaseSingle,
      select: mockSupabaseSelect
    });

    mockSupabaseSingle.mockResolvedValue({
      data: null,
      error: null
    });
  });

  // No cleanup needed for mocked tests

  describe('subscription.created event', () => {

    it('should create new subscription and customer records', async () => {
      const organizationId = 'test-org-id';
      // Mock customer lookup (not found)
      mockSupabaseSingle.mockResolvedValueOnce({
        data: null,
        error: null
      });

      // Mock successful customer creation
      mockSupabaseSingle.mockResolvedValueOnce({
        data: { ...testCustomerData, id: 'new-customer-id' },
        error: null
      });

      // Mock successful subscription creation
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'new-subscription-id',
          organization_id: organizationId,
          lemonsqueezy_subscription_id: '12345',
          status: 'active',
          quantity: 5
        },
        error: null
      });

      const { processSubscriptionCreated } = await import('@/app/api/webhooks/lemonsqueezy/handlers');
      
      const result = await processSubscriptionCreated(mockSubscriptionCreatedPayload);
      
      expect(result.success).toBe(true);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('customers');
      expect(mockSupabaseFrom).toHaveBeenCalledWith('subscriptions');
      expect(mockSupabaseInsert).toHaveBeenCalledTimes(2); // Customer + Subscription
    });

    it('should use existing customer if found', async () => {
      const organizationId = 'test-org-id';
      // Mock existing customer found
      mockSupabaseSingle.mockResolvedValueOnce({
        data: testCustomerData,
        error: null
      });

      // Mock successful subscription creation
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'new-subscription-id',
          organization_id: organizationId,
          customer_id: testCustomerData.id
        },
        error: null
      });

      const { processSubscriptionCreated } = await import('@/app/api/webhooks/lemonsqueezy/handlers');
      
      const result = await processSubscriptionCreated(mockSubscriptionCreatedPayload);
      
      expect(result.success).toBe(true);
      expect(mockSupabaseInsert).toHaveBeenCalledTimes(1); // Only Subscription, not Customer
    });

    it('should update organization paid_seats', async () => {
      // Mock existing customer
      mockSupabaseSingle
        .mockResolvedValueOnce({ data: testCustomerData, error: null })
        .mockResolvedValueOnce({
          data: { id: 'subscription-id', quantity: 5 },
          error: null
        });

      const { processSubscriptionCreated } = await import('@/app/api/webhooks/lemonsqueezy/handlers');

      await processSubscriptionCreated(mockSubscriptionCreatedPayload);

      // Should update organization with paid_seats = quantity
      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        paid_seats: 5
      });
    });

    it('should set current_seats equal to quantity for new subscriptions', async () => {
      // Mock existing customer found
      mockSupabaseSingle.mockResolvedValueOnce({
        data: testCustomerData,
        error: null
      });

      // Mock successful subscription creation
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'new-subscription-id',
          organization_id: testCustomerData.organization_id,
          customer_id: testCustomerData.id,
          quantity: 5,
          current_seats: 5  // Should be set on creation
        },
        error: null
      });

      const { processSubscriptionCreated } = await import('@/app/api/webhooks/lemonsqueezy/handlers');

      const result = await processSubscriptionCreated(mockSubscriptionCreatedPayload);

      expect(result.success).toBe(true);

      // Verify that insert was called with current_seats
      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: testCustomerData.organization_id,
          quantity: 5,
          current_seats: 5  // Must be set for immediate access
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      // Mock customer lookup error
      mockSupabaseSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' }
      });

      const { processSubscriptionCreated } = await import('@/app/api/webhooks/lemonsqueezy/handlers');
      
      const result = await processSubscriptionCreated(mockSubscriptionCreatedPayload);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
      expect(mockLogBillingEvent).toHaveBeenCalledWith(
        'subscription_created',
        'evt_123',
        mockSubscriptionCreatedPayload,
        'failed',
        expect.any(String)
      );
    });

    it('should validate required payload fields', async () => {
      const invalidPayload = {
        meta: { event_name: 'subscription_created' },
        data: { id: '123' } // Missing required fields
      };

      const { processSubscriptionCreated } = await import('@/app/api/webhooks/lemonsqueezy/handlers');
      
      const result = await processSubscriptionCreated(invalidPayload);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid payload structure');
    });
  });

  describe('subscription.updated event', () => {
    it('should update existing subscription', async () => {
      const organizationId = 'test-org-id';
      // Mock existing subscription found
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'existing-subscription-id',
          organization_id: organizationId,
          quantity: 5
        },
        error: null
      });

      // Mock successful update
      mockSupabaseSelect.mockResolvedValueOnce({
        data: [{
          id: 'existing-subscription-id',
          quantity: 8,
          status: 'active'
        }],
        error: null
      });

      const { processSubscriptionUpdated } = await import('@/app/api/webhooks/lemonsqueezy/handlers');
      
      const result = await processSubscriptionUpdated(mockSubscriptionUpdatedPayload);

      expect(result.success).toBe(true);
      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        status: 'active',
        quantity: 8,
        current_seats: 8,  // Should sync current_seats with quantity
        lemonsqueezy_variant_id: 11111,
        renews_at: '2025-01-01T00:00:00Z',
        ends_at: null,
        trial_ends_at: null,
        updated_at: expect.any(String)
      });
    });

    it('should update organization paid_seats when quantity changes', async () => {
      const organizationId = 'test-org-id';
      // Mock existing subscription
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'subscription-id',
          organization_id: organizationId,
          quantity: 5 // Old quantity
        },
        error: null
      });

      // Mock successful subscription update
      mockSupabaseSelect.mockResolvedValueOnce({
        data: [{ id: 'subscription-id', quantity: 8 }],
        error: null
      });

      const { processSubscriptionUpdated } = await import('@/app/api/webhooks/lemonsqueezy/handlers');
      
      await processSubscriptionUpdated(mockSubscriptionUpdatedPayload);
      
      // Should update organization with new quantity
      expect(mockSupabaseFrom).toHaveBeenCalledWith('organizations');
      expect(mockSupabaseUpdate).toHaveBeenCalledWith({ paid_seats: 8 });
    });

    it('should handle subscription not found', async () => {
      // Mock subscription not found
      mockSupabaseSingle.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const { processSubscriptionUpdated } = await import('@/app/api/webhooks/lemonsqueezy/handlers');
      
      const result = await processSubscriptionUpdated(mockSubscriptionUpdatedPayload);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Subscription not found');
    });

    it('should handle status changes correctly', async () => {
      const organizationId = 'test-org-id';
      const pausedPayload = {
        ...mockSubscriptionUpdatedPayload,
        data: {
          ...mockSubscriptionUpdatedPayload.data,
          attributes: {
            ...mockSubscriptionUpdatedPayload.data.attributes,
            status: 'paused'
          }
        }
      };

      mockSupabaseSingle.mockResolvedValueOnce({
        data: { id: 'subscription-id', organization_id: organizationId },
        error: null
      });

      mockSupabaseSelect.mockResolvedValueOnce({
        data: [{ id: 'subscription-id', status: 'paused' }],
        error: null
      });

      const { processSubscriptionUpdated } = await import('@/app/api/webhooks/lemonsqueezy/handlers');

      const result = await processSubscriptionUpdated(pausedPayload);

      expect(result.success).toBe(true);
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'paused' })
      );
    });

    it('should always sync current_seats with quantity on manual LemonSqueezy updates', async () => {
      // Scenario: Admin manually changes quantity from 9 to 7 in LemonSqueezy dashboard
      // This update should immediately sync to the app
      const organizationId = 'test-org-id';

      const manualUpdatePayload = {
        meta: {
          event_name: 'subscription_updated',
          event_id: 'evt_manual_update_001'
        },
        data: {
          id: '12345',
          type: 'subscriptions',
          attributes: {
            status: 'active',
            quantity: 7,  // Manually changed in dashboard
            renews_at: '2025-01-01T00:00:00Z',
            ends_at: null,
            trial_ends_at: null,
            customer_id: 67890,
            variant_id: 11111
          }
        }
      };

      // Mock existing subscription with different quantity
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'subscription-id',
          organization_id: organizationId,
          lemonsqueezy_subscription_id: '12345',
          quantity: 9,  // Old quantity
          current_seats: 9,  // Old current_seats
          lemonsqueezy_variant_id: 11111
        },
        error: null
      });

      // Mock successful update
      mockSupabaseSelect.mockResolvedValueOnce({
        data: [{
          id: 'subscription-id',
          quantity: 7,
          current_seats: 7
        }],
        error: null
      });

      const { processSubscriptionUpdated } = await import('@/app/api/webhooks/lemonsqueezy/handlers');

      const result = await processSubscriptionUpdated(manualUpdatePayload);

      expect(result.success).toBe(true);

      // Verify subscription was updated with synced current_seats
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 7,
          current_seats: 7,  // Should ALWAYS sync with quantity
          status: 'active'
        })
      );

      // Verify organization paid_seats was updated
      expect(mockSupabaseFrom).toHaveBeenCalledWith('organizations');
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ paid_seats: 7 })
      );
    });

    it('should update organization even when only variant changes (not quantity)', async () => {
      // Scenario: Admin changes from monthly to yearly plan with same seat count
      // This should still update organization to recalculate paid_seats
      const organizationId = 'test-org-id';

      const variantChangePayload = {
        meta: {
          event_name: 'subscription_updated',
          event_id: 'evt_variant_change_001'
        },
        data: {
          id: '12345',
          type: 'subscriptions',
          attributes: {
            status: 'active',
            quantity: 5,  // Same quantity
            renews_at: '2026-01-01T00:00:00Z',  // New renewal date (yearly)
            ends_at: null,
            trial_ends_at: null,
            customer_id: 67890,
            variant_id: 22222  // Changed variant
          }
        }
      };

      // Mock existing subscription with different variant
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'subscription-id',
          organization_id: organizationId,
          lemonsqueezy_subscription_id: '12345',
          quantity: 5,  // Same quantity
          current_seats: 5,
          lemonsqueezy_variant_id: 11111  // Old variant
        },
        error: null
      });

      // Mock successful update
      mockSupabaseSelect.mockResolvedValueOnce({
        data: [{
          id: 'subscription-id',
          lemonsqueezy_variant_id: 22222
        }],
        error: null
      });

      const { processSubscriptionUpdated } = await import('@/app/api/webhooks/lemonsqueezy/handlers');

      const result = await processSubscriptionUpdated(variantChangePayload);

      expect(result.success).toBe(true);

      // Verify organization paid_seats was updated even though quantity didn't change
      expect(mockSupabaseFrom).toHaveBeenCalledWith('organizations');
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ paid_seats: 5 })
      );
    });

    it('should update organization even when only dates change (not quantity or variant)', async () => {
      // Scenario: Subscription renews with no changes - only renews_at date updates
      // This should STILL update organization to ensure sync
      const organizationId = 'test-org-id';

      const dateOnlyChangePayload = {
        meta: {
          event_name: 'subscription_updated',
          event_id: 'evt_date_change_001'
        },
        data: {
          id: '12345',
          type: 'subscriptions',
          attributes: {
            status: 'active',
            quantity: 5,  // Same
            renews_at: '2025-02-01T00:00:00Z',  // Only this changed
            ends_at: null,
            trial_ends_at: null,
            customer_id: 67890,
            variant_id: 11111  // Same
          }
        }
      };

      // Mock existing subscription - only date different
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'subscription-id',
          organization_id: organizationId,
          lemonsqueezy_subscription_id: '12345',
          quantity: 5,
          current_seats: 5,
          lemonsqueezy_variant_id: 11111,
          renews_at: '2025-01-01T00:00:00Z'  // Old date
        },
        error: null
      });

      // Mock successful update
      mockSupabaseSelect.mockResolvedValueOnce({
        data: [{
          id: 'subscription-id',
          renews_at: '2025-02-01T00:00:00Z'
        }],
        error: null
      });

      const { processSubscriptionUpdated } = await import('@/app/api/webhooks/lemonsqueezy/handlers');

      const result = await processSubscriptionUpdated(dateOnlyChangePayload);

      expect(result.success).toBe(true);

      // Verify organization was STILL updated (no conditional logic)
      expect(mockSupabaseFrom).toHaveBeenCalledWith('organizations');
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          paid_seats: 5,
          subscription_tier: 'active'
        })
      );
    });

    it('should always sync current_seats even for zero quantity subscriptions', async () => {
      // Edge case: Subscription exists but quantity is 0 (cancelled but not deleted)
      const organizationId = 'test-org-id';
      const zeroQuantityPayload = {
        meta: {
          event_name: 'subscription_updated',
          event_id: 'evt_zero_qty_001'
        },
        data: {
          id: '12345',
          type: 'subscriptions',
          attributes: {
            status: 'active',
            quantity: 0,
            renews_at: null,
            ends_at: null,
            trial_ends_at: null,
            customer_id: 67890,
            variant_id: 11111
          }
        }
      };

      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'subscription-id',
          organization_id: organizationId,
          lemonsqueezy_subscription_id: '12345',
          quantity: 5,
          current_seats: 5,
          lemonsqueezy_variant_id: 11111
        },
        error: null
      });

      mockSupabaseSelect.mockResolvedValueOnce({
        data: [{
          id: 'subscription-id',
          quantity: 0,
          current_seats: 0
        }],
        error: null
      });

      const { processSubscriptionUpdated } = await import('@/app/api/webhooks/lemonsqueezy/handlers');

      const result = await processSubscriptionUpdated(zeroQuantityPayload);

      expect(result.success).toBe(true);

      // Verify current_seats synced to 0
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 0,
          current_seats: 0,
          status: 'active'
        })
      );

      // Verify organization set to free tier
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          paid_seats: 0,
          subscription_tier: 'free'
        })
      );
    });
  });

  describe('subscription_created with usage-based billing', () => {
    it('should extract quantity from first_subscription_item.quantity', async () => {
      const usageBasedPayload = {
        meta: {
          event_name: 'subscription_created',
          event_id: 'evt_usage_001'
        },
        data: {
          id: '12345',
          type: 'subscriptions',
          attributes: {
            status: 'active',
            customer_id: 67890,
            variant_id: 972634, // Monthly variant with usage-based billing
            renews_at: '2025-02-01T00:00:00Z',
            ends_at: null,
            trial_ends_at: null,
            first_subscription_item: {
              id: 'sub-item-456',
              subscription_id: 12345,
              price_id: 12345,
              quantity: 10 // Usage-based quantity
            }
          }
        }
      };

      // Mock customer found
      mockSupabaseSingle
        .mockResolvedValueOnce({ data: testCustomerData, error: null })
        .mockResolvedValueOnce({
          data: {
            id: 'new-subscription-id',
            organization_id: testCustomerData.organization_id,
            quantity: 10,
            current_seats: 10
          },
          error: null
        });

      const { processSubscriptionCreated } = await import('@/app/api/webhooks/lemonsqueezy/handlers');

      const result = await processSubscriptionCreated(usageBasedPayload);

      expect(result.success).toBe(true);

      // Verify subscription was created with usage-based quantity
      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 10,
          current_seats: 10,
          lemonsqueezy_subscription_item_id: 'sub-item-456'
        })
      );
    });
  });

  describe('subscription_updated with usage-based billing', () => {
    it('should sync quantity from first_subscription_item after usage record update', async () => {
      const usageUpdatePayload = {
        meta: {
          event_name: 'subscription_updated',
          event_id: 'evt_usage_update_001'
        },
        data: {
          id: '12345',
          type: 'subscriptions',
          attributes: {
            status: 'active',
            customer_id: 67890,
            variant_id: 972634,
            renews_at: '2025-02-01T00:00:00Z',
            ends_at: null,
            trial_ends_at: null,
            first_subscription_item: {
              id: 'sub-item-456',
              subscription_id: 12345,
              price_id: 12345,
              quantity: 15 // Updated from 8 to 15 via usage records
            }
          }
        }
      };

      // Mock existing subscription
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'subscription-id',
          organization_id: testCustomerData.organization_id,
          lemonsqueezy_subscription_id: '12345',
          quantity: 8,
          current_seats: 8
        },
        error: null
      });

      // Mock successful update
      mockSupabaseSelect.mockResolvedValueOnce({
        data: [{
          id: 'subscription-id',
          quantity: 15,
          current_seats: 15
        }],
        error: null
      });

      const { processSubscriptionUpdated } = await import('@/app/api/webhooks/lemonsqueezy/handlers');

      const result = await processSubscriptionUpdated(usageUpdatePayload);

      expect(result.success).toBe(true);

      // Verify quantity was synced from usage records
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 15,
          current_seats: 15
        })
      );
    });

    it('should handle variant change with usage-based billing preserving quantity', async () => {
      const variantChangePayload = {
        meta: {
          event_name: 'subscription_updated',
          event_id: 'evt_variant_usage_001'
        },
        data: {
          id: '12345',
          type: 'subscriptions',
          attributes: {
            status: 'active',
            customer_id: 67890,
            variant_id: 972635, // Changed from monthly (972634) to annual (972635)
            renews_at: '2026-02-01T00:00:00Z',
            ends_at: null,
            trial_ends_at: null,
            first_subscription_item: {
              id: 'sub-item-456',
              subscription_id: 12345,
              price_id: 12345,
              quantity: 10 // Preserved during variant change
            }
          }
        }
      };

      // Mock existing subscription with monthly variant
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'subscription-id',
          organization_id: testCustomerData.organization_id,
          lemonsqueezy_subscription_id: '12345',
          lemonsqueezy_variant_id: '972634',
          quantity: 10,
          current_seats: 10
        },
        error: null
      });

      // Mock successful update
      mockSupabaseSelect.mockResolvedValueOnce({
        data: [{
          id: 'subscription-id',
          lemonsqueezy_variant_id: '972635',
          quantity: 10
        }],
        error: null
      });

      const { processSubscriptionUpdated } = await import('@/app/api/webhooks/lemonsqueezy/handlers');

      const result = await processSubscriptionUpdated(variantChangePayload);

      expect(result.success).toBe(true);

      // Verify variant changed but quantity preserved
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          lemonsqueezy_variant_id: 972635,
          quantity: 10,
          current_seats: 10
        })
      );
    });
  });

  describe('subscription.cancelled event', () => {
    it('should cancel subscription and reset paid_seats to 0', async () => {
      const organizationId = 'test-org-id';
      // Mock existing subscription
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'subscription-id',
          organization_id: organizationId,
          status: 'active'
        },
        error: null
      });

      // Mock successful cancellation update
      mockSupabaseSelect.mockResolvedValueOnce({
        data: [{ 
          id: 'subscription-id', 
          status: 'cancelled',
          ends_at: '2024-12-31T23:59:59Z'
        }],
        error: null
      });

      const { processSubscriptionCancelled } = await import('@/app/api/webhooks/lemonsqueezy/handlers');
      
      const result = await processSubscriptionCancelled(mockSubscriptionCancelledPayload);
      
      expect(result.success).toBe(true);
      
      // Should update subscription status and reset seats to 0
      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        status: 'cancelled',
        quantity: 0,              // Reset to 0
        current_seats: 0,         // Reset to 0
        ends_at: '2024-12-31T23:59:59Z',
        renews_at: null,
        updated_at: expect.any(String)
      });

      // Should reset organization paid_seats to 0
      expect(mockSupabaseFrom).toHaveBeenCalledWith('organizations');
      expect(mockSupabaseUpdate).toHaveBeenCalledWith({ paid_seats: 0 });
    });

    it('should handle subscription at end of billing period', async () => {
      const organizationId = 'test-org-id';
      const endedPayload = {
        ...mockSubscriptionCancelledPayload,
        data: {
          ...mockSubscriptionCancelledPayload.data,
          attributes: {
            ...mockSubscriptionCancelledPayload.data.attributes,
            status: 'expired'
          }
        }
      };

      mockSupabaseSingle.mockResolvedValueOnce({
        data: { id: 'subscription-id', organization_id: organizationId },
        error: null
      });

      mockSupabaseSelect.mockResolvedValueOnce({
        data: [{ id: 'subscription-id', status: 'expired' }],
        error: null
      });

      const { processSubscriptionCancelled } = await import('@/app/api/webhooks/lemonsqueezy/handlers');
      
      const result = await processSubscriptionCancelled(endedPayload);
      
      expect(result.success).toBe(true);
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'expired' })
      );
    });

    it('should handle already cancelled subscription', async () => {
      const organizationId = 'test-org-id';
      // Mock subscription already cancelled
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'subscription-id',
          organization_id: organizationId,
          status: 'cancelled'
        },
        error: null
      });

      const { processSubscriptionCancelled } = await import('@/app/api/webhooks/lemonsqueezy/handlers');
      
      const result = await processSubscriptionCancelled(mockSubscriptionCancelledPayload);
      
      // Should still succeed (idempotent)
      expect(result.success).toBe(true);
    });
  });

  describe('Event Logging', () => {
    it('should log successful events', async () => {
      mockSupabaseSingle
        .mockResolvedValueOnce({ data: testCustomerData, error: null })
        .mockResolvedValueOnce({
          data: { id: 'subscription-id' },
          error: null
        });

      const { processSubscriptionCreated } = await import('@/app/api/webhooks/lemonsqueezy/handlers');
      
      await processSubscriptionCreated(mockSubscriptionCreatedPayload);
      
      expect(mockLogBillingEvent).toHaveBeenCalledWith(
        'subscription_created',
        'evt_123',
        mockSubscriptionCreatedPayload,
        'processed'
      );
    });

    it('should log failed events with error details', async () => {
      const errorMessage = 'Database connection failed';
      mockSupabaseSingle.mockResolvedValueOnce({
        data: null,
        error: { message: errorMessage }
      });

      const { processSubscriptionCreated } = await import('@/app/api/webhooks/lemonsqueezy/handlers');
      
      await processSubscriptionCreated(mockSubscriptionCreatedPayload);
      
      expect(mockLogBillingEvent).toHaveBeenCalledWith(
        'subscription_created',
        'evt_123',
        mockSubscriptionCreatedPayload,
        'failed',
        expect.stringContaining(errorMessage)
      );
    });

    it('should handle duplicate event IDs gracefully', async () => {
      // Mock duplicate event
      const duplicatePayload = {
        ...mockSubscriptionCreatedPayload,
        meta: {
          ...mockSubscriptionCreatedPayload.meta,
          event_id: 'duplicate-event-123'
        }
      };

      const { isEventAlreadyProcessed } = await import('@/app/api/webhooks/lemonsqueezy/handlers');
      
      // Mock event already exists in billing_events table
      mockSupabaseSingle.mockResolvedValueOnce({
        data: { id: 'existing-event-id' },
        error: null
      });

      const result = await isEventAlreadyProcessed('duplicate-event-123');
      
      expect(result).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed webhook payloads', async () => {
      const malformedPayload = {
        meta: {},
        data: null
      };

      const { processSubscriptionCreated } = await import('@/app/api/webhooks/lemonsqueezy/handlers');
      
      const result = await processSubscriptionCreated(malformedPayload);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid payload structure');
    });

    it('should handle network timeouts gracefully', async () => {
      // Mock timeout error
      mockSupabaseSingle.mockRejectedValueOnce(new Error('Request timeout'));

      const { processSubscriptionCreated } = await import('@/app/api/webhooks/lemonsqueezy/handlers');
      
      const result = await processSubscriptionCreated(mockSubscriptionCreatedPayload);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Request timeout');
    });

    it('should validate subscription status values', async () => {
      const invalidStatusPayload = {
        ...mockSubscriptionCreatedPayload,
        data: {
          ...mockSubscriptionCreatedPayload.data,
          attributes: {
            ...mockSubscriptionCreatedPayload.data.attributes,
            status: 'invalid_status'
          }
        }
      };

      const { processSubscriptionCreated } = await import('@/app/api/webhooks/lemonsqueezy/handlers');
      
      const result = await processSubscriptionCreated(invalidStatusPayload);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid subscription status');
    });
  });

  describe('subscription_payment_failed event', () => {
    const mockPaymentFailedPayload = {
      meta: {
        event_name: 'subscription_payment_failed',
        event_id: 'evt_payment_failed_001'
      },
      data: {
        id: '12345',
        type: 'subscriptions',
        attributes: {
          status: 'past_due',
          quantity: 5,
          renews_at: '2024-12-01T00:00:00Z',
          ends_at: null,
          trial_ends_at: null,
          customer_id: 67890,
          variant_id: 11111
        }
      }
    };

    it('should process payment_failed event and update subscription status', async () => {
      const organizationId = 'test-org-id';
      // Mock existing subscription found
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'existing-subscription-id',
          organization_id: organizationId,
          lemonsqueezy_subscription_id: '12345'
        },
        error: null
      });

      // Mock successful update
      mockSupabaseSelect.mockResolvedValueOnce({
        data: [{
          id: 'existing-subscription-id',
          status: 'past_due'
        }],
        error: null
      });

      const { processSubscriptionPaymentFailed } = await import('@/app/api/webhooks/lemonsqueezy/handlers');

      const result = await processSubscriptionPaymentFailed(mockPaymentFailedPayload);

      expect(result.success).toBe(true);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('subscriptions');
      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        status: 'past_due',
        updated_at: expect.any(String)
      });
    });

    it('should handle subscription not found for payment_failed', async () => {
      // Mock subscription not found
      mockSupabaseSingle.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const { processSubscriptionPaymentFailed } = await import('@/app/api/webhooks/lemonsqueezy/handlers');

      const result = await processSubscriptionPaymentFailed(mockPaymentFailedPayload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Subscription not found');
    });

    it('should skip if event already processed', async () => {
      // Mock event already processed
      const { isEventAlreadyProcessed } = await import('@/app/api/webhooks/lemonsqueezy/handlers');
      jest.spyOn({ isEventAlreadyProcessed }, 'isEventAlreadyProcessed').mockResolvedValueOnce(true);

      const { processSubscriptionPaymentFailed } = await import('@/app/api/webhooks/lemonsqueezy/handlers');

      const result = await processSubscriptionPaymentFailed(mockPaymentFailedPayload);

      expect(result.success).toBe(true);
      expect(result.data?.message).toContain('already processed');
    });
  });

  describe('subscription_paused event', () => {
    const mockPausedPayload = {
      meta: {
        event_name: 'subscription_paused',
        event_id: 'evt_paused_001'
      },
      data: {
        id: '12345',
        type: 'subscriptions',
        attributes: {
          status: 'paused',
          quantity: 5,
          renews_at: null,
          ends_at: null,
          trial_ends_at: null,
          customer_id: 67890,
          variant_id: 11111
        }
      }
    };

    it('should process paused event and update subscription status', async () => {
      const organizationId = 'test-org-id';
      // Mock existing subscription found
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'existing-subscription-id',
          organization_id: organizationId,
          lemonsqueezy_subscription_id: '12345'
        },
        error: null
      });

      // Mock successful update
      mockSupabaseSelect.mockResolvedValueOnce({
        data: [{
          id: 'existing-subscription-id',
          status: 'paused'
        }],
        error: null
      });

      const { processSubscriptionPaused } = await import('@/app/api/webhooks/lemonsqueezy/handlers');

      const result = await processSubscriptionPaused(mockPausedPayload);

      expect(result.success).toBe(true);
      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        status: 'paused',
        renews_at: null,
        updated_at: expect.any(String)
      });
    });

    it('should handle subscription not found for paused', async () => {
      mockSupabaseSingle.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const { processSubscriptionPaused } = await import('@/app/api/webhooks/lemonsqueezy/handlers');

      const result = await processSubscriptionPaused(mockPausedPayload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Subscription not found');
    });
  });

  describe('subscription_resumed event', () => {
    const mockResumedPayload = {
      meta: {
        event_name: 'subscription_resumed',
        event_id: 'evt_resumed_001'
      },
      data: {
        id: '12345',
        type: 'subscriptions',
        attributes: {
          status: 'active',
          quantity: 5,
          renews_at: '2025-01-01T00:00:00Z',
          ends_at: null,
          trial_ends_at: null,
          customer_id: 67890,
          variant_id: 11111
        }
      }
    };

    it('should process resumed event and reactivate subscription', async () => {
      const organizationId = 'test-org-id';
      // Mock existing subscription found
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'existing-subscription-id',
          organization_id: organizationId,
          lemonsqueezy_subscription_id: '12345',
          quantity: 5
        },
        error: null
      });

      // Mock successful update
      mockSupabaseSelect.mockResolvedValueOnce({
        data: [{
          id: 'existing-subscription-id',
          status: 'active'
        }],
        error: null
      });

      const { processSubscriptionResumed } = await import('@/app/api/webhooks/lemonsqueezy/handlers');

      const result = await processSubscriptionResumed(mockResumedPayload);

      expect(result.success).toBe(true);
      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        status: 'active',
        renews_at: '2025-01-01T00:00:00Z',
        updated_at: expect.any(String)
      });
    });

    it('should handle subscription not found for resumed', async () => {
      mockSupabaseSingle.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const { processSubscriptionResumed } = await import('@/app/api/webhooks/lemonsqueezy/handlers');

      const result = await processSubscriptionResumed(mockResumedPayload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Subscription not found');
    });

    it('should update organization paid_seats when subscription resumed', async () => {
      const organizationId = 'test-org-id';
      // Mock existing subscription
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'subscription-id',
          organization_id: organizationId,
          quantity: 5
        },
        error: null
      });

      // Mock successful subscription update
      mockSupabaseSelect.mockResolvedValueOnce({
        data: [{ id: 'subscription-id', quantity: 5 }],
        error: null
      });

      const { processSubscriptionResumed } = await import('@/app/api/webhooks/lemonsqueezy/handlers');

      await processSubscriptionResumed(mockResumedPayload);

      // Should update organization with seats when resumed
      expect(mockSupabaseFrom).toHaveBeenCalledWith('organizations');
      expect(mockSupabaseUpdate).toHaveBeenCalledWith({ paid_seats: 5 });
    });
  });

  describe('subscription_payment_success event - immediate upgrades', () => {
    const mockPaymentSuccessPayload = {
      meta: {
        event_name: 'subscription_payment_success',
        event_id: 'evt_payment_success_001'
      },
      data: {
        id: '12345',
        type: 'subscriptions',
        attributes: {
          status: 'active',
          quantity: 10,
          renews_at: '2025-01-01T00:00:00Z',
          ends_at: null,
          trial_ends_at: null,
          customer_id: 67890,
          variant_id: 11111
        }
      }
    };

    it('should grant current_seats after immediate upgrade payment confirmation', async () => {
      const organizationId = 'test-org-id';
      // Scenario: User upgraded from 9 to 10 seats, quantity already updated, current_seats still at 9
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'subscription-id',
          organization_id: organizationId,
          lemonsqueezy_subscription_id: '12345',
          quantity: 10,  // Already updated by API call
          current_seats: 9,  // Still at old value, waiting for payment confirmation
          pending_seats: null,  // No pending changes (immediate upgrade)
          lemonsqueezy_quantity_synced: null
        },
        error: null
      });

      // Mock successful update
      mockSupabaseSelect.mockResolvedValueOnce({
        data: [{
          id: 'subscription-id',
          current_seats: 10,
          quantity: 10
        }],
        error: null
      });

      const { processSubscriptionPaymentSuccess } = await import('@/app/api/webhooks/lemonsqueezy/handlers');

      const result = await processSubscriptionPaymentSuccess(mockPaymentSuccessPayload);

      expect(result.success).toBe(true);

      // Should update current_seats to match quantity (grant access after payment)
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          current_seats: 10,
          quantity: 10,
          status: 'active'
        })
      );

      // Should update organization paid_seats
      expect(mockSupabaseFrom).toHaveBeenCalledWith('organizations');
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ paid_seats: 10 })
      );
    });

    it('should handle deferred downgrade at renewal (existing behavior)', async () => {
      const organizationId = 'test-org-id';
      // Scenario: User scheduled downgrade from 10 to 7 seats, applying at renewal
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'subscription-id',
          organization_id: organizationId,
          lemonsqueezy_subscription_id: '12345',
          quantity: 10,
          current_seats: 10,
          pending_seats: 7,  // Scheduled downgrade
          lemonsqueezy_quantity_synced: true
        },
        error: null
      });

      // Mock successful update
      mockSupabaseSelect
        .mockResolvedValueOnce({
          data: [],  // No users to archive
          error: null
        })
        .mockResolvedValueOnce({
          data: [{
            id: 'subscription-id',
            current_seats: 7,
            quantity: 7
          }],
          error: null
        });

      const { processSubscriptionPaymentSuccess } = await import('@/app/api/webhooks/lemonsqueezy/handlers');

      const result = await processSubscriptionPaymentSuccess(mockPaymentSuccessPayload);

      expect(result.success).toBe(true);

      // Should apply pending_seats change
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          current_seats: 7,
          quantity: 7,
          pending_seats: null
        })
      );
    });

    it('should do nothing if no pending changes and seats already match', async () => {
      const organizationId = 'test-org-id';
      // Scenario: Renewal payment success but no changes needed
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'subscription-id',
          organization_id: organizationId,
          lemonsqueezy_subscription_id: '12345',
          quantity: 10,
          current_seats: 10,  // Already matches
          pending_seats: null,
          lemonsqueezy_quantity_synced: null
        },
        error: null
      });

      const { processSubscriptionPaymentSuccess } = await import('@/app/api/webhooks/lemonsqueezy/handlers');

      const result = await processSubscriptionPaymentSuccess(mockPaymentSuccessPayload);

      expect(result.success).toBe(true);
      expect(result.data?.message).toContain('No pending changes to apply');
    });

    it('should handle payment failure scenario gracefully', async () => {
      // Scenario: Subscription not found (edge case)
      mockSupabaseSingle.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const { processSubscriptionPaymentSuccess } = await import('@/app/api/webhooks/lemonsqueezy/handlers');

      const result = await processSubscriptionPaymentSuccess(mockPaymentSuccessPayload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Subscription not found');
    });

    it('should prevent double-processing via idempotency', async () => {
      const { isEventAlreadyProcessed } = await import('@/app/api/webhooks/lemonsqueezy/handlers');

      // Mock event already processed
      mockSupabaseSingle.mockResolvedValueOnce({
        data: { id: 'existing-event-id' },
        error: null
      });

      const alreadyProcessed = await isEventAlreadyProcessed('evt_payment_success_001');

      expect(alreadyProcessed).toBe(true);
    });
  });
});