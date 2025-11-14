# Spec Requirements Document

> Spec: Hybrid Billing - Add Quantity-Based Billing for Yearly Subscriptions
> Created: 2025-11-13
> Status: Planning

## Overview

Add quantity-based billing for yearly subscriptions alongside existing usage-based billing for monthly subscriptions. This creates a hybrid billing system where monthly users get flexible pay-at-end-of-month billing, while yearly users pay upfront for the year with immediate proration for seat changes.

**Critical Constraint**: This spec MUST NOT break or modify the existing monthly subscription workflow. Monthly subscriptions using usage-based billing are working correctly and must continue working unchanged.

## Known Issues & Resolutions

### Issue 1: Database Subscription ID Mismatch (RESOLVED - 2025-11-14)

**Problem**: Database was pointing to cancelled subscription 1447969 (`is_usage_based: false`) instead of active subscription 1638258 (`is_usage_based: true`).

**Symptoms**:
- Changing seats in app updated database but didn't create usage records in LemonSqueezy
- API calls to create usage records returned 404 "This subscription item is not usage-based"
- User reported: "nothing is changing in terms of lemonsqueezy!"

**Root Cause**: When subscription 1638258 was created, database wasn't updated to point to new subscription. App continued using old cancelled subscription ID.

**Resolution**: Updated subscriptions table for organization BB8 Studio:
- `lemonsqueezy_subscription_id`: '1447969' → '1638258'
- `lemonsqueezy_subscription_item_id`: '3806239' → '5289975'

**Verification Completed**:
- ✅ Usage records now created successfully in LemonSqueezy
- ✅ Peak usage tracking confirmed working (aggregation: "max")
- ✅ Graduated pricing verified (3 free seats + 10 PLN per additional seat)
- ✅ Webhook handler preserves `current_seats` correctly for usage-based billing
- ✅ Month-end billing will charge for peak usage during period

**Files Added for Diagnostics**:
- `fix-subscription-id.mjs` - Script to update database subscription IDs
- `verify-db-state.mjs` - Check database subscription configuration
- `check-correct-subscription.mjs` - Verify usage records in LemonSqueezy
- `check-current-usage.mjs` - Check what will be billed at period end
- `SUMMARY-OF-FIX.md` - Complete documentation of issue and fix
- `LEMONSQUEEZY-WEBHOOKS.md` - Webhook behavior guide

## Prerequisites (Completed - 2025-11-14)

Before implementing yearly billing, we verified monthly billing works correctly:

### 1. Database Subscription Configuration
- ✅ Database points to correct active subscription (1638258)
- ✅ Subscription has `is_usage_based: true`
- ✅ Subscription item ID correctly set (5289975)
- ✅ Billing type set to `usage_based` in database

### 2. Usage Record Creation
- ✅ Tested manual usage record creation via LemonSqueezy API
- ✅ Confirmed records appear in LemonSqueezy immediately
- ✅ Peak usage tracking verified with multiple test records
- ✅ Usage aggregation method confirmed as "max" (peak billing)

### 3. Webhook Handler Behavior
- ✅ Confirmed `subscription_updated` webhook preserves `current_seats`
- ✅ Billing type routing logic works correctly
- ✅ Only updates `current_seats` for non-usage-based subscriptions
- ✅ Webhooks do NOT fire for usage record creation (by design)

### 4. Graduated Pricing Structure
- ✅ First 3 seats: FREE tier verified
- ✅ Additional seats: 10 PLN per seat confirmed
- ✅ Pricing tier scheme: "graduated" confirmed
- ✅ Billing occurs at end of billing period

### 5. Key Learnings
- LemonSqueezy usage-based subscriptions always have `quantity: 0`
- Actual seat count stored in database `current_seats` field
- Current-usage endpoint shows free tier base (3), not actual seats
- Usage records must be checked via `/v1/usage-records` API endpoint
- Peak usage from all records determines month-end charge

## User Stories

### Story 1: Monthly User Adds Seats (Existing - Do Not Modify)

As a monthly subscriber, I want to add seats to my workspace at any time during the month, so that new team members can start using the system immediately without upfront costs.

**Current Workflow** (working correctly):
1. User clicks "Add Users" in workspace settings
2. User adds 2 new team members (6 → 8 seats)
3. System creates usage record with quantity: 8
4. User sees message: "New seats will be billed at end of current period"
5. At end of month, user is charged for 8 seats × monthly rate
6. No immediate charge, full flexibility

**Implementation Status**: ✅ COMPLETE & VERIFIED - Fixed database subscription ID issue (see Known Issues section)

### Story 2: Yearly User Adds Seats (New - To Implement)

As a yearly subscriber, I want to add seats to my workspace mid-year and be charged immediately for the prorated amount, so that my business gets predictable revenue and I can add team members without waiting.

**Desired Workflow**:
1. User clicks "Add Users" in workspace settings
2. User adds 2 new team members (6 → 8 seats)
3. System calculates proration: 2 seats × yearly rate × (remaining days / 365)
4. User sees: "You will be charged $X.XX now for Y remaining days"
5. User confirms
6. System immediately charges prorated amount
7. Subscription quantity updated to 8 seats
8. User receives invoice immediately

**Implementation Status**: ❌ NOT IMPLEMENTED - This is what we're building

### Story 3: User Switches Between Monthly and Yearly Plans (New - To Implement)

As a subscriber, I want to switch between monthly and yearly billing plans to optimize costs or cash flow based on my business needs.

**Monthly → Yearly Switch**:
1. User navigates to billing settings
2. User clicks "Switch to Yearly Plan"
3. System calculates proration credit for unused monthly time
4. System shows: "Switch to yearly billing: Save 20% per seat. You'll receive X PLN credit for unused monthly time, then be charged Y PLN for the year"
5. User confirms switch
6. LemonSqueezy applies credit and charges yearly amount
7. Subscription variant updated to yearly (972635)
8. Database `billing_type` updated to `quantity_based`
9. Seat count preserved (e.g., 8 seats stays 8 seats)

**Yearly → Monthly Switch**:
1. User navigates to billing settings
2. User clicks "Switch to Monthly Plan"
3. System calculates credit for unused yearly time
4. System shows: "Switch to monthly billing: Credit of X PLN will be applied at next billing cycle"
5. User confirms switch
6. LemonSqueezy updates subscription variant to monthly (972634)
7. Database `billing_type` updated to `usage_based`
8. Usage record created with current seat count
9. Credit applied at next monthly billing

**Implementation Status**: ❌ NOT IMPLEMENTED - This is what we're building

### Story 4: Business Owner Reviews Subscription Costs

As a business owner, I want to understand when and how I'll be charged for seat changes, so that I can plan my budget accordingly.

**Monthly Subscribers**:
- See clear message: "Charged at end of each month based on usage"
- Can add/remove seats freely during month
- Single invoice at month end with all changes

**Yearly Subscribers**:
- See clear message: "Charged immediately for prorated amount"
- See calculation before confirming: "48.16 PLN for 183 remaining days"
- Receive immediate invoice for changes

## Spec Scope

1. **Add quantity-based billing support** - Enable PATCH-based seat management for yearly subscriptions with immediate proration
2. **Create SeatManager service** - Centralized service that routes to correct billing method based on subscription type
3. **Update subscription_created webhook** - Detect and set billing_type based on variant (monthly vs yearly)
4. **Update database schema** - Add 'quantity_based' to billing_type enum
5. **Frontend UX for yearly** - Show proration calculation and immediate charge messaging
6. **Plan switching implementation** - Enable users to switch between monthly and yearly billing plans with proper proration/credits

## Out of Scope

- ❌ Any changes to monthly subscription workflow (must remain unchanged)
- ❌ Any changes to existing usage-based billing logic
- ❌ Automatic migration of existing subscriptions to different billing types
- ❌ Changes to free tier logic (1-3 users = 0 PLN for both monthly and yearly)
- ❌ Changes to create-checkout endpoint (already working for both variants)

## Expected Deliverable

1. **Yearly subscriptions charge upfront** - When user creates yearly subscription, they pay for first year immediately
2. **Yearly seat changes charge immediately** - When yearly user adds seats, they pay prorated amount now (not at renewal)
3. **Plan switching works both directions** - Users can switch monthly ↔ yearly with proper credits/charges
4. **Monthly subscriptions unchanged** - All existing monthly workflow continues working exactly as before
5. **Clear routing logic** - Code clearly separates monthly (usage-based) vs yearly (quantity-based) paths
6. **Proration calculator** - Frontend shows cost before user confirms seat changes or plan switches
7. **Comprehensive tests** - Test monthly (existing), yearly (new), and plan switching without breaking either

## Success Criteria

✅ Monthly user adds seats → usage record created → charged at end of month → VERIFIED WORKING (fixed DB subscription ID)
✅ Yearly user adds seats → quantity updated → charged immediately → NEW CODE WORKS
✅ User switches monthly → yearly → receives credit + charged yearly amount → billing_type updated
✅ User switches yearly → monthly → receives credit at renewal → billing_type updated → usage record created
✅ Free tier (1-3 users) works for both monthly and yearly
✅ All existing monthly subscriptions continue working unchanged
✅ New yearly subscriptions work with immediate proration
✅ Plan switching preserves seat count
✅ Clear separation between billing types in code
✅ Comprehensive logging for all paths (monthly, yearly, switching)
✅ Zero risk of double charging
