/**
 * Update Subscription Quantity Endpoint
 *
 * Updates subscription quantity via LemonSqueezy API.
 * Works in both test mode and production mode.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authenticateAndGetOrgContext } from '@/lib/auth-utils-v2';

interface UpdateQuantityRequest {
  new_quantity: number;
  invoice_immediately?: boolean;
  queued_invitations?: Array<{
    email: string;
    role: string;
  }>;
}

/**
 * POST handler for updating subscription quantity
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
    let body: UpdateQuantityRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request payload' },
        { status: 400 }
      );
    }

    const { new_quantity, invoice_immediately = true, queued_invitations = [] } = body;

    // Validate new_quantity
    if (!new_quantity || new_quantity < 1) {
      return NextResponse.json(
        { error: 'Invalid quantity. Must be at least 1.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch active subscription for organization
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('lemonsqueezy_subscription_id, lemonsqueezy_subscription_item_id, billing_type, status, current_seats')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'on_trial', 'paused', 'past_due'])
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        {
          error: 'No active subscription found',
          message: 'Organization must have an active subscription to update quantity'
        },
        { status: 404 }
      );
    }

    // Check if subscription supports usage-based billing
    if (subscription.billing_type === 'volume') {
      console.warn(`⚠️ [Payment Flow] Attempted to update legacy subscription:`, {
        subscription_id: subscription.lemonsqueezy_subscription_id,
        billing_type: subscription.billing_type,
        organizationId
      });

      return NextResponse.json(
        {
          error: 'This subscription was created before usage-based billing was enabled',
          details: 'Please create a new subscription to modify seats. Old subscriptions cannot be updated.',
          legacy_subscription: true,
          action_required: 'create_new_subscription'
        },
        { status: 400 }
      );
    }

    // Check if we have subscription_item_id
    if (!subscription.lemonsqueezy_subscription_item_id) {
      // Fetch subscription from LemonSqueezy to get subscription_item_id
      const lsResponse = await fetch(
        `https://api.lemonsqueezy.com/v1/subscriptions/${subscription.lemonsqueezy_subscription_id}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
            'Accept': 'application/vnd.api+json'
          }
        }
      );

      if (!lsResponse.ok) {
        throw new Error(`Failed to fetch subscription from LemonSqueezy: ${lsResponse.status}`);
      }

      const lsData = await lsResponse.json();
      const subscriptionItemId = lsData.data.attributes.first_subscription_item?.id;

      if (!subscriptionItemId) {
        return NextResponse.json(
          { error: 'Subscription item not found' },
          { status: 500 }
        );
      }

      // Update database with subscription_item_id
      await supabase
        .from('subscriptions')
        .update({ lemonsqueezy_subscription_item_id: subscriptionItemId })
        .eq('organization_id', organizationId);

      subscription.lemonsqueezy_subscription_item_id = subscriptionItemId;
    }

    // Verify subscription_item_id exists (required for usage records)
    if (!subscription.lemonsqueezy_subscription_item_id) {
      console.error(`❌ [Payment Flow] Missing subscription_item_id:`, {
        subscription_id: subscription.lemonsqueezy_subscription_id,
        organizationId
      });

      return NextResponse.json(
        {
          error: 'Subscription missing required data',
          details: 'subscription_item_id is required for usage-based billing'
        },
        { status: 500 }
      );
    }

    // Generate correlation ID for tracking payment flow
    const correlationId = `upgrade-${organizationId}-${Date.now()}`;

    // Calculate billable quantity based on free tier
    // 1-3 users: Free tier, quantity = 0
    // 4+ users: Pay for all seats, quantity = new_quantity
    const billableQuantity = new_quantity > 3 ? new_quantity : 0;

    console.log(`💰 [Payment Flow] Starting quantity update:`, {
      correlationId,
      subscription_id: subscription.lemonsqueezy_subscription_id,
      subscription_item_id: subscription.lemonsqueezy_subscription_item_id,
      current_quantity: subscription.current_seats,
      new_quantity,
      billableQuantity,
      freeTier: new_quantity <= 3,
      invoice_immediately,
      organizationId
    });

    // Report usage via LemonSqueezy Usage Records API (usage-based billing)
    const updateResponse = await fetch(
      'https://api.lemonsqueezy.com/v1/usage-records',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
          'Accept': 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json'
        },
        body: JSON.stringify({
          data: {
            type: 'usage-records',
            attributes: {
              quantity: billableQuantity,
              action: 'set', // Set absolute value (not increment)
              description: new_quantity <= 3
                ? `Free tier: ${new_quantity} seats for organization ${organizationId}`
                : `Seat count updated to ${billableQuantity} for organization ${organizationId}`
            },
            relationships: {
              'subscription-item': {
                data: {
                  type: 'subscription-items',
                  id: subscription.lemonsqueezy_subscription_item_id.toString()
                }
              }
            }
          }
        })
      }
    );

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      console.error('❌ [Payment Flow] LemonSqueezy API update failed:', {
        correlationId,
        subscription_id: subscription.lemonsqueezy_subscription_id,
        subscription_item_id: subscription.lemonsqueezy_subscription_item_id,
        error: errorData,
        status: updateResponse.status
      });

      // Check if this is an old subscription that doesn't support usage-based billing
      const errorMessage = errorData?.errors?.[0]?.detail || JSON.stringify(errorData);
      const isUsageBasedError = errorMessage.toLowerCase().includes('usage') ||
                                errorMessage.toLowerCase().includes('metered') ||
                                updateResponse.status === 422;

      if (isUsageBasedError) {
        return NextResponse.json(
          {
            error: 'This subscription was created before usage-based billing was enabled',
            details: 'Please create a new subscription to modify seats. Old subscriptions cannot be updated.',
            legacy_subscription: true
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to update subscription quantity',
          details: errorData
        },
        { status: updateResponse.status }
      );
    }

    const updatedData = await updateResponse.json();
    const usageRecordId = updatedData.data.id;

    console.log('✅ [Payment Flow] Usage record created successfully:', {
      correlationId,
      subscription_id: subscription.lemonsqueezy_subscription_id,
      usage_record_id: usageRecordId,
      new_quantity: updatedData.data.attributes.quantity,
      note: 'Awaiting payment confirmation webhook'
    });

    // 🔒 SECURITY: Update quantity but NOT current_seats
    // current_seats will be updated by subscription_payment_success webhook after payment confirmation
    await supabase
      .from('subscriptions')
      .update({
        quantity: new_quantity,
        updated_at: new Date().toISOString()
      })
      .eq('organization_id', organizationId);

    // Update organization.paid_seats based on free tier logic
    await supabase
      .from('organizations')
      .update({
        paid_seats: billableQuantity
      })
      .eq('id', organizationId);

    // Store queued invitations if provided (to be sent after payment confirmation)
    if (queued_invitations.length > 0) {
      console.log(`📋 [Payment Flow] Storing queued invitations:`, {
        correlationId,
        count: queued_invitations.length,
        subscription_id: subscription.lemonsqueezy_subscription_id,
        note: 'Will be sent after payment confirmation'
      });

      // Store invitations temporarily - they'll be sent by subscription_payment_success webhook
      await supabase
        .from('subscriptions')
        .update({
          queued_invitations: queued_invitations as any // JSONB column
        })
        .eq('organization_id', organizationId);
    }

    console.log(`⏳ [Payment Flow] Awaiting webhook confirmation:`, {
      correlationId,
      subscription_id: subscription.lemonsqueezy_subscription_id,
      new_quantity,
      note: 'subscription_payment_success webhook will grant seats'
    });

    return NextResponse.json({
      success: true,
      payment_status: 'processing',
      new_quantity,
      subscription_id: subscription.lemonsqueezy_subscription_id,
      usage_record_id: usageRecordId,
      message: 'Usage reported. Seats will be granted after payment confirmation.',
      correlationId // Include for tracking
    });

  } catch (error) {
    console.error('Update subscription quantity error:', error);
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
