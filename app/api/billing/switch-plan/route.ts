/**
 * API Route: Switch Subscription Plan
 *
 * Allows users to switch between monthly and yearly billing plans.
 * Handles variant change with automatic proration/credits from LemonSqueezy.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { SeatManager } from '@/lib/billing/seat-manager';

/**
 * POST /api/billing/switch-plan
 *
 * Switch subscription between monthly (972634) and yearly (972635) plans
 *
 * Request body:
 * {
 *   "targetVariantId": "972634" | "972635"
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await request.json();
    const { targetVariantId } = body;

    console.log(`🔄 [API] Switch plan request:`, {
      targetVariantId,
      timestamp: new Date().toISOString()
    });

    // Validate target variant ID
    const monthlyVariantId = process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID || '972634';
    const yearlyVariantId = process.env.LEMONSQUEEZY_YEARLY_VARIANT_ID || '972635';

    if (targetVariantId !== monthlyVariantId && targetVariantId !== yearlyVariantId) {
      return NextResponse.json(
        {
          error: 'Invalid variant ID',
          message: `Target variant must be ${monthlyVariantId} (monthly) or ${yearlyVariantId} (yearly)`
        },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error(`❌ [API] Authentication failed:`, authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      console.error(`❌ [API] User not in organization:`, memberError);
      return NextResponse.json(
        { error: 'User not found in any organization' },
        { status: 404 }
      );
    }

    // Check if user is owner/admin (only they can switch plans)
    if (member.role !== 'owner' && member.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only organization owners and admins can switch billing plans' },
        { status: 403 }
      );
    }

    // Get organization's subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, billing_type, current_seats, lemonsqueezy_variant_id')
      .eq('organization_id', member.organization_id)
      .eq('status', 'active')
      .single();

    if (subError || !subscription) {
      console.error(`❌ [API] No active subscription found:`, subError);
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    console.log(`🔍 [API] Current subscription:`, {
      subscriptionId: subscription.id,
      billingType: subscription.billing_type,
      currentSeats: subscription.current_seats,
      currentVariantId: subscription.lemonsqueezy_variant_id
    });

    // Check if already on target plan
    if (subscription.lemonsqueezy_variant_id === targetVariantId) {
      return NextResponse.json(
        {
          error: 'Already on target plan',
          message: `Subscription is already on the ${targetVariantId === monthlyVariantId ? 'monthly' : 'yearly'} plan`
        },
        { status: 400 }
      );
    }

    // Use SeatManager to switch plan
    const seatManager = new SeatManager();
    const result = await seatManager.switchPlan(subscription.id, targetVariantId);

    const processingTime = Date.now() - startTime;

    console.log(`✅ [API] Plan switched successfully:`, {
      subscriptionId: subscription.id,
      newBillingType: result.billingType,
      processingTime: `${processingTime}ms`
    });

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        billingType: result.billingType,
        currentSeats: result.currentSeats,
        processingTime: `${processingTime}ms`
      },
      { status: 200 }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ [API] Plan switch failed:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`
    });

    return NextResponse.json(
      {
        error: 'Failed to switch plan',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
