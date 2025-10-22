# Spec Requirements Document

> Spec: Lemon Squeezy Payment Integration
> Created: 2025-08-28
> Status: Planning

## Overview

Integrate Lemon Squeezy payment processing into the leave management system with a per-seat pricing model (€2.99/month per user above 3 free seats). This feature will enable organizations to upgrade from free to paid tiers while supporting multi-currency display and billing override options for partner accounts.

## User Stories

### Organization Admin Payment Management

As an organization admin, I want to upgrade my organization to a paid plan, so that I can add more than 3 users to my organization.

The admin navigates to the settings page, sees they've reached the 3-user free limit, clicks on the Billing tab, reviews the pricing (€2.99/month per additional user or €29.90/year with 20% discount), selects their preferred billing period, and is redirected to Lemon Squeezy's checkout page to complete the purchase.

### Automatic Seat Management

As an organization admin, I want the system to automatically track and enforce seat limits, so that I only pay for the seats I'm actually using.

When an admin tries to invite a new user, the system checks the current seat count against the subscription limit. If the organization has available paid seats, the invitation proceeds. If at the limit, the system prompts to upgrade the subscription before allowing new invitations.

### Multi-Currency Pricing Display

As a Polish user, I want to see prices in PLN instead of EUR, so that I can better understand the cost in my local currency.

The system detects the user's location and automatically displays prices as 12.99 PLN/month for Polish users while maintaining EUR pricing for other EU users. Users can manually switch between supported currencies if needed.

## Spec Scope

1. **Environment Configuration** - Set up Lemon Squeezy API integration with necessary environment variables and package installation
2. **Database Schema** - Create tables for products, subscriptions, customers, and billing events with proper RLS policies
3. **Webhook Processing** - Handle subscription lifecycle events to keep local data synchronized with Lemon Squeezy
4. **Checkout & Billing UI** - Implement upgrade flow and billing management interface for organization admins
5. **Seat Enforcement & Overrides** - Enforce subscription limits and support free account overrides for partners

## Out of Scope

- Direct credit card processing (handled by Lemon Squeezy)
- Complex VAT calculations (Lemon Squeezy acts as Merchant of Record)
- Usage-based billing models
- Individual user billing (only organization-level subscriptions)
- Refund processing through the application

## Expected Deliverable

1. Organizations can upgrade from free (3 users) to paid tiers through Lemon Squeezy checkout
2. Seat limits are automatically enforced based on active subscription status
3. Billing page shows current subscription details and allows access to customer portal