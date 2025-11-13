/**
 * Proration Preview API Endpoint
 *
 * Calculates proration cost for seat changes on yearly subscriptions.
 * Used by frontend to show users the cost before they confirm seat additions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authenticateAndGetOrgContext } from '@/lib/auth-utils-v2';
import { SeatManager } from '@/lib/billing/seat-manager';

interface ProrationPreviewRequest {
  new_quantity: number;
}

/**
 * POST handler for proration preview
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
    let body: ProrationPreviewRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request payload' },
        { status: 400 }
      );
    }

    const { new_quantity } = body;

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
      .select('id, billing_type, current_seats, status')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'on_trial', 'paused', 'past_due'])
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        {
          error: 'No active subscription found',
          message: 'Organization must have an active subscription'
        },
        { status: 404 }
      );
    }

    console.log(`💰 [API] Proration preview requested:`, {
      organizationId,
      billing_type: subscription.billing_type,
      current_seats: subscription.current_seats,
      new_quantity
    });

    // Check if proration is applicable (only for quantity-based/yearly)
    if (subscription.billing_type !== 'quantity_based') {
      return NextResponse.json({
        applicable: false,
        billing_type: subscription.billing_type,
        message: 'Proration preview not applicable for usage-based (monthly) subscriptions',
        current_seats: subscription.current_seats
      });
    }

    // Calculate proration using SeatManager
    const seatManager = new SeatManager();
    const prorationDetails = await seatManager.calculateProration(
      subscription.id,
      new_quantity
    );

    console.log(`✅ [API] Proration preview calculated:`, {
      organizationId,
      amount: prorationDetails.amount,
      daysRemaining: prorationDetails.daysRemaining,
      seatsAdded: prorationDetails.seatsAdded
    });

    return NextResponse.json({
      applicable: true,
      billing_type: subscription.billing_type,
      current_seats: subscription.current_seats,
      new_quantity,
      proration: {
        amount: prorationDetails.amount,
        daysRemaining: prorationDetails.daysRemaining,
        seatsAdded: prorationDetails.seatsAdded,
        yearlyPricePerSeat: prorationDetails.yearlyPricePerSeat,
        message: prorationDetails.message
      }
    });

  } catch (error) {
    console.error('Proration preview error:', error);
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
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}

export const PUT = GET;
export const DELETE = GET;
export const PATCH = GET;
