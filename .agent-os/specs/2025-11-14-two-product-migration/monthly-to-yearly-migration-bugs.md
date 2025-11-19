# Monthly→Yearly Migration Bugs - Investigation Report

**Date:** 2025-11-19
**Status:** CRITICAL - Blocking monthly→yearly migrations
**Related Task:** Task 20 in tasks.md

## Executive Summary

Monthly→yearly subscription migration is partially working but has 4 critical bugs that prevent proper seat preservation and UI updates:

1. ❌ Database constraint violation - `'migrated'` status not allowed
2. ❌ Wrong organization_id used during migration lookup
3. ❌ Seats not preserved (shows 0 instead of 7)
4. ❌ UI shows 2 subscriptions instead of 1

## Test Results

### ✅ What Worked:
- Monthly seat upgrades (6→7 seats) ✅
- Yearly seat upgrades (4→5 seats) ✅
- Migration webhook flow (new subscription created, old cancelled) ✅
- Old subscription cancelled in LemonSqueezy ✅

### ❌ What Failed:
- Seat count not preserved (0 instead of 7)
- Organization tier not updated (free instead of paid)
- UI cannot load subscription (returns 2 rows error)
- Database update failed with constraint violation

## Detailed Bug Analysis

### Bug #1: Database Constraint Violation

**Error from logs (Line 112-117):**
```
⚠️ [Webhook] Failed to update old subscription status: {
  code: '23514',
  details: 'Failing row contains (..., migrated, ...)',
  message: 'new row for relation "subscriptions" violates check constraint "subscriptions_status_check"'
}
```

**Root Cause:**
The `subscriptions` table has a check constraint that only allows specific status values:
- 'active'
- 'past_due'
- 'cancelled'
- 'expired'
- 'on_trial'
- 'paused'

The `'migrated'` status is NOT in this list.

**Impact:**
- Old subscription cannot be marked as migrated
- Database shows 'cancelled' status instead of 'migrated'
- May cause confusion in reconciliation logic

**Fix Required:**
Update the check constraint to include `'migrated'` status.

---

### Bug #2: Wrong Organization ID Used in Migration

**Error from logs (Line 48):**
```
✅ [Webhook] Reusing existing customer 1ec4a188-14e2-42f7-9789-9ba40bf947cf
    for organization c919b954-b2c2-45eb-80f5-fc65aea73cea
```

**Expected organization_id:** `70ccbf98-90ed-44a5-b89a-9b1133c6401d` (from custom_data)
**Actual organization_id used:** `c919b954-b2c2-45eb-80f5-fc65aea73cea` (from old subscription)

**Root Cause:**
In `processSubscriptionCreated` webhook handler, when migration is detected:
```typescript
// Find the old subscription to get its customer
const { data: oldSubscription, error: oldSubError } = await supabase
  .from('subscriptions')
  .select('customer_id, organization_id')
  .eq('lemonsqueezy_subscription_id', migrationFromSubscriptionId)
  .single();

// Later uses oldSubscription.organization_id instead of custom_data.organization_id
```

**Impact:**
- In multi-workspace scenarios, migration would link to wrong organization
- Violates multi-workspace architecture principles
- Could cause cross-workspace data leaks

**Fix Required:**
Always use `custom_data.organization_id`, never `oldSubscription.organization_id`.

---

### Bug #3: Seats Not Preserved

**Error from logs (Lines 75-82, 90):**
```typescript
📊 [Webhook] Quantity determination: {
  billingType: 'quantity_based',
  rawQuantity_from_lemonsqueezy: 7,
  userCount_from_custom_data: 0,  // ❌ WRONG! Should be 7
  final_quantity: 7,
}

// Result:
current_seats: 0,  // ❌ Should be 7
paid_seats: 0,     // ❌ Should be 7
subscription_tier: 'free'  // ❌ Should be 'paid'
```

**Custom Data Sent:**
```json
{
  "tier": "annual",
  "preserve_seats": "7",  // ✅ Correct value here
  "user_count": "",       // ❌ Empty string
  "organization_id": "70ccbf98-90ed-44a5-b89a-9b1133c6401d"
}
```

**Root Cause:**
The webhook extracts `user_count` from the wrong field:
```typescript
// Current code (WRONG):
const userCount = parseInt(meta.custom_data?.user_count || '0');  // Gets 0

// Should be:
const userCount = billingType === 'quantity_based' && meta.custom_data?.preserve_seats
  ? parseInt(meta.custom_data.preserve_seats)
  : parseInt(meta.custom_data?.user_count || '0');
```

**Impact:**
- Organization tier set to 'free' instead of 'paid'
- `current_seats` set to 0 instead of 7
- Users would lose access after migration
- Billing would be incorrect

**Fix Required:**
Extract `user_count` from `preserve_seats` for yearly migrations.

---

### Bug #4: UI Shows Free Tier Instead of Paid Subscription

**Error from logs (Lines 207-224):**
```
❌ No subscription record found: {
  code: 'PGRST116',
  details: 'The result contains 2 rows',
  message: 'Cannot coerce the result to a single JSON object'
}
```

**What User Sees:**
- UI shows "Plan darmowy" (Free plan)
- Shows "3 seats included"
- Should show "Yearly plan with 7 seats"

**Root Cause:**
The `/api/billing/subscription` endpoint at line 98 includes inactive statuses:
```typescript
const { data: subscriptionRecord, error: subError } = await supabase
  .from('subscriptions')
  .select('lemonsqueezy_subscription_id, status, trial_ends_at, current_seats')
  .eq('organization_id', organizationId)
  .in('status', ['active', 'on_trial', 'paused', 'past_due', 'cancelled', 'expired', 'unpaid'])
  .single();  // ❌ Fails when 2 rows returned
```

This query returns both:
1. Old monthly subscription (status: 'cancelled')
2. New yearly subscription (status: 'active')

When `.single()` fails, the code falls into error handler (line 128-152) which returns **free tier fallback**:
```typescript
if (subError || !subscriptionRecord) {
  console.error('❌ No subscription record found:', subError);
  // Returns free tier with subscription: null
  return NextResponse.json({
    success: true,
    subscription: null,  // ❌ UI shows free tier
    organization_info: { /* free tier data */ }
  });
}
```

**Actual Database State:**
```json
{
  "lemonsqueezy_subscription_id": "1652194",
  "status": "active",
  "billing_period": "yearly",
  "quantity": 7,
  "current_seats": 7,
  "subscription_tier": "active",
  "paid_seats": 7
}
```
Database is correct! The problem is only in the API query.

**Impact:**
- UI displays free tier instead of paid yearly subscription
- Shows 3 seats instead of 7 seats
- Users think they lost their subscription after migration
- Prevents accurate billing information display

**Fix Required:**
Remove inactive statuses from the query at line 98:
```typescript
// BEFORE (WRONG):
.in('status', ['active', 'on_trial', 'paused', 'past_due', 'cancelled', 'expired', 'unpaid'])

// AFTER (CORRECT):
.in('status', ['active', 'on_trial', 'paused', 'past_due', 'unpaid'])
// Removed: 'cancelled', 'expired' (and 'migrated' when added)
```

---

## Migration Flow Analysis

### Current Flow (Broken)

1. ✅ User initiates monthly→yearly migration
2. ✅ Checkout created with `preserve_seats: "7"`
3. ✅ LemonSqueezy sends `subscription_created` webhook
4. ✅ Webhook detects migration via `migration_from_subscription_id`
5. ❌ Webhook looks up old subscription's `organization_id` (wrong!)
6. ❌ Webhook extracts `user_count: 0` (should use `preserve_seats`)
7. ✅ New subscription created with `quantity: 7`
8. ❌ New subscription saved with `current_seats: 0` (wrong!)
9. ✅ Old subscription cancelled in LemonSqueezy
10. ❌ Attempt to update old subscription to `status: 'migrated'` fails
11. ❌ UI query returns 2 subscriptions

### Expected Flow (Fixed)

1. ✅ User initiates monthly→yearly migration
2. ✅ Checkout created with `preserve_seats: "7"`
3. ✅ LemonSqueezy sends `subscription_created` webhook
4. ✅ Webhook detects migration via `migration_from_subscription_id`
5. ✅ Webhook uses `custom_data.organization_id` (not old subscription)
6. ✅ Webhook extracts `preserve_seats: 7` for yearly subscriptions
7. ✅ New subscription created with `quantity: 7`
8. ✅ New subscription saved with `current_seats: 7`
9. ✅ Organization updated to `paid_seats: 7`, `subscription_tier: 'paid'`
10. ✅ Old subscription cancelled in LemonSqueezy
11. ✅ Old subscription updated to `status: 'migrated'`
12. ✅ UI query returns only active subscription

---

## Webhook Event Sequence

Based on actual logs, webhooks arrive in this order:

1. **subscription_created** (new yearly subscription)
   - Creates new subscription
   - Cancels old subscription
   - ❌ Fails to update old subscription status

2. **subscription_updated** (new yearly subscription)
   - ❌ Fails: "Subscription not found for update"
   - Arrives before DB insert completes

3. **subscription_payment_success**
   - ✅ Processes successfully

4. **subscription_updated** (old monthly subscription)
   - Updates old subscription to 'cancelled'

5. **subscription_cancelled** (old monthly subscription)
   - Confirms cancellation

6. **subscription_updated** (old monthly subscription again)
   - Redundant update

---

## Database State After Failed Migration

### Subscriptions Table

| Field | Old (Monthly) | New (Yearly) |
|-------|---------------|--------------|
| lemonsqueezy_subscription_id | 1652134 | 1652194 |
| status | cancelled ❌ | active ✅ |
| quantity | 6 | 7 ✅ |
| current_seats | 7 | 0 ❌ |
| billing_period | monthly | yearly ✅ |
| billing_type | usage_based | quantity_based ✅ |
| migrated_to_subscription_id | NULL ❌ | NULL |

### Organizations Table

| Field | Expected | Actual |
|-------|----------|--------|
| subscription_tier | paid | free ❌ |
| paid_seats | 7 | 0 ❌ |
| total_users | 7 | 0 ❌ |

---

## Code Locations

### Files to Update

1. **Supabase Migration**
   - `supabase/migrations/YYYYMMDD_add_migrated_status.sql`
   - Add 'migrated' to status constraint

2. **Webhook Handler**
   - `app/api/webhooks/lemonsqueezy/handlers.ts`
   - Line ~280: Migration customer lookup
   - Line ~420: User count extraction
   - Line ~462: Subscription insert

3. **Subscription API**
   - `app/api/billing/subscription/route.ts`
   - Update query to filter inactive subscriptions

### Specific Code Changes Needed

#### 1. Database Migration
```sql
-- Remove old constraint
ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

-- Add new constraint with 'migrated' status
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN (
    'active',
    'past_due',
    'cancelled',
    'expired',
    'on_trial',
    'paused',
    'migrated'
  ));
```

#### 2. Webhook Handler - Migration Lookup
```typescript
// BEFORE (WRONG):
const { data: oldSubscription } = await supabase
  .from('subscriptions')
  .select('customer_id, organization_id')
  .eq('lemonsqueezy_subscription_id', migrationFromSubscriptionId)
  .single();

customer = existingCustomer;
// Uses oldSubscription.organization_id ❌

// AFTER (CORRECT):
const { data: oldSubscription } = await supabase
  .from('subscriptions')
  .select('customer_id')  // Don't select organization_id
  .eq('lemonsqueezy_subscription_id', migrationFromSubscriptionId)
  .single();

customer = existingCustomer;
// Uses custom_data.organization_id ✅
```

#### 3. Webhook Handler - User Count
```typescript
// BEFORE (WRONG):
const userCount = parseInt(meta.custom_data?.user_count || '0');

// AFTER (CORRECT):
// For migrations with preserve_seats, use that value
// For new subscriptions, use user_count
const userCount = meta.custom_data?.preserve_seats
  ? parseInt(meta.custom_data.preserve_seats)
  : parseInt(meta.custom_data?.user_count || '0');
```

#### 4. Subscription API Query (Line 98)
File: `app/api/billing/subscription/route.ts`

```typescript
// BEFORE (WRONG) - Line 98:
const { data: subscriptionRecord, error: subError } = await supabase
  .from('subscriptions')
  .select('lemonsqueezy_subscription_id, status, trial_ends_at, current_seats')
  .eq('organization_id', organizationId)
  .in('status', ['active', 'on_trial', 'paused', 'past_due', 'cancelled', 'expired', 'unpaid'])
  .single();

// AFTER (CORRECT):
const { data: subscriptionRecord, error: subError } = await supabase
  .from('subscriptions')
  .select('lemonsqueezy_subscription_id, status, trial_ends_at, current_seats')
  .eq('organization_id', organizationId)
  .in('status', ['active', 'on_trial', 'paused', 'past_due', 'unpaid'])
  // Removed: 'cancelled', 'expired' - these should not be shown to users
  // When 'migrated' status is added, it should also NOT be in this list
  .single();
```

---

## Testing Checklist

After fixes are implemented, verify:

- [ ] Database migration runs without errors
- [ ] Old subscription updates to `status: 'migrated'`
- [ ] New subscription shows `current_seats: 7`
- [ ] Organization shows `paid_seats: 7`, `subscription_tier: 'paid'`
- [ ] UI displays only active (yearly) subscription
- [ ] UI shows correct seat count (7)
- [ ] UI shows correct billing period (yearly)
- [ ] No console errors in browser
- [ ] No webhook processing errors in logs
- [ ] Migration works for different seat counts (test with 4, 5, 6, 7, 10 seats)
- [ ] Multi-workspace: Migration in workspace A doesn't affect workspace B

---

## Related Files

- **Tasks:** `.agent-os/specs/2025-11-14-two-product-migration/tasks.md` (Task 20)
- **Webhook Logs:** `.agent-os/specs/2025-11-14-two-product-migration/2025-11-19 12:32:28.md`
- **Migration Code:** `app/api/webhooks/lemonsqueezy/handlers.ts`
- **Subscription API:** `app/api/billing/subscription/route.ts`
- **Database Schema:** `supabase/migrations/20250828000001_create_billing_customers_subscriptions.sql`

---

## Priority

**CRITICAL** - This blocks the entire monthly→yearly migration feature, which is essential for:
- Allowing users to switch billing periods
- Proper seat preservation during migrations
- Correct billing calculations
- UI functionality

## Next Steps

1. Create database migration for 'migrated' status
2. Update webhook handler to fix all 4 bugs
3. Update subscription API query
4. Test complete migration flow
5. Deploy to production
