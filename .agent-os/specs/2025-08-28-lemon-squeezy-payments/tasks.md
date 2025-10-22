# Spec Tasks

## Tasks

- [x] 1. Environment Setup & Package Installation
  - [x] 1.1 Write tests for environment configuration validation
  - [x] 1.2 Install @lemonsqueezy/lemonsqueezy.js package
  - [x] 1.3 Add environment variables to .env.local (LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID, LEMONSQUEEZY_WEBHOOK_SECRET)
  - [x] 1.4 Create Lemon Squeezy API client configuration
  - [x] 1.5 Verify all tests pass

- [x] 2. Database Schema Implementation
  - [x] 2.1 Write tests for database schema and RLS policies
  - [x] 2.2 Create Supabase migration for products and price_variants tables
  - [x] 2.3 Create migration for customers and subscriptions tables
  - [x] 2.4 Create migration for billing_events table
  - [x] 2.5 Add billing override columns to organizations table
  - [x] 2.6 Implement RLS policies for all new tables
  - [x] 2.7 Verify all tests pass

- [x] 3. Webhook Handler Implementation
  - [x] 3.1 Write tests for webhook signature verification
  - [x] 3.2 Write tests for subscription event processing
  - [x] 3.3 Create /api/webhooks/lemonsqueezy route handler
  - [x] 3.4 Implement HMAC signature verification
  - [x] 3.5 Implement subscription.created event handler
  - [x] 3.6 Implement subscription.updated event handler
  - [x] 3.7 Implement subscription.cancelled event handler
  - [x] 3.8 Add event logging to billing_events table
  - [x] 3.9 Verify all tests pass
  - [ ] 3.10 Update webhook handlers to use organization context from custom_data
  - [ ] 3.11 Fix findOrCreateCustomer to properly identify organization from checkout custom data
  - [ ] 3.12 Ensure webhook processing creates/updates correct organization subscription records
  - [ ] 3.13 Test webhook flow with organization context from real checkout purchases

- [x] 4. Billing API & Checkout Implementation
  - [x] 4.1 Write tests for checkout session creation
  - [x] 4.2 Write tests for subscription retrieval
  - [x] 4.3 Create /api/billing/create-checkout endpoint
  - [x] 4.4 Create /api/billing/subscription endpoint
  - [x] 4.5 Create /api/billing/customer-portal endpoint
  - [x] 4.6 Create /api/billing/products endpoint
  - [x] 4.7 Implement seat calculation logic (total - 3 free)
  - [x] 4.8 Add admin authorization checks
  - [x] 4.9 Verify all tests pass
  - [ ] 4.10 Add organization context to checkout custom data (organization_id, organization_slug)
  - [ ] 4.11 Update /api/billing/subscription to use stored Lemon Squeezy subscription ID from database
  - [ ] 4.12 Test checkout with organization context passes correctly to Lemon Squeezy

- [x] 5. Onboarding Flow Integration & Organization Creation Fix
  - [x] 5.1 Write tests for deferred organization creation flow
  - [x] 5.2 Update create-workspace flow to store organization data in session (not create in DB)
  - [x] 5.3 Update add-users page to handle organization creation based on team size decision
  - [x] 5.4 Implement free tier flow: create organization in DB when ≤3 users selected
  - [x] 5.5 Implement paid tier flow: create organization only after successful payment
  - [x] 5.6 Fix checkout flow to include organization creation in payment success
  - [x] 5.7 Update payment success handler to create organization and redirect to dashboard
  - [x] 5.8 Add cleanup for abandoned checkout sessions
  - [x] 5.9 Verify all tests pass

- [x] 6. Simplify Lemon Squeezy Integration (Remove Database Complexity)
  - [x] 6.1 Remove overcomplicated database syncing and product tables
  - [x] 6.2 Delete /api/billing/products and sync routes
  - [x] 6.3 Simplify add-users page to use env variables directly
  - [x] 6.4 Create simple checkout endpoint using Lemon Squeezy API directly
  - [x] 6.5 Keep only essential subscription fields in organizations table
  - [x] 6.6 Test the simplified Lemon Squeezy integration

- [x] 7. Critical Billing Fixes (High Priority)
  - [x] 7.1 Write tests for dynamic pricing retrieval from Lemon Squeezy API
  - [x] 7.2 Fix hardcoded pricing values in add-users screen - fetch from environment/API
  - [x] 7.3 Fix checkout parameter passing - ensure user count and billing interval are sent correctly
  - [x] 7.4 Fix currency mismatch - ensure checkout uses PLN currency from Lemon Squeezy
  - [x] 7.5 Test checkout flow with 5 users monthly subscription to verify correct pricing
  - [x] 7.6 Verify all tests pass

- [x] 8. Billing UI & Management Page
  - [x] 8.1 Write tests for Billing tab component
  - [x] 8.2 Write tests for subscription display logic
  - [x] 8.3 Create Billing tab in /admin/settings page
  - [x] 8.4 Implement current subscription status display
  - [x] 8.5 Create upgrade/downgrade UI with variant selection (replaced with "Manage seats" button)
  - [x] 8.6 Add customer portal link for subscription management
  - [x] 8.7 Implement billing override banner display
  - [x] 8.8 Verify all tests pass

- [x] 9. Seat Enforcement & Invitation Flow
  - [x] 9.1 Write tests for seat limit enforcement
  - [x] 9.2 Write tests for billing override logic
  - [x] 9.3 Update user invitation API to check seat availability
  - [x] 9.4 Implement seat limit calculation with overrides
  - [x] 9.5 Add upgrade prompt UI when seat limit reached
  - [x] 9.6 Block invitation when at capacity
  - [x] 9.7 Verify all tests pass

- [x] 10. Simple Multi-Currency Support (Lemon Squeezy Handled)
  - [x] 10.1 Update pricing displays to show PLN with note about EUR at checkout
  - [x] 10.2 Ensure checkout flow uses PLN variant IDs only
  - [x] 10.3 Add helpful text explaining currency conversion at checkout
  - [x] 10.4 Test that Lemon Squeezy handles currency conversion properly
  - [x] 10.5 Verify all tests pass
  - **Note:** Simplified approach - Lemon Squeezy automatically handles currency conversion at checkout. No complex detection or switching needed.

- [ ] 11. Organization Context Integration & Cleanup
  - [ ] 11.1 Remove hardcoded subscription data from database (mock customer and subscription records)
  - [ ] 11.2 Test complete checkout flow with organization context (new purchase should auto-create correct records)
  - [ ] 11.3 Verify webhook processing correctly identifies and updates organization based on custom_data
  - [ ] 11.4 Test seat upgrade/downgrade flow creates new subscriptions with correct organization linking
  - [ ] 11.5 Ensure billing page displays real data from properly linked Lemon Squeezy subscriptions
  - [ ] 11.6 Verify all tests pass

- [ ] 13. Production Webhook Setup (On Hold - Waiting for Account Verification)
  - [ ] 13.1 Deploy application to production environment 
  - [ ] 13.2 Update Lemon Squeezy webhook URL from localhost to production domain
  - [ ] 13.3 Test webhook signature validation with real Lemon Squeezy calls
  - [ ] 13.4 Verify subscription events process correctly and update database
  - [ ] 13.5 Monitor webhook logs for any processing errors
  - **Note:** Currently blocked pending Lemon Squeezy account verification for production access

- [ ] 12. Final Integration Testing
  - [ ] 12.1 Test complete upgrade flow from free to paid
  - [ ] 12.2 Test webhook processing for all subscription events
  - [ ] 12.3 Test seat enforcement with various scenarios
  - [ ] 12.4 Test billing override functionality
  - [ ] 12.5 Test multi-currency display
  - [ ] 12.6 Run full test suite and ensure all tests pass