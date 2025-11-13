# Spec Requirements Document

> Spec: Migrate to Usage-Based Billing for Seat Management
> Created: 2025-11-12
> Status: Planning

## Overview

Migrate the subscription seat management system from volume pricing (direct quantity updates) to LemonSqueezy's usage-based billing model. This will fix the critical bug where billing period changes reset seat quantity to 1 and align the implementation with LemonSqueezy best practices for SaaS applications.

## User Stories

### Admin Changes Billing Period with Preserved Seats

As an organization admin, I want to change my subscription billing period from monthly to annual (or vice versa), so that I can optimize my billing costs without losing access to my team's seats.

**Current Broken Workflow:**
1. Admin has 10 seats on annual billing
2. Admin changes to monthly billing
3. Quantity resets to 1 seat (BUG)
4. 9 team members lose access
5. Admin must contact support

**Expected Workflow:**
1. Admin has 10 seats on annual billing
2. Admin changes to monthly billing
3. All 10 seats are preserved automatically
4. No disruption to team access
5. Billing period updates, usage continues

## Spec Scope

1. **Configure LemonSqueezy Variants** - Enable usage-based billing for both monthly and annual variants in the LemonSqueezy dashboard

2. **Implement Usage Records API** - Replace direct quantity PATCH calls with usage records POST endpoint for seat updates

3. **Simplify Billing Period Changes** - Remove quantity restoration logic since usage-based billing preserves seats automatically

4. **Update Webhook Handlers** - Ensure subscription_created, subscription_updated, and subscription_payment_success webhooks properly handle usage-based billing

5. **Maintain Database Schema** - Keep existing quantity, current_seats, and pending_seats fields for access control

## Out of Scope

- Changing pricing model or per-seat costs
- Modifying payment processing flow
- Altering upgrade/downgrade deferral logic
- Changes to UI or user-facing messaging

## Expected Deliverable

1. Organization admins can change billing period (monthly ↔ annual) and seat count is preserved automatically
2. No manual quantity restoration needed after variant changes
3. All existing seat management features continue to work (upgrades, downgrades, deferrals)
4. Webhook processing correctly syncs usage-based billing data
