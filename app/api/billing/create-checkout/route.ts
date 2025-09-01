/**
 * Create Checkout Session Endpoint (Simplified)
 * 
 * Creates a Lemon Squeezy checkout session using direct API calls with environment variables.
 * No database syncing - Lemon Squeezy is the source of truth for products/pricing.
 */

import { NextRequest, NextResponse } from 'next/server';

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
  return_url?: string;
  failure_url?: string;
}

/**
 * Calculate required paid seats (3 free + paid seats)
 */
function calculateRequiredPaidSeats(totalUsers: number): number {
  const FREE_SEATS = 3;
  return Math.max(0, totalUsers - FREE_SEATS);
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

    const { variant_id, organization_data, user_count, tier, return_url, failure_url } = body;
    
    console.log('🔍 Simplified checkout request:', {
      variant_id,
      organization_data: organization_data?.name,
      user_count,
      tier,
      required_paid_seats: calculateRequiredPaidSeats(user_count)
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

    // Calculate seat requirements
    const paidSeats = calculateRequiredPaidSeats(user_count);
    
    console.log('💺 Seat calculation:', {
      total_users: user_count,
      free_seats: 3,
      paid_seats: paidSeats,
      pricing_tier: tier
    });


    // Prepare custom data for webhook processing (as string for Lemon Squeezy)
    const customData = JSON.stringify({
      organization_data,
      user_count,
      paid_seats: paidSeats,
      tier,
      ...(return_url && { return_url }),
      ...(failure_url && { failure_url })
    });

    // Prepare checkout options with quantity in productOptions
    const checkoutOptions = {
      checkoutData: {
        name: organization_data.name,
        email: `noreply+${Date.now()}@time8.io`, // Temporary email for checkout
        custom: {
          organization_data: JSON.stringify(organization_data),
          user_count: user_count.toString(),
          paid_seats: paidSeats.toString(),
          tier,
          ...(return_url && { return_url }),
          ...(failure_url && { failure_url })
        }
      },
      productOptions: {
        name: `Leave Management - ${organization_data.name}`,
        description: `${user_count} users (${paidSeats} paid seats after 3 free)`,
        receiptThankYouNote: 'Thank you for subscribing!',
        redirectUrl: return_url || `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/onboarding/payment-success`
      }
    };

    console.log('🛒 Creating checkout with quantity:', {
      store_id: process.env.LEMONSQUEEZY_STORE_ID,
      variant_id,
      organization: organization_data.name,
      total_users: user_count,
      paid_seats: paidSeats,
      quantity: user_count, // Volume pricing uses total user count
      test_mode: process.env.NODE_ENV !== 'production'
    });

    console.log('🔍 Full checkout options being sent:', JSON.stringify({
      ...checkoutOptions,
      quantity: user_count
    }, null, 2));

    // Use simple format for volume pricing
    const checkoutPayload = {
      checkoutOptions: {
        name: organization_data.name,
        email: `noreply+${Date.now()}@time8.io`,
        custom: {
          organization_data: JSON.stringify(organization_data),
          user_count: user_count.toString(),
          paid_seats: paidSeats.toString(),
          tier
        }
      },
      productOptions: {
        name: `Leave Management for ${organization_data.name}`,
        description: `Monthly subscription for ${user_count} users - includes 3 free seats`,
        redirectUrl: return_url || `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/onboarding/payment-success`,
        receiptThankYouNote: 'Thank you for subscribing to our leave management system!'
      }
    };

    console.log('🔧 Using correct Lemon Squeezy format:', {
      variant_id: parseInt(variant_id),
      quantity: user_count,
      total_users: user_count,
      paid_seats: paidSeats
    });
    
    const checkout = await createCheckout(
      process.env.LEMONSQUEEZY_STORE_ID!,
      variant_id,
      {
        checkoutData: {
          name: organization_data.name,
          email: `noreply+${Date.now()}@time8.io`,
          custom: {
            organization_data: JSON.stringify(organization_data),
            user_count: user_count.toString(),
            paid_seats: paidSeats.toString(),
            tier
          },
          variant_quantities: [
            {
              variant_id: parseInt(variant_id),
              quantity: user_count
            }
          ]
        },
        productOptions: {
          name: `Leave Management for ${organization_data.name}`,
          description: `Monthly subscription for ${user_count} users - includes 3 free seats`,
          redirectUrl: return_url || `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/onboarding/payment-success`,
          receiptThankYouNote: 'Thank you for subscribing to our leave management system!'
        }
      }
    );

    if (checkout.error) {
      console.error('❌ Lemon Squeezy checkout creation failed:');
      console.error('Full error object:', JSON.stringify(checkout.error, null, 2));
      return NextResponse.json(
        { 
          error: 'Failed to create checkout session',
          details: checkout.error.message || checkout.error,
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