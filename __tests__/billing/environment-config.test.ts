// Mock the Lemon Squeezy SDK before imports
jest.mock('@lemonsqueezy/lemonsqueezy.js', () => ({
  lemonSqueezySetup: jest.fn(),
  listProducts: jest.fn(),
  listVariants: jest.fn(),
  createCheckout: jest.fn(),
  listSubscriptions: jest.fn(),
  getSubscription: jest.fn(),
  updateSubscription: jest.fn(),
  cancelSubscription: jest.fn(),
  listCustomers: jest.fn(),
  createCustomer: jest.fn(),
  getCustomer: jest.fn(),
}));

import { validateLemonSqueezyConfig } from '@/lib/lemon-squeezy/config';

describe('Lemon Squeezy Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateLemonSqueezyConfig', () => {
    it('should validate when all required environment variables are present', () => {
      process.env.LEMONSQUEEZY_API_KEY = 'test-api-key';
      process.env.LEMONSQUEEZY_STORE_ID = 'test-store-id';
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'test-webhook-secret';

      const config = validateLemonSqueezyConfig();

      expect(config).toEqual({
        apiKey: 'test-api-key',
        storeId: 'test-store-id',
        webhookSecret: 'test-webhook-secret',
      });
    });

    it('should throw error when API key is missing', () => {
      delete process.env.LEMONSQUEEZY_API_KEY;
      process.env.LEMONSQUEEZY_STORE_ID = 'test-store-id';
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'test-webhook-secret';

      expect(() => validateLemonSqueezyConfig()).toThrow(
        'Missing required environment variable: LEMONSQUEEZY_API_KEY'
      );
    });

    it('should throw error when Store ID is missing', () => {
      process.env.LEMONSQUEEZY_API_KEY = 'test-api-key';
      delete process.env.LEMONSQUEEZY_STORE_ID;
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'test-webhook-secret';

      expect(() => validateLemonSqueezyConfig()).toThrow(
        'Missing required environment variable: LEMONSQUEEZY_STORE_ID'
      );
    });

    it('should throw error when Webhook Secret is missing', () => {
      process.env.LEMONSQUEEZY_API_KEY = 'test-api-key';
      process.env.LEMONSQUEEZY_STORE_ID = 'test-store-id';
      delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

      expect(() => validateLemonSqueezyConfig()).toThrow(
        'Missing required environment variable: LEMONSQUEEZY_WEBHOOK_SECRET'
      );
    });

    it('should throw error when any environment variable is empty', () => {
      process.env.LEMONSQUEEZY_API_KEY = '';
      process.env.LEMONSQUEEZY_STORE_ID = 'test-store-id';
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'test-webhook-secret';

      expect(() => validateLemonSqueezyConfig()).toThrow(
        'Missing required environment variable: LEMONSQUEEZY_API_KEY'
      );
    });

    it('should trim whitespace from environment variables', () => {
      process.env.LEMONSQUEEZY_API_KEY = '  test-api-key  ';
      process.env.LEMONSQUEEZY_STORE_ID = '  test-store-id  ';
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = '  test-webhook-secret  ';

      const config = validateLemonSqueezyConfig();

      expect(config).toEqual({
        apiKey: 'test-api-key',
        storeId: 'test-store-id',
        webhookSecret: 'test-webhook-secret',
      });
    });
  });

  describe('getLemonSqueezyClient', () => {
    it('should create a client instance when config is valid', async () => {
      process.env.LEMONSQUEEZY_API_KEY = 'test-api-key';
      process.env.LEMONSQUEEZY_STORE_ID = 'test-store-id';
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'test-webhook-secret';

      const { getLemonSqueezyClient } = await import('@/lib/lemon-squeezy/config');
      const client = await getLemonSqueezyClient();

      expect(client).toBeDefined();
      expect(client).toHaveProperty('products');
      expect(client).toHaveProperty('variants');
      expect(client).toHaveProperty('checkouts');
      expect(client).toHaveProperty('subscriptions');
      expect(client).toHaveProperty('customers');
    });

    it('should throw error when creating client with invalid config', async () => {
      delete process.env.LEMONSQUEEZY_API_KEY;

      const { getLemonSqueezyClient } = await import('@/lib/lemon-squeezy/config');
      
      await expect(getLemonSqueezyClient()).rejects.toThrow(
        'Missing required environment variable: LEMONSQUEEZY_API_KEY'
      );
    });

    it('should use the same client instance (singleton)', async () => {
      process.env.LEMONSQUEEZY_API_KEY = 'test-api-key';
      process.env.LEMONSQUEEZY_STORE_ID = 'test-store-id';
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'test-webhook-secret';

      const { getLemonSqueezyClient } = await import('@/lib/lemon-squeezy/config');
      const client1 = await getLemonSqueezyClient();
      const client2 = await getLemonSqueezyClient();

      expect(client1).toBe(client2);
    });
  });
});