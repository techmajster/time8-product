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

    // Count active members using service client to bypass RLS
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: members, count: memberCount, error: memberError } = await serviceClient
      .from('user_organizations')
      .select('user_id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (memberError) {
      console.error('❌ Member count query failed:', memberError);
    }

    const currentMembers = memberCount || 1; // Default to 1 if count fails

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

    // Check subscription based on database fields
    if (orgDetails.subscription_tier === 'free' || orgDetails.paid_seats === 0) {
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

    // Get subscription record from database (contains stored Lemon Squeezy subscription ID)
    const { data: subscriptionRecord, error: subError } = await supabase
      .from('subscriptions')
      .select('lemonsqueezy_subscription_id')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single();

    if (subError || !subscriptionRecord) {
      console.error('❌ No subscription record found:', subError);
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

      const seatInfo = calculateComprehensiveSeatInfo(
        orgDetails.paid_seats,
        currentMembers,
        pendingInvitations
      );

      const subscriptionData = {
        id: data.data.id,
        status: lsAttrs.status,
        status_formatted: lsAttrs.status_formatted,
        quantity: lsAttrs.first_subscription_item?.quantity || orgDetails.paid_seats,
        current_period_start: lsAttrs.current_period_start,
        current_period_end: lsAttrs.current_period_end,
        renews_at: lsAttrs.renews_at,
        ends_at: lsAttrs.ends_at,
        trial_ends_at: lsAttrs.trial_ends_at,
        product: {
          name: lsAttrs.product_name,
          description: lsAttrs.product_description
        },
        variant: {
          name: lsAttrs.variant_name,
          price: lsAttrs.first_subscription_item?.price_id || 0, // Real price from Lemon Squeezy
          quantity: lsAttrs.first_subscription_item?.quantity || orgDetails.paid_seats
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

      const seatInfo = calculateComprehensiveSeatInfo(
        orgDetails.paid_seats,
        currentMembers,
        pendingInvitations
      );

      // If Lemon Squeezy fails, return subscription info from our database
      const fallbackSubscriptionData = {
        id: subscriptionRecord.lemonsqueezy_subscription_id,
        status: 'active',
        status_formatted: 'Active',
        quantity: orgDetails.paid_seats + 3, // Convert paid seats back to total users
        product: {
          name: 'Leave Management System',
          description: 'Database subscription (Lemon Squeezy unavailable)'
        },
        variant: {
          name: 'Monthly Plan', // Default assumption
          price: 1299, // Default monthly price in cents
          quantity: orgDetails.paid_seats + 3
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