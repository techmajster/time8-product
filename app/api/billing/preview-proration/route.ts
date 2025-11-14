/**
 * API Route: Preview Proration
 *
 * Calculates proration cost for seat changes (yearly only) or plan switches.
 * Used by frontend to show cost preview before user confirms.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { SeatManager } from '@/lib/billing/seat-manager';

/**
 * POST /api/billing/preview-proration
 *
 * Preview proration cost for seat changes
 *
 * Request body:
 * {
 *   "newQuantity": number  // New total seat count
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await request.json();
    const { newQuantity } = body;

    console.log(`💵 [API] Proration preview request:`, {
      newQuantity,
      timestamp: new Date().toISOString()
    });

    // Validate new quantity
    if (typeof newQuantity !== 'number' || newQuantity < 0) {
      return NextResponse.json(
        { error: 'Invalid quantity', message: 'newQuantity must be a positive number' },
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
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      console.error(`❌ [API] User not in organization:`, memberError);
      return NextResponse.json(
        { error: 'User not found in any organization' },
        { status: 404 }
      );
    }

    // Get organization's subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, billing_type, current_seats')
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
      currentSeats: subscription.current_seats
    });

    // Calculate proration using SeatManager
    const seatManager = new SeatManager();
    const proration = await seatManager.calculateProration(subscription.id, newQuantity);

    const processingTime = Date.now() - startTime;

    console.log(`✅ [API] Proration calculated:`, {
      subscriptionId: subscription.id,
      currentSeats: subscription.current_seats,
      newQuantity,
      prorationAmount: proration.amount,
      daysRemaining: proration.daysRemaining,
      processingTime: `${processingTime}ms`
    });

    return NextResponse.json(
      {
        success: true,
        billingType: subscription.billing_type,
        currentSeats: subscription.current_seats,
        newQuantity,
        proration: {
          amount: proration.amount,
          daysRemaining: proration.daysRemaining,
          seatsAdded: proration.seatsAdded,
          message: proration.message
        },
        processingTime: `${processingTime}ms`
      },
      { status: 200 }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ [API] Proration preview failed:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`
    });

    return NextResponse.json(
      {
        error: 'Failed to calculate proration',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
