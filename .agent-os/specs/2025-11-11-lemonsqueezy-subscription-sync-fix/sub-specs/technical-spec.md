# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-11-11-lemonsqueezy-subscription-sync-fix/spec.md

## Architecture Overview

### Current System Design (Keep This Pattern)

The codebase has TWO different patterns for seat changes, both of which are correct and should be preserved:

1. **Immediate Upgrades** (adding seats mid-cycle):
   - User pays NOW via LemonSqueezy Subscription Items API
   - `quantity` updates immediately (what user is paying for)
   - Wait for `subscription_payment_success` webhook
   - Only then update `current_seats` (what user can actually use)
   - No use of `pending_seats` pattern

2. **Deferred Downgrades** (removing seats):
   - Uses existing `pending_seats` pattern (already implemented)
   - Users retain access until next renewal date
   - Cron job syncs with LemonSqueezy 24 hours before renewal
   - Renewal webhook applies the change to `current_seats`
   - Avoids mid-cycle refunds

### Why Two Patterns?

**Business Logic:**
- Upgrades: Users expect immediate access after payment
- Downgrades: Users expect to keep access through paid period

**Technical Logic:**
- Upgrades: Payment required before access
- Downgrades: Credit applied at renewal (no immediate payment)

## Technical Requirements

### 1. Fix Invite Dialog Payment Flow

**File:** `components/invitations/invite-users-dialog.tsx`

**Current Problem (Lines 222-256):**
```typescript
// Creates NEW checkout for existing subscriptions
const response = await fetch('/api/billing/create-checkout', {
  method: 'POST',
  body: JSON.stringify({
    variant_id: ...,
    user_count: requiredSeats,  // Total seats (9 + 3 = 12)
    // Charges for 12 full seats instead of +3 incremental
  })
})
```

**Required Fix:**
```typescript
// Check if user has existing active subscription
const subscriptionResponse = await fetch('/api/billing/subscription')
const subscriptionData = await subscriptionResponse.json()

if (subscriptionData.subscription && subscriptionData.subscription.status === 'active') {
  // Use Subscription Items API for upgrades
  const response = await fetch('/api/billing/update-subscription-quantity', {
    method: 'POST',
    body: JSON.stringify({
      new_quantity: requiredSeats,
      invoice_immediately: true,
      queued_invitations: queuedInvitations.map(inv => ({
        email: inv.email,
        role: 'employee'
      }))
    })
  })

  // Show "Processing payment..." state
  // Wait for webhook to confirm payment before showing success
} else {
  // No subscription - create new checkout (existing logic)
}
```

### 2. Add subscription_payment_success Webhook Handler

**File:** `app/api/webhooks/lemonsqueezy/handlers.ts`

**Current Problem:**
- Handler DOES NOT EXIST
- Cannot confirm payment before granting seats

**Required Implementation:**
```typescript
export async function processSubscriptionPaymentSuccess(payload: any): Promise<EventResult> {
  const supabase = createAdminClient();

  // Extract data from webhook
  const subscriptionId = payload.data.attributes.subscription_id;
  const amount = payload.data.attributes.amount;
  const currency = payload.data.attributes.currency;

  // Find subscription in database
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('lemonsqueezy_subscription_id', subscriptionId)
    .single();

  if (subError || !subscription) {
    return {
      success: false,
      error: `Subscription not found: ${subscriptionId}`
    };
  }

  // ✅ Payment confirmed - update current_seats
  await supabase
    .from('subscriptions')
    .update({
      current_seats: subscription.quantity,  // Grant access
      updated_at: new Date().toISOString()
    })
    .eq('id', subscription.id);

  // ✅ Update organization paid_seats
  await supabase
    .from('organizations')
    .update({
      paid_seats: subscription.quantity
    })
    .eq('id', subscription.organization_id);

  // ✅ Send any queued invitations (if stored in session/temp table)
  // Implementation depends on where queued invitations are stored

  console.log(`✅ Payment confirmed for subscription ${subscriptionId}: ${amount} ${currency}`);

  return {
    success: true,
    data: { subscriptionId, amount, currency }
  };
}
```

**Add to route.ts:**
```typescript
// File: app/api/webhooks/lemonsqueezy/route.ts
case 'subscription_payment_success':
  return await processSubscriptionPaymentSuccess(payload);
```

### 3. Fix subscription_created Webhook

**File:** `app/api/webhooks/lemonsqueezy/handlers.ts` (Lines 266-369)

**Current Problem:**
```typescript
const { data: newSubscription } = await supabase
  .from('subscriptions')
  .insert({
    organization_id: organizationId,
    lemonsqueezy_subscription_id: subscriptionId,
    quantity: totalUsers,  // ✅ Sets quantity
    // ❌ MISSING: current_seats is NOT set
    status: status,
    // ...
  })
```

**Required Fix:**
```typescript
const { data: newSubscription } = await supabase
  .from('subscriptions')
  .insert({
    organization_id: organizationId,
    lemonsqueezy_subscription_id: subscriptionId,
    quantity: totalUsers,
    current_seats: totalUsers,  // ✅ Add this line
    status: status,
    // ...
  })
```

**Rationale:** New subscriptions come from checkout pages where payment was already completed. User should have immediate access.

### 4. Remove Conditional Logic from subscription_updated Webhook

**File:** `app/api/webhooks/lemonsqueezy/handlers.ts` (Line ~450)

**Current Problem:**
```typescript
// Only updates if variant OR quantity changed
if (variantChanged || quantityChanged) {
  await updateOrganizationSubscription(...);
}
```

**Required Fix:**
```typescript
// ALWAYS sync database on subscription_updated events
await supabase
  .from('subscriptions')
  .update({
    status: status,
    quantity: quantity,
    current_seats: quantity,  // Always sync
    renews_at: renewsAt,
    ends_at: endsAt,
    trial_ends_at: trialEndsAt,
    lemonsqueezy_variant_id: variantIdStr,
    updated_at: new Date().toISOString()
  })
  .eq('organization_id', organizationId);

// Also update organization
await updateOrganizationSubscription(organizationId, quantity, status, supabase);
```

**Rationale:** This ensures manual LemonSqueezy dashboard updates (not just quantity changes) sync to the app immediately.

### 5. Fix Cron Job Database Sync

**File:** `app/api/cron/apply-pending-subscription-changes/route.ts` (Lines 85-120)

**Current Problem:**
```typescript
// Updates LemonSqueezy
const updateResponse = await fetch(
  `https://api.lemonsqueezy.com/v1/subscription-items/${subscription.lemonsqueezy_subscription_item_id}`,
  { /* ... */ }
);

// Marks as synced
await supabase
  .from('subscriptions')
  .update({ lemonsqueezy_quantity_synced: true })
  .eq('id', subscription.id);

// ❌ PROBLEM: Does NOT update current_seats or quantity in database
```

**Required Fix:**
```typescript
// Update LemonSqueezy
const updateResponse = await fetch(...);

if (!updateResponse.ok) {
  throw new Error('LemonSqueezy API update failed');
}

// ✅ Sync local database with the change
await supabase
  .from('subscriptions')
  .update({
    quantity: subscription.pending_seats,
    current_seats: subscription.pending_seats,
    lemonsqueezy_quantity_synced: true,
    updated_at: new Date().toISOString()
  })
  .eq('id', subscription.id);

// ✅ Also update organization
await supabase
  .from('organizations')
  .update({
    paid_seats: subscription.pending_seats
  })
  .eq('id', subscription.organization_id);
```

**Rationale:** Don't rely solely on webhooks for cron-initiated changes. Update database immediately after successful API call.

### 6. Update Invite Dialog UX

**File:** `components/invitations/invite-users-dialog.tsx`

**Required Changes:**

1. **Add payment processing state:**
```typescript
const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
```

2. **Show processing state:**
```typescript
{paymentStatus === 'processing' && (
  <div className="text-sm text-muted-foreground">
    Przetwarzanie płatności... Poczekaj na potwierdzenie.
  </div>
)}
```

3. **Handle async payment confirmation:**
- Store queued invitations in session storage or temporary database table
- After calling `/api/billing/update-subscription-quantity`, show "Processing payment..."
- Poll API or wait for webhook notification
- Once `subscription_payment_success` webhook fires, send invitations
- Show success message

### 7. Add Comprehensive Logging

**Files:** All webhook handlers

**Required Additions:**
```typescript
// Before update
console.log('📊 Subscription Update - Before:', {
  subscriptionId,
  current: { quantity: oldQuantity, current_seats: oldCurrentSeats },
  new: { quantity: newQuantity, current_seats: newCurrentSeats },
  correlationId: payload.meta.event_id
});

// After update
console.log('✅ Subscription Update - After:', {
  subscriptionId,
  updated: { quantity, current_seats, paid_seats },
  correlationId: payload.meta.event_id
});
```

**Correlation IDs:**
- Use `payload.meta.event_id` from LemonSqueezy as correlation ID
- Log this ID in all related operations
- Enables tracking payment flow across multiple operations

### 8. Performance Considerations

- Webhook handlers should process quickly (<3 seconds)
- Use database transactions for multi-table updates
- Add indexes on frequently queried columns if needed
- Log performance metrics for slow operations

### 9. Error Handling

**Webhook Idempotency:**
- Already implemented via `isEventAlreadyProcessed()` function
- Continue using this to prevent duplicate processing

**Payment Failures:**
- If `subscription_payment_success` never arrives, seats remain at old quantity
- User retries payment or cancels invitations
- No automatic cleanup needed (user simply doesn't get access)

**Webhook Retry Logic:**
- LemonSqueezy automatically retries failed webhooks
- Ensure handlers are idempotent
- Log all webhook processing for debugging

## Testing Requirements

### Unit Tests

1. Test `processSubscriptionPaymentSuccess()` handler
2. Test invite dialog payment flow logic
3. Test cron job database sync logic

### Integration Tests

1. **Test Upgrade Flow (9 → 10 seats):**
   - User with 9 seats clicks "Invite 1 user"
   - Verify Subscription Items API called with quantity: 10
   - Verify `current_seats` stays at 9 until webhook
   - Simulate `subscription_payment_success` webhook
   - Verify `current_seats` updates to 10
   - Verify invitation sent

2. **Test Downgrade Flow (10 → 7 seats):**
   - Admin removes 3 users
   - Verify `pending_seats` set to 7
   - Verify `current_seats` stays at 10
   - Wait for renewal date
   - Verify cron job updates LemonSqueezy
   - Verify renewal webhook updates `current_seats` to 7

3. **Test Manual LemonSqueezy Update:**
   - Manually change seats in LemonSqueezy dashboard
   - Simulate `subscription_updated` webhook
   - Verify `current_seats` and `quantity` sync to app
   - Verify UI reflects changes

4. **Test Payment Failure:**
   - User attempts upgrade but payment fails
   - Verify `current_seats` does NOT increase
   - Verify invitations NOT sent
   - Verify error message shown

## External Dependencies

No new external dependencies required. All changes use existing:
- LemonSqueezy API (already integrated)
- Supabase (already integrated)
- Existing webhook infrastructure

## Security Considerations

1. **Payment Bypass Prevention:**
   - Never update `current_seats` before `subscription_payment_success` webhook
   - Always validate webhook signatures (already implemented)
   - Use idempotency to prevent duplicate processing

2. **Database Security:**
   - Use parameterized queries (already using Supabase client)
   - Validate all user inputs
   - Use admin client for webhook handlers (already implemented)

3. **API Security:**
   - Protect webhook endpoint with signature validation (already implemented)
   - Rate limit webhook endpoint if needed
   - Log all suspicious activity
