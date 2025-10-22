/**
 * Test Lemon Squeezy Checkout Creation
 */

import { NextResponse } from 'next/server';
import { lemonSqueezySetup, createCheckout } from '@lemonsqueezy/lemonsqueezy.js';

export async function GET() {
  try {
    // Setup Lemon Squeezy client
    lemonSqueezySetup({
      apiKey: process.env.LEMONSQUEEZY_API_KEY!,
      onError: (error) => console.error('Lemon Squeezy API Error:', error),
    });

    console.log('🛒 Testing minimal checkout creation...');

    // Create a minimal checkout to test the API
    const checkoutOptions = {
      checkoutData: {
        name: "Test Checkout User",
        email: "test@example.com",
        custom: {
          test: true,
          organization: "Test Company"
        }
      },
      productOptions: {
        name: "Time8 Monthly Plan Test",
        description: "5 users (2 paid seats + 3 free)"
      },
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
      preview: false,
      testMode: true
    };

    console.log('Creating checkout with:', {
      store_id: process.env.LEMONSQUEEZY_STORE_ID,
      variant_id: process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID,
      options: checkoutOptions
    });

    const checkout = await createCheckout(
      process.env.LEMONSQUEEZY_STORE_ID!,
      process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID!,
      checkoutOptions
    );

    console.log('Checkout response:', {
      success: !checkout.error,
      error: checkout.error?.message,
      checkout_url: checkout.data?.data?.attributes?.url,
      checkout_id: checkout.data?.data?.id
    });

    return NextResponse.json({
      success: !checkout.error,
      error: checkout.error?.message,
      checkout_url: checkout.data?.data?.attributes?.url,
      checkout_id: checkout.data?.data?.id,
      expires_at: checkout.data?.data?.attributes?.expires_at,
      test_mode: checkout.data?.data?.attributes?.test_mode
    });

  } catch (error: any) {
    console.error('❌ Checkout test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    });
  }
}