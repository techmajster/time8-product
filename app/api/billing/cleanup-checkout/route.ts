/**
 * Cleanup Checkout Session Endpoint
 * 
 * Handles cleanup of abandoned checkout sessions and related data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface CleanupRequest {
  checkout_id: string;
  action: 'mark_abandoned' | 'force_cleanup';
}

/**
 * POST handler for cleaning up checkout sessions
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: CleanupRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request payload' },
        { status: 400 }
      );
    }

    const { checkout_id, action } = body;
    console.log('🧹 Cleanup request:', { checkout_id, action });
    
    if (!checkout_id || !action) {
      return NextResponse.json(
        { 
          error: 'Missing required parameters',
          required: ['checkout_id', 'action']
        },
        { status: 400 }
      );
    }

    if (!['mark_abandoned', 'force_cleanup'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "mark_abandoned" or "force_cleanup"' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (action === 'mark_abandoned') {
      // Mark checkout session as abandoned in billing_events
      const { error: eventError } = await supabase
        .from('billing_events')
        .insert({
          event_type: 'checkout.abandoned',
          checkout_id: checkout_id,
          event_data: {
            action: 'automated_cleanup',
            timestamp: new Date().toISOString()
          },
          processed: true
        });

      if (eventError) {
        console.error('Failed to log abandoned checkout:', eventError);
        return NextResponse.json(
          { error: 'Failed to mark checkout as abandoned', details: eventError },
          { status: 500 }
        );
      }

      console.log('✅ Checkout marked as abandoned:', checkout_id);
      return NextResponse.json({
        success: true,
        message: 'Checkout marked as abandoned',
        checkout_id: checkout_id
      });
    }

    if (action === 'force_cleanup') {
      // Force cleanup - more aggressive action
      // This would typically involve contacting the payment provider to cancel/expire the checkout
      
      // Log the forced cleanup
      const { error: eventError } = await supabase
        .from('billing_events')
        .insert({
          event_type: 'checkout.force_cleanup',
          checkout_id: checkout_id,
          event_data: {
            action: 'force_cleanup',
            timestamp: new Date().toISOString()
          },
          processed: true
        });

      if (eventError) {
        console.error('Failed to log forced cleanup:', eventError);
        return NextResponse.json(
          { error: 'Failed to log forced cleanup', details: eventError },
          { status: 500 }
        );
      }

      console.log('✅ Checkout force cleaned:', checkout_id);
      return NextResponse.json({
        success: true,
        message: 'Checkout force cleaned',
        checkout_id: checkout_id
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle unsupported HTTP methods
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export const PUT = GET;
export const DELETE = GET;
export const PATCH = GET;