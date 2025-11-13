/**
 * Subscription Retrieval Endpoint
 *
 * Retrieves subscription information using stored Lemon Squeezy subscription ID.
 * Follows best practice: store subscription ID locally + fetch real data from Lemon Squeezy.
 *
 * SECURITY: Uses authenticateAndGetOrgContext() to ensure user belongs to the organization
 * before allowing access to billing data (multi-workspace isolation).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { calculateComprehensiveSeatInfo } from '@/lib/billing/seat-calculation';
import { authenticateAndGetOrgContext } from '@/lib/auth-utils-v2';
import { getVariantPrice } from '@/lib/lemon-squeezy/pricing';

/**
 * GET handler for retrieving subscription information
 * Uses stored subscription ID + fetches real data from Lemon Squeezy (best practice)
 */
export async function GET(request: NextRequest) {
  try {
    // Validate environment variables
    if (!process.env.LEMONSQUEEZY_API_KEY) {
      return NextResponse.json(
        { error: 'Lemon Squeezy configuration missing' },
        { status: 500 }
      );
    }

    // SECURITY FIX: Authenticate and get organization context from active workspace
    // This ensures user belongs to the organization before accessing billing data
    const auth = await authenticateAndGetOrgContext();
    if (!auth.success) {
      return auth.error;
    }

    const { context } = auth;
    const { organization } = context;
    const organizationId = organization.id;

    const supabase = await createClient();

    // Get organization subscription details (organization basic info already from context)
    const { data: orgDetails, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, subscription_tier, paid_seats')
      .eq('id', organizationId)
      .single();

    if (orgError || !orgDetails) {
      console.error('Organization details not found:', orgError);
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Count active members using direct query for real-time accuracy
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { count: activeMembersCount, error: memberError } = await serviceClient
      .from('user_organizations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (memberError) {
      console.error('❌ Active members count query failed:', memberError);
    }

    const currentMembers = activeMembersCount || 0;

    // Count pending invitations that will consume seats when accepted
    const { count: pendingInvitationsCount, error: pendingCountError } = await serviceClient
      .from('invitations')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('status', 'pending');

    if (pendingCountError) {
      console.error('❌ Pending invitations count query failed:', pendingCountError);
    }

    const pendingInvitations = pendingInvitationsCount || 0;

    // Get subscription record from database FIRST (contains stored Lemon Squeezy subscription ID)
    // Include all subscription statuses for display
    // IMPORTANT: Select current_seats which is the actual paid seat count (for usage-based billing)
    const { data: subscriptionRecord, error: subError } = await supabase
      .from('subscriptions')
      .select('lemonsqueezy_subscription_id, status, trial_ends_at, current_seats')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'on_trial', 'paused', 'past_due', 'cancelled', 'expired', 'unpaid'])
      .single();

    // If no subscription record found AND no paid seats, return free tier
    if ((subError || !subscriptionRecord) && orgDetails.paid_seats === 0) {
      // Return free tier with comprehensive seat calculation
      const seatInfo = calculateComprehensiveSeatInfo(
        0, // 0 paid seats
        currentMembers,
        pendingInvitations
      );

      return NextResponse.json({
        success: true,
        subscription: null,
        organization_info: {
          id: orgDetails.id,
          name: orgDetails.name,
          seat_info: {
            total_seats: seatInfo.totalSeats,
            paid_seats: seatInfo.paidSeats,
            free_seats: seatInfo.freeSeats,
            current_employees: seatInfo.currentActiveMembers,
            pending_invitations: seatInfo.pendingInvitations,
            seats_remaining: seatInfo.availableSeats
          }
        }
      });
    }

    if (subError || !subscriptionRecord) {
      console.error('❌ No subscription record found:', subError);
      // Use paid_seats from organizations table as fallback when subscription record missing
      const seatInfo = calculateComprehensiveSeatInfo(
        orgDetails.paid_seats,
        currentMembers,
        pendingInvitations
      );

      return NextResponse.json({
        success: true,
        subscription: null,
        organization_info: {
          id: orgDetails.id,
          name: orgDetails.name,
          seat_info: {
            total_seats: seatInfo.totalSeats,
            paid_seats: seatInfo.paidSeats,
            free_seats: seatInfo.freeSeats,
            current_employees: seatInfo.currentActiveMembers,
            pending_invitations: seatInfo.pendingInvitations,
            seats_remaining: seatInfo.availableSeats
          }
        }
      });
    }

    const lemonSqueezySubscriptionId = subscriptionRecord.lemonsqueezy_subscription_id;
    console.log(`📡 Fetching subscription ${lemonSqueezySubscriptionId} from Lemon Squeezy...`);

    // Fetch real subscription data from Lemon Squeezy using stored ID
    try {
      const response = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${lemonSqueezySubscriptionId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
          'Accept': 'application/vnd.api+json'
        }
      });

      if (!response.ok) {
        throw new Error(`Lemon Squeezy API failed: ${response.status}`);
      }

      const data = await response.json();
      const lsAttrs = data.data.attributes;

      console.log(`✅ Found subscription: ${lsAttrs.variant_name} (${lsAttrs.first_subscription_item?.quantity || 'N/A'} seats)`);

      // Use current_seats from subscription record (this is the ACTUAL paid seat count)
      // For usage-based billing, current_seats reflects the actual usage records
      const actualPaidSeats = subscriptionRecord.current_seats || orgDetails.paid_seats;
      console.log(`💺 Using seat count: ${actualPaidSeats} (from subscriptions.current_seats)`);

      const seatInfo = calculateComprehensiveSeatInfo(
        actualPaidSeats,
        currentMembers,
        pendingInvitations
      );

      // Fetch real pricing from variant API using variant_id
      const variantId = lsAttrs.variant_id?.toString();
      let variantPrice = null;
      if (variantId) {
        try {
          variantPrice = await getVariantPrice(variantId);
          console.log(`💰 Fetched variant price: ${variantPrice?.price} ${variantPrice?.currency} (${variantPrice?.interval})`);
        } catch (error) {
          console.error('❌ Failed to fetch variant price:', error);
        }
      }

      const subscriptionData = {
        id: data.data.id,
        // Prefer database status for testing (allows manual status changes)
        status: subscriptionRecord.status || lsAttrs.status,
        status_formatted: lsAttrs.status_formatted,
        quantity: lsAttrs.first_subscription_item?.quantity || actualPaidSeats,
        current_period_start: lsAttrs.current_period_start,
        current_period_end: lsAttrs.current_period_end,
        renews_at: lsAttrs.renews_at,
        ends_at: lsAttrs.ends_at,
        // Prefer database trial_ends_at for testing
        trial_ends_at: subscriptionRecord.trial_ends_at || lsAttrs.trial_ends_at,
        product: {
          name: lsAttrs.product_name,
          description: lsAttrs.product_description
        },
        variant: {
          name: lsAttrs.variant_name,
          // Price must be in cents for frontend formatCurrency() which divides by 100
          // getVariantPrice() returns PLN (10.00), so multiply by 100 to get cents (1000)
          price: variantPrice ? Math.round(variantPrice.price * 100) : 1000, // Price per seat in cents
          currency: variantPrice?.currency || 'PLN',
          interval: variantPrice?.interval || 'month',
          quantity: lsAttrs.first_subscription_item?.quantity || actualPaidSeats
        },
        billing_info: {
          card_brand: lsAttrs.card_brand,
          card_last_four: lsAttrs.card_last_four,
          customer_portal_url: lsAttrs.urls?.customer_portal
        },
        test_mode: lsAttrs.test_mode,
        seat_info: {
          total_seats: seatInfo.totalSeats,
          paid_seats: seatInfo.paidSeats,
          free_seats: seatInfo.freeSeats,
          current_employees: seatInfo.currentActiveMembers,
          pending_invitations: seatInfo.pendingInvitations,
          seats_remaining: seatInfo.availableSeats
        }
      };

      // Add pause info if subscription is paused
      if (lsAttrs.pause) {
        subscriptionData['pause_info'] = lsAttrs.pause;
      }

      return NextResponse.json({
        success: true,
        subscription: subscriptionData
      });

    } catch (error) {
      console.error('❌ Failed to fetch from Lemon Squeezy:', error);
      console.log('🔄 Falling back to database subscription data...');

      // Use current_seats from subscription record (fallback scenario)
      const actualPaidSeats = subscriptionRecord.current_seats || orgDetails.paid_seats;

      const seatInfo = calculateComprehensiveSeatInfo(
        actualPaidSeats,
        currentMembers,
        pendingInvitations
      );

      // If Lemon Squeezy fails, return subscription info from our database
      const fallbackSubscriptionData = {
        id: subscriptionRecord.lemonsqueezy_subscription_id,
        status: 'active',
        status_formatted: 'Active',
        quantity: actualPaidSeats,
        product: {
          name: 'Leave Management System',
          description: 'Database subscription (Lemon Squeezy unavailable)'
        },
        variant: {
          name: 'Monthly Plan', // Default assumption
          price: 1299, // Default monthly price in cents
          quantity: actualPaidSeats
        },
        billing_info: {
          card_brand: null,
          card_last_four: null,
          customer_portal_url: null
        },
        test_mode: true,
        seat_info: {
          total_seats: seatInfo.totalSeats,
          paid_seats: seatInfo.paidSeats,
          free_seats: seatInfo.freeSeats,
          current_employees: seatInfo.currentActiveMembers,
          pending_invitations: seatInfo.pendingInvitations,
          seats_remaining: seatInfo.availableSeats
        }
      };

      return NextResponse.json({
        success: true,
        subscription: fallbackSubscriptionData
      });
    }

  } catch (error) {
    console.error('Subscription retrieval error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle unsupported HTTP methods
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export const PUT = POST;
export const DELETE = POST;
export const PATCH = POST;