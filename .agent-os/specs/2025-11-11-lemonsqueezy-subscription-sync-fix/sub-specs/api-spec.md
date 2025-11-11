# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-11-11-lemonsqueezy-subscription-sync-fix/spec.md

## API Endpoints

### 1. POST /api/billing/update-subscription-quantity

**Purpose:** Update subscription quantity for immediate seat upgrades

**Current Implementation Status:** EXISTS but has payment bypass vulnerability

**Required Changes:**

**Request Body:**
```typescript
{
  new_quantity: number;           // Total seats needed (e.g., 10)
  invoice_immediately?: boolean;  // Default: true
  queued_invitations?: Array<{    // NEW: Store for after payment
    email: string;
    role: string;
  }>;
}
```

**Response (Success):**
```typescript
{
  success: true;
  message: "Processing payment...";
  subscription_id: string;
  new_quantity: number;
  // Note: current_seats NOT updated yet - waiting for webhook
}
```

**Response (Error):**
```typescript
{
  error: string;
  details?: any;
}
```

**Implementation Notes:**
- MUST NOT update `current_seats` immediately
- Store `queued_invitations` in session or temporary table
- Wait for `subscription_payment_success` webhook before granting access

---

### 2. POST /api/webhooks/lemonsqueezy

**Purpose:** Handle all LemonSqueezy webhook events

**Event: subscription_payment_success (NEW)**

**Request Payload:**
```typescript
{
  meta: {
    event_name: 'subscription_payment_success';
    event_id: string;  // Correlation ID
    custom_data?: object;
  },
  data: {
    id: string;  // payment_id
    type: 'subscription-invoices';
    attributes: {
      subscription_id: number;
      amount: number;
      currency: string;
      status: 'paid' | 'failed';
      // ... other fields
    }
  }
}
```

**Handler Logic:**
1. Validate webhook signature (already implemented)
2. Check idempotency (already implemented)
3. Find subscription by `lemonsqueezy_subscription_id`
4. Update `current_seats = quantity` (grant access)
5. Update `organizations.paid_seats`
6. Retrieve and send queued invitations
7. Log payment confirmation

**Response:**
```typescript
{
  received: true;
  processed: true;
}
```

---

### 3. GET /api/billing/subscription

**Purpose:** Get current subscription information

**Current Implementation Status:** EXISTS, working correctly

**No Changes Required**

**Response:**
```typescript
{
  success: true;
  subscription: {
    lemonsqueezy_subscription_id: string;
    status: 'active' | 'paused' | 'cancelled' | 'expired' | 'on_trial' | 'past_due' | 'unpaid';
    trial_ends_at: string | null;
  } | null;
  organization_info: {
    id: string;
    subscription_tier: 'free' | 'active';
    paid_seats: number;
    current_employees: number;
    pending_invitations: number;
    seats_remaining: number;
  }
}
```

---

### 4. POST /api/organizations/[organizationId]/invitations

**Purpose:** Send bulk invitations

**Current Implementation Status:** EXISTS, working correctly

**Integration Point:**
- Should be called ONLY after `subscription_payment_success` webhook confirms payment
- Do not call immediately after subscription quantity update

---

## Webhook Event Handling

### Updated Event Flow

**1. subscription_created**
```
Trigger: New subscription created from checkout
Fires: Immediately after checkout completes
Handler Changes: Add current_seats = quantity to insert
Purpose: Give immediate access (already paid via checkout)
```

**2. subscription_updated**
```
Trigger: Any subscription change (quantity, status, etc.)
Fires: When subscription data changes
Handler Changes: Remove conditional logic, always sync current_seats
Purpose: Ensure manual LemonSqueezy updates reflect in app
```

**3. subscription_payment_success (NEW)**
```
Trigger: Payment succeeds for subscription invoice
Fires: After prorated payment for quantity increase
Handler: NEW - needs to be implemented
Purpose: Confirm payment before granting seat access
```

**4. subscription_payment_failed**
```
Trigger: Payment fails
Fires: When payment processing fails
Current: Already handled
No Changes: Existing logic sufficient
```

**5. subscription_renewal**
```
Trigger: Subscription renews
Fires: At renewal date
Current: Already handles pending_seats → current_seats
No Changes: Existing logic sufficient
```

---

## API Request Flow Diagrams

### Upgrade Flow (Invite Dialog)

```
User Action: Click "Upgrade & Send Invitations"
    ↓
1. Client: POST /api/billing/update-subscription-quantity
   Body: { new_quantity: 10, queued_invitations: [...] }
    ↓
2. Server: Call LemonSqueezy Subscription Items API
   PATCH /v1/subscription-items/{id}
   Body: { quantity: 10, invoice_immediately: true }
    ↓
3. LemonSqueezy: Returns 200 OK immediately
   (Payment processing happens async)
    ↓
4. Server: Store queued_invitations in session/temp table
   Update: quantity = 10 (what user is paying for)
   Do NOT update: current_seats (still at old value)
    ↓
5. Server: Return "Processing payment..."
   Client: Show loading state
    ↓
6. LemonSqueezy: Processes payment asynchronously
    ↓
7. LemonSqueezy: Fires subscription_payment_success webhook
   POST /api/webhooks/lemonsqueezy
    ↓
8. Webhook Handler: Confirms payment
   Update: current_seats = 10 (grant access)
   Update: organizations.paid_seats = 10
   Retrieve: queued_invitations from storage
   Send: Bulk invitations via /api/organizations/[id]/invitations
    ↓
9. Client: Poll or receive notification
   Show: "Success! Invitations sent."
```

### Manual LemonSqueezy Update Flow

```
Admin Action: Update quantity in LemonSqueezy dashboard
    ↓
1. LemonSqueezy: Fires subscription_updated webhook
   POST /api/webhooks/lemonsqueezy
   Body: { quantity: 7, current_seats: undefined }
    ↓
2. Webhook Handler: Always sync (no conditional check)
   Update: quantity = 7
   Update: current_seats = 7
   Update: organizations.paid_seats = 7
    ↓
3. Result: App reflects changes within seconds
```

---

## LemonSqueezy API Integration

### Subscription Items API

**Endpoint:** `PATCH /v1/subscription-items/{id}`

**Request:**
```json
{
  "data": {
    "type": "subscription-items",
    "id": "12345",
    "attributes": {
      "quantity": 10,
      "invoice_immediately": true,
      "disable_prorations": false
    }
  }
}
```

**Response:**
```json
{
  "data": {
    "id": "12345",
    "type": "subscription-items",
    "attributes": {
      "subscription_id": 67890,
      "price_id": 11111,
      "quantity": 10,
      "created_at": "2025-11-11T10:00:00Z",
      "updated_at": "2025-11-11T12:30:00Z"
    }
  }
}
```

**Important Notes:**
- Returns immediately (synchronous response)
- Payment processing happens asynchronously
- `invoice_immediately: true` triggers immediate payment attempt
- `disable_prorations: false` charges prorated amount for remaining cycle

---

## Error Handling

### Payment Failures

**Scenario:** User's credit card is declined

**Flow:**
```
1. Subscription Items API returns 200 OK
2. LemonSqueezy attempts to charge card
3. Payment fails (declined card)
4. subscription_payment_failed webhook fires
5. current_seats remains at old value
6. User sees error message
7. User can retry payment or cancel
```

**Handler Response:**
- Do not update `current_seats`
- Log payment failure
- Optionally notify admin via alert service

### Webhook Failures

**Scenario:** Webhook handler throws error

**Flow:**
```
1. Webhook received
2. Handler throws error (database down, etc.)
3. Return 500 error to LemonSqueezy
4. LemonSqueezy retries webhook (exponential backoff)
5. Handler eventually succeeds
6. Idempotency check prevents duplicate processing
```

**Implementation:**
- Already handled via `isEventAlreadyProcessed()`
- Continue using this pattern

---

## Rate Limiting

**Not Required** - LemonSqueezy webhooks are not user-initiated and have natural rate limits

---

## Authentication

**Webhook Endpoints:**
- Use signature validation (already implemented)
- No additional auth required

**Update Subscription Quantity Endpoint:**
- Use existing session authentication
- Verify user is admin of organization (already implemented via `authenticateAndGetOrgContext()`)

---

## CORS Configuration

**Not Applicable** - All endpoints are server-to-server or same-origin
