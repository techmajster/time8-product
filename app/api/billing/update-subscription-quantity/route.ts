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

    const { new_quantity, invoice_immediately = true } = body;

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
      .select('lemonsqueezy_subscription_id, lemonsqueezy_subscription_item_id, status, current_seats')
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

    console.log(`📊 Updating subscription quantity:`, {
      subscription_id: subscription.lemonsqueezy_subscription_id,
      subscription_item_id: subscription.lemonsqueezy_subscription_item_id,
      current_quantity: subscription.current_seats,
      new_quantity,
      invoice_immediately
    });

    // Update subscription item quantity via LemonSqueezy API
    const updateResponse = await fetch(
      `https://api.lemonsqueezy.com/v1/subscription-items/${subscription.lemonsqueezy_subscription_item_id}`,
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
            id: subscription.lemonsqueezy_subscription_item_id.toString(),
            attributes: {
              quantity: new_quantity,
              invoice_immediately,
              disable_prorations: false // Enable prorations for fair billing
            }
          }
        })
      }
    );

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      console.error('❌ LemonSqueezy update failed:', errorData);
      return NextResponse.json(
        {
          error: 'Failed to update subscription quantity',
          details: errorData
        },
        { status: updateResponse.status }
      );
    }

    const updatedData = await updateResponse.json();
    console.log('✅ Subscription quantity updated:', updatedData.data.attributes.quantity);

    // Update local database
    await supabase
      .from('subscriptions')
      .update({
        quantity: new_quantity,
        current_seats: new_quantity
      })
      .eq('organization_id', organizationId);

    // Also update organization paid_seats
    await supabase
      .from('organizations')
      .update({
        paid_seats: new_quantity
      })
      .eq('id', organizationId);

    return NextResponse.json({
      success: true,
      new_quantity,
      subscription_id: subscription.lemonsqueezy_subscription_id,
      message: 'Subscription quantity updated successfully'
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
