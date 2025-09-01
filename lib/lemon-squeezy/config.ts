export interface LemonSqueezyConfig {
  apiKey: string;
  storeId: string;
  webhookSecret: string;
}

/**
 * Validates and returns the Lemon Squeezy configuration from environment variables
 * @throws Error if any required environment variable is missing
 */
export function validateLemonSqueezyConfig(): LemonSqueezyConfig {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY?.trim();
  const storeId = process.env.LEMONSQUEEZY_STORE_ID?.trim();
  const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET?.trim();

  if (!apiKey) {
    throw new Error('Missing required environment variable: LEMONSQUEEZY_API_KEY');
  }

  if (!storeId) {
    throw new Error('Missing required environment variable: LEMONSQUEEZY_STORE_ID');
  }

  if (!webhookSecret) {
    throw new Error('Missing required environment variable: LEMONSQUEEZY_WEBHOOK_SECRET');
  }

  return {
    apiKey,
    storeId,
    webhookSecret,
  };
}

// Export a singleton client instance
let clientInstance: any = null;

/**
 * Get the Lemon Squeezy client instance
 * Creates a singleton instance on first call
 */
export async function getLemonSqueezyClient() {
  if (!clientInstance) {
    const config = validateLemonSqueezyConfig();
    // Import dynamically to avoid circular dependencies
    const { initializeLemonSqueezy, getClient } = require('./client');
    
    // Initialize the SDK first
    await initializeLemonSqueezy();
    
    // Then get the client
    clientInstance = getClient();
  }
  return clientInstance;
}