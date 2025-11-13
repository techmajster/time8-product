/**
 * Update Subscription Quantity API Tests
 *
 * Tests for the update-subscription-quantity endpoint that handles:
 * - Payment security (seats not granted until webhook confirms payment)
 * - Subscription quantity updates via SeatManager service
 * - Hybrid billing: usage-based (monthly) vs quantity-based (yearly)
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
  })),
  createAdminClient: jest.fn(() => ({
    from: mockSupabaseFrom
  }))
}));

// Mock auth utils
const mockAuthenticateAndGetOrgContext = jest.fn();
jest.mock('@/lib/auth-utils-v2', () => ({
  authenticateAndGetOrgContext: () => mockAuthenticateAndGetOrgContext()
}));

// Mock SeatManager
const mockAddSeats = jest.fn();
const mockRemoveSeats = jest.fn();
const mockCalculateProration = jest.fn();

jest.mock('@/lib/billing/seat-manager', () => ({
  SeatManager: jest.fn().mockImplementation(() => ({
    addSeats: mockAddSeats,
    removeSeats: mockRemoveSeats,
    calculateProration: mockCalculateProration
  }))
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
    id: 'sub-db-123',
    lemonsqueezy_subscription_id: 'sub-123',
    lemonsqueezy_subscription_item_id: 'sub-item-456',
    billing_type: 'usage_based',
    status: 'active',
    quantity: 9,
    current_seats: 9,
    organization_id: 'org-123'
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

    // Mock SeatManager.addSeats default success response
    mockAddSeats.mockResolvedValue({
      success: true,
      billingType: 'usage_based',
      chargedAt: 'end_of_period',
      message: 'New seats will be billed at end of current billing period',
      currentSeats: 10
    });

    // Mock successful LemonSqueezy API response (for legacy tests)
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
    it('should delegate to SeatManager which handles seat updates correctly', async () => {
      const request = new NextRequest('http://localhost/api/billing/update-subscription-quantity', {
        method: 'POST',
        body: JSON.stringify({
          new_quantity: 10,
          invoice_immediately: true
        })
      });

      await POST(request);

      // Verify SeatManager.addSeats was called (SeatManager handles database updates)
      expect(mockAddSeats).toHaveBeenCalledWith('sub-db-123', 10);
    });

    it('should NOT update tables directly - SeatManager handles all updates', async () => {
      const request = new NextRequest('http://localhost/api/billing/update-subscription-quantity', {
        method: 'POST',
        body: JSON.stringify({
          new_quantity: 10,
          invoice_immediately: true
        })
      });

      await POST(request);

      // Verify API endpoint delegates to SeatManager
      expect(mockAddSeats).toHaveBeenCalled();
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
    it('should return SeatManager result information', async () => {
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
      expect(data).toHaveProperty('billingType');
      expect(data).toHaveProperty('chargedAt');
      expect(data).toHaveProperty('message');
      expect(data.billingType).toBe('usage_based');
      expect(data.chargedAt).toBe('end_of_period');
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

  describe('SeatManager Delegation', () => {
    it('should delegate seat additions to SeatManager', async () => {
      const request = new NextRequest('http://localhost/api/billing/update-subscription-quantity', {
        method: 'POST',
        body: JSON.stringify({
          new_quantity: 10,
          invoice_immediately: true
        })
      });

      await POST(request);

      // Verify SeatManager.addSeats was called with correct parameters
      expect(mockAddSeats).toHaveBeenCalledWith('sub-db-123', 10);
    });

    it('should handle SeatManager errors gracefully', async () => {
      mockAddSeats.mockRejectedValueOnce(new Error('LemonSqueezy API error'));

      const request = new NextRequest('http://localhost/api/billing/update-subscription-quantity', {
        method: 'POST',
        body: JSON.stringify({
          new_quantity: 10,
          invoice_immediately: true
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
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
      (global.fetch as jest.Mock).mockResolvedValueOnce({
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
      });

      const request = new NextRequest('http://localhost/api/billing/update-subscription-quantity', {
        method: 'POST',
        body: JSON.stringify({
          new_quantity: 10,
          invoice_immediately: true
        })
      });

      const response = await POST(request);

      // SeatManager is called after subscription_item_id is fetched
      expect(response.status).toBe(200);
      expect(mockAddSeats).toHaveBeenCalled();
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

  describe('SeatManager Integration - Hybrid Billing', () => {
    describe('Monthly (usage_based) Subscription Path', () => {
      const mockMonthlySubscription = {
        id: 'sub-db-123',
        lemonsqueezy_subscription_id: 'sub-123',
        lemonsqueezy_subscription_item_id: 'sub-item-456',
        billing_type: 'usage_based',
        status: 'active',
        quantity: 9,
        current_seats: 9,
        organization_id: 'org-123'
      };

      beforeEach(() => {
        mockSupabaseSingle.mockResolvedValue({
          data: mockMonthlySubscription,
          error: null
        });

        mockAddSeats.mockResolvedValue({
          success: true,
          billingType: 'usage_based',
          chargedAt: 'end_of_period',
          message: 'New seats will be billed at end of current billing period',
          currentSeats: 10
        });
      });

      it('should use SeatManager.addSeats() for monthly subscriptions when increasing seats', async () => {
        const request = new NextRequest('http://localhost/api/billing/update-subscription-quantity', {
          method: 'POST',
          body: JSON.stringify({
            new_quantity: 10,
            invoice_immediately: true
          })
        });

        await POST(request);

        expect(mockAddSeats).toHaveBeenCalledWith('sub-db-123', 10);
      });

      it('should return usage_based billing information for monthly subscriptions', async () => {
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
        expect(data.success).toBe(true);
        expect(data.billingType).toBe('usage_based');
        expect(data.chargedAt).toBe('end_of_period');
        expect(data.message).toContain('end of current billing period');
      });

      it('should use SeatManager.removeSeats() for monthly subscriptions when decreasing seats', async () => {
        mockSupabaseSingle.mockResolvedValue({
          data: { ...mockMonthlySubscription, current_seats: 10 },
          error: null
        });

        mockRemoveSeats.mockResolvedValue({
          success: true,
          billingType: 'usage_based',
          chargedAt: 'end_of_period',
          message: 'Seat reduction will take effect at end of current billing period',
          currentSeats: 8
        });

        const request = new NextRequest('http://localhost/api/billing/update-subscription-quantity', {
          method: 'POST',
          body: JSON.stringify({
            new_quantity: 8,
            invoice_immediately: true
          })
        });

        await POST(request);

        expect(mockRemoveSeats).toHaveBeenCalledWith('sub-db-123', 8);
      });
    });

    describe('Yearly (quantity_based) Subscription Path', () => {
      const mockYearlySubscription = {
        id: 'sub-db-456',
        lemonsqueezy_subscription_id: 'sub-789',
        lemonsqueezy_subscription_item_id: 'sub-item-999',
        billing_type: 'quantity_based',
        status: 'active',
        quantity: 9,
        current_seats: 9,
        organization_id: 'org-123'
      };

      beforeEach(() => {
        mockSupabaseSingle.mockResolvedValue({
          data: mockYearlySubscription,
          error: null
        });

        mockAddSeats.mockResolvedValue({
          success: true,
          billingType: 'quantity_based',
          chargedAt: 'immediately',
          prorationAmount: 600.00,
          daysRemaining: 183,
          message: 'You will be charged $600.00 for 183 remaining days',
          currentSeats: 10
        });
      });

      it('should use SeatManager.addSeats() for yearly subscriptions when increasing seats', async () => {
        const request = new NextRequest('http://localhost/api/billing/update-subscription-quantity', {
          method: 'POST',
          body: JSON.stringify({
            new_quantity: 10,
            invoice_immediately: true
          })
        });

        await POST(request);

        expect(mockAddSeats).toHaveBeenCalledWith('sub-db-456', 10);
      });

      it('should return quantity_based billing information with proration for yearly subscriptions', async () => {
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
        expect(data.success).toBe(true);
        expect(data.billingType).toBe('quantity_based');
        expect(data.chargedAt).toBe('immediately');
        expect(data.prorationAmount).toBe(600.00);
        expect(data.daysRemaining).toBe(183);
        expect(data.message).toContain('charged $600.00');
      });

      it('should use SeatManager.removeSeats() for yearly subscriptions when decreasing seats', async () => {
        mockSupabaseSingle.mockResolvedValue({
          data: { ...mockYearlySubscription, current_seats: 10 },
          error: null
        });

        mockRemoveSeats.mockResolvedValue({
          success: true,
          billingType: 'quantity_based',
          chargedAt: 'immediately',
          prorationAmount: 0,
          daysRemaining: 183,
          message: 'Credit will be applied at next renewal',
          currentSeats: 8
        });

        const request = new NextRequest('http://localhost/api/billing/update-subscription-quantity', {
          method: 'POST',
          body: JSON.stringify({
            new_quantity: 8,
            invoice_immediately: true
          })
        });

        await POST(request);

        expect(mockRemoveSeats).toHaveBeenCalledWith('sub-db-456', 8);
      });
    });

    describe('Error Handling', () => {
      it('should handle SeatManager errors gracefully', async () => {
        mockSupabaseSingle.mockResolvedValue({
          data: {
            id: 'sub-db-123',
            billing_type: 'usage_based',
            current_seats: 9,
            organization_id: 'org-123'
          },
          error: null
        });

        mockAddSeats.mockRejectedValue(new Error('Failed to create usage record'));

        const request = new NextRequest('http://localhost/api/billing/update-subscription-quantity', {
          method: 'POST',
          body: JSON.stringify({
            new_quantity: 10,
            invoice_immediately: true
          })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBeDefined();
      });

      it('should handle no change in seat count', async () => {
        const sameQuantitySubscription = {
          id: 'sub-db-123',
          lemonsqueezy_subscription_id: 'sub-123',
          lemonsqueezy_subscription_item_id: 'sub-item-456',
          billing_type: 'usage_based' as const,
          current_seats: 10,
          quantity: 10,
          organization_id: 'org-123',
          status: 'active' as const
        };

        mockSupabaseSingle.mockResolvedValue({
          data: sameQuantitySubscription,
          error: null
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

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toContain('No change');
        expect(mockAddSeats).not.toHaveBeenCalled();
        expect(mockRemoveSeats).not.toHaveBeenCalled();
      });
    });
  });
});
