# Spec Tasks

## Tasks

- [ ] 1. Fix Critical Billing Period and Seat Count Bugs
  - [x] 1.1 Write tests for billing period tracking and seat count display
  - [x] 1.2 Create migration to add `billing_period` enum column to subscriptions table
  - [x] 1.3 Update webhook handler to extract and save `tier` from custom_data
  - [x] 1.4 Update SubscriptionWidget to query actual user count from organization_members
  - [x] 1.5 Update update-subscription page to use billing_period column as primary source
  - [x] 1.6 Find and fix "Upgrade to paid plan" button redirect path
  - [x] 1.7 Add billing_period to organization creation flow for free tier
  - [ ] 1.8 Test complete workspace creation flow with monthly selection
  - [ ] 1.9 Verify seat count shows "1 z 3 miejsc" for first user
  - [ ] 1.10 Verify all tests pass

- [x] 2. Database Schema Migration (Product ID Tracking)
  - [x] 2.1 Write migration script to add `lemonsqueezy_product_id` column
  - [x] 2.2 Write migration script to add `migrated_to_subscription_id` column
  - [x] 2.3 Add backfill logic to populate product_id based on variant mapping
  - [x] 2.4 Run migration on development database
  - [x] 2.5 Verify indexes created correctly
  - [x] 2.6 Run migration on production database (after testing)

- [x] 3. Environment Variables Configuration
  - [x] 3.1 Add LEMONSQUEEZY_MONTHLY_PRODUCT_ID=621389 to .env.example
  - [x] 3.2 Add LEMONSQUEEZY_YEARLY_PRODUCT_ID=693341 to .env.example
  - [x] 3.3 Update LEMONSQUEEZY_YEARLY_VARIANT_ID=1090954 in .env.example
  - [x] 3.4 Update production environment variables in Vercel

- [x] 4. Create New Switch-to-Yearly Endpoint
  - [x] 4.1 Write tests for /api/billing/switch-to-yearly endpoint
  - [x] 4.2 Create app/api/billing/switch-to-yearly/route.ts file
  - [x] 4.3 Implement authentication and organization context validation
  - [x] 4.4 Implement monthly subscription fetch logic
  - [x] 4.5 Implement yearly checkout creation with custom_data
  - [x] 4.6 Implement error handling for checkout failures
  - [x] 4.7 Verify all tests pass

- [x] 5. Update Change Billing Period Endpoint
  - [x] 5.1 Write tests for yearly→monthly blocking logic
  - [x] 5.2 Add validation to block yearly→monthly switches (before line 106)
  - [x] 5.3 Add redirect logic for monthly→yearly to new endpoint
  - [x] 5.4 Update error responses with renewal_date
  - [x] 5.5 Verify all tests pass

- [x] 6. Update Webhook Handlers
  - [x] 6.1 Write tests for subscription_created webhook with product_id
  - [x] 6.2 Update subscription_created handler to extract product_id
  - [x] 6.3 Update database insert to save lemonsqueezy_product_id
  - [x] 6.4 Implement migration detection logic (check custom_data)
  - [x] 6.5 Implement old subscription cancellation logic
  - [x] 6.6 Implement database update for migrated subscription status
  - [x] 6.7 Add error handling for cancellation failures
  - [x] 6.8 Verify all tests pass

- [x] 7. Create Update Subscription Page
  - [x] 7.1 Create /app/onboarding/update-subscription/page.tsx
  - [x] 7.2 Implement seat adjustment controls (+/- buttons)
  - [x] 7.3 Implement pricing cards display (monthly + yearly)
  - [x] 7.4 Implement monthly user flow (both cards selectable)
  - [x] 7.5 Implement yearly user flow (banner + locked monthly card)
  - [x] 7.6 Fetch and display renewal date for yearly users
  - [x] 7.7 Implement API call logic based on user changes
  - [x] 7.8 Add loading states and error handling
  - [x] 7.9 Write tests for all user flows
  - [x] 7.10 Verify all tests pass

- [ ] 8. Update Admin Settings & Simplify Add Users Page
  - [x] 8.1 Update AdminSettingsClient: Replace two buttons with "Manage Subscription"
  - [x] 8.2 Update handler to redirect to /onboarding/update-subscription
  - [x] 8.3 Remove old handleManageSeatSubscription handler
  - [x] 8.4 Remove old handleChangeBillingPeriod handler
  - [x] 8.5 Simplify add-users page: Remove isUpgradeFlow logic
  - [x] 8.6 Simplify add-users page: Remove subscription fetching
  - [x] 8.7 Simplify add-users page: Update warning text
  - [x] 8.8 Delete /app/onboarding/change-billing-period/page.tsx
  - [x] 8.9 Delete /__tests__/app/onboarding/change-billing-period/
  - [ ] 8.10 Verify all tests pass

- [ ] 9. Integration Testing
  - [ ] 9.1 Test monthly→yearly upgrade flow end-to-end on development
  - [ ] 9.2 Verify seat preservation through checkout custom_data
  - [ ] 9.3 Verify webhook cancels old subscription correctly
  - [ ] 9.4 Verify database status updates to 'migrated'
  - [ ] 9.5 Test yearly→monthly blocking in UI and API
  - [ ] 9.6 Verify renewal date display accuracy
  - [ ] 9.7 Test error scenarios (checkout failure, cancel failure)
  - [ ] 9.8 Verify all tests pass

- [ ] 10. Documentation and Deployment
  - [ ] 10.1 Update README with new environment variables
  - [ ] 10.2 Document migration flow for team
  - [ ] 10.3 Create rollback plan for database migration
  - [ ] 10.4 Deploy to production
  - [ ] 10.5 Monitor logs for migration events
  - [ ] 10.6 Verify production monthly→yearly upgrade works
  - [ ] 10.7 Verify production yearly→monthly blocking works
  - [ ] 10.8 All production tests verified
