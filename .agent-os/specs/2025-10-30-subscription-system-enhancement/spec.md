# Spec Requirements Document

> Spec: Subscription System Enhancement
> Created: 2025-10-30
> Status: Planning

## Overview

Complete the LemonSqueezy integration by implementing missing webhook handlers, UI status displays, and trial period conversion features. This ensures all subscription states are properly handled from initial trial through payment failures, pauses, and expiration.

## User Stories

### Trial User Sees Countdown and Conversion Prompt

As a trial user, I want to see how many days remain in my trial and be prompted to upgrade before it expires, so that I can make an informed decision about converting to a paid subscription without service interruption.

**Workflow:**
1. User is on trial subscription with `trial_ends_at` date
2. System displays banner showing "X days remaining in trial"
3. As trial approaches expiration (e.g., 3 days), upgrade CTA becomes more prominent
4. User can click upgrade CTA to access billing portal
5. After trial expires, user sees clear messaging about expired status

**Problem Solved:** Currently trial users don't see their trial status or expiration date, leading to unexpected service interruptions and confusion.

---

### Admin Receives Payment Failure Notification

As an organization admin, I want to be notified immediately when a payment fails, so that I can update payment information before service is disrupted.

**Workflow:**
1. LemonSqueezy attempts payment and it fails
2. Webhook `subscription_payment_failed` is received
3. System logs event in `billing_events` table
4. Subscription status updates to reflect payment issue
5. Admin sees clear messaging in UI about payment failure
6. Admin can access customer portal to update payment method

**Problem Solved:** Payment failures go unnoticed until subscription is cancelled, causing unexpected service disruption.

---

### User Pauses/Resumes Subscription via Portal

As a user, I want my dashboard to accurately reflect when I pause or resume my subscription via the customer portal, so that the UI stays in sync with my actual billing status.

**Workflow:**
1. User accesses LemonSqueezy customer portal
2. User pauses subscription
3. Webhook `subscription_paused` is received
4. System updates subscription status to `paused`
5. Dashboard UI reflects paused status
6. When user resumes, webhook `subscription_resumed` is received
7. Status updates to `active` and UI reflects change

**Problem Solved:** Portal actions don't sync to app, causing confusion about actual subscription status.

## Spec Scope

1. **UI Status Display** - Add on_trial and expired status badges with proper translations
2. **Trial Period UI** - Show trial countdown banner and upgrade CTA
3. **Payment Failure Handler** - Process subscription_payment_failed webhook events
4. **Pause Handler** - Process subscription_paused webhook events
5. **Resume Handler** - Process subscription_resumed webhook events
6. **Enhanced Status Actions** - Context-aware CTAs for each status
7. **Webhook Tests** - Test coverage for new event handlers
8. **UI Tests** - Test coverage for new status displays

## Out of Scope

- Email notifications for payment failures (future enhancement)
- SMS notifications
- Custom retry logic (handled by LemonSqueezy)
- Grace period customization (handled by LemonSqueezy settings)
- Subscription analytics dashboard

## Expected Deliverable

1. Dashboard displays all 7 subscription statuses correctly (including on_trial, expired)
2. Trial users see countdown and conversion prompts
3. Payment failures are logged and displayed immediately
4. Pause/resume actions via customer portal sync to app
5. All webhook handlers have test coverage
6. All UI components have test coverage
7. English and Polish translations for all new UI elements
