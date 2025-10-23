# Webhook Security Patterns

> Created: 2025-10-23
> Status: Active
> Related: Multi-Workspace Isolation Audit - Sprint 3

## Overview

This document defines security patterns for webhook endpoints in multi-workspace applications. Webhooks are special API routes that receive external requests from third-party services (payment providers, notification services, etc.) and require different security considerations than standard authenticated endpoints.

## Key Differences from Standard API Routes

| Aspect | Standard API Routes | Webhook Routes |
|--------|-------------------|----------------|
| **Authentication** | User session/token | Signature verification |
| **Authorization** | Role-based (admin/manager/employee) | Source validation (IP, signature) |
| **Workspace Context** | Active organization cookie | Derived from webhook payload |
| **Rate Limiting** | Per-user basis | Per-IP or per-service basis |
| **Error Handling** | User-friendly messages | Service-specific retry logic |

## Security Layers for Webhooks

### 1. Signature Verification

**Purpose**: Verify the webhook request genuinely comes from the claimed service

**Implementation** (LemonSqueezy example):

```typescript
import crypto from 'crypto'

export async function validateWebhookRequest(request: NextRequest) {
  const signature = request.headers.get('x-signature')
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET

  if (!signature || !secret) {
    return {
      isValid: false,
      error: 'Missing signature or secret'
    }
  }

  const rawBody = await request.text()
  const hmac = crypto.createHmac('sha256', secret)
  const digest = hmac.update(rawBody).digest('hex')

  if (digest !== signature) {
    return {
      isValid: false,
      error: 'Invalid signature'
    }
  }

  return {
    isValid: true,
    payload: JSON.parse(rawBody)
  }
}
```

**Key Points**:
- ✅ Always verify signatures before processing
- ✅ Use environment variables for webhook secrets
- ✅ Compare signatures with constant-time comparison to prevent timing attacks
- ❌ Never trust webhook payloads without verification

### 2. Rate Limiting

**Purpose**: Prevent abuse and DDoS attacks on webhook endpoints

**Implementation**:

```typescript
class WebhookRateLimiter {
  private requests: Map<string, number[]> = new Map()
  private readonly maxRequests: number = 100 // per window
  private readonly windowMs: number = 60000 // 1 minute

  isRateLimited(identifier: string): boolean {
    const now = Date.now()
    const requests = this.requests.get(identifier) || []

    // Clean old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs)

    if (validRequests.length >= this.maxRequests) {
      return true
    }

    validRequests.push(now)
    this.requests.set(identifier, validRequests)
    return false
  }
}

export const webhookRateLimiter = new WebhookRateLimiter()
```

**Usage**:

```typescript
export async function POST(request: NextRequest) {
  const clientIP = request.ip ||
                   request.headers.get('x-forwarded-for')?.split(',')[0] ||
                   'unknown'

  if (webhookRateLimiter.isRateLimited(clientIP)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  // Process webhook...
}
```

**Key Points**:
- ✅ Rate limit by IP address or service identifier
- ✅ Use appropriate limits (higher than normal user traffic)
- ✅ Clean up old rate limit data to prevent memory leaks
- ✅ Return 429 status code for rate limit violations

### 3. IP Whitelisting (Optional)

**Purpose**: Restrict webhook access to known IP ranges

**When to Use**:
- When webhook provider publishes their IP ranges
- For additional security layer
- In high-security environments

**Implementation**:

```typescript
const ALLOWED_IP_RANGES = [
  '192.168.1.0/24',
  '10.0.0.0/8'
]

function isIPAllowed(ip: string): boolean {
  // Implement CIDR matching logic
  // Return true if IP is in allowed ranges
  return ALLOWED_IP_RANGES.some(range => isIPInRange(ip, range))
}

export async function POST(request: NextRequest) {
  const clientIP = request.ip || request.headers.get('x-real-ip')

  if (!isIPAllowed(clientIP)) {
    console.warn(`Webhook from unauthorized IP: ${clientIP}`)
    return NextResponse.json(
      { error: 'Unauthorized IP' },
      { status: 403 }
    )
  }

  // Process webhook...
}
```

**Key Points**:
- ✅ Only use when provider's IP ranges are stable
- ✅ Document IP ranges in environment variables
- ✅ Plan for IP range updates
- ⚠️ Don't rely solely on IP whitelisting (IPs can be spoofed)

### 4. Idempotency

**Purpose**: Prevent duplicate processing of the same webhook event

**Implementation**:

```typescript
import { createAdminClient } from '@/lib/supabase/server'

export async function processWebhookEvent(eventId: string, eventType: string, payload: any) {
  const adminClient = await createAdminClient()

  // Check if event already processed
  const { data: existingEvent } = await adminClient
    .from('billing_events')
    .select('id, processed')
    .eq('event_id', eventId)
    .eq('event_type', eventType)
    .single()

  if (existingEvent?.processed) {
    console.log(`Event ${eventId} already processed, skipping`)
    return {
      success: true,
      message: 'Event already processed'
    }
  }

  // Process event...

  // Mark as processed
  await adminClient
    .from('billing_events')
    .upsert({
      event_id: eventId,
      event_type: eventType,
      event_data: payload,
      processed: true,
      processed_at: new Date().toISOString()
    })

  return { success: true }
}
```

**Key Points**:
- ✅ Always check for duplicate events before processing
- ✅ Use unique event IDs provided by webhook service
- ✅ Store processed event IDs permanently
- ✅ Handle race conditions (use database constraints)

### 5. Organization Context Resolution

**Purpose**: Determine which organization a webhook event belongs to

**Pattern**: Extract organization ID from webhook payload

```typescript
export async function processSubscriptionCreated(payload: any) {
  const adminClient = await createAdminClient()

  // Extract organization data from custom field
  const customData = JSON.parse(payload.meta?.custom_data || '{}')
  const organizationData = JSON.parse(customData.organization_data || '{}')
  const organizationId = organizationData.id

  if (!organizationId) {
    console.error('No organization ID in webhook payload')
    return {
      success: false,
      error: 'Missing organization ID'
    }
  }

  // Verify organization exists
  const { data: org, error: orgError } = await adminClient
    .from('organizations')
    .select('id, name')
    .eq('id', organizationId)
    .single()

  if (orgError || !org) {
    console.error(`Organization ${organizationId} not found`)
    return {
      success: false,
      error: 'Organization not found'
    }
  }

  // Process subscription for this organization
  // ...
}
```

**Key Points**:
- ✅ Always include organization ID in webhook metadata
- ✅ Validate organization exists before processing
- ✅ Use admin client to bypass RLS (webhooks don't have user context)
- ✅ Always scope database operations to the resolved organization

### 6. Error Handling and Retry Logic

**Purpose**: Handle failures gracefully and work with webhook provider's retry mechanisms

**Implementation**:

```typescript
export async function POST(request: NextRequest) {
  try {
    // Validation and processing...

    if (result.success) {
      // Return 200-299 to prevent retries
      return NextResponse.json(
        { message: 'Webhook processed successfully' },
        { status: 200 }
      )
    } else {
      // Return 500 to trigger retry (if temporary failure)
      if (result.error?.includes('temporary')) {
        return NextResponse.json(
          { error: 'Temporary failure, please retry' },
          { status: 500 }
        )
      }

      // Return 400 for permanent failures (no retry)
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Webhook processing error:', error)

    // Return 500 for unexpected errors (will trigger retry)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Status Codes**:
- `200-299`: Success, no retry
- `400-499`: Client error, no retry (invalid data)
- `500-599`: Server error, will retry

**Key Points**:
- ✅ Return 2xx for successful processing (prevents retries)
- ✅ Return 4xx for permanent failures (invalid payload)
- ✅ Return 5xx for temporary failures (triggers retry)
- ✅ Log all errors with context for debugging

### 7. Logging and Monitoring

**Purpose**: Track webhook activity for debugging and security monitoring

**Implementation**:

```typescript
export async function logBillingEvent(
  eventType: string,
  eventId: string,
  payload: any,
  status: 'success' | 'failed' | 'skipped',
  errorMessage?: string
) {
  const adminClient = await createAdminClient()

  await adminClient
    .from('billing_events')
    .insert({
      event_type: eventType,
      event_id: eventId,
      event_data: payload,
      processed: status === 'success',
      error_message: errorMessage,
      created_at: new Date().toISOString()
    })
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Process webhook...

    const processingTime = Date.now() - startTime
    console.log(`Webhook ${eventType} processed in ${processingTime}ms`)

    await logBillingEvent(eventType, eventId, payload, 'success')

    return NextResponse.json({ message: 'Success' })

  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error(`Webhook ${eventType} failed after ${processingTime}ms:`, error)

    await logBillingEvent(
      eventType,
      eventId,
      payload,
      'failed',
      error instanceof Error ? error.message : 'Unknown error'
    )

    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

**What to Log**:
- ✅ Event type and ID
- ✅ Processing time
- ✅ Success/failure status
- ✅ Error messages (but sanitize sensitive data)
- ✅ Organization ID (for scoping)
- ❌ Don't log sensitive data (payment details, tokens)

## Security Checklist for Webhook Routes

Before deploying webhook endpoints, verify:

- [ ] **Signature Verification**: Validates request authenticity
- [ ] **Rate Limiting**: Prevents abuse and DDoS
- [ ] **Idempotency**: Prevents duplicate processing
- [ ] **Organization Resolution**: Correctly determines workspace context
- [ ] **Error Handling**: Returns appropriate status codes
- [ ] **Logging**: Tracks all webhook activity
- [ ] **Environment Variables**: Webhook secrets stored securely
- [ ] **Testing**: Verified with test webhooks from provider
- [ ] **Monitoring**: Alerts for webhook failures
- [ ] **Documentation**: Webhook URL and setup documented

## Testing Webhooks

### Local Testing

```bash
# Use webhook provider's test mode
curl -X POST http://localhost:3000/api/webhooks/lemonsqueezy \
  -H "Content-Type: application/json" \
  -H "X-Signature: <test-signature>" \
  -d @test-webhook-payload.json
```

### Integration Testing

```typescript
describe('Webhook Security', () => {
  test('should reject requests with invalid signature', async () => {
    const request = createMockWebhookRequest({
      payload: { event_name: 'subscription_created' },
      signature: 'invalid-signature'
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  test('should enforce rate limiting', async () => {
    const requests = Array(101).fill(null)

    for (const _ of requests) {
      const request = createMockWebhookRequest({ ip: '1.2.3.4' })
      const response = await POST(request)

      if (requests.indexOf(_) < 100) {
        expect(response.status).not.toBe(429)
      } else {
        expect(response.status).toBe(429)
      }
    }
  })

  test('should prevent duplicate processing', async () => {
    const payload = {
      meta: { event_id: 'evt_123', event_name: 'subscription_created' },
      data: { /* subscription data */ }
    }

    const request1 = createMockWebhookRequest({ payload })
    const request2 = createMockWebhookRequest({ payload })

    await POST(request1)
    const response2 = await POST(request2)

    // Second request should be acknowledged but not reprocessed
    expect(response2.status).toBe(200)
    // Verify only one subscription was created
  })
})
```

## Common Pitfalls

### ❌ Don't Use Standard Auth Pattern

```typescript
// ❌ WRONG - Webhooks don't have user sessions
const auth = await authenticateAndGetOrgContext()
if (!auth.success) {
  return auth.error
}
```

### ✅ Use Webhook-Specific Validation

```typescript
// ✅ CORRECT - Verify webhook signature
const validation = await validateWebhookRequest(request)
if (!validation.isValid) {
  return NextResponse.json({ error: 'Invalid webhook' }, { status: 401 })
}

// Extract organization from payload
const organizationId = extractOrganizationId(validation.payload)
```

### ❌ Don't Rely on Workspace Cookie

```typescript
// ❌ WRONG - Webhooks don't send cookies
const cookieStore = await cookies()
const activeOrgId = cookieStore.get('active-organization-id')?.value
```

### ✅ Extract Organization from Payload

```typescript
// ✅ CORRECT - Get organization from webhook data
const customData = JSON.parse(payload.meta?.custom_data || '{}')
const organizationData = JSON.parse(customData.organization_data || '{}')
const organizationId = organizationData.id
```

## Example: Complete Webhook Handler

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { validateWebhookRequest, webhookRateLimiter } from './utils'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // 1. Rate limiting
    const clientIP = request.ip || request.headers.get('x-real-ip') || 'unknown'
    if (webhookRateLimiter.isRateLimited(clientIP)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    // 2. Signature verification
    const validation = await validateWebhookRequest(request)
    if (!validation.isValid) {
      return NextResponse.json({ error: 'Invalid webhook' }, { status: 401 })
    }

    const { payload } = validation
    const eventId = payload.meta?.event_id
    const eventType = payload.meta?.event_name

    // 3. Idempotency check
    const adminClient = await createAdminClient()
    const { data: existing } = await adminClient
      .from('webhook_events')
      .select('id')
      .eq('event_id', eventId)
      .single()

    if (existing) {
      return NextResponse.json({ message: 'Already processed' }, { status: 200 })
    }

    // 4. Organization context resolution
    const customData = JSON.parse(payload.meta?.custom_data || '{}')
    const orgData = JSON.parse(customData.organization_data || '{}')
    const organizationId = orgData.id

    if (!organizationId) {
      return NextResponse.json({ error: 'Missing organization ID' }, { status: 400 })
    }

    // 5. Process webhook
    const result = await processWebhookEvent(payload, organizationId)

    // 6. Log event
    await adminClient
      .from('webhook_events')
      .insert({
        event_id: eventId,
        event_type: eventType,
        organization_id: organizationId,
        payload,
        processed: result.success,
        processing_time: Date.now() - startTime
      })

    // 7. Return appropriate response
    if (result.success) {
      return NextResponse.json({ message: 'Success' }, { status: 200 })
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

## References

- **LemonSqueezy Webhook Implementation**: [app/api/webhooks/lemonsqueezy/route.ts](../../app/api/webhooks/lemonsqueezy/route.ts)
- **API Development Standards**: [api-development-standards.md](./api-development-standards.md)
- **Audit Results**: [audit-results.md](./audit-results.md)

---

*These patterns ensure webhooks are secure, reliable, and properly integrated with multi-workspace architecture while maintaining isolation between organizations.*
