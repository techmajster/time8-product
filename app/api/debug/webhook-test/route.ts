/**
 * Webhook Test Endpoint
 * 
 * Simulates a Lemon Squeezy webhook for testing purposes.
 * Only available in development mode.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoints not available in production' },
      { status: 404 }
    );
  }
    try {
      const body = await request.json();
      const { event_type = 'subscription_created', organization_id, test_data } = body;

      // Create test webhook payload
      const testPayload = {
        meta: {
          event_name: event_type,
          event_id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          webhook_id: 'test-webhook-id',
          created_at: new Date().toISOString()
        },
        data: test_data || {
          id: '12345',
          type: 'subscriptions',
          attributes: {
            status: 'active',
            quantity: 5,
            renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
            ends_at: null,
            trial_ends_at: null,
            customer_id: 67890,
            variant_id: 11111,
            product_id: 22222,
            store_id: parseInt(process.env.LEMONSQUEEZY_STORE_ID || '0'),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }
      };

      // Generate test signature (for development only)
      const crypto = await import('crypto');
      const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || 'test-secret';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(testPayload))
        .digest('hex');

      // Send to our webhook endpoint
      const webhookUrl = `${request.nextUrl.origin}/api/webhooks/lemonsqueezy`;
      
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': `sha256=${signature}`,
          'User-Agent': 'LemonSqueezy/1.0'
        },
        body: JSON.stringify(testPayload)
      });

      const webhookResult = await webhookResponse.json();

      return NextResponse.json({
        success: true,
        test_webhook: {
          event_type,
          payload: testPayload,
          signature,
          webhook_response: {
            status: webhookResponse.status,
            data: webhookResult
          }
        }
      });

    } catch (error) {
      console.error('Webhook test error:', error);
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoints not available in production' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    message: 'Webhook Test Endpoint',
    description: 'Use POST to simulate webhook events',
    example_payload: {
      event_type: 'subscription_created',
      organization_id: 'your-org-id',
      test_data: {
        // Optional custom test data
      }
    }
  });
}

// Handle other HTTP methods
export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export const DELETE = PUT;
export const PATCH = PUT;