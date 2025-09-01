/**
 * Lemon Squeezy Webhook Handler
 * 
 * Securely processes webhook events from Lemon Squeezy for billing operations.
 * Handles subscription lifecycle events: created, updated, cancelled.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateWebhookRequest, webhookRateLimiter } from './utils';
import {
  processSubscriptionCreated,
  processSubscriptionUpdated,
  processSubscriptionCancelled,
  logBillingEvent
} from './handlers';

/**
 * POST handler for Lemon Squeezy webhook events
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get client IP for rate limiting
    const clientIP = request.ip || 
                    request.headers.get('x-forwarded-for')?.split(',')[0] || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    // Check rate limiting
    if (webhookRateLimiter.isRateLimited(clientIP)) {
      console.warn(`Webhook rate limit exceeded for IP: ${clientIP}`);
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Validate webhook request (signature, payload, etc.)
    const validation = await validateWebhookRequest(request);
    if (!validation.isValid) {
      console.error('Webhook validation failed:', validation.error);
      return NextResponse.json(
        { error: 'Webhook validation failed' },
        { status: 401 }
      );
    }

    const { payload } = validation;
    const eventType = payload?.meta?.event_name;
    const eventId = payload?.meta?.event_id;

    // Log webhook receipt
    console.log(`Received webhook: ${eventType} (${eventId})`);

    // Process event based on type
    let result;
    switch (eventType) {
      case 'subscription_created':
        result = await processSubscriptionCreated(payload);
        break;

      case 'subscription_updated':
        result = await processSubscriptionUpdated(payload);
        break;

      case 'subscription_cancelled':
        result = await processSubscriptionCancelled(payload);
        break;

      case 'subscription_expired':
        // Handle expired subscriptions same as cancelled
        result = await processSubscriptionCancelled(payload);
        break;

      default:
        // Log unsupported event types for monitoring
        await logBillingEvent(
          eventType || 'unknown',
          eventId || 'unknown',
          payload,
          'skipped',
          `Unsupported event type: ${eventType}`
        );
        
        console.log(`Unsupported webhook event type: ${eventType}`);
        return NextResponse.json(
          { message: 'Event type not supported', eventType },
          { status: 200 } // Return 200 to prevent retries
        );
    }

    // Handle processing result
    if (result.success) {
      const processingTime = Date.now() - startTime;
      console.log(`Webhook ${eventType} processed successfully in ${processingTime}ms`);
      
      return NextResponse.json(
        {
          message: 'Webhook processed successfully',
          eventType,
          eventId,
          processingTime: `${processingTime}ms`,
          data: result.data
        },
        { status: 200 }
      );
    } else {
      console.error(`Webhook ${eventType} processing failed:`, result.error);
      
      return NextResponse.json(
        {
          error: 'Webhook processing failed',
          eventType,
          eventId,
          details: result.error
        },
        { status: 500 }
      );
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Webhook handler error:', error);

    // Log critical error
    try {
      await logBillingEvent(
        'webhook_error',
        'unknown',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'failed',
        `Critical webhook handler error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } catch (logError) {
      console.error('Failed to log webhook error:', logError);
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        processingTime: `${processingTime}ms`
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler for webhook health check
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      message: 'Lemon Squeezy webhook endpoint is healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET ? 'configured' : 'missing'
    },
    { status: 200 }
  );
}

/**
 * Handle other HTTP methods
 */
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    { message: 'Method not allowed' },
    { 
      status: 405,
      headers: {
        'Allow': 'GET, POST'
      }
    }
  );
}

// Explicitly handle unsupported methods
export const PUT = OPTIONS;
export const DELETE = OPTIONS;
export const PATCH = OPTIONS;