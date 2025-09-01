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
    beforeEach(async () => {
      organizationId = await createTestOrganization('Test Billing Org Updated');
    });

    it('should update existing subscription', async () => {
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
        renews_at: '2025-01-01T00:00:00Z',
        ends_at: null,
        trial_ends_at: null,
        updated_at: expect.any(String)
      });
    });

    it('should update organization paid_seats when quantity changes', async () => {
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
  });

  describe('subscription.cancelled event', () => {
    beforeEach(async () => {
      organizationId = await createTestOrganization('Test Billing Org Cancelled');
    });

    it('should cancel subscription and reset paid_seats to 0', async () => {
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
      
      // Should update subscription status
      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        status: 'cancelled',
        ends_at: '2024-12-31T23:59:59Z',
        renews_at: null,
        updated_at: expect.any(String)
      });

      // Should reset organization paid_seats to 0
      expect(mockSupabaseFrom).toHaveBeenCalledWith('organizations');
      expect(mockSupabaseUpdate).toHaveBeenCalledWith({ paid_seats: 0 });
    });

    it('should handle subscription at end of billing period', async () => {
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
      organizationId = await createTestOrganization('Test Logging Org');
      
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
});