# Spec Requirements Document

> Spec: Hybrid Billing - Add Quantity-Based Billing for Yearly Subscriptions
> Created: 2025-11-13
> Status: Planning

## Overview

Add quantity-based billing for yearly subscriptions alongside existing usage-based billing for monthly subscriptions. This creates a hybrid billing system where monthly users get flexible pay-at-end-of-month billing, while yearly users pay upfront for the year with immediate proration for seat changes.

**Critical Constraint**: This spec MUST NOT break or modify the existing monthly subscription workflow. Monthly subscriptions using usage-based billing are working correctly and must continue working unchanged.

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

**Implementation Status**: ✅ COMPLETE - Do not modify

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

### Story 3: Business Owner Reviews Subscription Costs

As a business owner, I want to understand when and how I'll be charged for seat changes, so that I can plan my budget accordingly.

**Monthly Subscribers**:
- See clear message: "Charged at end of each month based on usage"
- Can add/remove seats freely during month
- Single invoice at month end with all changes

**Yearly Subscribers**:
- See clear message: "Charged immediately for prorated amount"
- See calculation before confirming: "$240 for 73 remaining days"
- Receive immediate invoice for changes

## Spec Scope

1. **Add quantity-based billing support** - Enable PATCH-based seat management for yearly subscriptions with immediate proration
2. **Create SeatManager service** - Centralized service that routes to correct billing method based on subscription type
3. **Update subscription_created webhook** - Detect and set billing_type based on variant (monthly vs yearly)
4. **Update database schema** - Add 'quantity_based' to billing_type enum
5. **Frontend UX for yearly** - Show proration calculation and immediate charge messaging

## Out of Scope

- ❌ Any changes to monthly subscription workflow
- ❌ Any changes to existing usage-based billing logic
- ❌ Changes to subscription_updated handler (already fixed and working)
- ❌ Migration of existing monthly subscriptions to different billing type
- ❌ Changes to free tier logic (1-3 users = $0)
- ❌ Changes to create-checkout endpoint (already working)

## Expected Deliverable

1. **Yearly subscriptions charge upfront** - When user creates yearly subscription, they pay for first year immediately
2. **Yearly seat changes charge immediately** - When yearly user adds seats, they pay prorated amount now (not at renewal)
3. **Monthly subscriptions unchanged** - All existing monthly workflow continues working exactly as before
4. **Clear routing logic** - Code clearly separates monthly (usage-based) vs yearly (quantity-based) paths
5. **Proration calculator** - Frontend shows cost before user confirms seat changes on yearly plans
6. **Comprehensive tests** - Test both monthly (existing) and yearly (new) without breaking either

## Success Criteria

✅ Monthly user adds seats → usage record created → charged at end of month → NO CODE CHANGES
✅ Yearly user adds seats → quantity updated → charged immediately → NEW CODE WORKS
✅ Free tier (1-3 users) works for both monthly and yearly
✅ All existing monthly subscriptions continue working
✅ New yearly subscriptions work with immediate proration
✅ Clear separation between billing types in code
✅ Comprehensive logging for both paths
✅ Zero risk of double charging
