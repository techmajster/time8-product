/**
 * Switch to Yearly Billing Endpoint
 *
 * Handles monthly→yearly upgrades by creating a yearly checkout with custom_data
 * for migration tracking. The webhook will later cancel the old monthly subscription.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authenticateAndGetOrgContext } from '@/lib/auth-utils-v2';

// Conditional imports to handle module resolution issues
let lemonSqueezySetup: any
let createCheckout: any

function initializeLemonSqueezy() {
  if (!lemonSqueezySetup) {
    try {
      const lemonSqueezy = require('@lemonsqueezy/lemonsqueezy.js')
      lemonSqueezySetup = lemonSqueezy.lemonSqueezySetup
      createCheckout = lemonSqueezy.createCheckout

      // Setup Lemon Squeezy client
      lemonSqueezySetup({
        apiKey: process.env.LEMONSQUEEZY_API_KEY!,
        onError: (error: any) => console.error('Lemon Squeezy API Error:', error),
      })
    } catch (error) {
      console.warn('LemonSqueezy not available:', error)
    }
  }
}

/**
 * POST handler for switching to yearly billing
 */
export async function POST(request: NextRequest) {
  try {
    initializeLemonSqueezy()

    // Validate environment variables
    if (!process.env.LEMONSQUEEZY_API_KEY || !process.env.LEMONSQUEEZY_STORE_ID) {
      return NextResponse.json(
        { error: 'Lemon Squeezy configuration missing' },
        { status: 500 }
      );
    }

    if (!process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID?.trim() || !process.env.LEMONSQUEEZY_MONTHLY_PRODUCT_ID?.trim() || !process.env.LEMONSQUEEZY_YEARLY_PRODUCT_ID?.trim()) {
      return NextResponse.json(
        { error: 'Product configuration missing' },
        { status: 500 }
      );
    }

    // SECURITY: Validate user belongs to organization before accessing billing
    const auth = await authenticateAndGetOrgContext();
    if (!auth.success) {
      return auth.error;
    }

    const { context } = auth;
    const { user, organization } = context;
    const organizationId = organization.id;

    const supabase = await createClient();

    // Fetch active monthly subscription for organization
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, lemonsqueezy_subscription_id, lemonsqueezy_product_id, lemonsqueezy_variant_id, status, current_seats')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'on_trial'])
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        {
          error: 'No active monthly subscription found',
          message: 'Organization must have an active monthly subscription to upgrade to yearly'
        },
        { status: 404 }
      );
    }

    // Verify subscription is monthly (not already yearly)
    const monthlyProductId = process.env.LEMONSQUEEZY_MONTHLY_PRODUCT_ID?.trim();
    const yearlyProductId = process.env.LEMONSQUEEZY_YEARLY_PRODUCT_ID?.trim();

    if (subscription.lemonsqueezy_product_id === yearlyProductId) {
      return NextResponse.json(
        {
          error: 'Already on yearly subscription',
          message: 'Your subscription is already on yearly billing'
        },
        { status: 400 }
      );
    }

    if (subscription.lemonsqueezy_product_id !== monthlyProductId) {
      console.warn(`⚠️ Unexpected product_id: ${subscription.lemonsqueezy_product_id}, expected ${monthlyProductId}`);
    }

    // Get current seat count to preserve
    const currentSeats = subscription.current_seats || 3;

    console.log('🔄 [Switch to Yearly] Creating yearly checkout:', {
      organization_id: organizationId,
      old_subscription_id: subscription.lemonsqueezy_subscription_id,
      current_seats: currentSeats,
      old_product_id: subscription.lemonsqueezy_product_id,
      new_product_id: yearlyProductId
    });

    // Create checkout with custom_data for migration tracking
    const yearlyVariantId = process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID?.trim();
    const customData = {
      migration_from_subscription_id: subscription.lemonsqueezy_subscription_id,
      preserve_seats: currentSeats.toString(),
      organization_id: organizationId,
      organization_slug: organization.slug,
      user_email: user.email || '',
      tier: 'annual'
    };

    const checkoutPayload = {
      checkoutData: {
        name: organization.name,
        email: user.email || `noreply+${Date.now()}@time8.io`,
        custom: customData,
        variantQuantities: [
          {
            variantId: parseInt(yearlyVariantId),
            quantity: currentSeats
          }
        ]
      },
      productOptions: {
        name: `Yearly Leave Management for ${organization.name}`,
        description: `Annual subscription for ${currentSeats} users - upgrade from monthly`,
        redirectUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/settings?upgraded=true`,
        receiptThankYouNote: 'Thank you for upgrading to yearly billing!'
      },
      checkoutOptions: {
        embed: false,
        media: true,
        logo: true
      },
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
      testMode: process.env.NODE_ENV !== 'production',
      preview: false
    };

    console.log('📦 Creating yearly checkout with custom_data:', {
      custom_data: customData,
      variant_id: yearlyVariantId,
      quantity: currentSeats
    });

    const checkout = await createCheckout(
      process.env.LEMONSQUEEZY_STORE_ID!,
      yearlyVariantId,
      checkoutPayload
    );

    if (checkout.error) {
      const errorMessage = checkout.error?.message ||
                          JSON.stringify(checkout.error) ||
                          'Unknown error from Lemon Squeezy';

      console.error('❌ [Switch to Yearly] Checkout creation failed:', {
        error: errorMessage,
        statusCode: checkout.statusCode,
        organization_id: organizationId
      });

      return NextResponse.json(
        {
          error: 'Failed to create yearly checkout',
          details: errorMessage
        },
        { status: 500 }
      );
    }

    const checkoutUrl = checkout.data?.data?.attributes?.url;

    console.log('✅ [Switch to Yearly] Checkout created successfully:', {
      checkout_url: checkoutUrl,
      organization_id: organizationId,
      old_subscription_id: subscription.lemonsqueezy_subscription_id,
      preserved_seats: currentSeats,
      note: 'Webhook will cancel old subscription after new one is created'
    });

    // Return checkout URL for redirect
    return NextResponse.json({
      success: true,
      checkout_url: checkoutUrl,
      current_seats: currentSeats,
      old_subscription_id: subscription.lemonsqueezy_subscription_id,
      message: `Yearly checkout created for ${currentSeats} seats. Complete payment to upgrade.`
    });

  } catch (error) {
    console.error('❌ [Switch to Yearly] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Handle unsupported HTTP methods
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export const PUT = GET;
export const DELETE = GET;
export const PATCH = GET;
