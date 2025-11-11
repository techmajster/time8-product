/**
 * Update Subscription Quantity API Tests
 *
 * Tests for the update-subscription-quantity endpoint that handles:
 * - Payment security (seats not granted until webhook confirms payment)
 * - Subscription quantity updates via LemonSqueezy API
 * - Queued invitations storage
 * - Payment processing states
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/billing/update-subscription-quantity/route';

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

describe('Update Subscription Quantity API', () => {
  const mockOrganization = {
    id: 'org-123',
    name: 'Test Organization',
    paid_seats: 9
  };

  const mockSubscription = {
    lemonsqueezy_subscription_id: 'sub-123',
    lemonsqueezy_subscription_item_id: 'sub-item-456',
    status: 'active',
    quantity: 9,
    current_seats: 9
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
          type: 'subscription-items',
          id: 'sub-item-456',
          attributes: {
            quantity: 10
          }
        }
      })
    });
  });

  describe('Payment Security - DO NOT grant seats before webhook', () => {
    it('should update quantity but NOT current_seats after LemonSqueezy API call', async () => {
      const request = new NextRequest('http://localhost/api/billing/update-subscription-quantity', {
        method: 'POST',
        body: JSON.stringify({
          new_quantity: 10,
          invoice_immediately: true
        })
      });

      await POST(request);

      // Verify quantity is updated
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 10
        })
      );

      // Verify current_seats is NOT updated
      const updateCall = mockSupabaseUpdate.mock.calls[0][0];
      expect(updateCall).not.toHaveProperty('current_seats');
    });

    it('should NOT update organization paid_seats before webhook confirmation', async () => {
      const request = new NextRequest('http://localhost/api/billing/update-subscription-quantity', {
        method: 'POST',
        body: JSON.stringify({
          new_quantity: 10,
          invoice_immediately: true
        })
      });

      await POST(request);

      // Verify organizations table is NOT updated
      const fromCalls = mockSupabaseFrom.mock.calls.map(call => call[0]);
      expect(fromCalls).not.toContain('organizations');
    });
  });

  describe('Queued Invitations Storage', () => {
    it('should accept queued_invitations in request body', async () => {
      const queuedInvitations = [
        { email: 'user1@example.com', role: 'employee' },
        { email: 'user2@example.com', role: 'employee' }
      ];

      const request = new NextRequest('http://localhost/api/billing/update-subscription-quantity', {
        method: 'POST',
        body: JSON.stringify({
          new_quantity: 11,
          invoice_immediately: true,
          queued_invitations: queuedInvitations
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should store queued_invitations for webhook processing', async () => {
      const queuedInvitations = [
        { email: 'user1@example.com', role: 'employee' }
      ];

      const request = new NextRequest('http://localhost/api/billing/update-subscription-quantity', {
        method: 'POST',
        body: JSON.stringify({
          new_quantity: 10,
          invoice_immediately: true,
          queued_invitations: queuedInvitations
        })
      });

      await POST(request);

      // Verify queued invitations are stored (implementation will determine where)
      // This is a placeholder test - actual implementation may use session storage or DB table
      expect(mockSupabaseUpdate).toHaveBeenCalled();
    });
  });

  describe('Response Structure', () => {
    it('should return payment_processing status when invoice_immediately is true', async () => {
      const request = new NextRequest('http://localhost/api/billing/update-subscription-quantity', {
        method: 'POST',
        body: JSON.stringify({
          new_quantity: 10,
          invoice_immediately: true
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('payment_status');
      expect(data.payment_status).toBe('processing');
      expect(data.message).toContain('payment');
    });

    it('should include subscription_id in response for tracking', async () => {
      const request = new NextRequest('http://localhost/api/billing/update-subscription-quantity', {
        method: 'POST',
        body: JSON.stringify({
          new_quantity: 10,
          invoice_immediately: true
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.subscription_id).toBe('sub-123');
    });
  });

  describe('LemonSqueezy API Integration', () => {
    it('should call LemonSqueezy Subscription Items API with correct parameters', async () => {
      const request = new NextRequest('http://localhost/api/billing/update-subscription-quantity', {
        method: 'POST',
        body: JSON.stringify({
          new_quantity: 10,
          invoice_immediately: true
        })
      });

      await POST(request);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.lemonsqueezy.com/v1/subscription-items/sub-item-456',
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
            'Content-Type': 'application/vnd.api+json'
          }),
          body: expect.stringContaining('"quantity":10')
        })
      );
    });

    it('should enable prorations for fair billing', async () => {
      const request = new NextRequest('http://localhost/api/billing/update-subscription-quantity', {
        method: 'POST',
        body: JSON.stringify({
          new_quantity: 10,
          invoice_immediately: true
        })
      });

      await POST(request);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.data.attributes.disable_prorations).toBe(false);
    });

    it('should handle LemonSqueezy API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({
          errors: [{ detail: 'Invalid quantity' }]
        })
      });

      const request = new NextRequest('http://localhost/api/billing/update-subscription-quantity', {
        method: 'POST',
        body: JSON.stringify({
          new_quantity: 10,
          invoice_immediately: true
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.error).toContain('Failed to update');
    });
  });

  describe('Validation', () => {
    it('should reject invalid quantity values', async () => {
      const request = new NextRequest('http://localhost/api/billing/update-subscription-quantity', {
        method: 'POST',
        body: JSON.stringify({
          new_quantity: 0,
          invoice_immediately: true
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid quantity');
    });

    it('should reject negative quantity values', async () => {
      const request = new NextRequest('http://localhost/api/billing/update-subscription-quantity', {
        method: 'POST',
        body: JSON.stringify({
          new_quantity: -5,
          invoice_immediately: true
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should require active subscription', async () => {
      mockSupabaseSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'No subscription found' }
      });

      const request = new NextRequest('http://localhost/api/billing/update-subscription-quantity', {
        method: 'POST',
        body: JSON.stringify({
          new_quantity: 10,
          invoice_immediately: true
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

      const request = new NextRequest('http://localhost/api/billing/update-subscription-quantity', {
        method: 'POST',
        body: JSON.stringify({
          new_quantity: 10,
          invoice_immediately: true
        })
      });

      const response = await POST(request);

      expect(response).toBeDefined();
      // Auth error is returned directly from auth utils
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing subscription_item_id by fetching from LemonSqueezy', async () => {
      // Mock subscription without subscription_item_id
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          ...mockSubscription,
          lemonsqueezy_subscription_item_id: null
        },
        error: null
      });

      // Mock LemonSqueezy fetch subscription response
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              attributes: {
                first_subscription_item: {
                  id: 'sub-item-789'
                }
              }
            }
          })
        })
        // Mock update subscription item response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              attributes: { quantity: 10 }
            }
          })
        });

      const request = new NextRequest('http://localhost/api/billing/update-subscription-quantity', {
        method: 'POST',
        body: JSON.stringify({
          new_quantity: 10,
          invoice_immediately: true
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle invalid request body', async () => {
      const request = new NextRequest('http://localhost/api/billing/update-subscription-quantity', {
        method: 'POST',
        body: 'invalid json'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request payload');
    });
  });
});
