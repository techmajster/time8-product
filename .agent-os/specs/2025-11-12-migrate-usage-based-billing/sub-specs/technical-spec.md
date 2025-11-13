# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-11-12-migrate-usage-based-billing/spec.md

## Technical Requirements

### 1. LemonSqueezy Dashboard Configuration

**Manual Step** (Must be completed before code changes):

Navigate to LemonSqueezy dashboard and configure both variants:
- Monthly variant (ID: 972634)
- Annual variant (ID: 972635)

For each variant:
1. Edit variant settings
2. Enable "Usage-based billing"
3. Set billing type to "Metered"
4. Configure usage pricing: 10 PLN per seat per month (monthly) / 8 PLN per seat per month (annual)
5. Save changes

**Verification**: Test that variants accept usage records API calls

### 2. Replace Volume Pricing with Usage Records API

**File**: `app/api/billing/update-subscription-quantity/route.ts`

**Current Implementation** (Lines 126-148):
```typescript
// ❌ WRONG: Direct quantity update (volume pricing)
const updateResponse = await fetch(
  `https://api.lemonsqueezy.com/v1/subscription-items/${subscriptionItemId}`,
  {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json'
    },
    body: JSON.stringify({
      data: {
        type: 'subscription-items',
        id: subscriptionItemId.toString(),
        attributes: {
          quantity: new_quantity,  // Sets quantity directly
          invoice_immediately,
          disable_prorations: false
        }
      }
    })
  }
);
```

**Required Changes**:
```typescript
// ✅ CORRECT: Report usage (usage-based billing)
const usageResponse = await fetch(
  'https://api.lemonsqueezy.com/v1/usage-records',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json'
    },
    body: JSON.stringify({
      data: {
        type: 'usage-records',
        attributes: {
          quantity: new_quantity,  // Reports usage amount
          action: 'set',           // Sets absolute value (not increment)
          description: `Seat count updated to ${new_quantity} for organization ${organizationId}`
        },
        relationships: {
          'subscription-item': {
            data: {
              type: 'subscription-items',
              id: subscriptionItemId
            }
          }
        }
      }
    })
  }
);
```

**Why This Works**:
- Usage records API is designed for metered billing
- `action: "set"` allows absolute quantity updates
- LemonSqueezy handles billing calculations automatically
- Variant changes preserve usage automatically

**API Documentation**:
- Endpoint: `POST /v1/usage-records`
- Reference: https://docs.lemonsqueezy.com/api/usage-records/create-usage-record
- **IMPORTANT**: Subscription item ID goes in relationships, NOT in URL path

### 3. Simplify Billing Period Change Endpoint

**File**: `app/api/billing/change-billing-period/route.ts`

**Current Implementation** (Lines 105-217):
```typescript
// ❌ COMPLEX: Two-step process that fails
// Step 1: Change variant
await fetch(`/v1/subscriptions/${subscriptionId}`, {
  method: 'PATCH',
  body: JSON.stringify({
    attributes: { variant_id: new_variant_id }
  })
});

// Step 2: Try to restore quantity (FAILS - resets to 1)
await fetch(`/v1/subscription-items/${subscriptionItemId}`, {
  method: 'PATCH',
  body: JSON.stringify({
    attributes: { quantity: original_seats }
  })
});
```

**Required Changes**:
```typescript
// ✅ SIMPLE: Single variant change, usage preserved automatically
const updateResponse = await fetch(
  `https://api.lemonsqueezy.com/v1/subscriptions/${subscription.lemonsqueezy_subscription_id}`,
  {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json'
    },
    body: JSON.stringify({
      data: {
        type: 'subscriptions',
        id: subscription.lemonsqueezy_subscription_id.toString(),
        attributes: {
          variant_id: parseInt(new_variant_id)
          // NOTE: With usage-based billing, usage is preserved automatically
          // No need to restore quantity - it stays at current usage level
        }
      }
    })
  }
);
```

**Remove Lines 155-217**: Delete all quantity restoration logic

**Why This Works**:
- Usage-based billing variants preserve usage when switching
- Only the billing period (variant) changes
- Usage records remain intact across variant changes
- No manual quantity restoration needed

### 4. Update Webhook Handlers

**File**: `app/api/webhooks/lemonsqueezy/handlers.ts`

**Changes Required**:

**subscription_created** (Lines 388-412):
```typescript
// ✅ KEEP: Initial usage is set via usage records, not quantity
.insert({
  quantity: first_subscription_item?.quantity || 1,
  current_seats: quantity,
  // ... other fields
})
```
No changes needed - usage-based billing works with initial quantity.

**subscription_updated** (Lines 518-545):
```typescript
// ✅ UPDATE: Sync usage from webhook
.update({
  quantity: quantity,          // Usage reported to LemonSqueezy
  current_seats: quantity,     // Grant access based on usage
  lemonsqueezy_quantity_synced: true
})
```
No changes needed - webhook already syncs quantity correctly.

**subscription_payment_success** (Lines 1158-1217):
```typescript
// ✅ VERIFY: Ensure usage-based billing webhooks include usage data
// Check that first_subscription_item.quantity reflects reported usage
const quantity = first_subscription_item?.quantity || 1;

// Pattern 1: Immediate upgrades (mid-cycle)
if (needsImmediateUpgrade) {
  .update({
    current_seats: quantity  // Grant access after payment
  })
}

// Pattern 2: Deferred downgrades (at renewal)
if (hasPendingChanges) {
  .update({
    current_seats: pending_seats,
    pending_seats: null
  })
}
```
Verify that usage-based billing webhooks include correct quantity values.

### 5. Database Schema

**No Changes Required** - Existing schema supports usage-based billing:

```sql
subscriptions {
  quantity INTEGER              -- Reported usage (via usage records API)
  current_seats INTEGER         -- Access granted (after payment webhook)
  pending_seats INTEGER         -- Deferred changes (downgrades)
  lemonsqueezy_subscription_item_id TEXT  -- For usage records API
  lemonsqueezy_quantity_synced BOOLEAN
}
```

**Field Meanings with Usage-Based Billing**:
- `quantity`: Last reported usage via usage records API
- `current_seats`: Confirmed access after payment webhook
- `pending_seats`: Scheduled changes at next renewal
- `lemonsqueezy_subscription_item_id`: Used for POSTing usage records

## External Dependencies

**LemonSqueezy API Changes**:
- Add usage: `POST /v1/subscription-items/{id}/usage-records`
- Remove usage: `PATCH /v1/subscription-items/{id}` (quantity updates)

**Dashboard Configuration**:
- Variants must be configured as usage-based before deployment
- Test in LemonSqueezy test mode first

## Testing Requirements

### Unit Tests
- Test usage records API POST request format
- Test billing period change with single API call
- Test webhook processing with usage-based data

### Integration Tests
- Test seat quantity increase via usage records
- Test seat quantity decrease via usage records
- Test billing period change preserves usage
- Test deferred downgrades still work

### End-to-End Tests
1. Create subscription with 5 seats
2. Increase to 10 seats via usage records → verify quantity preserved
3. Change monthly to annual → verify 10 seats preserved
4. Change annual to monthly → verify 10 seats preserved
5. Decrease to 3 seats via usage records → verify quantity updated
6. Verify webhooks sync correctly throughout

## Rollback Plan

If usage-based billing causes issues:
1. **Revert Dashboard Config**: Disable usage-based billing in LemonSqueezy
2. **Revert Code**: Restore PATCH /subscription-items for quantity updates
3. **Revert Billing Period**: Re-add quantity restoration logic
4. **Database**: No schema changes, no rollback needed

## Performance Considerations

- Usage records API has same performance as PATCH quantity
- Single API call for billing period changes (improved from 2 calls)
- Webhook processing unchanged
- No additional database queries needed
