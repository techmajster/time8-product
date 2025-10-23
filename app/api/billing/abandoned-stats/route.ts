/**
 * Abandoned Checkout Statistics Endpoint
 *
 * Provides statistics about abandoned checkout sessions.
 * ADMIN-ONLY: This endpoint returns system-wide billing statistics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateAndGetOrgContext, requireRole } from '@/lib/auth-utils-v2';

/**
 * GET handler for abandoned checkout statistics
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Admin-only endpoint for system-wide billing statistics
    const auth = await authenticateAndGetOrgContext();
    if (!auth.success) {
      return auth.error;
    }

    const { context } = auth;
    const roleCheck = requireRole(context, ['admin']);
    if (roleCheck) {
      return roleCheck;
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    if (days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Days parameter must be between 1 and 365' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // Get abandoned checkouts in the period
    const { data: abandonedEvents, error: abandonedError } = await supabase
      .from('billing_events')
      .select('checkout_id, created_at, event_data')
      .eq('event_type', 'checkout.abandoned')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (abandonedError) {
      console.error('Failed to fetch abandoned events:', abandonedError);
      return NextResponse.json(
        { error: 'Failed to fetch abandoned checkout statistics', details: abandonedError },
        { status: 500 }
      );
    }

    // Get total checkouts created in the period for abandonment rate calculation
    const { data: totalEvents, error: totalError } = await supabase
      .from('billing_events')
      .select('checkout_id, created_at, event_data')
      .eq('event_type', 'checkout.created')
      .gte('created_at', startDate.toISOString());

    if (totalError) {
      console.error('Failed to fetch total checkout events:', totalError);
      return NextResponse.json(
        { error: 'Failed to fetch total checkout statistics', details: totalError },
        { status: 500 }
      );
    }

    const abandonedCheckouts = abandonedEvents || [];
    const totalCheckouts = totalEvents || [];
    
    // Calculate basic statistics
    const totalAbandoned = abandonedCheckouts.length;
    const totalCreated = totalCheckouts.length;
    const abandonmentRate = totalCreated > 0 ? (totalAbandoned / totalCreated) * 100 : 0;

    // For value calculations, we would need price variant data
    // For now, we'll estimate based on common pricing
    const estimatedAverageValue = 50; // Average EUR value per checkout
    const totalEstimatedValue = totalAbandoned * estimatedAverageValue;

    const statistics = {
      period_days: days,
      total_checkouts_created: totalCreated,
      total_abandoned: totalAbandoned,
      abandonment_rate: Math.round(abandonmentRate * 100) / 100, // Round to 2 decimal places
      total_value: totalEstimatedValue,
      average_value: totalAbandoned > 0 ? estimatedAverageValue : 0,
      currency: 'EUR',
      period_start: startDate.toISOString(),
      period_end: new Date().toISOString()
    };

    console.log('📊 Abandoned checkout stats:', statistics);

    return NextResponse.json({
      success: true,
      statistics
    });

  } catch (error) {
    console.error('Abandoned stats error:', error);
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