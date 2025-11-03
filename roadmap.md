# Billing System Enhancement Roadmap

## Executive Summary

This document outlines a comprehensive plan to fix critical billing page pricing issues and implement robust handling of subscription variant and quantity changes in the LemonSqueezy integration.

**Status:** 🔴 Planning Phase
**Priority:** High
**Estimated Effort:** ~100 LOC changes across 5 files
**Target Completion:** TBD

---

## Critical Issues Identified

### Issue 0: Incorrect Paid Seats Calculation ⚠️ MOST CRITICAL
**Problem:** System calculates paid seats as `quantity - 3` instead of "all seats paid when 4+ users"
**Current Behavior:** 6 users = 3 paid seats (6-3)
**Required Behavior:** 6 users = 6 paid seats (all paid when 4+)
**Root Cause:** Wrong formula in `/lib/billing/seat-calculation.ts` line 18, and propagated to all billing code
**Impact:**
- **Billing discrepancy** - LemonSqueezy charges for 6 seats, but database shows 3 paid seats
- Incorrect seat limits displayed to users
- Potential revenue loss or customer confusion
- **MUST BE FIXED FIRST** before other enhancements

### Issue 1: Incorrect Pricing Display
**Problem:** Billing page shows "15,143.56 zł za miejsce" instead of "12.99 PLN"
**Root Cause:** Line 197 in `/app/api/billing/subscription/route.ts` uses `price_id` (UUID like `1514356`) instead of actual `price` value
**Impact:** Users see confusing and incorrect pricing information

### Issue 2: Variant Changes Ignored
**Problem:** When user switches from Monthly→Yearly plan, variant change is not stored
**Root Cause:** Database column `lemonsqueezy_variant_id` was removed in migration `20250828210000`
**Impact:** No tracking of which plan (monthly/yearly) user currently has

### Issue 3: Silent Variant-Only Changes
**Problem:** When user changes variant but keeps same seat count (Monthly 6→Yearly 6), webhook handler doesn't trigger organization update
**Root Cause:** Line 441-443 in `handlers.ts` only checks `quantity` changes, not `variant_id` changes
**Impact:** Critical scenario failure - variant changes are completely undetected

### Issue 4: Missing Audit Trail
**Problem:** No historical record of plan changes in database
**Root Cause:** Variant information not persisted
**Impact:** Cannot analyze subscription patterns or troubleshoot billing issues

---

## Solution Architecture

### 5-Part Implementation Plan

#### **Phase 0: Fix Paid Seats Calculation (CRITICAL - DO FIRST)**
⚠️ **This MUST be completed before all other work**
- Fix core calculation formula in `/lib/billing/seat-calculation.ts`
- Update webhook handlers to use correct calculation
- Update sync script with correct formula
- Update checkout flow calculation
- **Business Logic:**
  - 1-3 users = 0 paid seats (free tier)
  - 4+ users = ALL users are paid seats (e.g., 6 users = 6 paid seats, NOT 3)
- Re-sync existing subscriptions to fix database discrepancies

#### Part 1: Restore Variant Tracking in Database
- Re-add `lemonsqueezy_variant_id` column to subscriptions table
- Add index for fast variant-based queries
- Enable audit trail and subscription analytics

#### Part 2: Update Webhook Handlers
- Extract `variant_id` from webhook payload (both created & updated events)
- Store variant_id alongside quantity in database
- Detect changes to EITHER field independently
- Fix silent failure when only variant changes

#### Part 3: Dynamic Price Fetching
- Create `getVariantPrice(variantId)` utility function
- Fetch real-time pricing from LemonSqueezy Variant API
- Replace hardcoded `price_id` with actual price in cents
- Support multiple currencies (PLN, EUR, USD)

#### Part 4: Handle All Change Scenarios
- Implement independent detection for variant vs quantity changes
- Trigger organization updates when EITHER field changes
- Support simultaneous variant + quantity changes
- Log variant changes for debugging

---

## Detailed Implementation

### **Phase 0: Fix Paid Seats Calculation (DO THIS FIRST)**

⚠️ **CRITICAL:** This phase MUST be completed before proceeding to database migrations and variant tracking.

---

#### Phase 0 - Step 1: Fix Core Calculation Function

**File:** `/lib/billing/seat-calculation.ts`

**Line 17-19:** Update `calculateRequiredPaidSeats` function

```typescript
// BEFORE (INCORRECT):
export function calculateRequiredPaidSeats(currentEmployees: number): number {
  return Math.max(0, currentEmployees - BILLING_CONSTANTS.FREE_SEATS);
}

// AFTER (CORRECT):
export function calculateRequiredPaidSeats(currentEmployees: number): number {
  const FREE_TIER_LIMIT = BILLING_CONSTANTS.FREE_SEATS; // 3
  // Business logic: Up to 3 users are free. 4+ users pay for ALL seats.
  return currentEmployees > FREE_TIER_LIMIT ? currentEmployees : 0;
}
```

**Example Behavior After Fix:**
- 1 user → 0 paid seats (free)
- 2 users → 0 paid seats (free)
- 3 users → 0 paid seats (free)
- 4 users → 4 paid seats (all paid)
- 5 users → 5 paid seats (all paid)
- 6 users → 6 paid seats (all paid)

---

#### Phase 0 - Step 2: Fix Webhook Handler Calculation

**File:** `/app/api/webhooks/lemonsqueezy/handlers.ts`

**Line 238-239:** Update `updateOrganizationSubscription` function

```typescript
// BEFORE (INCORRECT):
const FREE_SEATS = 3;
const paidSeats = Math.max(0, totalUsers - FREE_SEATS);

// AFTER (CORRECT):
const FREE_TIER_LIMIT = 3;
// Business logic: Up to 3 users are free. 4+ users pay for ALL seats.
const paidSeats = totalUsers > FREE_TIER_LIMIT ? totalUsers : 0;
```

---

#### Phase 0 - Step 3: Fix Sync Script Calculation

**File:** `/scripts/sync-subscription-from-lemonsqueezy.ts`

**Line 67-68:** Update calculation formula

```typescript
// BEFORE (INCORRECT):
const FREE_SEATS = 3;
const paidSeats = Math.max(0, quantity - FREE_SEATS);

// AFTER (CORRECT):
const FREE_TIER_LIMIT = 3;
// Business logic: Up to 3 users are free. 4+ users pay for ALL seats.
const paidSeats = quantity > FREE_TIER_LIMIT ? quantity : 0;
```

---

#### Phase 0 - Step 4: Fix Checkout Calculation

**File:** `/app/api/billing/create-checkout/route.ts`

**Line 51-52:** Update `calculatePaidSeats` helper function

```typescript
// BEFORE (INCORRECT):
const FREE_SEATS = 3;
return Math.max(0, totalUsers - FREE_SEATS);

// AFTER (CORRECT):
const FREE_TIER_LIMIT = 3;
// Business logic: Up to 3 users are free. 4+ users pay for ALL seats.
return totalUsers > FREE_TIER_LIMIT ? totalUsers : 0;
```

---

#### Phase 0 - Step 5: Update Tests (If Exists)

**Files to check:**
- `__tests__/billing/seat-enforcement-unit.test.ts`
- `__tests__/billing/test-billing-api-full.js`

Update test expectations to match new calculation:
```typescript
// Example test update:
expect(calculateRequiredPaidSeats(4)).toBe(4); // Not 1
expect(calculateRequiredPaidSeats(6)).toBe(6); // Not 3
```

---

#### Phase 0 - Step 6: Re-sync Existing Subscription Data

**Action:** Run the fixed sync script to update your organization's paid_seats

```bash
# After making code changes, run:
npx tsx scripts/sync-subscription-from-lemonsqueezy.ts bb8-studio
```

**Expected Output After Fix:**
```
Total seats: 6
Paid seats: 6  ← NOW CORRECT (was 3 before)
Free tier: Not eligible (4+ users)
```

---

#### Phase 0 - Step 7: Verify Billing Page

**Action:** Refresh billing page and verify:
- Shows correct number of paid seats (6, not 3)
- Seat utilization displays correctly
- Pricing reflects actual paid seats

---

### **Phase 0 Testing Checklist**

- [ ] Core calculation function updated
- [ ] Webhook handler calculation updated
- [ ] Sync script calculation updated
- [ ] Checkout calculation updated
- [ ] Tests updated (if exist)
- [ ] Sync script run successfully
- [ ] Database shows paid_seats = 6 (not 3)
- [ ] Billing page displays correctly
- [ ] No errors in application logs
- [ ] LemonSqueezy quantity matches database paid_seats

**Estimated Time:** 45 minutes

---

### Step 1: Database Migration

**File:** `/supabase/migrations/[timestamp]_add_variant_id_to_subscriptions.sql`

```sql
-- Re-add variant_id column that was removed in 20250828210000
ALTER TABLE subscriptions
ADD COLUMN lemonsqueezy_variant_id TEXT;

-- Add index for fast variant lookups and filtering
CREATE INDEX idx_subscriptions_variant_id
ON subscriptions(lemonsqueezy_variant_id);

-- Optional: Add comment for documentation
COMMENT ON COLUMN subscriptions.lemonsqueezy_variant_id IS
'LemonSqueezy variant ID (e.g., 972634 for monthly, 972635 for yearly)';
```

**Post-migration:** Run sync script to populate variant_id for existing subscriptions

---

### Step 2: Webhook Handler - processSubscriptionCreated

**File:** `/app/api/webhooks/lemonsqueezy/handlers.ts`

**Change 1 - Line 282:** Extract variant_id from attributes
```typescript
// BEFORE:
const { status, quantity, customer_id, renews_at, ends_at, trial_ends_at } = attributes;

// AFTER:
const { status, quantity, customer_id, variant_id, renews_at, ends_at, trial_ends_at } = attributes;
```

**Change 2 - Line 326:** Add variant_id to insert payload
```typescript
// Add this field to the insert object:
lemonsqueezy_variant_id: variant_id,  // NEW FIELD
```

---

### Step 3: Webhook Handler - processSubscriptionUpdated (CRITICAL FIX)

**File:** `/app/api/webhooks/lemonsqueezy/handlers.ts`

**Change 1 - Line 390-391:** Extract variant_id along with other fields
```typescript
// BEFORE:
const { status, quantity, renews_at, ends_at, trial_ends_at } = attributes;

// AFTER:
const { status, quantity, variant_id, renews_at, ends_at, trial_ends_at } = attributes;
```

**Change 2 - Line 423-430:** Update to include variant_id
```typescript
const { data: updatedSubscription, error: updateError } = await supabase
  .from('subscriptions')
  .update({
    status,
    quantity,
    lemonsqueezy_variant_id: variant_id,  // ADD THIS LINE
    renews_at: renews_at || null,
    ends_at: ends_at || null,
    trial_ends_at: trial_ends_at || null,
    updated_at: new Date().toISOString()
  })
  .eq('lemonsqueezy_subscription_id', subscriptionId)
  .select()
  .single();
```

**Change 3 - Line 441-455:** Replace quantity-only check with BOTH checks (CRITICAL)
```typescript
// BEFORE (BROKEN):
if (existingSubscription.quantity !== quantity) {
  await updateOrganizationSubscription(
    supabase,
    existingSubscription.organization_id,
    quantity,
    status
  );
}

// AFTER (FIXED):
// Detect changes to EITHER field independently
const variantChanged = existingSubscription.lemonsqueezy_variant_id !== variant_id;
const quantityChanged = existingSubscription.quantity !== quantity;

if (variantChanged || quantityChanged) {
  // Update organization when EITHER field changes
  await updateOrganizationSubscription(
    supabase,
    existingSubscription.organization_id,
    quantity,
    status
  );

  // Log variant change for debugging/audit
  if (variantChanged) {
    console.log(
      `[Billing] Variant changed for subscription ${subscriptionId}: ` +
      `${existingSubscription.lemonsqueezy_variant_id} → ${variant_id}`
    );
  }

  if (quantityChanged) {
    console.log(
      `[Billing] Quantity changed for subscription ${subscriptionId}: ` +
      `${existingSubscription.quantity} → ${quantity} seats`
    );
  }
}
```

---

### Step 4: Pricing Utility Function

**File:** `/lib/lemon-squeezy/pricing.ts`

**Add after line 120:**

```typescript
/**
 * Fetch current pricing for a specific variant from LemonSqueezy
 *
 * @param variantId - LemonSqueezy variant ID (e.g., "972634")
 * @returns Object with price, currency, interval, and name
 */
export async function getVariantPrice(variantId: string): Promise<{
  price: number;
  currency: string;
  interval: string;
  name: string;
}> {
  try {
    // Use LemonSqueezy client to fetch variant details
    const variant = await lemonSqueezyClient.getVariant({
      id: variantId
    });

    if (!variant.data) {
      throw new Error(`Variant ${variantId} not found in LemonSqueezy`);
    }

    const attrs = variant.data.data.attributes;

    return {
      price: attrs.price / 100, // Convert cents to currency units (1299 → 12.99)
      currency: 'PLN', // TODO: Extract from attrs if LemonSqueezy provides it
      interval: attrs.interval || 'month',
      name: attrs.name
    };
  } catch (error) {
    console.error(`[Pricing] Failed to fetch variant price for ${variantId}:`, error);

    // Fallback to environment variable pricing
    const fallbackPrice = parseFloat(
      process.env.LEMONSQUEEZY_MONTHLY_PRICE || '12.99'
    );

    console.warn(`[Pricing] Using fallback price: ${fallbackPrice} PLN`);

    return {
      price: fallbackPrice,
      currency: 'PLN',
      interval: 'month',
      name: 'Subscription Plan'
    };
  }
}
```

---

### Step 5: Subscription API Route

**File:** `/app/api/billing/subscription/route.ts`

**Replace lines 183-200:**

```typescript
// BEFORE (BROKEN):
variant: {
  name: lsAttrs.variant_name,
  price: lsAttrs.first_subscription_item?.price_id || 0,  // BUG: Uses price_id!
  quantity: lsAttrs.first_subscription_item?.quantity || orgDetails.paid_seats
}

// AFTER (FIXED):
// Fetch real pricing from variant API
const variantId = lsAttrs.variant_id?.toString();
let variantPricing;

try {
  if (!variantId) {
    throw new Error('No variant_id in subscription response');
  }

  variantPricing = await getVariantPrice(variantId);
} catch (error) {
  console.error('[Billing API] Failed to fetch variant pricing:', error);

  // Fallback pricing to prevent billing page from breaking
  variantPricing = {
    price: 12.99,
    currency: 'PLN',
    interval: 'month',
    name: lsAttrs.variant_name || 'Subscription Plan'
  };
}

variant: {
  id: variantId,
  name: lsAttrs.variant_name,
  price: variantPricing.price,        // ✅ Real price in currency units (12.99)
  currency: variantPricing.currency,  // ✅ Currency code (PLN)
  interval: variantPricing.interval,  // ✅ Billing interval (month/year)
  quantity: lsAttrs.first_subscription_item?.quantity || orgDetails.paid_seats
}
```

**Don't forget to add import at top of file:**
```typescript
import { getVariantPrice } from '@/lib/lemon-squeezy/pricing';
```

---

### Step 6: Update Sync Script (Optional)

**File:** `/scripts/sync-subscription-from-lemonsqueezy.ts`

**Add after line 79 (in the subscription update block):**

```typescript
lemonsqueezy_variant_id: attrs.variant_id,
```

This ensures manual syncs also populate the variant_id field.

---

## Scenario Handling Matrix

| Scenario | Variant Change | Quantity Change | Webhook Detection | Organization Update | Status |
|----------|----------------|-----------------|-------------------|---------------------|---------|
| **Monthly 6→10 seats** | No | Yes | ✅ quantity | ✅ Triggered | Working |
| **Monthly→Yearly (6 seats)** | Yes | No | ✅ variant | ✅ Triggered | 🔴 **BROKEN → FIXED** |
| **Monthly 6→Yearly 10** | Yes | Yes | ✅ both | ✅ Triggered | Working but improved |
| **Yearly 10→Monthly 5** | Yes | Yes | ✅ both | ✅ Triggered | Working but improved |

### Detailed Scenario Flows

#### Scenario 1: User changes seats only (Monthly 6 → Monthly 10)
```
Webhook payload: variant_id=972634 (unchanged), quantity=10 (changed)
↓
Handler extracts: variant_id, quantity
↓
Detects: variantChanged=false, quantityChanged=true
↓
Updates DB: quantity=10, lemonsqueezy_variant_id=972634 (no change)
↓
Triggers: updateOrganizationSubscription() ✅
↓
Billing page: Fetches variant 972634 price → displays "12.99 PLN" ✅
```

#### Scenario 2: User changes variant only (Monthly → Yearly, same 6 seats) ⚠️ CRITICAL FIX
```
Webhook payload: variant_id=972635 (changed), quantity=6 (unchanged)
↓
Handler extracts: variant_id, quantity
↓
Detects: variantChanged=true, quantityChanged=false
↓
Updates DB: quantity=6 (no change), lemonsqueezy_variant_id=972635 (changed)
↓
Triggers: updateOrganizationSubscription() ✅ FIXED (was broken before)
↓
Billing page: Fetches variant 972635 price → displays "10.83 PLN" ✅
↓
User sees: "Plan: Yearly - Per User, Cena: 10,83 zł za miejsce" ✅
```

**Before fix:** Organization update was NOT triggered because only quantity was checked.
**After fix:** Organization update IS triggered because we check `variantChanged || quantityChanged`.

#### Scenario 3: User changes both (Monthly 6 → Yearly 10)
```
Webhook payload: variant_id=972635 (changed), quantity=10 (changed)
↓
Handler extracts: variant_id, quantity
↓
Detects: variantChanged=true, quantityChanged=true
↓
Updates DB: quantity=10, lemonsqueezy_variant_id=972635
↓
Triggers: updateOrganizationSubscription() ✅
↓
Logs: Both changes detected (variant + quantity)
↓
Billing page: Fetches variant 972635 price → displays "10.83 PLN" with 10 seats ✅
```

#### Scenario 4: User downgrades (Yearly 10 → Monthly 5)
```
Webhook payload: variant_id=972634 (changed), quantity=5 (changed)
↓
Handler extracts: variant_id, quantity
↓
Detects: variantChanged=true, quantityChanged=true
↓
Updates DB: quantity=5, lemonsqueezy_variant_id=972634
↓
Triggers: updateOrganizationSubscription() ✅
↓
Billing page: Fetches variant 972634 price → displays "12.99 PLN" with 5 seats ✅
```

---

## Testing Checklist

### Pre-Implementation Tests (Current State)
- [ ] Document current billing page showing incorrect price (15,143.56 zł)
- [ ] Verify sync script shows variant_id in LemonSqueezy response
- [ ] Confirm variant_id column does not exist in subscriptions table

### Migration Tests
- [ ] Run migration successfully on local database
- [ ] Verify `lemonsqueezy_variant_id` column added to subscriptions table
- [ ] Verify index `idx_subscriptions_variant_id` created
- [ ] Run sync script to populate variant_id for existing subscription
- [ ] Verify variant_id is now stored in database

### Webhook Tests
- [ ] Test subscription_created webhook stores variant_id
- [ ] Test subscription_updated webhook with quantity change only
- [ ] Test subscription_updated webhook with variant change only ⚠️ CRITICAL
- [ ] Test subscription_updated webhook with both changes
- [ ] Verify webhook logs show variant change detection
- [ ] Verify organization updates trigger correctly

### Pricing Tests
- [ ] Verify `getVariantPrice()` fetches monthly price (12.99 PLN)
- [ ] Verify `getVariantPrice()` fetches yearly price (10.83 PLN)
- [ ] Test fallback pricing when LemonSqueezy API fails
- [ ] Verify billing page displays correct monthly price
- [ ] Verify billing page displays correct yearly price

### End-to-End Scenario Tests
- [ ] **Scenario 1:** User changes from 6→10 seats (same monthly variant)
  - [ ] Webhook received and processed
  - [ ] Database updated (quantity=10, variant_id unchanged)
  - [ ] Organization updated
  - [ ] Billing page shows 12.99 PLN for 10 seats

- [ ] **Scenario 2:** User changes Monthly→Yearly (same 6 seats) ⚠️ CRITICAL TEST
  - [ ] Webhook received and processed
  - [ ] Database updated (quantity=6 unchanged, variant_id=972635)
  - [ ] Organization updated (THIS WAS BROKEN, NOW FIXED)
  - [ ] Billing page shows 10.83 PLN for 6 seats
  - [ ] User sees "Yearly - Per User" plan name

- [ ] **Scenario 3:** User changes Monthly 6→Yearly 10
  - [ ] Webhook received and processed
  - [ ] Database updated (quantity=10, variant_id=972635)
  - [ ] Organization updated
  - [ ] Billing page shows 10.83 PLN for 10 seats

- [ ] **Scenario 4:** User downgrades Yearly 10→Monthly 5
  - [ ] Webhook received and processed
  - [ ] Database updated (quantity=5, variant_id=972634)
  - [ ] Organization updated
  - [ ] Billing page shows 12.99 PLN for 5 seats

### Regression Tests
- [ ] Verify upgrade page still works (onboarding/add-users)
- [ ] Verify subscription cancellation still works
- [ ] Verify subscription pause/resume still works
- [ ] Verify existing subscriptions continue to work
- [ ] Verify webhook signature validation still works

### Performance Tests
- [ ] Monitor API response time with new variant price fetching
- [ ] Verify pricing is cached appropriately
- [ ] Check LemonSqueezy API rate limits not exceeded
- [ ] Verify fallback pricing kicks in if API is slow

---

## Files Modified Summary

### Phase 0: Paid Seats Calculation Fix
| File | Lines Changed | Type | Description |
|------|---------------|------|-------------|
| `/lib/billing/seat-calculation.ts` | ~3 | Modified | Fix calculateRequiredPaidSeats() formula |
| `/app/api/webhooks/lemonsqueezy/handlers.ts` | ~3 | Modified | Fix paid seats calculation in webhook |
| `/scripts/sync-subscription-from-lemonsqueezy.ts` | ~3 | Modified | Fix paid seats calculation in sync script |
| `/app/api/billing/create-checkout/route.ts` | ~3 | Modified | Fix paid seats calculation in checkout |
| `__tests__/billing/*.test.ts` | ~10 | Modified | Update test expectations (if needed) |

**Phase 0 subtotal:** ~22 lines across 5 files

### Phases 1-4: Variant Tracking & Dynamic Pricing
| File | Lines Changed | Type | Description |
|------|---------------|------|-------------|
| `/supabase/migrations/[new]_add_variant_id.sql` | +8 | New | Add variant_id column & index |
| `/app/api/webhooks/lemonsqueezy/handlers.ts` | ~30 | Modified | Extract & store variant_id, fix detection logic |
| `/lib/lemon-squeezy/pricing.ts` | +35 | Modified | Add getVariantPrice() function |
| `/app/api/billing/subscription/route.ts` | ~25 | Modified | Fetch variant pricing dynamically |
| `/scripts/sync-subscription-from-lemonsqueezy.ts` | +1 | Modified | Sync variant_id in manual sync |

**Phases 1-4 subtotal:** ~100 lines across 5 files

**Total estimated changes:** ~122 lines of code across 7 files (with some overlap)

---

## Implementation Timeline

### **Phase 0: Fix Paid Seats Calculation (45 min) - DO FIRST**
⚠️ **CRITICAL: Complete before all other phases**
1. Update seat-calculation.ts (5 min)
2. Update handlers.ts webhook calculation (5 min)
3. Update sync-subscription script (5 min)
4. Update create-checkout calculation (5 min)
5. Update tests if they exist (10 min)
6. Run sync script to fix current data (5 min)
7. Verify billing page shows correct paid seats (10 min)

**Deliverable:** Database correctly shows paid_seats=6 (not 3), all formulas use "all paid when 4+" logic

---

### Phase 1: Database Setup (30 min)
1. Create migration file
2. Run migration on local database
3. Verify migration successful
4. Run sync script to populate existing data

### Phase 2: Webhook Handlers (45 min)
1. Update processSubscriptionCreated to extract & store variant_id
2. Update processSubscriptionUpdated to extract & store variant_id
3. Fix detection logic for variant-only changes (CRITICAL)
4. Add logging for debugging
5. Test webhook processing locally

### Phase 3: Pricing Utility (30 min)
1. Implement getVariantPrice() function
2. Add error handling and fallback logic
3. Test with both monthly and yearly variants
4. Verify caching works properly

### Phase 4: API Integration (30 min)
1. Update subscription API route to use getVariantPrice()
2. Add proper error handling
3. Import new utility function
4. Test API endpoint returns correct pricing

### Phase 5: Testing (60 min)
1. Run all 4 end-to-end scenarios
2. Verify webhook processing
3. Check billing page displays
4. Test fallback scenarios
5. Regression testing

### Phase 6: Documentation & Deployment (30 min)
1. Update API documentation if needed
2. Document new variant_id column in schema docs
3. Create deployment checklist
4. Deploy to staging
5. Smoke test in staging
6. Deploy to production

**Total estimated time:** 4-5 hours (including Phase 0)

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing locally
- [ ] Code reviewed
- [ ] Migration file created and tested
- [ ] Backup current production database
- [ ] Document rollback procedure

### Staging Deployment
- [ ] Deploy code to staging
- [ ] Run migration on staging database
- [ ] Run sync script to populate variant_id
- [ ] Test all scenarios in staging
- [ ] Verify webhooks work with staging LemonSqueezy webhooks
- [ ] Monitor logs for errors

### Production Deployment
- [ ] Deploy code to production
- [ ] Run migration on production database
- [ ] Run sync script to populate variant_id for existing subscriptions
- [ ] Monitor webhook processing
- [ ] Check billing page for multiple users
- [ ] Monitor error logs
- [ ] Verify LemonSqueezy webhook success rate

### Post-Deployment
- [ ] Monitor for 24 hours
- [ ] Check customer support tickets for billing issues
- [ ] Verify all subscription changes are tracked
- [ ] Document any issues found
- [ ] Update this roadmap with lessons learned

---

## Rollback Procedure

If critical issues are found after deployment:

### Quick Rollback (Code Only)
1. Revert code changes via git
2. Redeploy previous version
3. Note: variant_id column will remain but be ignored

### Full Rollback (Code + Database)
1. Revert code changes via git
2. Run rollback migration:
   ```sql
   DROP INDEX IF EXISTS idx_subscriptions_variant_id;
   ALTER TABLE subscriptions DROP COLUMN IF EXISTS lemonsqueezy_variant_id;
   ```
3. Redeploy previous version
4. Investigate root cause before re-attempting

---

## Future Enhancements

### Phase 2 Improvements (Post-Launch)
- [ ] Add variant change notification emails to customers
- [ ] Create admin dashboard to view subscription variant distribution
- [ ] Implement variant pricing cache (Redis/in-memory)
- [ ] Add metrics/analytics for plan change patterns
- [ ] Support multiple currencies dynamically from LemonSqueezy
- [ ] Add variant change history log table for audit trail
- [ ] Create API endpoint to forecast revenue based on variant mix
- [ ] Implement automated tests for all webhook scenarios

### Performance Optimizations
- [ ] Cache variant pricing for 1 hour to reduce API calls
- [ ] Implement background job for variant price refresh
- [ ] Add fallback pricing from database instead of env vars
- [ ] Optimize getVariantPrice() with memoization

### Monitoring & Observability
- [ ] Add Datadog/Sentry monitoring for variant changes
- [ ] Create dashboard for subscription variant metrics
- [ ] Alert on variant change webhook failures
- [ ] Track pricing API call success rate

---

## Known Limitations

1. **Currency Detection:** Currently hardcoded to PLN, need to extract from LemonSqueezy API
2. **Price Caching:** No caching implemented, fetches price on every billing page load
3. **Variant History:** No historical log of variant changes, only current state
4. **Webhook Retry:** If variant update fails, no automatic retry mechanism
5. **Multi-Currency:** Doesn't handle customers with different currencies yet

---

## Questions & Answers

**Q: What is the correct paid seats calculation formula?**
A: **Up to 3 users are FREE. 4+ users pay for ALL seats.**
- 1-3 users → 0 paid seats (free tier)
- 4 users → 4 paid seats (not 1!)
- 6 users → 6 paid seats (not 3!)

The old formula `quantity - 3` was incorrect and caused billing discrepancies.

**Q: Why is Phase 0 so critical?**
A: Your LemonSqueezy subscription charges for 6 seats, but your database currently shows only 3 paid seats due to the wrong formula. This creates:
- Revenue tracking errors
- Incorrect seat limits for users
- Potential billing disputes
- Data inconsistency between LemonSqueezy and your database

**Q: Can we skip Phase 0 and do it later?**
A: **No!** All subsequent phases depend on correct paid_seats calculations. Implementing variant tracking and dynamic pricing on top of wrong seat calculations will compound the errors.

**Q: Why not use price from subscription_item instead of fetching from variant?**
A: LemonSqueezy's `first_subscription_item.price` is undefined in the API response. The `price_id` is just an identifier, not the actual price amount. Fetching from variant ensures we always have the correct, current price.

**Q: What happens if variant pricing changes in LemonSqueezy?**
A: The `getVariantPrice()` function fetches real-time pricing, so if you change the price in LemonSqueezy dashboard, it will be reflected immediately on the billing page (no code changes needed).

**Q: Will this work when we add new variants (e.g., quarterly plan)?**
A: Yes! The solution is variant-agnostic. Just create the new variant in LemonSqueezy, and the system will automatically fetch and display its pricing.

**Q: What if the LemonSqueezy API is down?**
A: The `getVariantPrice()` function has fallback pricing from environment variables. The billing page won't break, but will show fallback pricing until the API is available again.

**Q: Do we need to update webhooks in LemonSqueezy dashboard?**
A: No! The existing webhooks already send `variant_id` in the payload. We're just now properly extracting and storing it.

---

## Success Metrics

### Phase 0 Success Criteria (CRITICAL)
- ✅ Database shows `paid_seats = 6` for bb8-studio org (not 3)
- ✅ All calculation formulas use "all paid when 4+" logic
- ✅ LemonSqueezy quantity matches database paid_seats
- ✅ Billing page shows correct seat count (6 of 6 used)
- ✅ No calculation errors in logs

### Immediate Success Criteria (Phases 1-4)
- ✅ Billing page shows correct price (12.99 PLN or 10.83 PLN)
- ✅ Variant changes are detected and stored
- ✅ Scenario 2 (variant-only change) works correctly
- ✅ No errors in webhook processing logs

### Long-Term Success Metrics
- 📊 100% webhook success rate for subscription_updated events
- 📊 Zero customer support tickets about incorrect pricing or seat counts
- 📊 Accurate subscription variant tracking in database
- 📊 Successful handling of plan changes in production
- 📊 Paid seats calculations match LemonSqueezy billing

---

## Contact & Support

**Implementation Lead:** TBD
**Code Reviewers:** TBD
**Deployment Owner:** TBD

**Documentation:** This roadmap + inline code comments
**Support Channel:** [Your support channel]
**Issue Tracking:** [Your issue tracker]

---

## Document History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-10-31 | 1.0 | Initial roadmap created | Claude |
| 2025-10-31 | 1.1 | **Added Phase 0: Fix Paid Seats Calculation** - Critical discovery that paid_seats formula is incorrect (quantity-3 instead of "all paid when 4+"). Phase 0 must be completed first before other work. | Claude |

---

**Next Steps:**

⚠️ **CRITICAL: Begin with Phase 0 (Paid Seats Calculation Fix) - DO NOT skip this step!**

1. Review this roadmap with stakeholders
2. Assign implementation lead
3. **Start Phase 0:** Fix paid seats calculation (45 min, HIGHEST PRIORITY)
4. After Phase 0 complete: Begin Phase 1 (Database Setup)
