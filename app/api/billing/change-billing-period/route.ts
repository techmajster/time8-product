/**
 * Change Billing Period Endpoint
 *
 * Updates subscription billing period (monthly ↔ annual) via LemonSqueezy API.
 * Uses the subscription update endpoint (not subscription-items) to change variant.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authenticateAndGetOrgContext } from '@/lib/auth-utils-v2';

interface ChangeBillingPeriodRequest {
  new_variant_id: number;
  billing_period?: 'monthly' | 'annual';
}

/**
 * POST handler for changing billing period
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Validate user belongs to organization before accessing billing
    const auth = await authenticateAndGetOrgContext();
    if (!auth.success) {
      return auth.error;
    }

    const { context } = auth;
    const { organization } = context;
    const organizationId = organization.id;

    // Parse request body
    let body: ChangeBillingPeriodRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request payload' },
        { status: 400 }
      );
    }

    const { new_variant_id, billing_period = 'unknown' } = body;

    // Validate inputs
    if (!new_variant_id || new_variant_id <= 0) {
      return NextResponse.json(
        { error: 'Invalid variant_id. Must be a positive number.' },
        { status: 400 }
      );
    }

    if (billing_period && !['monthly', 'annual', 'unknown'].includes(billing_period)) {
      return NextResponse.json(
        { error: 'Invalid billing_period. Must be "monthly" or "annual"' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch active subscription for organization
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('lemonsqueezy_subscription_id, lemonsqueezy_subscription_item_id, lemonsqueezy_variant_id, status, current_seats')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'on_trial'])
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        {
          error: 'No active subscription found',
          message: 'Organization must have an active subscription to change billing period'
        },
        { status: 404 }
      );
    }

    // Check if already on the requested variant
    if (subscription.lemonsqueezy_variant_id === new_variant_id.toString()) {
      return NextResponse.json(
        {
          error: 'Already on requested variant',
          message: `Subscription is already using this variant`
        },
        { status: 400 }
      );
    }

    // Generate correlation ID for tracking payment flow
    const correlationId = `billing-change-${organizationId}-${Date.now()}`;

    console.log(`💰 [Payment Flow] Starting billing period change (usage-based):`, {
      correlationId,
      subscription_id: subscription.lemonsqueezy_subscription_id,
      current_variant: subscription.lemonsqueezy_variant_id,
      new_variant: new_variant_id,
      billing_period,
      current_seats: subscription.current_seats,
      note: 'Usage-based billing preserves quantity automatically',
      organizationId
    });

    // Update subscription variant via LemonSqueezy API
    // This endpoint changes the subscription variant (billing period)
    const updateResponse = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${subscription.lemonsqueezy_subscription_id}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
          'Accept': 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json'
        },
        body: JSON.stringify({
          data: {
            type: 'subscriptions',
            id: subscription.lemonsqueezy_subscription_id.toString(),
            attributes: {
              variant_id: new_variant_id
            }
          }
        })
      }
    );

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      console.error('❌ [Billing Period Change] LemonSqueezy API update failed:', {
        correlationId,
        subscription_id: subscription.lemonsqueezy_subscription_id,
        error: errorData,
        status: updateResponse.status
      });
      return NextResponse.json(
        {
          error: 'Failed to change billing period',
          details: errorData
        },
        { status: updateResponse.status }
      );
    }

    const updatedData = await updateResponse.json();
    const preservedSeats = updatedData.data.attributes.first_subscription_item?.quantity || subscription.current_seats;

    console.log('✅ [Billing Period Change] Success - seats preserved automatically:', {
      correlationId,
      subscription_id: subscription.lemonsqueezy_subscription_id,
      new_variant_id: updatedData.data.attributes.variant_id,
      billing_period,
      preserved_seats: preservedSeats,
      note: 'Usage-based billing preserves quantity automatically'
    });

    // Determine billing type based on variant
    const monthlyVariantId = parseInt(process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID || '0');
    const yearlyVariantId = parseInt(process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID || '0');

    let billingType: 'usage_based' | 'quantity_based';
    if (new_variant_id === monthlyVariantId) {
      billingType = 'usage_based'; // Monthly uses usage records
    } else if (new_variant_id === yearlyVariantId) {
      billingType = 'quantity_based'; // Yearly uses quantity updates
    } else {
      console.warn(`⚠️ Unknown variant ${new_variant_id}, defaulting to usage_based`);
      billingType = 'usage_based';
    }

    // Update database with new variant AND billing_type
    await supabase
      .from('subscriptions')
      .update({
        lemonsqueezy_variant_id: new_variant_id.toString(),
        billing_type: billingType,
        updated_at: new Date().toISOString()
      })
      .eq('organization_id', organizationId);

    console.log(`🔄 [Billing Period Change] Updated billing_type to ${billingType} for variant ${new_variant_id}`);

    console.log(`✅ [Payment Flow] Billing period changed successfully:`, {
      correlationId,
      subscription_id: subscription.lemonsqueezy_subscription_id,
      new_billing_period: billing_period,
      preserved_seats: preservedSeats,
      note: 'Single API call - no manual restoration needed'
    });

    return NextResponse.json({
      success: true,
      billing_period,
      new_variant_id,
      subscription_id: subscription.lemonsqueezy_subscription_id,
      preserved_seats: preservedSeats,
      message: `Billing period changed to ${billing_period}. ${preservedSeats} seats preserved.`,
      correlationId
    });

  } catch (error) {
    console.error('Change billing period error:', error);
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
