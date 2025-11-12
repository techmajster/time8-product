# Spec Requirements Document

> Spec: Billing Period Change & Pricing Fetch Fix
> Created: 2025-11-12
> Status: Planning

## Overview

Fix critical client-side API key exposure in billing period change page and incorrect field comparison in subscription reconciliation cron job. The billing period change functionality is completely broken due to attempting to access server-only environment variables from a client component.

## User Stories

### Story 1: Admin Changing Billing Period

As an organization admin, I want to switch my subscription from monthly to annual billing (or vice versa), so that I can optimize my payment schedule and take advantage of annual pricing discounts.

**Current Problem:**
- Admin clicks "Change Billing Period" button in settings
- Redirected to `/onboarding/change-billing-period` page
- Page shows loading spinner forever or displays error
- Browser console shows: `LEMONSQUEEZY_API_KEY not set`
- Error: `newVariantId` is `undefined`
- API call fails with `400 Bad Request: Missing required fields`
- Admin cannot complete billing period change

**Expected Behavior:**
- Admin clicks "Change Billing Period" button
- Pricing data loads successfully from server-side API
- Page displays current plan (monthly/annual) and available options
- Admin selects new billing period
- Proration amount calculated and displayed
- Admin confirms change
- Payment processes immediately
- Webhook confirms payment
- Subscription updated to new billing period

### Story 2: Billing Reconciliation Accuracy

As a system administrator, I need accurate reconciliation alerts that only trigger for genuine billing mismatches, so that I can trust the monitoring system and respond appropriately to real issues.

**Current Problem:**
- Reconciliation cron job runs daily
- Compares `current_seats` (DB) vs `quantity` (LemonSqueezy API)
- These fields have different meanings:
  - `current_seats` = user access (granted after payment webhook)
  - `quantity` = billing amount (updated immediately after API call)
- During upgrades, there's a gap between API call and webhook
- Results in false positive alerts during normal operation
- Alerts become noise instead of actionable information

**Expected Behavior:**
- Reconciliation cron job compares `quantity` (DB) vs `quantity` (LemonSqueezy)
- Both fields represent "what organization is being charged for"
- Alerts only trigger for genuine billing discrepancies
- No false positives during in-flight payment processing
- Reliable monitoring of subscription billing state

### Story 3: Graceful Degradation for API Failures

As a user trying to change billing period, if the LemonSqueezy API is temporarily unavailable, I expect to see a clear error message with options to retry or go back, rather than a cryptic failure or infinite loading state.

**Current Problem:**
- If pricing API fails, user sees generic error or loading spinner
- No clear indication of what went wrong
- No option to retry
- Must manually navigate back to settings
- Poor user experience

**Expected Behavior:**
- Pricing fetch fails gracefully
- User sees clear error message: "Unable to load pricing information"
- Options presented:
  - "Retry" button to attempt fetch again
  - "Go Back" button to return to settings
  - Link to contact support if issue persists
- Optional: Fallback to static pricing display (if configured)
- Error logged for debugging

## Spec Scope

1. **Fix Client-Side API Key Exposure** - Replace direct `getDynamicPricing()` call with server-side API fetch in billing period change page
2. **Add Error Handling to Pricing Fetch** - Implement try/catch, user-friendly error UI, and retry mechanism
3. **Fix Reconciliation Cron Field Comparison** - Change from `current_seats` to `quantity` for accurate billing comparison
4. **Add Fallback Pricing Support** - Use static pricing from `NEXT_PUBLIC_*` env vars if LemonSqueezy API unavailable
5. **Comprehensive Testing** - Test billing period changes, reconciliation accuracy, and error scenarios

## Out of Scope

- Refactoring entire billing architecture
- Changing webhook payment confirmation flow (already works correctly)
- Modifying invite dialog (already uses correct endpoint)
- Implementing new payment flows
- Adding support for changing billing period AND quantity simultaneously (LemonSqueezy limitation)
- Redesigning billing period change UI/UX

## Expected Deliverable

1. **Billing Period Changes Work**: Admins can successfully switch between monthly and annual billing
2. **No Client-Side API Key Exposure**: All LemonSqueezy API calls happen server-side only
3. **Accurate Reconciliation**: Cron job compares correct fields and eliminates false positives
4. **Graceful Error Handling**: Clear error messages and retry options when pricing API fails
5. **Test Coverage**: End-to-end tests covering billing period changes and error scenarios
6. **Documentation**: Clear documentation of field meanings and why pricing must be server-side

### Success Criteria

- ✅ Admin with active subscription can change from monthly to annual billing
- ✅ Admin with active subscription can change from annual to monthly billing
- ✅ Pricing data loads successfully from server-side API endpoint
- ✅ `LEMONSQUEEZY_API_KEY` never exposed to client browser
- ✅ Reconciliation cron job compares `quantity` (DB) vs `quantity` (LemonSqueezy)
- ✅ No false positive alerts during normal upgrade operations
- ✅ Error handling provides clear user feedback with retry options
- ✅ All existing payment flows remain functional
- ✅ Tests pass for billing period changes and reconciliation accuracy
