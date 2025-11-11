/**
 * Lemon Squeezy Webhook Utilities
 * 
 * Provides secure webhook signature verification and request validation
 * for Lemon Squeezy webhook events.
 */

import crypto from 'crypto';
import { NextRequest } from 'next/server';

export interface WebhookValidationResult {
  isValid: boolean;
  payload?: any;
  error?: string;
}

/**
 * Verifies HMAC-SHA256 webhook signature using timing-safe comparison
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!payload || !signature || !secret) {
    return false;
  }

  try {
    // Compute expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const receivedBuffer = Buffer.from(signature, 'hex');

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch (error) {
    console.error('Signature verification error:', error);
    throw error;
  }
}

/**
 * Extracts signature from X-Signature header
 */
export function extractSignatureFromHeader(request: NextRequest): string | null {
  const signatureHeader = request.headers.get('X-Signature') || 
                         request.headers.get('x-signature');
  
  if (!signatureHeader) {
    return null;
  }

  // Lemon Squeezy sends signatures in format "sha256=<hex_signature>"
  if (signatureHeader.startsWith('sha256=')) {
    return signatureHeader.substring(7);
  }

  // Return null for malformed headers
  return null;
}

/**
 * Validates webhook timestamp to prevent replay attacks
 */
export function validateWebhookTimestamp(
  payload: any,
  toleranceSeconds: number = 300 // 5 minutes default
): boolean {
  const timestamp = payload?.meta?.timestamp;
  
  if (!timestamp) {
    // If no timestamp provided, allow (depends on webhook configuration)
    return true;
  }

  const now = Date.now();
  const timeDiff = Math.abs(now - timestamp) / 1000; // Convert to seconds
  
  return timeDiff <= toleranceSeconds;
}

/**
 * Validates complete webhook request including signature and payload
 */
export async function validateWebhookRequest(
  request: NextRequest
): Promise<WebhookValidationResult> {
  try {
    // Check webhook secret configuration
    const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('🔒 [Webhook Validation] Failed: Webhook secret not configured');
      return {
        isValid: false,
        error: 'Webhook secret not configured'
      };
    }

    // Extract signature from header
    const rawSignatureHeader = request.headers.get('X-Signature') || request.headers.get('x-signature');
    const signature = extractSignatureFromHeader(request);

    console.log('🔍 [Webhook Validation] Signature check:', {
      rawHeader: rawSignatureHeader,
      extractedSignature: signature ? `${signature.substring(0, 10)}...` : null,
      hasSignature: !!signature
    });

    if (!signature) {
      console.error('🔒 [Webhook Validation] Failed: Missing or malformed webhook signature', {
        rawHeader: rawSignatureHeader
      });
      return {
        isValid: false,
        error: 'Missing webhook signature'
      };
    }

    // Get request body
    const body = await request.text();

    console.log('📦 [Webhook Validation] Body received:', {
      bodyLength: body.length,
      bodyPreview: body.substring(0, 100)
    });

    // Verify signature
    const isSignatureValid = verifyWebhookSignature(body, signature, webhookSecret);

    console.log('🔐 [Webhook Validation] Signature verification:', {
      isValid: isSignatureValid,
      signatureLength: signature.length,
      secretConfigured: !!webhookSecret,
      secretLength: webhookSecret.length
    });

    if (!isSignatureValid) {
      console.error('🔒 [Webhook Validation] Failed: Invalid webhook signature', {
        receivedSignature: `${signature.substring(0, 10)}...`,
        bodyLength: body.length
      });
      return {
        isValid: false,
        error: 'Invalid webhook signature'
      };
    }

    // Parse JSON payload
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (error) {
      console.error('🔒 [Webhook Validation] Failed: Invalid JSON payload', {
        error: error instanceof Error ? error.message : 'Unknown error',
        bodyPreview: body.substring(0, 200)
      });
      return {
        isValid: false,
        error: 'Invalid JSON payload'
      };
    }

    console.log('📋 [Webhook Validation] Parsed payload:', {
      eventName: payload?.meta?.event_name,
      subscriptionId: payload?.data?.id,
      testMode: payload?.meta?.test_mode
    });

    // Validate timestamp if present
    if (!validateWebhookTimestamp(payload)) {
      console.error('🔒 [Webhook Validation] Failed: Webhook timestamp too old', {
        timestamp: payload?.meta?.timestamp,
        now: Date.now()
      });
      return {
        isValid: false,
        error: 'Webhook timestamp too old (possible replay attack)'
      };
    }

    console.log('✅ [Webhook Validation] Success:', {
      eventName: payload?.meta?.event_name,
      subscriptionId: payload?.data?.id
    });

    return {
      isValid: true,
      payload
    };

  } catch (error) {
    console.error('❌ [Webhook Validation] Exception:', error);
    return {
      isValid: false,
      error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Rate limiting for webhook endpoints
 */
export class WebhookRateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts = 100, windowMs = 60000) { // 100 requests per minute
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record || now > record.resetTime) {
      // Reset or create new record
      this.attempts.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return false;
    }

    if (record.count >= this.maxAttempts) {
      return true;
    }

    record.count++;
    return false;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.attempts.entries()) {
      if (now > record.resetTime) {
        this.attempts.delete(key);
      }
    }
  }
}

// Global rate limiter instance
export const webhookRateLimiter = new WebhookRateLimiter();

// Clean up rate limiter periodically
setInterval(() => {
  webhookRateLimiter.cleanup();
}, 60000); // Clean up every minute