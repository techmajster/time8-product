/**
 * Test Lemon Squeezy API Connection
 */

import { NextResponse } from 'next/server';
import { lemonSqueezySetup, getStore } from '@lemonsqueezy/lemonsqueezy.js';

export async function GET() {
  try {
    // Setup Lemon Squeezy client
    lemonSqueezySetup({
      apiKey: process.env.LEMONSQUEEZY_API_KEY!,
      onError: (error) => console.error('Lemon Squeezy API Error:', error),
    });

    console.log('🔍 Testing Lemon Squeezy connection...');
    console.log('API Key exists:', !!process.env.LEMONSQUEEZY_API_KEY);
    console.log('Store ID:', process.env.LEMONSQUEEZY_STORE_ID);

    // Test API connection by fetching store info
    const storeResponse = await getStore(process.env.LEMONSQUEEZY_STORE_ID!);
    
    console.log('Store response:', {
      success: !storeResponse.error,
      error: storeResponse.error?.message,
      storeId: storeResponse.data?.data?.id,
      storeName: storeResponse.data?.data?.attributes?.name
    });

    return NextResponse.json({
      success: true,
      api_configured: !!process.env.LEMONSQUEEZY_API_KEY,
      store_id: process.env.LEMONSQUEEZY_STORE_ID,
      store_response: {
        success: !storeResponse.error,
        error: storeResponse.error?.message,
        store_name: storeResponse.data?.data?.attributes?.name,
        store_id: storeResponse.data?.data?.id
      },
      variant_ids: {
        monthly: process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID,
        yearly: process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID,
        product: process.env.LEMONSQUEEZY_PRODUCT_ID
      }
    });

  } catch (error: any) {
    console.error('❌ Lemon Squeezy test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      api_configured: !!process.env.LEMONSQUEEZY_API_KEY,
      store_id: process.env.LEMONSQUEEZY_STORE_ID
    });
  }
}