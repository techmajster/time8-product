# Spec Requirements Document

> Spec: Fix Usage-Based Billing Implementation
> Created: 2025-11-13
> Status: Planning
> Related Spec: @.agent-os/specs/2025-11-12-migrate-usage-based-billing/

## Overview

Fix all critical issues discovered in the usage-based billing migration by comparing the implementation against official LemonSqueezy documentation. The original migration (2025-11-12) has multiple bugs and misunderstandings about LemonSqueezy's usage-based billing behavior that prevent the system from working correctly.

## User Stories

### Story 1: Free Tier Users (1-3 Seats)

As a user with 1-3 team members, I want to use the free tier without being charged, so that I can evaluate the product before committing to a paid plan.

**Current Behavior**: Usage records may be sent with incorrect quantities, causing unexpected charges.

**Expected Behavior**:
- Checkout shows $0 for 1-3 users
- Usage record created with `quantity: 0`
- Organization marked with `paid_seats: 0`
- No charges at billing period end

### Story 2: Paid Tier Users (4+ Seats)

As a user with 4 or more team members, I want to pay for ALL seats (not seats minus 3), so that billing is straightforward and transparent.

**Current Behavior**: Code has conflicting logic about whether to charge for all seats or (seats - 3).

**Expected Behavior**:
- 5 users = pay for 5 seats (not 2 seats)
- 10 users = pay for 10 seats (not 7 seats)
- Usage record created with `quantity: total_user_count`
- Organization marked with `paid_seats: total_user_count`

### Story 3: Subscription Tracking

As a developer, I want subscription_item_id stored at creation time, so that I don't need extra API calls when updating usage records.

**Current Behavior**: subscription_item_id is fetched on-demand, causing extra API calls and potential rate limiting.

**Expected Behavior**:
- subscription_item_id stored in `subscription_created` webhook
- No extra API calls needed for usage updates
- Faster performance for seat management

### Story 4: Legacy Subscription Handling

As a user with an old subscription (created before usage-based billing), I want clear error messages explaining I need to create a new subscription, so that I understand why seat changes don't work.

**Current Behavior**: Generic error messages, unclear what the problem is.

**Expected Behavior**:
- Proactive detection of legacy subscriptions
- Clear error message: "This subscription was created before usage-based billing was enabled"
- Guidance to create new subscription
- UI hides unsupported operations

### Story 5: Checkout Experience

As a new user going through checkout, I want to see $0 charge when using usage-based billing, so that I understand billing happens retrospectively.

**Current Behavior**: Checkout may attempt to charge for initial seats.

**Expected Behavior**:
- Checkout always shows $0 for usage-based subscriptions
- Payment method captured but no immediate charge
- Clear messaging that billing happens at end of first period
- Usage record created after subscription_created webhook

## Spec Scope

This spec fixes the following issues found in the original migration:

### Phase 1: Critical Billing Logic Fixes
1. **Fix free tier calculation** - Properly handle 1-3 users = $0, 4+ = pay for all
2. **Fix usage record creation** - Send correct quantities based on free tier logic
3. **Store subscription_item_id** - Save at creation time, not on-demand
4. **Fix quantity update logic** - Respect free tier in all seat changes

### Phase 2: Data Storage Improvements
1. **Add billing_type field** - Track 'volume' vs 'usage_based' subscriptions
2. **Update subscription_created webhook** - Store all required fields at creation
3. **Add proactive legacy detection** - Check billing_type before usage records API

### Phase 3: Webhook Clarity Improvements
1. **Clarify usage-based comments** - Explain how usage records flow through webhooks
2. **Add usage-based verification** - Check is_usage_based before processing
3. **Improve billing period logic** - Handle usage-based subscriptions correctly

### Phase 4: Frontend UX Enhancements
1. **Improve error handling** - Better rollback/recovery for multi-step operations
2. **Add user-friendly messages** - Explain legacy subscription limitations
3. **Hide unsupported operations** - Don't show options that won't work

### Phase 5: Documentation Updates
1. **Fix API endpoint documentation** - Correct usage records endpoint in specs
2. **Update terminology** - Match LemonSqueezy dashboard terminology
3. **Document free tier logic** - Clearly explain 1-3 vs 4+ seat billing

### Phase 6: Code Quality Improvements
1. **Standardize extraction patterns** - Consistent subscription_item_id handling
2. **Add proactive validation** - Check before API calls, not just error handling
3. **Add comprehensive logging** - Track billing decisions and usage record values

### Phase 7: Testing & Verification
1. **Create test checklist** - Comprehensive test scenarios
2. **Enhance E2E test script** - Cover free tier and all edge cases
3. **Verify complete flow** - End-to-end testing with new subscriptions

## Out of Scope

- **Migration of existing subscriptions** - Old subscriptions cannot be migrated to usage-based billing (LemonSqueezy limitation)
- **Retroactive billing fixes** - Cannot fix charges that already occurred
- **Alternative billing models** - Staying with current usage-based + graduated pricing model
- **Custom pricing negotiation** - Not implementing enterprise custom pricing in this spec

## Expected Deliverable

A fully working usage-based billing system with:

1. **Correct checkout behavior** - $0 charge, payment method captured
2. **Accurate usage records** - Proper quantities for free tier (1-3) and paid tier (4+)
3. **Efficient data storage** - subscription_item_id and billing_type tracked from creation
4. **Clear error handling** - Legacy subscriptions handled gracefully
5. **Comprehensive logging** - Audit trail of billing decisions
6. **Updated documentation** - Specs match actual implementation
7. **Complete test coverage** - E2E tests verify all scenarios work

Browser-testable outcomes:
1. Create new workspace with 3 users → $0 charge, free tier confirmed
2. Create new workspace with 6 users → $0 at checkout, usage record for 6 seats created
3. Upgrade from 6 to 10 seats → Usage record updated, organization reflects 10 paid seats
4. Change billing period → Seats preserved, no restoration logic needed
5. View webhook logs → Clear audit trail of all billing decisions

## Success Criteria

- ✅ All E2E tests pass for free tier (1-3 users)
- ✅ All E2E tests pass for paid tier (4+ users)
- ✅ Checkout always charges $0 for usage-based subscriptions
- ✅ Usage records created with correct quantities
- ✅ subscription_item_id stored at creation (no extra API calls)
- ✅ Legacy subscriptions detected and handled gracefully
- ✅ Documentation matches implementation
- ✅ All webhook handlers understand usage-based billing
- ✅ No manual LemonSqueezy dashboard intervention needed after initial variant setup

## Cross-References

- Original spec: @.agent-os/specs/2025-11-12-migrate-usage-based-billing/spec.md
- Original tasks: @.agent-os/specs/2025-11-12-migrate-usage-based-billing/tasks.md
- LemonSqueezy documentation: @documentationLemon.md (lines 440-540 for usage-based billing)
- Analysis findings: See technical spec for detailed issue breakdown
