/**
 * Checkout Session Creation Tests
 * 
 * Tests for creating Lemon Squeezy checkout sessions for subscription upgrades.
 * Validates pricing calculations, seat requirements, and integration with Lemon Squeezy API.
 * 
 * @jest-environment node
 */

// Mock Lemon Squeezy client
const mockLemonSqueezyCheckout = {
  listCheckouts: jest.fn(),
  createCheckout: jest.fn(),
  getCheckout: jest.fn(),
  updateCheckout: jest.fn(),
  deleteCheckout: jest.fn()
};

jest.mock('@lemonsqueezy/lemonsqueezy.js', () => ({
  lemonSqueezySetup: jest.fn(),
  listCheckouts: () => mockLemonSqueezyCheckout.listCheckouts(),
  createCheckout: (storeId: string, variantId: string, options: any) => 
    mockLemonSqueezyCheckout.createCheckout(storeId, variantId, options),
  getCheckout: (id: string) => mockLemonSqueezyCheckout.getCheckout(id)
}));

// Mock Supabase client
const mockSupabaseFrom = jest.fn();
const mockSupabaseSelect = jest.fn();
const mockSupabaseInsert = jest.fn();
const mockSupabaseUpdate = jest.fn();
const mockSupabaseSingle = jest.fn();
const mockSupabaseEq = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    from: mockSupabaseFrom
  })
}));

// Mock Next.js request/response
const createMockRequest = (body: any, headers: any = {}) => ({
  json: jest.fn().mockResolvedValue(body),
  headers: {
    get: jest.fn((key: string) => headers[key] || null)
  },
  url: 'http://localhost:3000/api/billing/create-checkout'
});

const mockNextResponse = {
  json: jest.fn((data: any, init?: any) => ({ data, ...init }))
};

jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: any) => mockNextResponse.json(data, init)
  }
}));

// Test data
const mockOrganizationData = {
  id: 'test-org-id',
  name: 'Test Organization',
  current_employees: 5,
  paid_seats: 3
};

const mockProductData = {
  id: 'product-uuid',
  lemonsqueezy_product_id: '123',
  name: 'Team Plan',
  status: 'active'
};

const mockVariantData = {
  id: 'variant-uuid',
  product_id: 'product-uuid',
  lemonsqueezy_variant_id: '456',
  name: '5 seats',
  price: 2500, // $25.00
  quantity: 5
};

const mockCheckoutResponse = {
  data: {
    id: '789',
    type: 'checkouts',
    attributes: {
      url: 'https://checkout.lemonsqueezy.com/checkout/123',
      expires_at: '2024-12-31T23:59:59Z',
      custom_data: {
        organization_id: 'test-org-id',
        user_id: 'test-user-id'
      }
    }
  }
};

describe('Checkout Session Creation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock chain
    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
      insert: mockSupabaseInsert,
      update: mockSupabaseUpdate
    });

    mockSupabaseSelect.mockReturnValue({
      eq: mockSupabaseEq,
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

    // Set environment variables
    process.env.LEMONSQUEEZY_API_KEY = 'test-api-key';
    process.env.LEMONSQUEEZY_STORE_ID = 'test-store-id';
    process.env.NEXT_PUBLIC_BASE_URL = 'https://test.example.com';
  });

  afterEach(() => {
    delete process.env.LEMONSQUEEZY_API_KEY;
    delete process.env.LEMONSQUEEZY_STORE_ID;
    delete process.env.NEXT_PUBLIC_BASE_URL;
  });

  describe('POST /api/billing/create-checkout', () => {
    it('should create checkout session with valid parameters', async () => {
      const checkoutRequest = {
        variant_id: 'variant-uuid',
        organization_id: 'test-org-id',
        return_url: 'https://test.example.com/admin/settings?tab=billing'
      };

      // Mock variant lookup
      mockSupabaseSingle.mockResolvedValueOnce({
        data: mockVariantData,
        error: null
      });

      // Mock organization lookup
      mockSupabaseSingle.mockResolvedValueOnce({
        data: mockOrganizationData,
        error: null
      });

      // Mock Lemon Squeezy API response
      mockLemonSqueezyCheckout.createCheckout.mockResolvedValue({
        data: mockCheckoutResponse.data,
        error: null
      });

      const mockRequest = createMockRequest(checkoutRequest);

      const { POST } = await import('@/app/api/billing/create-checkout/route');
      const response = await POST(mockRequest as any);

      expect(mockLemonSqueezyCheckout.createCheckout).toHaveBeenCalledWith(
        'test-store-id',
        '456', // lemonsqueezy_variant_id
        expect.objectContaining({
          productOptions: {
            name: '5 seats',
            description: '5 seats subscription'
          },
          checkoutOptions: {
            embed: false,
            media: false,
            logo: true
          },
          checkoutData: {
            name: 'Test Organization',
            custom: expect.objectContaining({
              organization_id: 'test-org-id',
              variant_id: 'variant-uuid'
            })
          },
          expiresAt: expect.any(String),
          preview: false,
          testMode: true
        })
      );

      expect(response.data).toEqual({
        success: true,
        checkout_url: 'https://checkout.lemonsqueezy.com/checkout/123',
        checkout_id: '789',
        expires_at: '2024-12-31T23:59:59Z'
      });
    });

    it('should calculate correct seat requirements', async () => {
      const checkoutRequest = {
        variant_id: 'variant-uuid',
        organization_id: 'test-org-id'
      };

      // Mock organization with 8 employees (needs upgrade)
      const orgWithManyEmployees = {
        ...mockOrganizationData,
        current_employees: 8,
        paid_seats: 3
      };

      mockSupabaseSingle
        .mockResolvedValueOnce({ data: mockVariantData, error: null })
        .mockResolvedValueOnce({ data: orgWithManyEmployees, error: null });

      mockLemonSqueezyCheckout.createCheckout.mockResolvedValue({
        data: mockCheckoutResponse.data,
        error: null
      });

      const mockRequest = createMockRequest(checkoutRequest);

      const { POST } = await import('@/app/api/billing/create-checkout/route');
      await POST(mockRequest as any);

      // Should create checkout since 8 employees > 3 free seats, and variant provides 5 seats total
      expect(mockLemonSqueezyCheckout.createCheckout).toHaveBeenCalled();
    });

    it('should reject checkout for insufficient seats', async () => {
      const checkoutRequest = {
        variant_id: 'variant-uuid',
        organization_id: 'test-org-id'
      };

      // Mock variant with only 3 seats
      const smallVariant = {
        ...mockVariantData,
        quantity: 3,
        name: '3 seats'
      };

      // Mock organization with 8 employees (more than 3 seats can handle)
      const orgWithManyEmployees = {
        ...mockOrganizationData,
        current_employees: 8,
        paid_seats: 0
      };

      mockSupabaseSingle
        .mockResolvedValueOnce({ data: smallVariant, error: null })
        .mockResolvedValueOnce({ data: orgWithManyEmployees, error: null });

      const mockRequest = createMockRequest(checkoutRequest);

      const { POST } = await import('@/app/api/billing/create-checkout/route');
      const response = await POST(mockRequest as any);

      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Selected plan does not provide enough seats');
      expect(response.data.details).toEqual({
        current_employees: 8,
        free_seats: 3,
        required_paid_seats: 5,
        variant_seats: 3
      });
    });

    it('should handle missing variant gracefully', async () => {
      const checkoutRequest = {
        variant_id: 'non-existent-variant',
        organization_id: 'test-org-id'
      };

      // Mock variant not found
      mockSupabaseSingle.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const mockRequest = createMockRequest(checkoutRequest);

      const { POST } = await import('@/app/api/billing/create-checkout/route');
      const response = await POST(mockRequest as any);

      expect(response.status).toBe(404);
      expect(response.data.error).toBe('Price variant not found');
    });

    it('should handle missing organization gracefully', async () => {
      const checkoutRequest = {
        variant_id: 'variant-uuid',
        organization_id: 'non-existent-org'
      };

      mockSupabaseSingle
        .mockResolvedValueOnce({ data: mockVariantData, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      const mockRequest = createMockRequest(checkoutRequest);

      const { POST } = await import('@/app/api/billing/create-checkout/route');
      const response = await POST(mockRequest as any);

      expect(response.status).toBe(404);
      expect(response.data.error).toBe('Organization not found');
    });

    it('should handle Lemon Squeezy API errors', async () => {
      const checkoutRequest = {
        variant_id: 'variant-uuid',
        organization_id: 'test-org-id'
      };

      mockSupabaseSingle
        .mockResolvedValueOnce({ data: mockVariantData, error: null })
        .mockResolvedValueOnce({ data: mockOrganizationData, error: null });

      // Mock Lemon Squeezy API error
      mockLemonSqueezyCheckout.createCheckout.mockResolvedValue({
        data: null,
        error: {
          message: 'Invalid variant ID',
          status: 422
        }
      });

      const mockRequest = createMockRequest(checkoutRequest);

      const { POST } = await import('@/app/api/billing/create-checkout/route');
      const response = await POST(mockRequest as any);

      expect(response.status).toBe(500);
      expect(response.data.error).toBe('Failed to create checkout session');
      expect(response.data.details).toBe('Invalid variant ID');
    });

    it('should validate required parameters', async () => {
      const incompleteRequest = {
        variant_id: 'variant-uuid'
        // Missing organization_id
      };

      const mockRequest = createMockRequest(incompleteRequest);

      const { POST } = await import('@/app/api/billing/create-checkout/route');
      const response = await POST(mockRequest as any);

      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Missing required parameters');
      expect(response.data.required).toEqual(['variant_id', 'organization_id']);
    });

    it('should set correct expiration time', async () => {
      const checkoutRequest = {
        variant_id: 'variant-uuid',
        organization_id: 'test-org-id'
      };

      mockSupabaseSingle
        .mockResolvedValueOnce({ data: mockVariantData, error: null })
        .mockResolvedValueOnce({ data: mockOrganizationData, error: null });

      mockLemonSqueezyCheckout.createCheckout.mockResolvedValue({
        data: mockCheckoutResponse.data,
        error: null
      });

      const mockRequest = createMockRequest(checkoutRequest);

      const { POST } = await import('@/app/api/billing/create-checkout/route');
      await POST(mockRequest as any);

      // Should set expiration to 1 hour from now
      const createCall = mockLemonSqueezyCheckout.createCheckout.mock.calls[0];
      const expiresAt = new Date(createCall[2].expiresAt);
      const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
      const timeDifference = Math.abs(expiresAt.getTime() - oneHourFromNow.getTime());
      
      expect(timeDifference).toBeLessThan(5000); // Within 5 seconds
    });

    it('should include custom data for webhook processing', async () => {
      const checkoutRequest = {
        variant_id: 'variant-uuid',
        organization_id: 'test-org-id'
      };

      mockSupabaseSingle
        .mockResolvedValueOnce({ data: mockVariantData, error: null })
        .mockResolvedValueOnce({ data: mockOrganizationData, error: null });

      mockLemonSqueezyCheckout.createCheckout.mockResolvedValue({
        data: mockCheckoutResponse.data,
        error: null
      });

      const mockRequest = createMockRequest(checkoutRequest);

      const { POST } = await import('@/app/api/billing/create-checkout/route');
      await POST(mockRequest as any);

      const createCall = mockLemonSqueezyCheckout.createCheckout.mock.calls[0];
      expect(createCall[2].checkoutData.custom).toEqual({
        organization_id: 'test-org-id',
        variant_id: 'variant-uuid'
      });
    });

    it('should handle test mode correctly', async () => {
      const checkoutRequest = {
        variant_id: 'variant-uuid',
        organization_id: 'test-org-id'
      };

      // Test in production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockSupabaseSingle
        .mockResolvedValueOnce({ data: mockVariantData, error: null })
        .mockResolvedValueOnce({ data: mockOrganizationData, error: null });

      mockLemonSqueezyCheckout.createCheckout.mockResolvedValue({
        data: mockCheckoutResponse.data,
        error: null
      });

      const mockRequest = createMockRequest(checkoutRequest);

      const { POST } = await import('@/app/api/billing/create-checkout/route');
      await POST(mockRequest as any);

      const createCall = mockLemonSqueezyCheckout.createCheckout.mock.calls[0];
      expect(createCall[2].testMode).toBe(false);

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Seat Calculation Logic', () => {
    it('should calculate required paid seats correctly', () => {
      const testCases = [
        { current_employees: 2, expected_paid_seats: 0 }, // Under free limit
        { current_employees: 3, expected_paid_seats: 0 }, // Exactly at free limit
        { current_employees: 4, expected_paid_seats: 1 }, // 1 over free limit
        { current_employees: 8, expected_paid_seats: 5 }, // 5 over free limit
        { current_employees: 15, expected_paid_seats: 12 }, // 12 over free limit
      ];

      testCases.forEach(({ current_employees, expected_paid_seats }) => {
        const calculateRequiredPaidSeats = (employees: number) => Math.max(0, employees - 3);
        expect(calculateRequiredPaidSeats(current_employees)).toBe(expected_paid_seats);
      });
    });

    it('should validate seat requirements against variant', () => {
      const validateSeatRequirement = (currentEmployees: number, variantSeats: number) => {
        const requiredPaidSeats = Math.max(0, currentEmployees - 3);
        return variantSeats >= requiredPaidSeats;
      };

      expect(validateSeatRequirement(5, 5)).toBe(true); // 5 employees, 5 seat variant
      expect(validateSeatRequirement(8, 5)).toBe(true); // 8 employees, 5 seat variant (5 paid + 3 free = 8 total)
      expect(validateSeatRequirement(10, 5)).toBe(false); // 10 employees, 5 seat variant (5 paid + 3 free = 8 total)
      expect(validateSeatRequirement(3, 1)).toBe(true); // 3 employees, 1 seat variant (all free)
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      const checkoutRequest = {
        variant_id: 'variant-uuid',
        organization_id: 'test-org-id'
      };

      // Mock database error
      mockSupabaseSingle.mockRejectedValue(new Error('Database connection failed'));

      const mockRequest = createMockRequest(checkoutRequest);

      const { POST } = await import('@/app/api/billing/create-checkout/route');
      const response = await POST(mockRequest as any);

      expect(response.status).toBe(500);
      expect(response.data.error).toBe('Internal server error');
    });

    it('should handle invalid JSON payloads', async () => {
      const mockRequest = {
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      };

      const { POST } = await import('@/app/api/billing/create-checkout/route');
      const response = await POST(mockRequest as any);

      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Invalid request payload');
    });

    it('should handle missing environment variables', async () => {
      delete process.env.LEMONSQUEEZY_API_KEY;

      const checkoutRequest = {
        variant_id: 'variant-uuid',
        organization_id: 'test-org-id'
      };

      const mockRequest = createMockRequest(checkoutRequest);

      const { POST } = await import('@/app/api/billing/create-checkout/route');
      const response = await POST(mockRequest as any);

      expect(response.status).toBe(500);
      expect(response.data.error).toBe('Lemon Squeezy configuration missing');
    });
  });
});