/**
 * Subscription Retrieval Endpoint
 * 
 * Retrieves subscription information using stored Lemon Squeezy subscription ID.
 * Follows best practice: store subscription ID locally + fetch real data from Lemon Squeezy.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

/**
 * Calculate seat information (same as checkout)
 */
function calculateSeatInfo(paidSeats: number, currentEmployees: number) {
  const FREE_SEATS = 3;
  const totalSeats = paidSeats + FREE_SEATS;
  const seatsRemaining = totalSeats - currentEmployees;

  return {
    total_seats: totalSeats,
    paid_seats: paidSeats,
    free_seats: FREE_SEATS,
    current_employees: currentEmployees,
    seats_remaining: Math.max(0, seatsRemaining)
  };
}

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

    // Get organization ID from query parameters
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Missing required parameter: organization_id' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get organization with subscription data
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, subscription_tier, paid_seats')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      console.error('Organization not found:', orgError);
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

    // Check subscription based on database fields
    if (organization.subscription_tier === 'free' || organization.paid_seats === 0) {
      // Return free tier
      return NextResponse.json({
        success: true,
        subscription: null,
        organization_info: {
          id: organization.id,
          name: organization.name,
          seat_info: calculateSeatInfo(0, currentMembers) // Free tier: 0 paid + 3 free = 3 total
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
      return NextResponse.json({
        success: true,
        subscription: null,
        organization_info: {
          id: organization.id,
          name: organization.name,
          seat_info: calculateSeatInfo(organization.paid_seats, currentMembers)
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
      
      const subscriptionData = {
        id: data.data.id,
        status: lsAttrs.status,
        status_formatted: lsAttrs.status_formatted,
        quantity: lsAttrs.first_subscription_item?.quantity || organization.paid_seats,
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
          quantity: lsAttrs.first_subscription_item?.quantity || organization.paid_seats
        },
        billing_info: {
          card_brand: lsAttrs.card_brand,
          card_last_four: lsAttrs.card_last_four,
          customer_portal_url: lsAttrs.urls?.customer_portal
        },
        test_mode: lsAttrs.test_mode,
        seat_info: calculateSeatInfo(organization.paid_seats, currentMembers)
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
      
      // If Lemon Squeezy fails, return subscription info from our database
      const fallbackSubscriptionData = {
        id: subscriptionRecord.lemonsqueezy_subscription_id,
        status: 'active',
        status_formatted: 'Active',
        quantity: organization.paid_seats + 3, // Convert paid seats back to total users
        product: {
          name: 'Leave Management System',
          description: 'Database subscription (Lemon Squeezy unavailable)'
        },
        variant: {
          name: 'Monthly Plan', // Default assumption
          price: 1299, // Default monthly price in cents
          quantity: organization.paid_seats + 3
        },
        billing_info: {
          card_brand: null,
          card_last_four: null,
          customer_portal_url: null
        },
        test_mode: true,
        seat_info: calculateSeatInfo(organization.paid_seats, currentMembers)
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