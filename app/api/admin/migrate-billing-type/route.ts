/**
 * Admin Migration Endpoint: Update billing_type from quantity_based to usage_based
 *
 * SECURITY: This is a one-time migration endpoint
 * Should be removed after running successfully
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();

    // Update all quantity_based subscriptions to usage_based
    const { data, error, count } = await supabase
      .from('subscriptions')
      .update({
        billing_type: 'usage_based',
        updated_at: new Date().toISOString()
      })
      .eq('billing_type', 'quantity_based')
      .select('id, organization_id, billing_type');

    if (error) {
      console.error('Migration error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Get current state
    const { data: allSubscriptions, error: fetchError } = await supabase
      .from('subscriptions')
      .select('billing_type');

    if (fetchError) {
      console.error('Fetch error:', fetchError);
    }

    const billingTypeCounts = allSubscriptions?.reduce((acc: Record<string, number>, sub: any) => {
      acc[sub.billing_type] = (acc[sub.billing_type] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      message: `Updated ${data?.length || 0} subscription(s)`,
      updatedSubscriptions: data,
      currentState: billingTypeCounts
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Only allow POST
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to run migration.' },
    { status: 405 }
  );
}
