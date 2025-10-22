/**
 * List Lemon Squeezy Variants for the Product
 */

import { NextResponse } from 'next/server';
import { lemonSqueezySetup, listVariants } from '@lemonsqueezy/lemonsqueezy.js';

export async function GET() {
  try {
    // Setup Lemon Squeezy client
    lemonSqueezySetup({
      apiKey: process.env.LEMONSQUEEZY_API_KEY!,
      onError: (error) => console.error('Lemon Squeezy API Error:', error),
    });

    console.log('📋 Listing product variants...');

    // List variants for our product
    const variantsResponse = await listVariants({
      filter: {
        productId: process.env.LEMONSQUEEZY_PRODUCT_ID!
      }
    });

    console.log('Variants response:', JSON.stringify(variantsResponse, null, 2));

    if (variantsResponse.error) {
      return NextResponse.json({
        success: false,
        error: variantsResponse.error.message,
        product_id: process.env.LEMONSQUEEZY_PRODUCT_ID
      });
    }

    const variants = variantsResponse.data?.data || [];
    
    return NextResponse.json({
      success: true,
      product_id: process.env.LEMONSQUEEZY_PRODUCT_ID,
      configured_variants: {
        monthly: process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID,
        yearly: process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID
      },
      actual_variants: variants.map((variant: any) => ({
        id: variant.id,
        name: variant.attributes.name,
        price: variant.attributes.price,
        interval: variant.attributes.interval,
        interval_count: variant.attributes.interval_count,
        status: variant.attributes.status
      }))
    });

  } catch (error: any) {
    console.error('❌ List variants error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    });
  }
}