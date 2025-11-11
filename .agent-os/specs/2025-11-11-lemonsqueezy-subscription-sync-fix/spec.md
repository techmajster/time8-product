# Spec Requirements Document

> Spec: LemonSqueezy Subscription & Payment Flow Fix
> Created: 2025-11-11
> Status: Planning

## Overview

Fix critical payment bypass vulnerability in subscription upgrade flow and ensure all LemonSqueezy webhook events properly sync subscription state to the application database.

## User Stories

### Story 1: Admin Upgrading Subscription via Invite Dialog

As an organization admin, I want to invite new users and upgrade my subscription seamlessly, so that I only pay for the additional seats I need and invitations are sent immediately after payment succeeds.

**Current Problem:**
- Admin with 9 paid seats clicks "Invite 3 users" (needs 10 total seats)
- System creates NEW checkout for 10 seats instead of upgrading existing subscription by +1
- User is charged for 10 full seats (10 × 10 PLN = 100 PLN) instead of prorated +1 seat (~8 PLN)
- Incorrect payment flow and poor user experience

**Expected Behavior:**
- System detects existing active subscription
- Uses Subscription Items API to add +1 seat to existing subscription
- Charges prorated amount for remaining billing cycle (~8 PLN)
- Waits for `subscription_payment_success` webhook to confirm payment
- Sends queued invitations only after payment confirmation
- Updates `current_seats` immediately after payment succeeds

### Story 2: Manual LemonSqueezy Updates Syncing to App

As an organization admin, when I manually update my subscription quantity in the LemonSqueezy dashboard (for testing or administrative purposes), I expect those changes to immediately reflect in my application.

**Current Problem:**
- Admin manually changes seats from 9 to 7 in LemonSqueezy onboarding page
- Receives confirmation email from LemonSqueezy
- Application still shows 9 seats (no sync occurred)
- `subscription_updated` webhook has conditional logic that blocks updates

**Expected Behavior:**
- Admin updates subscription in LemonSqueezy dashboard
- `subscription_updated` webhook fires
- Application database immediately syncs `current_seats` and `quantity` to match LemonSqueezy
- UI reflects updated seat count within seconds

### Story 3: Preventing Payment Bypass Vulnerabilities

As a system administrator, I need to ensure that users cannot gain access to additional seats without completing payment, preventing revenue loss and maintaining billing integrity.

**Current Problem:**
- `/api/billing/update-subscription-quantity` endpoint updates `current_seats` immediately after calling LemonSqueezy API
- LemonSqueezy API returns synchronously, but payment processes asynchronously
- Users gain access to seats before payment is confirmed
- If payment fails (declined card), user still has access

**Expected Behavior:**
- Subscription quantity update calls LemonSqueezy Subscription Items API
- Database updates `quantity` (what user is paying for) but NOT `current_seats` (what user can use)
- System waits for `subscription_payment_success` webhook
- Only after webhook confirmation, update `current_seats` and grant access
- Queued invitations sent only after payment succeeds

## Spec Scope

1. **Fix Invite Dialog Payment Flow** - Replace new checkout creation with Subscription Items API for subscription upgrades
2. **Add subscription_payment_success Webhook Handler** - Implement missing webhook handler to confirm payment before granting seat access
3. **Fix subscription_created Webhook** - Set `current_seats` field on new subscription creation
4. **Remove Conditional Logic from subscription_updated Webhook** - Always sync database on subscription_updated events to ensure manual updates reflect in app
5. **Fix Cron Job Database Sync** - Update local database after successful LemonSqueezy API calls in cron job
6. **Update Invite Dialog UX** - Add "Processing payment..." state and handle payment confirmation flow
7. **Add Comprehensive Logging** - Log all webhook events, payment flows, and seat changes with correlation IDs
8. **End-to-End Testing** - Test upgrade flow, downgrade flow, manual updates, and payment failures
9. **Verify Payment Security** - Ensure no seats are granted without payment confirmation

## Out of Scope

- Refactoring entire billing system architecture
- Changing LemonSqueezy pricing model or graduated pricing tiers
- Implementing customer portal for test mode (limitation of LemonSqueezy)
- Migrating to different payment processor
- Implementing payment retry logic for failed charges
- Creating new `pending_quantity` database pattern (will reuse existing `pending_seats`)

## Expected Deliverable

1. **Payment Security**: No seats granted before payment confirmation via webhook
2. **Correct Upgrade Flow**: Users with existing subscriptions pay only for additional seats (prorated)
3. **Webhook Sync**: Manual LemonSqueezy updates sync to app within seconds
4. **Comprehensive Logging**: All payment flows and webhook events logged for debugging
5. **Test Coverage**: End-to-end tests covering upgrade, downgrade, and manual update scenarios
6. **Documentation**: Clear documentation of payment flow architecture and webhook handling

### Success Criteria

- ✅ Admin with 9 seats adding 1 user is charged for +1 seat only (prorated ~8 PLN)
- ✅ Invitations sent only after `subscription_payment_success` webhook confirms payment
- ✅ Manual LemonSqueezy dashboard updates reflect in app immediately
- ✅ Declined payments do not grant seat access
- ✅ All webhook events have comprehensive logging
- ✅ Tests pass for upgrade/downgrade/manual update scenarios
