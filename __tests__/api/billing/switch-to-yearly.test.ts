/**
 * Switch to Yearly API Tests
 *
 * Tests for the switch-to-yearly endpoint that handles:
 * - Monthly→Yearly upgrade flow
 * - Checkout creation with custom_data for migration
 * - Seat preservation through custom_data
 * - Error handling for checkout failures
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/billing/switch-to-yearly/route';

// Mock Supabase client
const mockSupabaseFrom = jest.fn();
const mockSupabaseSelect = jest.fn();
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

// Mock LemonSqueezy SDK
const mockCreateCheckout = jest.fn();
const mockLemonSqueezySetup = jest.fn();

jest.mock('@lemonsqueezy/lemonsqueezy.js', () => ({
  lemonSqueezySetup: mockLemonSqueezySetup,
  createCheckout: mockCreateCheckout
}));

describe('Switch to Yearly API', () => {
  const mockOrganization = {
    id: 'org-123',
    name: 'Test Organization',
    slug: 'test-org'
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com'
  };

  const mockMonthlySubscription = {
    id: 'db-sub-123',
    lemonsqueezy_subscription_id: 'ls-sub-456',
    lemonsqueezy_variant_id: '972634', // Monthly variant
    lemonsqueezy_product_id: '621389', // Monthly product
    status: 'active',
    current_seats: 5,
    organization_id: 'org-123'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup environment variables
    process.env.LEMONSQUEEZY_STORE_ID = 'store-123';
    process.env.LEMONSQUEEZY_API_KEY = 'test-api-key';
    process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID = '1090954';
    process.env.LEMONSQUEEZY_MONTHLY_PRODUCT_ID = '621389';
    process.env.LEMONSQUEEZY_YEARLY_PRODUCT_ID = '693341';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';

    // Setup default successful auth
    mockAuthenticateAndGetOrgContext.mockResolvedValue({
      success: true,
      context: {
        user: mockUser,
        organization: mockOrganization
      }
    });

    // Setup default Supabase mock chain
    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect
    });

    mockSupabaseSelect.mockReturnValue({
      eq: mockSupabaseEq,
      in: mockSupabaseIn
    });

    mockSupabaseIn.mockReturnValue({
      single: mockSupabaseSingle
    });

    mockSupabaseEq.mockReturnValue({
      single: mockSupabaseSingle,
      eq: mockSupabaseEq,
      in: mockSupabaseIn
    });

    mockSupabaseSingle.mockResolvedValue({
      data: mockMonthlySubscription,
      error: null
    });

    // Mock successful checkout creation
    mockCreateCheckout.mockResolvedValue({
      data: {
        data: {
          id: 'checkout-789',
          attributes: {
            url: 'https://time8.lemonsqueezy.com/checkout/test-checkout-url'
          }
        }
      },
      error: null
    });
  });

  describe('Successful Upgrade Flow', () => {
    it('should create yearly checkout with migration custom_data', async () => {
      const request = new NextRequest('http://localhost/api/billing/switch-to-yearly', {
        method: 'POST'
      });

      await POST(request);

      expect(mockCreateCheckout).toHaveBeenCalledWith(
        'store-123',
        '1090954', // Yearly variant
        expect.objectContaining({
          checkoutData: expect.objectContaining({
            custom: expect.objectContaining({
              migration_from_subscription_id: 'ls-sub-456',
              preserve_seats: '5',
              organization_id: 'org-123'
            })
          })
        })
      );
    });

    it('should preserve current seat count in custom_data', async () => {
      const request = new NextRequest('http://localhost/api/billing/switch-to-yearly', {
        method: 'POST'
      });

      await POST(request);

      const checkoutCall = mockCreateCheckout.mock.calls[0][2];
      expect(checkoutCall.checkoutData.custom.preserve_seats).toBe('5');
    });

    it('should return checkout URL and migration details', async () => {
      const request = new NextRequest('http://localhost/api/billing/switch-to-yearly', {
        method: 'POST'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        checkout_url: 'https://time8.lemonsqueezy.com/checkout/test-checkout-url',
        current_seats: 5,
        old_subscription_id: 'ls-sub-456',
        message: expect.stringContaining('checkout created')
      });
    });

    it('should set variantQuantities to current seat count', async () => {
      const request = new NextRequest('http://localhost/api/billing/switch-to-yearly', {
        method: 'POST'
      });

      await POST(request);

      const checkoutCall = mockCreateCheckout.mock.calls[0][2];
      expect(checkoutCall.checkoutData.variantQuantities).toEqual([
        {
          variantId: 1090954,
          quantity: 5
        }
      ]);
    });

    it('should include organization and user details in checkout', async () => {
      const request = new NextRequest('http://localhost/api/billing/switch-to-yearly', {
        method: 'POST'
      });

      await POST(request);

      const checkoutCall = mockCreateCheckout.mock.calls[0][2];
      expect(checkoutCall.checkoutData.name).toBe('Test Organization');
      expect(checkoutCall.checkoutData.email).toBe('test@example.com');
    });
  });

  describe('Validation', () => {
    it('should reject if user not authenticated', async () => {
      mockAuthenticateAndGetOrgContext.mockResolvedValueOnce({
        success: false,
        error: {
          json: () => ({ error: 'Unauthorized' }),
          status: 401
        }
      });

      const request = new NextRequest('http://localhost/api/billing/switch-to-yearly', {
        method: 'POST'
      });

      const response = await POST(request);

      expect(response).toBeDefined();
    });

    it('should reject if no active monthly subscription found', async () => {
      mockSupabaseSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'No subscription found' }
      });

      const request = new NextRequest('http://localhost/api/billing/switch-to-yearly', {
        method: 'POST'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('No active monthly subscription');
    });

    it('should reject if already on yearly subscription', async () => {
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          ...mockMonthlySubscription,
          lemonsqueezy_product_id: '693341', // Yearly product
          lemonsqueezy_variant_id: '1090954'
        },
        error: null
      });

      const request = new NextRequest('http://localhost/api/billing/switch-to-yearly', {
        method: 'POST'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Already on yearly');
    });

    it('should query only active or on_trial subscriptions', async () => {
      const request = new NextRequest('http://localhost/api/billing/switch-to-yearly', {
        method: 'POST'
      });

      await POST(request);

      expect(mockSupabaseIn).toHaveBeenCalledWith('status', ['active', 'on_trial']);
    });
  });

  describe('Error Handling', () => {
    it('should handle checkout creation failures gracefully', async () => {
      mockCreateCheckout.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'Invalid variant',
          statusCode: 422
        }
      });

      const request = new NextRequest('http://localhost/api/billing/switch-to-yearly', {
        method: 'POST'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to create yearly checkout');
      expect(data.details).toContain('Invalid variant');
    });

    it('should handle missing environment variables', async () => {
      delete process.env.LEMONSQUEEZY_STORE_ID;

      const request = new NextRequest('http://localhost/api/billing/switch-to-yearly', {
        method: 'POST'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('configuration missing');
    });

    it('should handle database errors', async () => {
      mockSupabaseSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' }
      });

      const request = new NextRequest('http://localhost/api/billing/switch-to-yearly', {
        method: 'POST'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
    });
  });

  describe('Custom Data Structure', () => {
    it('should include all required migration metadata', async () => {
      const request = new NextRequest('http://localhost/api/billing/switch-to-yearly', {
        method: 'POST'
      });

      await POST(request);

      const checkoutCall = mockCreateCheckout.mock.calls[0][2];
      const customData = checkoutCall.checkoutData.custom;

      expect(customData).toHaveProperty('migration_from_subscription_id');
      expect(customData).toHaveProperty('preserve_seats');
      expect(customData).toHaveProperty('organization_id');
      expect(customData.migration_from_subscription_id).toBe('ls-sub-456');
      expect(customData.preserve_seats).toBe('5');
      expect(customData.organization_id).toBe('org-123');
    });

    it('should set tier to annual in custom_data', async () => {
      const request = new NextRequest('http://localhost/api/billing/switch-to-yearly', {
        method: 'POST'
      });

      await POST(request);

      const checkoutCall = mockCreateCheckout.mock.calls[0][2];
      expect(checkoutCall.checkoutData.custom.tier).toBe('annual');
    });
  });

  describe('Checkout Configuration', () => {
    it('should set proper redirect URL', async () => {
      const request = new NextRequest('http://localhost/api/billing/switch-to-yearly', {
        method: 'POST'
      });

      await POST(request);

      const checkoutCall = mockCreateCheckout.mock.calls[0][2];
      expect(checkoutCall.productOptions.redirectUrl).toBe('http://localhost:3000/settings/billing?upgraded=true');
    });

    it('should set checkout expiration to 1 hour', async () => {
      const request = new NextRequest('http://localhost/api/billing/switch-to-yearly', {
        method: 'POST'
      });

      await POST(request);

      const checkoutCall = mockCreateCheckout.mock.calls[0][2];
      expect(checkoutCall.expiresAt).toBeDefined();

      const expiresAt = new Date(checkoutCall.expiresAt);
      const now = new Date();
      const diffInMinutes = (expiresAt.getTime() - now.getTime()) / (1000 * 60);

      expect(diffInMinutes).toBeGreaterThan(55);
      expect(diffInMinutes).toBeLessThan(65);
    });

    it('should enable test mode in non-production', async () => {
      process.env.NODE_ENV = 'development';

      const request = new NextRequest('http://localhost/api/billing/switch-to-yearly', {
        method: 'POST'
      });

      await POST(request);

      const checkoutCall = mockCreateCheckout.mock.calls[0][2];
      expect(checkoutCall.testMode).toBe(true);
    });
  });

  describe('Response Structure', () => {
    it('should return all required fields', async () => {
      const request = new NextRequest('http://localhost/api/billing/switch-to-yearly', {
        method: 'POST'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('checkout_url');
      expect(data).toHaveProperty('current_seats');
      expect(data).toHaveProperty('old_subscription_id');
      expect(data).toHaveProperty('message');
    });

    it('should include descriptive success message', async () => {
      const request = new NextRequest('http://localhost/api/billing/switch-to-yearly', {
        method: 'POST'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.message).toMatch(/yearly checkout created/i);
      expect(data.message).toMatch(/5 seats/);
    });
  });

  describe('Unsupported HTTP Methods', () => {
    it('should reject GET requests', async () => {
      const { GET } = await import('@/app/api/billing/switch-to-yearly/route');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toContain('Method not allowed');
    });
  });
});
