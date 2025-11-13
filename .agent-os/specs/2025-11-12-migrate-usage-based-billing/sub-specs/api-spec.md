# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-11-12-migrate-usage-based-billing/spec.md

## LemonSqueezy API Changes

### 1. Usage Records API (NEW)

**Endpoint**: `POST /v1/subscription-items/{id}/usage-records`

**Purpose**: Report seat usage for metered billing

**Request Format**:
```json
{
  "data": {
    "type": "usage-records",
    "attributes": {
      "quantity": 10,
      "action": "set",
      "description": "Seat count updated to 10 for organization org_123"
    }
  }
}
```

**Parameters**:
- `quantity` (required): Number of seats to report
- `action` (required): `"set"` for absolute value, `"increment"` for relative change
- `description` (optional): Human-readable description for audit trail

**Response Format**:
```json
{
  "data": {
    "type": "usage-records",
    "id": "12345",
    "attributes": {
      "subscription_item_id": 67890,
      "quantity": 10,
      "action": "set",
      "created_at": "2025-11-12T10:00:00Z"
    }
  }
}
```

**Errors**:
- `404`: Subscription item not found
- `400`: Invalid action or quantity
- `422`: Variant not configured for usage-based billing

### 2. Subscription Update API (SIMPLIFIED)

**Endpoint**: `PATCH /v1/subscriptions/{id}`

**Purpose**: Change billing period (variant) only

**Request Format**:
```json
{
  "data": {
    "type": "subscriptions",
    "id": "123456",
    "attributes": {
      "variant_id": 972635
    }
  }
}
```

**Parameters**:
- `variant_id` (required): New variant ID (monthly or annual)

**Response Format**:
```json
{
  "data": {
    "type": "subscriptions",
    "id": "123456",
    "attributes": {
      "variant_id": 972635,
      "status": "active",
      "first_subscription_item": {
        "id": 67890,
        "quantity": 10  // ← Usage preserved automatically
      }
    }
  }
}
```

**Note**: With usage-based billing, quantity is preserved when changing variants

## Internal API Endpoints

### 1. Update Subscription Quantity (MODIFIED)

**Endpoint**: `POST /api/billing/update-subscription-quantity`

**Purpose**: Update seat count via usage records API

**Request Body**:
```typescript
{
  organization_id: string
  new_quantity: number
  invoice_immediately: boolean
}
```

**Response Body**:
```typescript
{
  success: boolean
  quantity: number
  usage_record_id: string  // NEW: LemonSqueezy usage record ID
  subscription_id: string
  message: string
  correlationId: string
}
```

**Implementation Changes**:
- Replace PATCH `/subscription-items/{id}` with POST `/subscription-items/{id}/usage-records`
- Use `action: "set"` for absolute quantity updates
- Return usage record ID for audit trail

**Error Handling**:
- `404`: Subscription item not found
- `400`: Invalid quantity (must be ≥ 1)
- `422`: Variant not configured for usage-based billing
- `500`: LemonSqueezy API error

### 2. Change Billing Period (SIMPLIFIED)

**Endpoint**: `POST /api/billing/change-billing-period`

**Purpose**: Change subscription billing period (monthly ↔ annual)

**Request Body**:
```typescript
{
  organization_id: string
  new_variant_id: string
  billing_period: 'monthly' | 'annual'
}
```

**Response Body**:
```typescript
{
  success: boolean
  payment_status: 'processing'
  billing_period: 'monthly' | 'annual'
  new_variant_id: string
  preserved_seats: number  // NEW: Confirm seats preserved
  subscription_id: string
  message: string
  correlationId: string
}
```

**Implementation Changes**:
- Remove quantity restoration logic (lines 155-217)
- Single PATCH `/subscriptions/{id}` call with variant_id
- Verify usage preserved in response
- No second API call needed

**Simplified Flow**:
```typescript
// 1. Validate inputs
// 2. Get current subscription
// 3. Change variant (single API call)
// 4. Update database with new variant
// 5. Return success (usage preserved automatically)
```

**Error Handling**:
- `404`: No active subscription
- `400`: Already on requested billing period
- `422`: Variant change failed
- `500`: Internal server error

## Webhook Processing

### subscription_updated

**Webhook Body** (relevant fields):
```json
{
  "meta": {
    "event_name": "subscription_updated"
  },
  "data": {
    "attributes": {
      "variant_id": 972635,
      "first_subscription_item": {
        "id": 67890,
        "quantity": 10  // ← Usage value
      }
    }
  }
}
```

**Processing**:
- Sync `quantity` from `first_subscription_item.quantity`
- Update `lemonsqueezy_variant_id` from `variant_id`
- Preserve `current_seats` until payment confirmation

### subscription_payment_success

**Webhook Body** (relevant fields):
```json
{
  "meta": {
    "event_name": "subscription_payment_success"
  },
  "data": {
    "attributes": {
      "first_subscription_item": {
        "quantity": 10  // ← Confirmed usage after payment
      }
    }
  }
}
```

**Processing**:
- Confirm `current_seats` matches paid quantity
- Grant access based on paid usage
- Process deferred changes if applicable

## Security Considerations

1. **API Key Protection**: Usage records API requires server-side `LEMONSQUEEZY_API_KEY`
2. **Validation**: Verify organization ownership before usage updates
3. **Audit Trail**: Log all usage record submissions with correlation IDs
4. **Rate Limiting**: LemonSqueezy may rate limit usage records API (check docs)

## Migration Path

### Phase 1: Configure Dashboard
1. Enable usage-based billing for variants in LemonSqueezy test mode
2. Verify test subscriptions accept usage records
3. Enable in production mode

### Phase 2: Update Code
1. Deploy usage records API changes
2. Deploy simplified billing period change
3. Monitor webhook processing

### Phase 3: Verify
1. Test seat updates via usage records
2. Test billing period changes preserve usage
3. Monitor for errors in production
