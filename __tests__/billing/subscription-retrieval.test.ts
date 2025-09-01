/**
 * Subscription Retrieval Tests
 * 
 * Tests for retrieving and displaying subscription information for organizations.
 * Validates data fetching, formatting, and authorization logic.
 * 
 * @jest-environment node
 */

// Mock Lemon Squeezy client
const mockLemonSqueezySubscription = {
  getSubscription: jest.fn(),
  listSubscriptions: jest.fn(),
  updateSubscription: jest.fn(),
  cancelSubscription: jest.fn()
};

jest.mock('@lemonsqueezy/lemonsqueezy.js', () => ({
  lemonSqueezySetup: jest.fn(),
  getSubscription: (id: string) => mockLemonSqueezySubscription.getSubscription(id),
  listSubscriptions: (params: any) => mockLemonSqueezySubscription.listSubscriptions(params),
  updateSubscription: (id: string, params: any) => 
    mockLemonSqueezySubscription.updateSubscription(id, params)
}));

// Mock Supabase client
const mockSupabaseFrom = jest.fn();
const mockSupabaseSelect = jest.fn();
const mockSupabaseEq = jest.fn();
const mockSupabaseSingle = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    from: mockSupabaseFrom
  })
}));

// Mock Next.js request/response
const createMockRequest = (searchParams: any = {}, headers: any = {}) => {
  const url = new URL('http://localhost:3000/api/billing/subscription');
  Object.keys(searchParams).forEach(key => {
    if (searchParams[key]) {
      url.searchParams.set(key, searchParams[key]);
    }
  });
  
  return {
    url: url.toString(),
    nextUrl: {
      searchParams: {
        get: jest.fn((key: string) => searchParams[key] || null)
      }
    },
    headers: {
      get: jest.fn((key: string) => headers[key] || null)
    }
  };
};

const mockNextResponse = {
  json: jest.fn((data: any, init?: any) => ({ data, ...init }))
};

jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: any) => mockNextResponse.json(data, init)
  }
}));

// Test data
const mockSubscriptionData = {
  id: 'subscription-uuid',
  organization_id: 'test-org-id',
  lemonsqueezy_subscription_id: '12345',
  status: 'active',
  quantity: 5,
  current_period_start: '2024-01-01T00:00:00Z',
  current_period_end: '2024-02-01T00:00:00Z',
  renews_at: '2024-02-01T00:00:00Z',
  ends_at: null,
  trial_ends_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T12:00:00Z'
};

const mockLemonSqueezySubscriptionResponse = {
  data: {
    id: '12345',
    type: 'subscriptions',
    attributes: {
      store_id: 1234,
      customer_id: 67890,
      order_id: 98765,
      order_item_id: 54321,
      product_id: 11111,
      variant_id: 22222,
      product_name: 'Team Plan',
      variant_name: '5 seats',
      user_name: 'John Doe',
      user_email: 'john@test.com',
      status: 'active',
      status_formatted: 'Active',
      card_brand: 'visa',
      card_last_four: '4242',
      pause: null,
      cancelled: false,
      trial_ends_at: null,
      billing_anchor: 1,
      urls: {
        update_payment_method: 'https://billing.lemonsqueezy.com/update-payment-method',
        customer_portal: 'https://billing.lemonsqueezy.com/customer-portal'
      },
      renews_at: '2024-02-01T00:00:00Z',
      ends_at: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-15T12:00:00Z',
      test_mode: true
    },
    relationships: {
      store: {
        links: {
          related: 'https://api.lemonsqueezy.com/v1/subscriptions/12345/store',
          self: 'https://api.lemonsqueezy.com/v1/subscriptions/12345/relationships/store'
        }
      },
      customer: {
        links: {
          related: 'https://api.lemonsqueezy.com/v1/subscriptions/12345/customer',
          self: 'https://api.lemonsqueezy.com/v1/subscriptions/12345/relationships/customer'
        }
      }
    },
    links: {
      self: 'https://api.lemonsqueezy.com/v1/subscriptions/12345'
    }
  }
};

const mockPriceVariantData = {
  id: 'variant-uuid',
  product_id: 'product-uuid',
  lemonsqueezy_variant_id: '22222',
  name: '5 seats',
  price: 2500,
  quantity: 5
};

const mockProductData = {
  id: 'product-uuid',
  lemonsqueezy_product_id: '11111',
  name: 'Team Plan',
  description: 'Perfect for growing teams',
  status: 'active'
};

describe('Subscription Retrieval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock chain
    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect
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
  });

  afterEach(() => {
    delete process.env.LEMONSQUEEZY_API_KEY;
  });

  describe('GET /api/billing/subscription', () => {
    it('should retrieve active subscription for organization', async () => {
      const mockRequest = createMockRequest({ organization_id: 'test-org-id' });

      // Mock database subscription lookup
      mockSupabaseSingle.mockResolvedValueOnce({
        data: mockSubscriptionData,
        error: null
      });

      // Mock price variant lookup
      mockSupabaseSelect.mockReturnValueOnce({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockPriceVariantData,
            error: null
          })
        })
      });

      // Mock product lookup
      mockSupabaseSelect.mockReturnValueOnce({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockProductData,
            error: null
          })
        })
      });

      // Mock Lemon Squeezy API response
      mockLemonSqueezySubscription.getSubscription.mockResolvedValue({
        data: mockLemonSqueezySubscriptionResponse.data,
        error: null
      });

      const { GET } = await import('@/app/api/billing/subscription/route');
      const response = await GET(mockRequest as any);

      expect(response.data).toEqual({
        success: true,
        subscription: {
          id: 'subscription-uuid',
          status: 'active',
          status_formatted: 'Active',
          quantity: 5,
          current_period_start: '2024-01-01T00:00:00Z',
          current_period_end: '2024-02-01T00:00:00Z',
          renews_at: '2024-02-01T00:00:00Z',
          ends_at: null,
          trial_ends_at: null,
          product: {
            name: 'Team Plan',
            description: 'Perfect for growing teams'
          },
          variant: {
            name: '5 seats',
            price: 2500,
            quantity: 5
          },
          billing_info: {
            card_brand: 'visa',
            card_last_four: '4242',
            customer_portal_url: 'https://billing.lemonsqueezy.com/customer-portal'
          },
          test_mode: true
        }
      });
    });

    it('should return null for organization without subscription', async () => {
      const mockRequest = createMockRequest({ organization_id: 'test-org-id' });

      // Mock no subscription found
      mockSupabaseSingle.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const { GET } = await import('@/app/api/billing/subscription/route');
      const response = await GET(mockRequest as any);

      expect(response.data).toEqual({
        success: true,
        subscription: null
      });
    });

    it('should handle cancelled subscriptions correctly', async () => {
      const cancelledSubscription = {
        ...mockSubscriptionData,
        status: 'cancelled',
        ends_at: '2024-01-31T23:59:59Z',
        renews_at: null
      };

      const mockRequest = createMockRequest({ organization_id: 'test-org-id' });

      mockSupabaseSingle.mockResolvedValueOnce({
        data: cancelledSubscription,
        error: null
      });

      // Mock variant and product lookups
      mockSupabaseSelect
        .mockReturnValueOnce({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockPriceVariantData,
              error: null
            })
          })
        })
        .mockReturnValueOnce({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProductData,
              error: null
            })
          })
        });

      const cancelledLSResponse = {
        ...mockLemonSqueezySubscriptionResponse.data,
        attributes: {
          ...mockLemonSqueezySubscriptionResponse.data.attributes,
          status: 'cancelled',
          status_formatted: 'Cancelled',
          cancelled: true,
          ends_at: '2024-01-31T23:59:59Z',
          renews_at: null
        }
      };

      mockLemonSqueezySubscription.getSubscription.mockResolvedValue({
        data: cancelledLSResponse,
        error: null
      });

      const { GET } = await import('@/app/api/billing/subscription/route');
      const response = await GET(mockRequest as any);

      expect(response.data.subscription.status).toBe('cancelled');
      expect(response.data.subscription.status_formatted).toBe('Cancelled');
      expect(response.data.subscription.ends_at).toBe('2024-01-31T23:59:59Z');
      expect(response.data.subscription.renews_at).toBeNull();
    });

    it('should handle trial subscriptions correctly', async () => {
      const trialSubscription = {
        ...mockSubscriptionData,
        status: 'on_trial',
        trial_ends_at: '2024-01-14T23:59:59Z'
      };

      const mockRequest = createMockRequest({ organization_id: 'test-org-id' });

      mockSupabaseSingle.mockResolvedValueOnce({
        data: trialSubscription,
        error: null
      });

      // Mock variant and product lookups
      mockSupabaseSelect
        .mockReturnValueOnce({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockPriceVariantData,
              error: null
            })
          })
        })
        .mockReturnValueOnce({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProductData,
              error: null
            })
          })
        });

      const trialLSResponse = {
        ...mockLemonSqueezySubscriptionResponse.data,
        attributes: {
          ...mockLemonSqueezySubscriptionResponse.data.attributes,
          status: 'on_trial',
          status_formatted: 'On Trial',
          trial_ends_at: '2024-01-14T23:59:59Z'
        }
      };

      mockLemonSqueezySubscription.getSubscription.mockResolvedValue({
        data: trialLSResponse,
        error: null
      });

      const { GET } = await import('@/app/api/billing/subscription/route');
      const response = await GET(mockRequest as any);

      expect(response.data.subscription.status).toBe('on_trial');
      expect(response.data.subscription.status_formatted).toBe('On Trial');
      expect(response.data.subscription.trial_ends_at).toBe('2024-01-14T23:59:59Z');
    });

    it('should validate required organization_id parameter', async () => {
      const mockRequest = createMockRequest({}); // Missing organization_id

      const { GET } = await import('@/app/api/billing/subscription/route');
      const response = await GET(mockRequest as any);

      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Missing required parameter: organization_id');
    });

    it('should handle database errors gracefully', async () => {
      const mockRequest = createMockRequest({ organization_id: 'test-org-id' });

      // Mock database error
      mockSupabaseSingle.mockRejectedValue(new Error('Database connection failed'));

      const { GET } = await import('@/app/api/billing/subscription/route');
      const response = await GET(mockRequest as any);

      expect(response.status).toBe(500);
      expect(response.data.error).toBe('Internal server error');
    });

    it('should handle Lemon Squeezy API errors', async () => {
      const mockRequest = createMockRequest({ organization_id: 'test-org-id' });

      mockSupabaseSingle.mockResolvedValueOnce({
        data: mockSubscriptionData,
        error: null
      });

      // Mock Lemon Squeezy API error
      mockLemonSqueezySubscription.getSubscription.mockResolvedValue({
        data: null,
        error: {
          message: 'Subscription not found',
          status: 404
        }
      });

      const { GET } = await import('@/app/api/billing/subscription/route');
      const response = await GET(mockRequest as any);

      expect(response.status).toBe(500);
      expect(response.data.error).toBe('Failed to retrieve subscription details');
      expect(response.data.details).toBe('Subscription not found');
    });

    it('should handle missing environment variables', async () => {
      delete process.env.LEMONSQUEEZY_API_KEY;

      const mockRequest = createMockRequest({ organization_id: 'test-org-id' });

      const { GET } = await import('@/app/api/billing/subscription/route');
      const response = await GET(mockRequest as any);

      expect(response.status).toBe(500);
      expect(response.data.error).toBe('Lemon Squeezy configuration missing');
    });

    it('should include seat utilization information', async () => {
      const mockRequest = createMockRequest({ organization_id: 'test-org-id' });

      // Mock organization data with employee count
      const subscriptionWithSeatInfo = {
        ...mockSubscriptionData,
        organization: {
          current_employees: 7,
          paid_seats: 5
        }
      };

      mockSupabaseSingle.mockResolvedValueOnce({
        data: subscriptionWithSeatInfo,
        error: null
      });

      // Mock variant and product lookups
      mockSupabaseSelect
        .mockReturnValueOnce({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockPriceVariantData,
              error: null
            })
          })
        })
        .mockReturnValueOnce({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProductData,
              error: null
            })
          })
        });

      mockLemonSqueezySubscription.getSubscription.mockResolvedValue({
        data: mockLemonSqueezySubscriptionResponse.data,
        error: null
      });

      const { GET } = await import('@/app/api/billing/subscription/route');
      const response = await GET(mockRequest as any);

      expect(response.data.subscription.seat_info).toEqual({
        total_seats: 8, // 5 paid + 3 free
        paid_seats: 5,
        free_seats: 3,
        current_employees: 7,
        seats_remaining: 1 // 8 - 7
      });
    });

    it('should handle paused subscriptions', async () => {
      const pausedSubscription = {
        ...mockSubscriptionData,
        status: 'paused'
      };

      const mockRequest = createMockRequest({ organization_id: 'test-org-id' });

      mockSupabaseSingle.mockResolvedValueOnce({
        data: pausedSubscription,
        error: null
      });

      // Mock variant and product lookups
      mockSupabaseSelect
        .mockReturnValueOnce({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockPriceVariantData,
              error: null
            })
          })
        })
        .mockReturnValueOnce({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProductData,
              error: null
            })
          })
        });

      const pausedLSResponse = {
        ...mockLemonSqueezySubscriptionResponse.data,
        attributes: {
          ...mockLemonSqueezySubscriptionResponse.data.attributes,
          status: 'paused',
          status_formatted: 'Paused',
          pause: {
            mode: 'void',
            resumes_at: '2024-02-15T00:00:00Z'
          }
        }
      };

      mockLemonSqueezySubscription.getSubscription.mockResolvedValue({
        data: pausedLSResponse,
        error: null
      });

      const { GET } = await import('@/app/api/billing/subscription/route');
      const response = await GET(mockRequest as any);

      expect(response.data.subscription.status).toBe('paused');
      expect(response.data.subscription.status_formatted).toBe('Paused');
      expect(response.data.subscription.pause_info).toEqual({
        mode: 'void',
        resumes_at: '2024-02-15T00:00:00Z'
      });
    });
  });

  describe('Data Synchronization', () => {
    it('should sync local data with Lemon Squeezy if outdated', async () => {
      const mockRequest = createMockRequest({ organization_id: 'test-org-id' });

      // Mock local subscription that may be outdated
      const localSubscription = {
        ...mockSubscriptionData,
        updated_at: '2024-01-10T12:00:00Z' // Older than LS data
      };

      mockSupabaseSingle.mockResolvedValueOnce({
        data: localSubscription,
        error: null
      });

      // Mock more recent LS data
      const recentLSResponse = {
        ...mockLemonSqueezySubscriptionResponse.data,
        attributes: {
          ...mockLemonSqueezySubscriptionResponse.data.attributes,
          updated_at: '2024-01-20T15:30:00Z', // More recent
          status: 'past_due',
          status_formatted: 'Past Due'
        }
      };

      mockLemonSqueezySubscription.getSubscription.mockResolvedValue({
        data: recentLSResponse,
        error: null
      });

      const { GET } = await import('@/app/api/billing/subscription/route');
      const response = await GET(mockRequest as any);

      // Should return the more recent status from Lemon Squeezy
      expect(response.data.subscription.status).toBe('past_due');
      expect(response.data.subscription.status_formatted).toBe('Past Due');
    });

    it('should prefer local data if more recent', async () => {
      const mockRequest = createMockRequest({ organization_id: 'test-org-id' });

      // Mock recent local subscription
      const recentLocalSubscription = {
        ...mockSubscriptionData,
        updated_at: '2024-01-25T12:00:00Z' // More recent
      };

      mockSupabaseSingle.mockResolvedValueOnce({
        data: recentLocalSubscription,
        error: null
      });

      // Mock older LS data
      const olderLSResponse = {
        ...mockLemonSqueezySubscriptionResponse.data,
        attributes: {
          ...mockLemonSqueezySubscriptionResponse.data.attributes,
          updated_at: '2024-01-20T15:30:00Z' // Older
        }
      };

      mockLemonSqueezySubscription.getSubscription.mockResolvedValue({
        data: olderLSResponse,
        error: null
      });

      const { GET } = await import('@/app/api/billing/subscription/route');
      const response = await GET(mockRequest as any);

      // Should return local data since it's more recent
      expect(response.data.subscription.status).toBe('active');
    });
  });

  describe('Authorization', () => {
    it('should validate organization access', async () => {
      // This test would be expanded when we implement proper auth middleware
      const mockRequest = createMockRequest({ 
        organization_id: 'unauthorized-org-id' 
      });

      // For now, just test the basic flow
      mockSupabaseSingle.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const { GET } = await import('@/app/api/billing/subscription/route');
      const response = await GET(mockRequest as any);

      expect(response.data.subscription).toBeNull();
    });
  });
});