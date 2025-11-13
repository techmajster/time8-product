/**
 * Create Checkout Session Endpoint (Simplified)
 *
 * Creates a Lemon Squeezy checkout session using direct API calls with environment variables.
 * No database syncing - Lemon Squeezy is the source of truth for products/pricing.
 */

import { NextRequest, NextResponse } from 'next/server';
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

interface CheckoutRequest {
  variant_id: string;
  organization_data?: {
    id?: string; // For existing organizations (upgrades)
    name: string;
    slug: string;
    country_code: string;
  };
  user_count: number;
  tier: 'monthly' | 'annual';
  user_email?: string; // User email for billing notifications
  return_url?: string;
  failure_url?: string;
}


/**
 * POST handler for creating checkout sessions
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

    // Parse request body
    let body: CheckoutRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request payload' },
        { status: 400 }
      );
    }

    const { variant_id, organization_data, user_count, tier, user_email, return_url, failure_url } = body;

    console.log('📧 User email from request:', {
      user_email,
      has_email: !!user_email,
      type: typeof user_email,
      fallback_will_be_used: !user_email
    });

    // SECURITY: If organization_data includes an existing org ID (upgrade scenario),
    // validate user belongs to that organization
    if (organization_data?.id) {
      const auth = await authenticateAndGetOrgContext();
      if (!auth.success) {
        return auth.error;
      }

      const { context } = auth;
      const { organization } = context;

      // Verify the organization ID matches the authenticated user's organization
      if (organization.id !== organization_data.id) {
        return NextResponse.json(
          { error: 'Unauthorized: Cannot create checkout for different organization' },
          { status: 403 }
        );
      }
    }
    // NOTE: New organization creation (no ID) is allowed for all authenticated users

    console.log('🔍 Simplified checkout request:', {
      variant_id,
      organization_data: organization_data?.name,
      user_count,
      tier,
      user_email: user_email || 'not provided (using fallback)'
    });

    // Validate required parameters
    if (!variant_id || !organization_data || !user_count || !tier) {
      return NextResponse.json(
        {
          error: 'Missing required parameters',
          required: ['variant_id', 'organization_data', 'user_count', 'tier']
        },
        { status: 400 }
      );
    }

    // Validate variant ID matches expected values
    const expectedMonthly = process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID;
    const expectedYearly = process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID;
    
    if (tier === 'monthly' && variant_id !== expectedMonthly) {
      return NextResponse.json(
        { error: 'Invalid variant ID for monthly billing' },
        { status: 400 }
      );
    }
    
    if (tier === 'annual' && variant_id !== expectedYearly) {
      return NextResponse.json(
        { error: 'Invalid variant ID for yearly billing' },
        { status: 400 }
      );
    }

    // For usage-based billing: Checkout is always $0
    // Billing happens later based on usage records created in webhook
    // Pass user_count to webhook for initial usage record creation
    console.log('🛒 Creating checkout (usage-based billing):', {
      store_id: process.env.LEMONSQUEEZY_STORE_ID,
      variant_id,
      organization: organization_data.name,
      user_count,
      note: 'Checkout charge is $0, billing happens via usage records',
      test_mode: process.env.NODE_ENV !== 'production'
    });

    // Build custom data - only include organization_id if it exists
    const customData: Record<string, string> = {
      organization_name: organization_data.name,
      organization_slug: organization_data.slug, // Pass the slug for webhook organization lookup
      user_email: user_email || '', // Pass user email for webhook to identify the workspace creator
      user_count: user_count.toString(),
      tier
    };

    // Only add organization_id if it exists (for upgrades)
    if (organization_data.id) {
      customData.organization_id = organization_data.id;
    }

    const checkoutPayload = {
      checkoutData: {
        name: organization_data.name,
        email: user_email || `noreply+${Date.now()}@time8.io`, // Use real user email for billing notifications
        custom: customData,
        variantQuantities: [
          {
            variantId: parseInt(variant_id),
            quantity: user_count
          }
        ]
      },
      productOptions: {
        name: `Leave Management for ${organization_data.name}`,
        description: `Monthly subscription for ${user_count} users - includes 3 free seats`,
        redirectUrl: return_url || `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/onboarding/payment-success`,
        receiptThankYouNote: 'Thank you for subscribing to our leave management system!'
      },
      checkoutOptions: {
        embed: false,
        media: true,
        logo: true
      },
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      testMode: process.env.NODE_ENV !== 'production',
      preview: false
    };

    console.log('📦 Full checkout payload:', JSON.stringify(checkoutPayload, null, 2));
    console.log('🏪 Store ID:', process.env.LEMONSQUEEZY_STORE_ID);
    console.log('🎫 Variant ID:', variant_id);

    const checkout = await createCheckout(
      process.env.LEMONSQUEEZY_STORE_ID!,
      variant_id,
      checkoutPayload
    );

    if (checkout.error) {
      const errorMessage = checkout.error?.message ||
                          JSON.stringify(checkout.error) ||
                          'Unknown error from Lemon Squeezy';

      console.error('❌ Lemon Squeezy checkout creation failed:');
      console.error('Error message:', errorMessage);
      console.error('Status code:', checkout.statusCode);
      console.error('Full error object:', JSON.stringify(checkout.error, null, 2));

      return NextResponse.json(
        {
          error: 'Failed to create checkout session',
          details: errorMessage,
          statusCode: checkout.statusCode,
          fullError: checkout.error
        },
        { status: 500 }
      );
    }

    console.log('✅ Checkout created successfully:', {
      checkout_url: checkout.data?.data?.attributes?.url,
      checkout_id: checkout.data?.data?.id
    });

    console.log('🔍 Full checkout response:', JSON.stringify(checkout.data, null, 2));

    // Return checkout URL and details
    return NextResponse.json({
      success: true,
      checkout_url: checkout.data?.data?.attributes?.url,
      checkout_id: checkout.data?.data?.id,
      expires_at: checkout.data?.data?.attributes?.expires_at
    });

  } catch (error) {
    console.error('❌ Checkout creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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