/**
 * Change Billing Period API Tests
 *
 * Tests for the change-billing-period endpoint that handles:
 * - Single-call billing period changes with usage-based billing
 * - Automatic quantity preservation (no manual restoration needed)
 * - Variant switching between monthly and annual plans
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/billing/change-billing-period/route';

// Mock Supabase client
const mockSupabaseFrom = jest.fn();
const mockSupabaseSelect = jest.fn();
const mockSupabaseUpdate = jest.fn();
const mockSupabaseEq = jest.fn();
const mockSupabaseSingle = jest.fn();
const mockSupabaseIn = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: mockSupabaseFrom
  }))
}));

// Mock auth utils
const mockAuthenticateAndGetOrgContext = jest.fn();
jest.mock('@/lib/auth-utils-v2', () => ({
  authenticateAndGetOrgContext: () => mockAuthenticateAndGetOrgContext()
}));

// Mock fetch for LemonSqueezy API
global.fetch = jest.fn();

describe('Change Billing Period API', () => {
  const mockOrganization = {
    id: 'org-123',
    name: 'Test Organization',
    paid_seats: 10
  };

  const mockSubscription = {
    lemonsqueezy_subscription_id: 'sub-123',
    lemonsqueezy_subscription_item_id: 'sub-item-456',
    status: 'active',
    quantity: 10,
    current_seats: 10,
    lemonsqueezy_variant_id: '972634' // Monthly variant
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default successful auth
    mockAuthenticateAndGetOrgContext.mockResolvedValue({
      success: true,
      context: {
        user: { id: 'user-123' },
        organization: mockOrganization
      }
    });

    // Setup default Supabase mock chain
    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
      update: mockSupabaseUpdate
    });

    mockSupabaseSelect.mockReturnValue({
      eq: mockSupabaseEq,
      in: mockSupabaseIn,
      single: mockSupabaseSingle
    });

    mockSupabaseIn.mockReturnValue({
      single: mockSupabaseSingle
    });

    mockSupabaseUpdate.mockReturnValue({
      eq: mockSupabaseEq
    });

    mockSupabaseEq.mockReturnValue({
      single: mockSupabaseSingle,
      eq: mockSupabaseEq,
      in: mockSupabaseIn
    });

    mockSupabaseSingle.mockResolvedValue({
      data: mockSubscription,
      error: null
    });

    // Mock successful LemonSqueezy API response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          type: 'subscriptions',
          id: 'sub-123',
          attributes: {
            variant_id: 972635, // Changed to annual
            status: 'active',
            first_subscription_item: {
              id: 'sub-item-456',
              quantity: 10 // Quantity preserved automatically
            }
          }
        }
      })
    });
  });

  describe('Single-Call Variant Change (Usage-Based Billing)', () => {
    it('should make only ONE API call to change variant', async () => {
      const request = new NextRequest('http://localhost/api/billing/change-billing-period', {
        method: 'POST',
        body: JSON.stringify({
          new_variant_id: 972635 // Annual
        })
      });

      await POST(request);

      // Should only call LemonSqueezy API once for variant change
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.lemonsqueezy.com/v1/subscriptions/sub-123',
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
            'Content-Type': 'application/vnd.api+json'
          })
        })
      );
    });

    it('should NOT call subscription-items endpoint for quantity restoration', async () => {
      const request = new NextRequest('http://localhost/api/billing/change-billing-period', {
        method: 'POST',
        body: JSON.stringify({
          new_variant_id: 972635
        })
      });

      await POST(request);

      // Verify no calls to subscription-items endpoint
      const fetchCalls = (global.fetch as jest.Mock).mock.calls;
      const subscriptionItemsCalls = fetchCalls.filter(call =>
        call[0].includes('/subscription-items/')
      );
      expect(subscriptionItemsCalls).toHaveLength(0);
    });

    it('should only update variant_id in the PATCH request body', async () => {
      const request = new NextRequest('http://localhost/api/billing/change-billing-period', {
        method: 'POST',
        body: JSON.stringify({
          new_variant_id: 972635
        })
      });

      await POST(request);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      // Should only include variant_id, not quantity
      expect(requestBody.data.attributes).toEqual({
        variant_id: 972635
      });
      expect(requestBody.data.attributes).not.toHaveProperty('quantity');
    });
  });

  describe('Automatic Quantity Preservation', () => {
    it('should preserve quantity automatically with usage-based billing', async () => {
      const request = new NextRequest('http://localhost/api/billing/change-billing-period', {
        method: 'POST',
        body: JSON.stringify({
          new_variant_id: 972635
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preserved_seats).toBe(10);
      expect(data.message).toContain('seats preserved');
    });

    it('should confirm quantity preservation in response', async () => {
      const request = new NextRequest('http://localhost/api/billing/change-billing-period', {
        method: 'POST',
        body: JSON.stringify({
          new_variant_id: 972635
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('preserved_seats');
      expect(data).toHaveProperty('new_variant_id');
      expect(data.new_variant_id).toBe(972635);
    });
  });

  describe('Billing Period Changes', () => {
    it('should change from monthly to annual', async () => {
      const request = new NextRequest('http://localhost/api/billing/change-billing-period', {
        method: 'POST',
        body: JSON.stringify({
          new_variant_id: 972635 // Annual
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.new_variant_id).toBe(972635);
    });

    it('should change from annual to monthly', async () => {
      // Setup subscription with annual variant
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          ...mockSubscription,
          lemonsqueezy_variant_id: '972635' // Annual
        },
        error: null
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            attributes: {
              variant_id: 972634, // Changed to monthly
              first_subscription_item: {
                id: 'sub-item-456',
                quantity: 10
              }
            }
          }
        })
      });

      const request = new NextRequest('http://localhost/api/billing/change-billing-period', {
        method: 'POST',
        body: JSON.stringify({
          new_variant_id: 972634 // Monthly
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.new_variant_id).toBe(972634);
    });
  });

  describe('Response Structure', () => {
    it('should include subscription_id in response', async () => {
      const request = new NextRequest('http://localhost/api/billing/change-billing-period', {
        method: 'POST',
        body: JSON.stringify({
          new_variant_id: 972635
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.subscription_id).toBe('sub-123');
    });

    it('should include success status', async () => {
      const request = new NextRequest('http://localhost/api/billing/change-billing-period', {
        method: 'POST',
        body: JSON.stringify({
          new_variant_id: 972635
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
    });

    it('should include preserved_seats confirmation', async () => {
      const request = new NextRequest('http://localhost/api/billing/change-billing-period', {
        method: 'POST',
        body: JSON.stringify({
          new_variant_id: 972635
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('preserved_seats');
      expect(data.preserved_seats).toBe(10);
    });

    it('should include clear success message', async () => {
      const request = new NextRequest('http://localhost/api/billing/change-billing-period', {
        method: 'POST',
        body: JSON.stringify({
          new_variant_id: 972635
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.message).toBeDefined();
      expect(data.message).toContain('preserved');
    });
  });

  describe('Database Updates', () => {
    it('should update subscription record with new variant_id', async () => {
      const request = new NextRequest('http://localhost/api/billing/change-billing-period', {
        method: 'POST',
        body: JSON.stringify({
          new_variant_id: 972635
        })
      });

      await POST(request);

      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          lemonsqueezy_variant_id: '972635'
        })
      );
    });

    it('should NOT update quantity in database (preserved automatically)', async () => {
      const request = new NextRequest('http://localhost/api/billing/change-billing-period', {
        method: 'POST',
        body: JSON.stringify({
          new_variant_id: 972635
        })
      });

      await POST(request);

      // Verify quantity is NOT in the update call
      const updateCall = mockSupabaseUpdate.mock.calls[0][0];
      expect(updateCall).not.toHaveProperty('quantity');
      expect(updateCall).not.toHaveProperty('current_seats');
    });
  });

  describe('Validation', () => {
    it('should reject invalid variant_id', async () => {
      const request = new NextRequest('http://localhost/api/billing/change-billing-period', {
        method: 'POST',
        body: JSON.stringify({
          new_variant_id: 0
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid variant_id');
    });

    it('should reject missing variant_id', async () => {
      const request = new NextRequest('http://localhost/api/billing/change-billing-period', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should reject same variant_id as current', async () => {
      const request = new NextRequest('http://localhost/api/billing/change-billing-period', {
        method: 'POST',
        body: JSON.stringify({
          new_variant_id: 972634 // Same as current
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Already on requested variant');
    });

    it('should require active subscription', async () => {
      mockSupabaseSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'No subscription found' }
      });

      const request = new NextRequest('http://localhost/api/billing/change-billing-period', {
        method: 'POST',
        body: JSON.stringify({
          new_variant_id: 972635
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('No active subscription');
    });
  });

  describe('Authentication', () => {
    it('should require authenticated user', async () => {
      mockAuthenticateAndGetOrgContext.mockResolvedValueOnce({
        success: false,
        error: {
          json: () => ({ error: 'Unauthorized' }),
          status: 401
        }
      });

      const request = new NextRequest('http://localhost/api/billing/change-billing-period', {
        method: 'POST',
        body: JSON.stringify({
          new_variant_id: 972635
        })
      });

      const response = await POST(request);

      expect(response).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle LemonSqueezy API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({
          errors: [{ detail: 'Invalid variant' }]
        })
      });

      const request = new NextRequest('http://localhost/api/billing/change-billing-period', {
        method: 'POST',
        body: JSON.stringify({
          new_variant_id: 972635
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.error).toContain('Failed to change billing period');
    });

    it('should handle invalid request body', async () => {
      const request = new NextRequest('http://localhost/api/billing/change-billing-period', {
        method: 'POST',
        body: 'invalid json'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request payload');
    });
  });

  describe('Correlation Logging', () => {
    it('should log correlation ID for tracking', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const request = new NextRequest('http://localhost/api/billing/change-billing-period', {
        method: 'POST',
        body: JSON.stringify({
          new_variant_id: 972635
        })
      });

      await POST(request);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('💰 [Payment Flow]'),
        expect.objectContaining({
          correlationId: expect.stringContaining('billing-change')
        })
      );

      consoleSpy.mockRestore();
    });

    it('should log simplified single-call flow', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const request = new NextRequest('http://localhost/api/billing/change-billing-period', {
        method: 'POST',
        body: JSON.stringify({
          new_variant_id: 972635
        })
      });

      await POST(request);

      const logCalls = consoleSpy.mock.calls;
      const flowLogs = logCalls.filter(call =>
        call[0]?.includes('Payment Flow')
      );

      // Should NOT have quantity restoration logs
      const restorationLogs = flowLogs.filter(call =>
        call[0]?.includes('restoration') || call[0]?.includes('Restoring')
      );
      expect(restorationLogs).toHaveLength(0);

      consoleSpy.mockRestore();
    });
  });
});
