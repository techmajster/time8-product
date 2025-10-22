# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-08-28-lemon-squeezy-payments/spec.md

## Endpoints

### POST /api/webhooks/lemonsqueezy

**Purpose:** Receive and process webhook events from Lemon Squeezy
**Parameters:** 
- Headers: `X-Signature` (HMAC signature for verification)
- Body: Webhook payload (JSON)
**Response:** 
- Success: 200 OK
- Invalid signature: 401 Unauthorized
- Processing error: 500 Internal Server Error
**Errors:** Invalid signature, missing required fields, database errors

### POST /api/billing/create-checkout

**Purpose:** Create a Lemon Squeezy checkout session for subscription upgrade
**Parameters:**
- Body: `{ variant_id: string, quantity: number }`
- Auth: Required (organization admin only)
**Response:** 
```json
{
  "checkout_url": "https://[store].lemonsqueezy.com/checkout/...",
  "expires_at": "2025-01-01T00:00:00Z"
}
```
**Errors:** Unauthorized (non-admin), invalid variant, checkout creation failure

### GET /api/billing/subscription

**Purpose:** Get current subscription details for the authenticated user's organization
**Parameters:** None (uses auth context)
**Response:**
```json
{
  "status": "active",
  "current_seats": 5,
  "paid_seats": 2,
  "free_seats": 3,
  "billing_override": false,
  "next_renewal": "2025-02-01T00:00:00Z",
  "variant": {
    "name": "Monthly",
    "price_cents": 299,
    "currency": "EUR"
  }
}
```
**Errors:** Unauthorized, organization not found

### GET /api/billing/customer-portal

**Purpose:** Generate a Lemon Squeezy customer portal URL for subscription management
**Parameters:** None (uses auth context)
**Response:**
```json
{
  "portal_url": "https://[store].lemonsqueezy.com/billing/...",
  "expires_at": "2025-01-01T01:00:00Z"
}
```
**Errors:** Unauthorized (non-admin), no active subscription, portal generation failure

### GET /api/billing/products

**Purpose:** Get available products and pricing for display in the UI
**Parameters:** 
- Query: `currency` (optional, defaults to EUR)
**Response:**
```json
{
  "products": [{
    "id": "uuid",
    "name": "Per-Seat Subscription",
    "variants": [{
      "id": "uuid",
      "name": "Monthly",
      "price_cents": 299,
      "currency": "EUR",
      "interval": "month"
    }]
  }]
}
```
**Errors:** None (public endpoint)

## Controllers

### WebhookController

**Actions:**
- `handleWebhook` - Main entry point for webhook processing
- `verifySignature` - HMAC signature verification
- `processSubscriptionCreated` - Handle new subscription
- `processSubscriptionUpdated` - Handle subscription changes
- `processSubscriptionCancelled` - Handle cancellations

**Business Logic:**
- Always verify webhook signature before processing
- Log all events to billing_events table
- Update local subscription state to match Lemon Squeezy
- Calculate and update paid_seats based on quantity

### BillingController

**Actions:**
- `createCheckout` - Generate checkout session
- `getSubscription` - Retrieve subscription details
- `getCustomerPortal` - Generate portal URL
- `getProducts` - List available products

**Business Logic:**
- Only organization admins can create checkouts or access portal
- Calculate seats to charge (total - 3 free seats)
- Check billing overrides before enforcing limits
- Cache product data to reduce API calls

### SeatEnforcementMiddleware

**Purpose:** Intercept user invitation requests to enforce seat limits
**Integration:** Applied to user invitation endpoints
**Logic:**
- Count current organization members
- Check against subscription quantity + 3 free seats
- Consider billing overrides
- Block invitation if limit exceeded