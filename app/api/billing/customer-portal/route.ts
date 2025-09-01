/**
 * Customer Portal Endpoint
 * 
 * Generates customer portal URL for subscription management.
 * Allows users to update payment methods, view invoices, and manage subscriptions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    // Get organization ID from query parameters
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Missing required parameter: organization_id' },
        { status: 400 }
      );
    }

    const supabase = createClient();

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

    // Generate customer portal URL
    // Lemon Squeezy customer portal URLs follow the pattern:
    // https://[store-slug].lemonsqueezy.com/billing?subscription=[subscription_id]
    const portalUrl = `https://billing.lemonsqueezy.com/subscription/${localSub.lemonsqueezy_subscription_id}`;

    return NextResponse.json({
      success: true,
      portal_url: portalUrl,
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
    // Parse request body
    let body: { organization_id: string; return_url?: string };
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request payload' },
        { status: 400 }
      );
    }

    const { organization_id, return_url } = body;

    if (!organization_id) {
      return NextResponse.json(
        { 
          error: 'Missing required parameter',
          required: ['organization_id']
        },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Fetch active subscription for organization
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('lemonsqueezy_subscription_id, status')
      .eq('organization_id', organization_id)
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

    // Generate customer portal URL with optional return URL
    let portalUrl = `https://billing.lemonsqueezy.com/subscription/${localSub.lemonsqueezy_subscription_id}`;
    
    if (return_url) {
      const encodedReturnUrl = encodeURIComponent(return_url);
      portalUrl += `?return_url=${encodedReturnUrl}`;
    }

    return NextResponse.json({
      success: true,
      portal_url: portalUrl,
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