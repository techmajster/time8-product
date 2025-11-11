/**
 * Customer Portal Endpoint
 *
 * Generates customer portal URL for subscription management.
 * Allows users to update payment methods, view invoices, and manage subscriptions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authenticateAndGetOrgContext } from '@/lib/auth-utils-v2';

interface LocalSubscription {
  id: string;
  organization_id: string;
  lemonsqueezy_subscription_id: string;
  status: string;
}

/**
 * GET handler for retrieving customer portal URL
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Validate user belongs to organization before accessing billing
    const auth = await authenticateAndGetOrgContext();
    if (!auth.success) {
      return auth.error;
    }

    const { context } = auth;
    const { organization } = context;
    const organizationId = organization.id;

    const supabase = await createClient();

    // Fetch active subscription for organization
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('lemonsqueezy_subscription_id, status')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'paused', 'past_due']) // Include paused and past_due for portal access
      .single();

    if (subError && subError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw subError;
    }

    // No active subscription found
    if (!subscription) {
      return NextResponse.json(
        { 
          error: 'No active subscription found',
          message: 'Organization must have an active subscription to access customer portal'
        },
        { status: 404 }
      );
    }

    const localSub = subscription as LocalSubscription;

    // Fetch the signed customer portal URL from LemonSqueezy API
    const lsResponse = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${localSub.lemonsqueezy_subscription_id}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
          'Accept': 'application/vnd.api+json'
        }
      }
    );

    if (!lsResponse.ok) {
      throw new Error(`LemonSqueezy API failed: ${lsResponse.status}`);
    }

    const lsData = await lsResponse.json();
    const customerPortalUrl = lsData.data.attributes.urls?.customer_portal;

    if (!customerPortalUrl) {
      return NextResponse.json(
        {
          error: 'Customer portal URL not available',
          message: 'Could not retrieve customer portal URL from LemonSqueezy'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      portal_url: customerPortalUrl,
      subscription_id: localSub.lemonsqueezy_subscription_id,
      subscription_status: localSub.status
    });

  } catch (error) {
    console.error('Customer portal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST handler for generating customer portal URL with return URL
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

    // Parse request body for optional return_url
    let body: { return_url?: string } = {};
    try {
      body = await request.json();
    } catch (error) {
      // Body is optional - only used for return_url
    }

    const { return_url } = body;

    const supabase = await createClient();

    // Fetch active subscription for organization
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('lemonsqueezy_subscription_id, status')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'paused', 'past_due'])
      .single();

    if (subError && subError.code !== 'PGRST116') {
      throw subError;
    }

    // No active subscription found
    if (!subscription) {
      return NextResponse.json(
        { 
          error: 'No active subscription found',
          message: 'Organization must have an active subscription to access customer portal'
        },
        { status: 404 }
      );
    }

    const localSub = subscription as LocalSubscription;

    // Fetch the signed customer portal URL from LemonSqueezy API
    const lsResponse = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${localSub.lemonsqueezy_subscription_id}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
          'Accept': 'application/vnd.api+json'
        }
      }
    );

    if (!lsResponse.ok) {
      throw new Error(`LemonSqueezy API failed: ${lsResponse.status}`);
    }

    const lsData = await lsResponse.json();
    const customerPortalUrl = lsData.data.attributes.urls?.customer_portal;

    if (!customerPortalUrl) {
      return NextResponse.json(
        {
          error: 'Customer portal URL not available',
          message: 'Could not retrieve customer portal URL from LemonSqueezy'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      portal_url: customerPortalUrl,
      subscription_id: localSub.lemonsqueezy_subscription_id,
      subscription_status: localSub.status,
      return_url: return_url || null
    });

  } catch (error) {
    console.error('Customer portal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle unsupported HTTP methods
 */
export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export const DELETE = PUT;
export const PATCH = PUT;