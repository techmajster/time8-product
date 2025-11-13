# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-11-13-fix-usage-based-billing/spec.md

## Phase 1: Critical Billing Logic Fixes

### 1.1 Fix Free Tier Calculation in Checkout

**File**: `app/api/billing/create-checkout/route.ts`

**Problem**:
- Function `calculateRequiredPaidSeats()` (lines 52-56) calculates "paid seats" but this is meaningless for usage-based billing
- Checkout doesn't need to know about billing logic - that happens in webhooks

**Changes Required**:

1. **Remove** the `calculateRequiredPaidSeats()` function (lines 52-56)
2. **Remove** paid seats calculation and logging (lines 152-159)
3. **Update** custom_data to only include `user_count` (total users selected)
4. **Add comment** explaining checkout is $0 for usage-based billing

**Expected Behavior**:
- Checkout passes full `user_count` in custom_data
- No billing calculations at checkout time
- Webhook handles free tier logic (1-3 = free, 4+ = paid)

---

### 1.2 Fix Usage Record Creation in Webhook

**File**: `app/api/webhooks/lemonsqueezy/handlers.ts`

**Problem**:
- Lines 437-493: Creates usage record with `desiredQuantity` directly from `user_count`
- Doesn't account for free tier (1-3 users should be quantity: 0)
- Paid tier (4+ users) should be quantity: user_count (pay for ALL seats, not seats - 3)

**Changes Required**:

1. **Update lines 437-493** with proper free tier logic:

```typescript
// For usage-based billing: Create initial usage record if user_count is in custom_data
// FREE TIER: 1-3 users = quantity 0 (no billing)
// PAID TIER: 4+ users = quantity equals total users (pay for ALL seats)
const desiredUserCount = parseInt(meta.custom_data?.user_count || '0');
const subscriptionItemId = first_subscription_item?.id;

if (desiredUserCount > 0 && subscriptionItemId && first_subscription_item?.is_usage_based) {
  // Calculate billable quantity based on free tier
  // 1-3 users: Free tier, quantity = 0
  // 4+ users: Pay for all seats, quantity = desiredUserCount
  const billableQuantity = desiredUserCount > 3 ? desiredUserCount : 0;

  console.log(`📊 [Webhook] Creating initial usage record:`, {
    subscriptionItemId,
    desiredUserCount,
    billableQuantity,
    freeTier: desiredUserCount <= 3,
    organizationName: meta.custom_data?.organization_name
  });

  try {
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
              quantity: billableQuantity,
              action: 'set',
              description: desiredUserCount <= 3
                ? `Free tier: ${desiredUserCount} seats for ${meta.custom_data?.organization_name || 'organization'}`
                : `Initial seat count: ${billableQuantity} for ${meta.custom_data?.organization_name || 'organization'}`
            },
            relationships: {
              'subscription-item': {
                data: {
                  type: 'subscription-items',
                  id: subscriptionItemId.toString()
                }
              }
            }
          }
        })
      }
    );

    if (!usageResponse.ok) {
      const errorText = await usageResponse.text();
      console.error(`❌ [Webhook] Failed to create initial usage record:`, errorText);
    } else {
      const usageData = await usageResponse.json();
      console.log(`✅ [Webhook] Initial usage record created:`, {
        usageRecordId: usageData.data?.id,
        quantity: billableQuantity,
        freeTier: desiredUserCount <= 3
      });
    }
  } catch (usageError) {
    console.error(`❌ [Webhook] Error creating initial usage record:`, usageError);
    // Don't fail the webhook - log the error and continue
  }
}
```

2. **Update lines 420-433** to set paid_seats correctly:

```typescript
paid_seats: desiredUserCount > 3 ? desiredUserCount : 0,
```

**Expected Behavior**:
- 1-3 users: Usage record quantity = 0, paid_seats = 0, no billing
- 4+ users: Usage record quantity = user_count, paid_seats = user_count, bill for all
- 5 users = pay for 5 seats (not 2 seats)

---

### 1.3 Store subscription_item_id at Creation

**File**: `app/api/webhooks/lemonsqueezy/handlers.ts`

**Problem**:
- Lines 388-405: INSERT statement doesn't include `lemonsqueezy_subscription_item_id`
- This causes extra API call in update-subscription-quantity route (lines 78-111)

**Changes Required**:

1. **Extract subscription_item_id** before INSERT (add after line 387):

```typescript
const subscriptionItemId = first_subscription_item?.id;

if (!subscriptionItemId) {
  console.error(`❌ [Webhook] Missing subscription_item_id in payload:`, {
    subscriptionId,
    organizationId: customer.organization_id
  });
}
```

2. **Add to INSERT statement** (line 388-405):

```typescript
lemonsqueezy_subscription_item_id: subscriptionItemId || null,
```

3. **Add logging** to confirm storage:

```typescript
console.log(`✅ [Webhook] Subscription created with item_id:`, {
  subscription_id: subscriptionId,
  subscription_item_id: subscriptionItemId,
  organization_id: customer.organization_id
});
```

**Expected Behavior**:
- subscription_item_id stored at creation time
- No extra API calls needed later
- Faster performance for seat updates

---

### 1.4 Fix Quantity Update Logic

**File**: `app/api/billing/update-subscription-quantity/route.ts`

**Problem**:
- Lines 136-143: Usage record uses `new_quantity` directly
- Doesn't respect free tier (1-3 users should be quantity: 0)

**Changes Required**:

1. **Update lines 136-155** with free tier logic:

```typescript
// Calculate billable quantity based on free tier
// 1-3 users: Free tier, quantity = 0
// 4+ users: Pay for all seats, quantity = new_quantity
const billableQuantity = new_quantity > 3 ? new_quantity : 0;

console.log(`💰 [Payment Flow] Starting quantity update:`, {
  correlationId,
  subscription_id: subscription.lemonsqueezy_subscription_id,
  subscription_item_id: subscription.lemonsqueezy_subscription_item_id,
  current_quantity: subscription.current_seats,
  new_quantity,
  billableQuantity,
  freeTier: new_quantity <= 3,
  invoice_immediately,
  organizationId
});

// Report usage via LemonSqueezy Usage Records API (usage-based billing)
const updateResponse = await fetch(
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
          quantity: billableQuantity,
          action: 'set', // Set absolute value (not increment)
          description: new_quantity <= 3
            ? `Free tier: ${new_quantity} seats for organization ${organizationId}`
            : `Seat count updated to ${billableQuantity} for organization ${organizationId}`
        },
        relationships: {
          'subscription-item': {
            data: {
              type: 'subscription-items',
              id: subscription.lemonsqueezy_subscription_item_id.toString()
            }
          }
        }
      }
    })
  }
);
```

2. **Update organization paid_seats calculation** (around line 189):

```typescript
// Update organization.paid_seats
await supabase
  .from('organizations')
  .update({
    paid_seats: new_quantity > 3 ? new_quantity : 0
  })
  .eq('id', organizationId);
```

**Expected Behavior**:
- 1-3 users: Usage record quantity = 0, no billing
- 4-10 users: Usage record quantity = user count, bill for all
- Organization.paid_seats reflects actual billable seats

---

## Phase 2: Data Storage Improvements

### 2.1 Add billing_type Field to Subscriptions

**File**: New migration `supabase/migrations/20251113000000_add_billing_type_to_subscriptions.sql`

**Purpose**: Track whether subscription uses 'volume' or 'usage_based' billing

**Migration SQL**:

```sql
-- Add billing_type column to subscriptions
BEGIN;

-- Add column
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS billing_type TEXT
CHECK (billing_type IN ('volume', 'usage_based'))
DEFAULT 'usage_based';

-- Add index for querying by billing type
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing_type
ON subscriptions(billing_type);

-- Add column comment
COMMENT ON COLUMN subscriptions.billing_type IS
'Billing model: "volume" for legacy subscriptions, "usage_based" for new subscriptions using usage records API';

-- Set existing subscriptions to volume (if any exist)
-- New subscriptions will default to usage_based
UPDATE subscriptions
SET billing_type = 'volume'
WHERE billing_type IS NULL;

COMMIT;

-- Verify
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'subscriptions'
    AND column_name = 'billing_type';
```

**Expected Behavior**:
- New subscriptions automatically tagged as 'usage_based'
- Old subscriptions (if any) marked as 'volume'
- Can query subscriptions by billing type
- Enables proactive detection of legacy subscriptions

---

### 2.2 Update Subscription Created Webhook

**File**: `app/api/webhooks/lemonsqueezy/handlers.ts`

**Changes Required**:

1. **Add billing_type to INSERT** (lines 388-405):

```typescript
billing_type: first_subscription_item?.is_usage_based ? 'usage_based' : 'volume',
```

2. **Add validation warning** (after line 335):

```typescript
// Verify variant is configured for usage-based billing
if (!first_subscription_item?.is_usage_based) {
  console.warn(`⚠️ [Webhook] Subscription created with non-usage-based variant:`, {
    subscriptionId,
    variantId: variant_id,
    organizationId: customer.organization_id,
    note: 'This subscription will use volume pricing'
  });
}
```

**Expected Behavior**:
- Subscriptions correctly tagged at creation
- Warning logged if variant isn't usage-based enabled
- Enables proactive handling in API routes

---

### 2.3 Add Proactive Legacy Subscription Detection

**File**: `app/api/billing/update-subscription-quantity/route.ts`

**Changes Required**:

1. **Add check after fetching subscription** (after line 75, before line 76):

```typescript
// Check if subscription supports usage-based billing
if (subscription.billing_type === 'volume') {
  console.warn(`⚠️ [Payment Flow] Attempted to update legacy subscription:`, {
    subscription_id: subscription.lemonsqueezy_subscription_id,
    billing_type: subscription.billing_type,
    organizationId
  });

  return NextResponse.json(
    {
      error: 'This subscription was created before usage-based billing was enabled',
      details: 'Please create a new subscription to modify seats. Old subscriptions cannot be updated.',
      legacy_subscription: true,
      action_required: 'create_new_subscription'
    },
    { status: 400 }
  );
}

// Verify subscription_item_id exists (required for usage records)
if (!subscription.lemonsqueezy_subscription_item_id) {
  console.error(`❌ [Payment Flow] Missing subscription_item_id:`, {
    subscription_id: subscription.lemonsqueezy_subscription_id,
    organizationId
  });

  return NextResponse.json(
    {
      error: 'Subscription missing required data',
      details: 'subscription_item_id is required for usage-based billing'
    },
    { status: 500 }
  );
}
```

**Expected Behavior**:
- Fails fast before attempting API call
- Clear error message for users
- Keeps existing 422 error handling as fallback
- Better logging for debugging

---

## Phase 3: Webhook Clarity Improvements

### 3.1 Clarify Usage-Based Comments in subscription_updated

**File**: `app/api/webhooks/lemonsqueezy/handlers.ts`

**Changes Required**:

1. **Update comment at line 586**:

```typescript
// IMPORTANT: For usage-based billing, quantity reflects REPORTED USAGE (from usage records API).
// When LemonSqueezy sends subscription_updated, we sync BOTH quantity AND current_seats.
// This ensures:
// 1. Dashboard updates via usage records API immediately reflect in UI
// 2. Usage record changes flow through: usage record → LS quantity → webhook → our DB
// 3. No manual restoration logic needed - LemonSqueezy is source of truth for quantity
```

**Expected Behavior**:
- Clear understanding of data flow
- No confusion about where quantity comes from
- Future developers understand webhook purpose

---

### 3.2 Add Usage-Based Verification in subscription_payment_success

**File**: `app/api/webhooks/lemonsqueezy/handlers.ts`

**Changes Required**:

1. **Add billing_type check** (around line 1229):

```typescript
// Determine if this is an immediate upgrade (usage-based billing)
// or a deferred change (volume billing at renewal)
const isUsageBasedBilling = existingSubscription.billing_type === 'usage_based';
const needsImmediateUpgrade = isUsageBasedBilling &&
                             !hasPendingChanges &&
                             existingSubscription.current_seats !== existingSubscription.quantity;

console.log(`💳 [Webhook] Payment success analysis:`, {
  isUsageBasedBilling,
  needsImmediateUpgrade,
  hasPendingChanges,
  current_seats: existingSubscription.current_seats,
  quantity: existingSubscription.quantity
});
```

2. **Add comment explaining the logic**:

```typescript
// For USAGE-BASED billing: Grant seats immediately when quantity increases
// (quantity was already updated by usage records API, this confirms payment)
//
// For VOLUME billing: Apply pending changes at renewal
// (quantity update is deferred until customer pays at renewal)
```

**Expected Behavior**:
- Clear distinction between billing types
- Correct logic for each billing model
- Better debugging information

---

### 3.3 Improve Change Billing Period Logic

**File**: `app/api/billing/change-billing-period/route.ts`

**Changes Required**:

1. **Read file to understand current implementation** (first)
2. **Add proactive billing_type check** after fetching subscription
3. **Add comment** explaining usage-based behavior:

```typescript
// For usage-based billing: Billing period change preserves quantity automatically
// LemonSqueezy maintains quantity through the change, no restoration needed
// Usage records continue to work with new variant
```

**Expected Behavior**:
- Handles usage-based subscriptions correctly
- Clear comments about behavior
- No unnecessary restoration logic

---

## Phase 4: Frontend UX Enhancements

### 4.1 Improve Billing Period + Seats Change Flow

**File**: `app/onboarding/add-users/page.tsx`

**Changes Required**:

1. **Update lines 280-334** with better error handling:

```typescript
// Handle billing period change (if changed)
if (periodChanged) {
  console.log(`🔄 Changing billing period: ${initialBillingPeriod} → ${selectedTier}`)

  try {
    const periodResponse = await fetch('/api/billing/change-billing-period', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        new_tier: selectedTier
      })
    })

    const periodData = await periodResponse.json()

    if (!periodResponse.ok) {
      throw new Error(periodData.error || 'Failed to change billing period')
    }

    console.log('✅ Billing period changed:', periodData)
  } catch (periodError) {
    console.error('❌ Billing period change failed:', periodError)
    setError(`Failed to change billing period: ${periodError.message}`)
    setIsLoading(false)
    return // Don't proceed to seat update if period change failed
  }
}

// Handle seat quantity change (if changed)
if (seatsChanged) {
  console.log(`🔄 Updating seat quantity: ${initialUserCount} → ${userCount}`)

  try {
    const quantityResponse = await fetch('/api/billing/update-subscription-quantity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        new_quantity: userCount,
        invoice_immediately: true
      })
    })

    const quantityData = await quantityResponse.json()

    if (!quantityResponse.ok) {
      console.error('❌ Failed to update subscription quantity:', quantityData)

      // Check if this is a legacy subscription error
      if (quantityData.legacy_subscription) {
        setError('This subscription cannot be modified. Please create a new subscription.')
        // Could show a "Create New Subscription" button here
      } else {
        setError(quantityData.details || quantityData.error || 'Failed to update subscription')
      }

      setIsLoading(false)
      return
    }

    console.log('✅ Subscription quantity updated:', quantityData)
  } catch (quantityError) {
    console.error('❌ Quantity update failed:', quantityError)
    setError(`Failed to update seats: ${quantityError.message}`)
    setIsLoading(false)
    return
  }
}
```

**Expected Behavior**:
- Stops if first operation fails
- Clear error messages for each failure
- Special handling for legacy subscription errors
- Better debugging information

---

### 4.2 Add User-Friendly Error Messages

**File**: `app/onboarding/add-users/page.tsx`

**Changes Required**:

1. **Add helper component** for legacy subscription errors:

```typescript
// Add near the error display section
{error && error.includes('cannot be modified') && (
  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
    <h3 className="font-semibold text-blue-900">Legacy Subscription</h3>
    <p className="text-sm text-blue-700 mt-2">
      This subscription was created before our new billing system.
      To modify your plan, please create a new subscription.
    </p>
    <button
      onClick={() => router.push('/onboarding/add-users')}
      className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      Create New Subscription
    </button>
  </div>
)}
```

**Expected Behavior**:
- Clear explanation of legacy subscription issue
- Action button to create new subscription
- Better user experience

---

## Phase 5: Documentation Updates

### 5.1 Fix API Endpoint Documentation

**Files**:
- `.agent-os/specs/2025-11-12-migrate-usage-based-billing/sub-specs/api-spec.md`
- `.agent-os/specs/2025-11-12-migrate-usage-based-billing/sub-specs/technical-spec.md`

**Changes Required**:

1. **Update api-spec.md line 9**:

Change from:
```
POST /v1/subscription-items/{id}/usage-records
```

To:
```
POST /v1/usage-records

Body:
{
  "data": {
    "type": "usage-records",
    "attributes": {
      "quantity": 100,
      "action": "set"
    },
    "relationships": {
      "subscription-item": {
        "data": {
          "type": "subscription-items",
          "id": "12345"
        }
      }
    }
  }
}
```

2. **Update technical-spec.md line 32** with same correction

**Expected Behavior**:
- Specs match actual implementation
- Future developers have correct examples
- No confusion about API endpoint format

---

### 5.2 Update Terminology

**File**: `.agent-os/specs/2025-11-12-migrate-usage-based-billing/sub-specs/technical-spec.md`

**Changes Required**:

1. **Update line 17-18**:

Change from:
```
Set billing type to 'Metered'
```

To:
```
Enable 'Usage is metered?' toggle in LemonSqueezy dashboard
```

**Expected Behavior**:
- Matches LemonSqueezy UI terminology
- Clear instructions for configuration

---

### 5.3 Document Free Tier Logic

**Files**:
- `.agent-os/specs/2025-11-12-migrate-usage-based-billing/spec.md`
- `.agent-os/specs/2025-11-12-migrate-usage-based-billing/sub-specs/technical-spec.md`

**Changes Required**:

1. **Add section to spec.md**:

```markdown
## Pricing Model: Free Tier + Usage-Based Billing

### Free Tier (1-3 Users)
- Users: 1, 2, or 3
- Cost: $0 / month
- Usage Record Quantity: 0
- Billing: No charges at any time

### Paid Tier (4+ Users)
- Users: 4 or more
- Cost: Per-seat pricing (10 PLN/month or 8 PLN/month annual)
- Usage Record Quantity: Total user count (NOT user count - 3)
- Billing: Charged for ALL seats

### Examples
- 3 users = $0 billing (quantity: 0)
- 4 users = 4 seats billed (quantity: 4, NOT 1)
- 5 users = 5 seats billed (quantity: 5, NOT 2)
- 10 users = 10 seats billed (quantity: 10, NOT 7)

### Implementation
The free tier is implemented at the APPLICATION level, not in LemonSqueezy.
LemonSqueezy variants are priced per-seat. Our code sends quantity: 0 for 1-3 users
and quantity: user_count for 4+ users.
```

2. **Add to technical-spec.md** with code examples

**Expected Behavior**:
- Clear understanding of pricing model
- No confusion about (seats - 3) calculation
- Documented in multiple places for discoverability

---

## Phase 6: Code Quality Improvements

### 6.1 Standardize subscription_item_id Extraction

**Files**: Multiple

**Changes Required**:

1. **Create helper function** in `lib/lemonsqueezy/helpers.ts` (new file):

```typescript
/**
 * Extract subscription item ID from LemonSqueezy payload
 * Handles both webhook and API response formats
 */
export function extractSubscriptionItemId(payload: any): string | null {
  // Webhook format: attributes.first_subscription_item.id
  if (payload?.attributes?.first_subscription_item?.id) {
    return payload.attributes.first_subscription_item.id;
  }

  // API response format: data.attributes.first_subscription_item.id
  if (payload?.data?.attributes?.first_subscription_item?.id) {
    return payload.data.attributes.first_subscription_item.id;
  }

  // Direct object format
  if (payload?.first_subscription_item?.id) {
    return payload.first_subscription_item.id;
  }

  return null;
}
```

2. **Use in webhooks** (handlers.ts line 438):

```typescript
const subscriptionItemId = extractSubscriptionItemId({ attributes: webhookPayload.data.attributes });
```

3. **Use in API routes** (update-subscription-quantity line 95):

```typescript
const subscriptionItemId = extractSubscriptionItemId(lsData);
```

**Expected Behavior**:
- Consistent extraction pattern
- Handles all payload formats
- Single source of truth

---

### 6.2 Add Comprehensive Logging

**Files**: All webhook handlers and API routes

**Changes Required**:

1. **Add correlation ID to all operations** (generate at start):

```typescript
const correlationId = `billing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
```

2. **Log key decisions**:

```typescript
console.log(`[${correlationId}] Free tier check:`, {
  userCount,
  billableQuantity,
  freeTier: userCount <= 3,
  reasoning: userCount <= 3 ? '1-3 users = free' : '4+ users = paid'
});
```

3. **Log all usage record operations**:

```typescript
console.log(`[${correlationId}] Usage record created:`, {
  subscription_item_id,
  quantity,
  action,
  description
});
```

**Expected Behavior**:
- Complete audit trail
- Can track flow end-to-end
- Easier debugging

---

## Phase 7: Testing & Verification

### 7.1 Create Test Checklist

**File**: New file `.agent-os/specs/2025-11-13-fix-usage-based-billing/TESTING.md`

**Content**:

```markdown
# Testing Checklist

## Checkout Flow
- [ ] 1 user checkout: $0 charge, payment method captured
- [ ] 3 users checkout: $0 charge, payment method captured
- [ ] 6 users checkout: $0 charge, payment method captured
- [ ] Webhook fires after successful checkout
- [ ] subscription_item_id stored in database

## Usage Record Creation
- [ ] 1 user: Quantity = 0, paid_seats = 0
- [ ] 3 users: Quantity = 0, paid_seats = 0
- [ ] 4 users: Quantity = 4, paid_seats = 4
- [ ] 6 users: Quantity = 6, paid_seats = 6
- [ ] 10 users: Quantity = 10, paid_seats = 10

## Free Tier Verification
- [ ] 1 user organization shows "Free Plan"
- [ ] 3 users organization shows "Free Plan"
- [ ] No charges at renewal for 1-3 user orgs
- [ ] Usage record quantity stays at 0

## Paid Tier Verification
- [ ] 4 users billed for 4 seats (not 1)
- [ ] 5 users billed for 5 seats (not 2)
- [ ] 10 users billed for 10 seats (not 7)
- [ ] Charges at renewal match seat count

## Seat Updates
- [ ] Increase 3 → 4: Quantity changes from 0 → 4
- [ ] Increase 4 → 6: Quantity changes from 4 → 6
- [ ] Increase 6 → 10: Quantity changes from 6 → 10
- [ ] Decrease 10 → 6: Quantity changes from 10 → 6
- [ ] Decrease 6 → 3: Quantity changes from 6 → 0
- [ ] All updates trigger usage record API
- [ ] paid_seats updates correctly

## Billing Period Changes
- [ ] Monthly → Annual preserves seats
- [ ] Annual → Monthly preserves seats
- [ ] Quantity stays correct after change
- [ ] No restoration logic needed
- [ ] Works for both free and paid tiers

## Combined Changes
- [ ] Change seats AND period in same flow
- [ ] Both updates apply correctly
- [ ] Error handling works for partial failures

## Legacy Subscriptions
- [ ] Old subscription shows clear error
- [ ] Error message explains situation
- [ ] UI shows "Create New Subscription" option
- [ ] Legacy detection works proactively

## Webhook Sync
- [ ] subscription_created stores all data
- [ ] subscription_updated syncs quantity
- [ ] subscription_payment_success grants seats
- [ ] All webhooks return 200 quickly
- [ ] Data processing happens asynchronously

## Data Verification
- [ ] subscription_item_id stored at creation
- [ ] billing_type = 'usage_based' for new subs
- [ ] paid_seats matches billable quantity
- [ ] organization.paid_seats correct
- [ ] No extra API calls for item_id

## Logging Verification
- [ ] Correlation IDs in all logs
- [ ] Free tier decisions logged
- [ ] Usage record quantities logged
- [ ] Billing type logged
- [ ] Complete audit trail available
```

---

### 7.2 Enhance E2E Test Script

**File**: Update existing `scripts/test-usage-based-billing-e2e.mjs`

**Add test cases**:

```javascript
// Free tier tests
await testFreeTier(1); // 1 user
await testFreeTier(2); // 2 users
await testFreeTier(3); // 3 users

// Paid tier tests
await testPaidTier(4, 4);  // 4 users = pay for 4
await testPaidTier(5, 5);  // 5 users = pay for 5
await testPaidTier(10, 10); // 10 users = pay for 10

// Tier crossing tests
await testTierCrossing(3, 4); // Free → Paid
await testTierCrossing(4, 3); // Paid → Free

async function testFreeTier(userCount) {
  console.log(`Testing free tier with ${userCount} users...`);
  // Verify quantity = 0
  // Verify paid_seats = 0
  // Verify no billing
}

async function testPaidTier(userCount, expectedQuantity) {
  console.log(`Testing paid tier: ${userCount} users should pay for ${expectedQuantity} seats`);
  // Verify quantity = expectedQuantity
  // Verify paid_seats = expectedQuantity
  // Verify billing amount correct
}
```

---

## Summary

All phases work together to create a fully functional usage-based billing system that:

1. **Correctly implements free tier** (1-3 users = $0)
2. **Correctly implements paid tier** (4+ users = pay for all seats)
3. **Stores all required data** at creation time
4. **Provides clear error handling** for edge cases
5. **Maintains comprehensive documentation** matching implementation
6. **Includes thorough testing** of all scenarios

The fixes address all issues found in the original migration and ensure the system works correctly according to official LemonSqueezy documentation.
