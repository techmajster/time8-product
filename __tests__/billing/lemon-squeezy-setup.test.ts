// Mock the Lemon Squeezy SDK before imports
const mockLemonSqueezySetup = jest.fn();
jest.mock('@lemonsqueezy/lemonsqueezy.js', () => ({
  lemonSqueezySetup: mockLemonSqueezySetup,
}));

describe('Lemon Squeezy SDK Setup', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.LEMONSQUEEZY_API_KEY = 'test-api-key';
    process.env.LEMONSQUEEZY_STORE_ID = 'test-store-id';
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'test-webhook-secret';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should verify Lemon Squeezy SDK is installed', () => {
    const lemonSqueezy = require('@lemonsqueezy/lemonsqueezy.js');
    expect(lemonSqueezy).toBeDefined();
    expect(lemonSqueezy.lemonSqueezySetup).toBeDefined();
  });

  it('should have all required environment variables configured', () => {
    const { validateLemonSqueezyConfig } = require('@/lib/lemon-squeezy/config');
    
    expect(() => validateLemonSqueezyConfig()).not.toThrow();
    
    const config = validateLemonSqueezyConfig();
    expect(config.apiKey).toBe('test-api-key');
    expect(config.storeId).toBe('test-store-id');
    expect(config.webhookSecret).toBe('test-webhook-secret');
  });

  it('should export required client methods', async () => {
    const lemonSqueezy = await import('@/lib/lemon-squeezy');
    
    // Config exports
    expect(lemonSqueezy.validateLemonSqueezyConfig).toBeDefined();
    expect(lemonSqueezy.getLemonSqueezyClient).toBeDefined();
    
    // Client exports  
    expect(lemonSqueezy.initializeLemonSqueezy).toBeDefined();
    expect(lemonSqueezy.createClient).toBeDefined();
    expect(lemonSqueezy.getClient).toBeDefined();
  });

  it('should handle missing environment variables gracefully', () => {
    delete process.env.LEMONSQUEEZY_API_KEY;
    
    const { validateLemonSqueezyConfig } = require('@/lib/lemon-squeezy/config');
    
    expect(() => validateLemonSqueezyConfig()).toThrow(
      'Missing required environment variable: LEMONSQUEEZY_API_KEY'
    );
  });
});