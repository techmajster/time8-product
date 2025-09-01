import { 
  lemonSqueezySetup,
  listProducts,
  listVariants,
  createCheckout,
  listSubscriptions,
  getSubscription,
  updateSubscription,
  cancelSubscription,
  listCustomers,
  createCustomer,
  getCustomer,
  type Variant,
  type Product,
  type Subscription,
  type Customer,
  type Checkout,
} from '@lemonsqueezy/lemonsqueezy.js';
import { LemonSqueezyConfig } from './config';

// Types for our client
export interface LemonSqueezyClient {
  products: {
    list: typeof listProducts;
  };
  variants: {
    list: typeof listVariants;
  };
  checkouts: {
    create: typeof createCheckout;
  };
  subscriptions: {
    list: typeof listSubscriptions;
    get: typeof getSubscription;
    update: typeof updateSubscription;
    cancel: typeof cancelSubscription;
  };
  customers: {
    list: typeof listCustomers;
    create: typeof createCustomer;
    get: typeof getCustomer;
  };
}

let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize the Lemon Squeezy SDK
 * This must be called before using any other SDK methods
 */
export async function initializeLemonSqueezy(): Promise<void> {
  // Return existing promise if initialization is in progress
  if (initPromise) {
    return initPromise;
  }

  // Return immediately if already initialized
  if (isInitialized) {
    return;
  }

  // Create new initialization promise
  initPromise = new Promise<void>((resolve, reject) => {
    try {
      const config = require('./config').validateLemonSqueezyConfig();
      
      lemonSqueezySetup({
        apiKey: config.apiKey,
        onError: (error) => {
          console.error('Lemon Squeezy Error:', error);
          reject(new Error(`Failed to initialize Lemon Squeezy: ${error.message}`));
        },
      });

      isInitialized = true;
      resolve();
    } catch (error) {
      reject(error);
    }
  });

  return initPromise;
}

/**
 * Create a typed Lemon Squeezy client
 */
export function createClient(config: LemonSqueezyConfig): LemonSqueezyClient {
  // Ensure the SDK is initialized before creating client
  if (!isInitialized) {
    throw new Error('Lemon Squeezy SDK not initialized. Call initializeLemonSqueezy() first.');
  }

  return {
    products: {
      list: listProducts,
    },
    variants: {
      list: listVariants,
    },
    checkouts: {
      create: createCheckout,
    },
    subscriptions: {
      list: listSubscriptions,
      get: getSubscription,
      update: updateSubscription,
      cancel: cancelSubscription,
    },
    customers: {
      list: listCustomers,
      create: createCustomer,
      get: getCustomer,
    },
  };
}

/**
 * Get the initialized client
 * @throws Error if client is not initialized
 */
export function getClient(): LemonSqueezyClient {
  const config = require('./config').validateLemonSqueezyConfig();
  return createClient(config);
}

// Export types for use in other modules
export type {
  Variant,
  Product,
  Subscription,
  Customer,
  Checkout,
};