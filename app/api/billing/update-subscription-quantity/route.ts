/**
 * Update Subscription Quantity Endpoint
 *
 * Updates subscription quantity via SeatManager service (hybrid billing).
 * Routes to correct billing method based on subscription type:
 * - usage_based (monthly): Creates usage records, charged at end of period
 * - quantity_based (yearly): PATCH subscription quantity, charged immediately with proration
 *
 * Works in both test mode and production mode.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authenticateAndGetOrgContext } from '@/lib/auth-utils-v2';
import { SeatManager } from '@/lib/billing/seat-manager';

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
      .select('id, lemonsqueezy_subscription_id, lemonsqueezy_subscription_item_id, billing_type, status, current_seats, organization_id')
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

    // Check if subscription supports hybrid billing
    if (subscription.billing_type === 'volume') {
      console.warn(`⚠️ [Payment Flow] Attempted to update legacy subscription:`, {
        subscription_id: subscription.lemonsqueezy_subscription_id,
        billing_type: subscription.billing_type,
        organizationId
      });

      return NextResponse.json(
        {
          error: 'This subscription was created before hybrid billing was enabled',
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

    // Check if seat count is changing
    const currentSeats = subscription.current_seats;
    const seatDiff = new_quantity - currentSeats;

    // Handle no change case
    if (seatDiff === 0) {
      return NextResponse.json({
        success: true,
        message: 'No change in seat count',
        currentSeats: currentSeats,
        billing_type: subscription.billing_type
      });
    }

    // Generate correlation ID for tracking
    const correlationId = `seat-update-${organizationId}-${Date.now()}`;

    console.log(`💰 [API] Starting seat update via SeatManager:`, {
      correlationId,
      subscription_id: subscription.lemonsqueezy_subscription_id,
      subscription_db_id: subscription.id,
      billing_type: subscription.billing_type,
      current_seats: currentSeats,
      new_quantity,
      seatDiff,
      organizationId
    });

    try {
      // Use SeatManager for routing to correct billing method
      const seatManager = new SeatManager();
      let result;

      if (seatDiff > 0) {
        // Adding seats
        console.log(`➕ [API] Adding ${seatDiff} seats via SeatManager`);
        result = await seatManager.addSeats(subscription.id, new_quantity);
      } else {
        // Removing seats
        console.log(`➖ [API] Removing ${Math.abs(seatDiff)} seats via SeatManager`);
        result = await seatManager.removeSeats(subscription.id, new_quantity);
      }

      console.log(`✅ [API] SeatManager operation completed:`, {
        correlationId,
        billingType: result.billingType,
        chargedAt: result.chargedAt,
        currentSeats: result.currentSeats,
        message: result.message
      });

      // Store queued invitations if provided (to be sent after payment confirmation)
      if (queued_invitations.length > 0) {
        console.log(`📋 [API] Storing queued invitations:`, {
          correlationId,
          count: queued_invitations.length,
          subscription_id: subscription.lemonsqueezy_subscription_id,
          note: 'Will be sent after seat update confirmation'
        });

        // Store invitations temporarily
        await supabase
          .from('subscriptions')
          .update({
            queued_invitations: queued_invitations as any // JSONB column
          })
          .eq('id', subscription.id);
      }

      // Return result with billing-specific information
      return NextResponse.json({
        success: true,
        subscription_id: subscription.lemonsqueezy_subscription_id,
        new_quantity,
        correlationId,
        ...result // Include all SeatManager result fields
      });

    } catch (seatManagerError) {
      console.error('❌ [API] SeatManager error:', {
        correlationId,
        subscription_id: subscription.lemonsqueezy_subscription_id,
        error: seatManagerError instanceof Error ? seatManagerError.message : seatManagerError
      });

      return NextResponse.json(
        {
          error: 'Failed to update subscription seats',
          details: seatManagerError instanceof Error ? seatManagerError.message : 'Unknown error',
          correlationId
        },
        { status: 500 }
      );
    }

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
