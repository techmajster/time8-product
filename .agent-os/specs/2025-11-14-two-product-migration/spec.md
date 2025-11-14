# Spec Requirements Document

> Spec: Two-Product Migration for Billing Period Switching
> Created: 2025-11-14
> Status: Planning

## Overview

Migrate from single-product variant-switching architecture to two-product architecture to enable monthly→yearly billing period upgrades. This works around LemonSqueezy's platform limitation that prevents switching between usage-based and non-usage-based variants within the same product.

## User Stories

### Monthly User Upgrading to Yearly

As a monthly subscriber, I want to upgrade to yearly billing, so that I can save money with annual pricing and lock in my current seat count.

**Workflow**: User navigates to billing settings, clicks "Switch to Yearly", sees proration preview showing the annual cost for their current seats, confirms upgrade. System cancels monthly subscription and creates new yearly subscription with preserved seat count. User receives confirmation and new invoice.

**Problem Solved**: Currently users cannot upgrade from monthly to yearly due to LemonSqueezy API 422 error ("A subscription cannot be changed from a usage-based plan to a non-usage-based plan").

### Yearly User Attempting to Downgrade

As a yearly subscriber, I want to understand why I cannot switch to monthly until renewal, so that I know my subscription terms are honored.

**Workflow**: User navigates to billing settings, sees monthly option is locked with a message "Available after [renewal date]". Lock icon and tooltip explain that yearly→monthly switching is only available at renewal to honor prepaid annual period.

**Problem Solved**: Prevents user confusion and support tickets by clearly communicating the one-way upgrade policy.

## Spec Scope

1. **Database Schema Update** - Add `lemonsqueezy_product_id` column to track which product (monthly 621389 vs yearly 693341) each subscription belongs to

2. **New Upgrade Endpoint** - Create `/api/billing/switch-to-yearly` endpoint that cancels monthly subscription and redirects to yearly checkout with seat preservation

3. **Webhook Enhancement** - Update `subscription_created` webhook to capture `product_id` and handle migration cleanup (cancel old subscription if upgrade)

4. **UI Redesign** - Create unified subscription management page, separate from workspace creation flow

5. **Environment Variables** - Add `LEMONSQUEEZY_MONTHLY_PRODUCT_ID` and `LEMONSQUEEZY_YEARLY_PRODUCT_ID` to track separate products

## UI Architecture

### Page Separation Strategy

**Two Dedicated Pages**:
1. `/onboarding/add-users` - New workspace creation ONLY (no upgrade logic)
2. `/onboarding/update-subscription` - Existing subscription management (seats + billing period)

**Deprecated**:
- `/onboarding/change-billing-period` - Removed entirely

### Update Subscription Page Behavior

**For Monthly Users**:
- Both pricing cards selectable (monthly + yearly)
- Can upgrade to yearly + adjust seats in one action
- Switching to yearly: calls `/api/billing/switch-to-yearly` with new seat count, redirects to checkout
- Staying monthly but changing seats: calls `/api/billing/update-subscription-quantity`

**For Yearly Users**:
- Banner displayed at top: "🔒 Switching to monthly is only available at renewal (after [renewal_date])"
- Both pricing cards visible but monthly card locked/disabled with lock icon and tooltip
- Can only adjust seat quantity on yearly plan
- Calls `/api/billing/update-subscription-quantity` for seat changes

### Admin Settings Integration

**Single "Manage Subscription" Button**:
- Replaces previous "Manage Seats" and "Change Billing Period" buttons
- Redirects to `/onboarding/update-subscription` with current organization and seat count

## Out of Scope

- Yearly→monthly downgrade functionality (blocked until renewal)
- Automatic refund/credit handling for yearly users (LemonSqueezy doesn't support this on cancellation)
- Migration of existing subscriptions (handled manually or through separate script)
- Customer portal switching (same limitation applies)

## Expected Deliverable

1. Monthly users can successfully upgrade to yearly billing with seat count preserved through checkout flow
2. Yearly→monthly switch is visually disabled in UI with clear messaging about renewal date
3. Database tracks both `lemonsqueezy_product_id` and `lemonsqueezy_variant_id` for all subscriptions
4. Webhooks properly handle upgrade flow by canceling old monthly subscription after yearly is created
