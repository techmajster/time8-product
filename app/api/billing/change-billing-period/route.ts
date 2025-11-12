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
  organization_id: string;
  new_variant_id: string;
  billing_period: 'monthly' | 'annual';
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

    const { new_variant_id, billing_period } = body;

    // Validate inputs
    if (!new_variant_id || !billing_period) {
      return NextResponse.json(
        { error: 'Missing required fields: new_variant_id, billing_period' },
        { status: 400 }
      );
    }

    if (!['monthly', 'annual'].includes(billing_period)) {
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
    if (subscription.lemonsqueezy_variant_id === new_variant_id) {
      return NextResponse.json(
        {
          error: 'Already on requested billing period',
          message: `Subscription is already on ${billing_period} billing`
        },
        { status: 400 }
      );
    }

    // Generate correlation ID for tracking payment flow
    const correlationId = `billing-change-${organizationId}-${Date.now()}`;

    console.log(`🔄 [Billing Period Change] Starting:`, {
      correlationId,
      subscription_id: subscription.lemonsqueezy_subscription_id,
      current_variant: subscription.lemonsqueezy_variant_id,
      new_variant: new_variant_id,
      billing_period,
      seats: subscription.current_seats,
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
              variant_id: parseInt(new_variant_id)
              // Note: LemonSqueezy automatically preserves quantity when changing variants
              // Quantity changes must use /subscription-items endpoint, not /subscriptions
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
    console.log('✅ [Billing Period Change] Variant change successful:', {
      correlationId,
      subscription_id: subscription.lemonsqueezy_subscription_id,
      new_variant_id: updatedData.data.attributes.variant_id,
      billing_period
    });

    // CRITICAL: LemonSqueezy resets quantity to 1 when changing variants
    // We must restore the original quantity using the subscription-items endpoint
    const subscriptionItemId = subscription.lemonsqueezy_subscription_item_id ||
      updatedData.data.attributes.first_subscription_item?.id;

    if (!subscriptionItemId) {
      console.error('❌ [Billing Period Change] No subscription_item_id found');
      return NextResponse.json(
        { error: 'Cannot restore quantity: subscription_item_id not found' },
        { status: 500 }
      );
    }

    console.log(`🔄 [Billing Period Change] Restoring quantity to ${subscription.current_seats}...`, {
      correlationId,
      subscription_item_id: subscriptionItemId,
      original_seats: subscription.current_seats
    });

    // Restore the original quantity via subscription-items endpoint
    const quantityResponse = await fetch(
      `https://api.lemonsqueezy.com/v1/subscription-items/${subscriptionItemId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
          'Accept': 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json'
        },
        body: JSON.stringify({
          data: {
            type: 'subscription-items',
            id: subscriptionItemId.toString(),
            attributes: {
              quantity: subscription.current_seats,
              invoice_immediately: true,
              disable_prorations: false
            }
          }
        })
      }
    );

    if (!quantityResponse.ok) {
      const errorData = await quantityResponse.json();
      console.error('❌ [Billing Period Change] Failed to restore quantity:', {
        correlationId,
        subscription_item_id: subscriptionItemId,
        error: errorData,
        status: quantityResponse.status
      });
      return NextResponse.json(
        { error: 'Failed to restore seat quantity', details: errorData },
        { status: quantityResponse.status }
      );
    }

    console.log('✅ [Billing Period Change] Quantity restored:', {
      correlationId,
      subscription_id: subscription.lemonsqueezy_subscription_id,
      quantity: subscription.current_seats,
      note: 'Awaiting payment confirmation webhook'
    });

    // Update database with new variant (webhook will confirm after payment)
    await supabase
      .from('subscriptions')
      .update({
        lemonsqueezy_variant_id: new_variant_id,
        updated_at: new Date().toISOString()
      })
      .eq('organization_id', organizationId);

    console.log(`⏳ [Billing Period Change] Awaiting webhook confirmation:`, {
      correlationId,
      subscription_id: subscription.lemonsqueezy_subscription_id,
      new_billing_period: billing_period,
      restored_quantity: subscription.current_seats,
      note: 'subscription_payment_success webhook will confirm'
    });

    return NextResponse.json({
      success: true,
      payment_status: 'processing',
      billing_period,
      new_variant_id,
      subscription_id: subscription.lemonsqueezy_subscription_id,
      message: 'Billing period change processing. Confirmation pending.',
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
