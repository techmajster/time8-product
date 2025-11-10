# Spec Requirements Document

> Spec: LemonSqueezy Pricing & Seat Calculation Fix
> Created: 2025-11-10
> Status: Planning

## Overview

Fix critical pricing fetch failures and seat calculation inconsistencies across admin and onboarding pages. The current implementation uses a deprecated SDK function that fails to fetch correct graduated pricing from LemonSqueezy API, and seat calculation terminology is confusing, causing incorrect displays across multiple pages.

## User Stories

### Story 1: Admin Viewing Accurate Seat Information

As an **Admin**, I want to see accurate seat counts and pricing in the team management and settings pages, so that I can make informed decisions about adding new users and understand my billing costs.

**Current Problem:**
- Seat counts show confusing "free seats" that mix two concepts (tier threshold vs available seats)
- Pricing shows wrong fallback values (12.99/10.83 instead of 10/8)
- Free tier orgs see incorrect "2/3 total seats" instead of "2/3 free seats used"

**Expected Behavior:**
- Free tier (0-3 users): Shows "X/3 free seats used, Y available"
- Paid tier (4+ users): Shows "X/Y seats used (3 free + Z paid), N available"
- Pricing displays correct values: 10 PLN/month, 96 PLN/year (8 PLN/month equivalent)

### Story 2: Onboarding User Understanding Pricing

As a **new user setting up my organization**, I want to understand the graduated pricing model clearly during onboarding, so that I know when I'll need to pay and how much it will cost.

**Current Problem:**
- Pricing may show incorrect values if API fails
- No clear explanation of "3 free seats" model
- Confusion about whether 4th user costs 1 seat or 4 seats

**Expected Behavior:**
- Clear explanation: "First 3 seats FREE, 4+ users pay for ALL seats"
- Example shown: "5 users = 5 seats × 10 PLN = 50 PLN/month"
- Correct pricing fetched from LemonSqueezy API

### Story 3: Admin Inviting Users with Seat Awareness

As an **Admin inviting new users**, I want to see accurate available seats and understand when I'll need to upgrade, so that I can manage my team growth and budget effectively.

**Current Problem:**
- Invite dialog shows confusing "free seats" count
- May show wrong available seat count
- Unclear when payment is required

**Expected Behavior:**
- Shows "X/Y available seats" clearly
- Indicates when adding users will trigger payment
- Displays correct price per seat with proper currency (PLN)

## Spec Scope

1. **Pricing API Fix** - Replace deprecated `fetchVariantPricing()` with `getVariantPrice()` in `getDynamicPricing()` to correctly fetch graduated pricing tiers from LemonSqueezy API

2. **Seat Calculation API Clarity** - Rename `freeSeats` field to `availableSeats` in seat-info API response, add `freeTierSeats` field to distinguish concepts

3. **Component Updates** - Update all affected components (Invite Dialog, Admin Settings, Team Management) to use correct field names and display accurate information

4. **Fallback Values Correction** - Fix hardcoded fallback pricing values in `.env.example` and components to match actual LemonSqueezy pricing (10 PLN monthly, 96 PLN yearly)

5. **User Education** - Add tooltips and help text explaining the graduated pricing model ("3 free, 4+ pay for all")

## Out of Scope

- Changing the actual graduated pricing model in LemonSqueezy
- Modifying billing logic or subscription management
- Adding new pricing tiers or plans
- Changing the seat calculation formulas (total = paid + 3)
- UI/UX redesign of affected pages (only text/data updates)

## Expected Deliverable

1. **Pricing API returns correct values** - LemonSqueezy API successfully fetched with 10 PLN monthly, 96 PLN yearly pricing for tier 4+ users

2. **Seat counts are accurate across all pages:**
   - Free tier org (2 users): Shows "2/3 free seats used, 1 available"
   - Paid tier org (10 paid seats, 5 users): Shows "5/13 seats used (3 free + 10 paid), 8 available"
   - Pending invitations correctly count against available seats

3. **Clear terminology everywhere:**
   - "Available seats" means empty seats that can be filled
   - "Free tier seats" means the 3 seats included before payment required
   - No more confusing "free seats" that could mean either

## Cross-References

- Related Roadmap: [@.agent-os/product/roadmap.md - Phase 2.19](../.agent-os/product/roadmap.md)
- Related Specs:
  - [Phase 2.6: Subscription Enhancement](../.agent-os/specs/2025-10-30-subscription-system-enhancement/)
  - [Phase 2.11: Seat Management](../.agent-os/specs/2025-11-04-seat-based-subscription-grace-periods/)
  - [Phase 2.18: Invite Users Dialog](../.agent-os/specs/2025-11-09-invite-users-seat-visualization/)
