/**
 * Test Basic Lemon Squeezy Checkout Creation
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

    console.log('🛒 Testing absolute basic checkout...');
    
    // Test with the exact format from Lemon Squeezy documentation
    const checkout = await createCheckout(
      process.env.LEMONSQUEEZY_STORE_ID!,
      process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID!,
      {
        checkoutData: {
          name: "John Doe",
          email: "john@example.com"
        }
      }
    );

    console.log('Checkout response:', checkout);

    return NextResponse.json({
      success: !checkout.error,
      error: checkout.error?.message,
      status_code: checkout.statusCode,
      checkout_url: checkout.data?.data?.attributes?.url,
      checkout_id: checkout.data?.data?.id,
      raw_response: checkout
    });

  } catch (error: any) {
    console.error('❌ Basic checkout error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    });
  }
}