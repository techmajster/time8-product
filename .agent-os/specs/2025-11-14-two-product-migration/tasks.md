# Spec Tasks

## Tasks

- [x] 1. Database Schema Migration
  - [x] 1.1 Write migration script to add `lemonsqueezy_product_id` column
  - [x] 1.2 Write migration script to add `migrated_to_subscription_id` column
  - [x] 1.3 Add backfill logic to populate product_id based on variant mapping
  - [x] 1.4 Run migration on development database
  - [x] 1.5 Verify indexes created correctly
  - [x] 1.6 Run migration on production database (after testing)

- [x] 2. Environment Variables Configuration
  - [x] 2.1 Add LEMONSQUEEZY_MONTHLY_PRODUCT_ID=621389 to .env.example
  - [x] 2.2 Add LEMONSQUEEZY_YEARLY_PRODUCT_ID=693341 to .env.example
  - [x] 2.3 Update LEMONSQUEEZY_YEARLY_VARIANT_ID=1090954 in .env.example
  - [x] 2.4 Update production environment variables in Vercel

- [x] 3. Create New Switch-to-Yearly Endpoint
  - [x] 3.1 Write tests for /api/billing/switch-to-yearly endpoint
  - [x] 3.2 Create app/api/billing/switch-to-yearly/route.ts file
  - [x] 3.3 Implement authentication and organization context validation
  - [x] 3.4 Implement monthly subscription fetch logic
  - [x] 3.5 Implement yearly checkout creation with custom_data
  - [x] 3.6 Implement error handling for checkout failures
  - [x] 3.7 Verify all tests pass

- [x] 4. Update Change Billing Period Endpoint
  - [x] 4.1 Write tests for yearly→monthly blocking logic
  - [x] 4.2 Add validation to block yearly→monthly switches (before line 106)
  - [x] 4.3 Add redirect logic for monthly→yearly to new endpoint
  - [x] 4.4 Update error responses with renewal_date
  - [x] 4.5 Verify all tests pass

- [x] 5. Update Webhook Handlers
  - [x] 5.1 Write tests for subscription_created webhook with product_id
  - [x] 5.2 Update subscription_created handler to extract product_id
  - [x] 5.3 Update database insert to save lemonsqueezy_product_id
  - [x] 5.4 Implement migration detection logic (check custom_data)
  - [x] 5.5 Implement old subscription cancellation logic
  - [x] 5.6 Implement database update for migrated subscription status
  - [x] 5.7 Add error handling for cancellation failures
  - [x] 5.8 Verify all tests pass

- [x] 6. Create Update Subscription Page
  - [x] 6.1 Create /app/onboarding/update-subscription/page.tsx
  - [x] 6.2 Implement seat adjustment controls (+/- buttons)
  - [x] 6.3 Implement pricing cards display (monthly + yearly)
  - [x] 6.4 Implement monthly user flow (both cards selectable)
  - [x] 6.5 Implement yearly user flow (banner + locked monthly card)
  - [x] 6.6 Fetch and display renewal date for yearly users
  - [x] 6.7 Implement API call logic based on user changes
  - [x] 6.8 Add loading states and error handling
  - [x] 6.9 Write tests for all user flows
  - [x] 6.10 Verify all tests pass

- [ ] 7. Update Admin Settings & Simplify Add Users Page
  - [ ] 7.1 Update AdminSettingsClient: Replace two buttons with "Manage Subscription"
  - [ ] 7.2 Update handler to redirect to /onboarding/update-subscription
  - [ ] 7.3 Remove old handleManageSeatSubscription handler
  - [ ] 7.4 Remove old handleChangeBillingPeriod handler
  - [ ] 7.5 Simplify add-users page: Remove isUpgradeFlow logic
  - [ ] 7.6 Simplify add-users page: Remove subscription fetching
  - [ ] 7.7 Simplify add-users page: Update warning text
  - [ ] 7.8 Delete /app/onboarding/change-billing-period/page.tsx
  - [ ] 7.9 Delete /__tests__/app/onboarding/change-billing-period/
  - [ ] 7.10 Verify all tests pass

- [ ] 8. Integration Testing
  - [ ] 8.1 Test monthly→yearly upgrade flow end-to-end on development
  - [ ] 8.2 Verify seat preservation through checkout custom_data
  - [ ] 8.3 Verify webhook cancels old subscription correctly
  - [ ] 8.4 Verify database status updates to 'migrated'
  - [ ] 8.5 Test yearly→monthly blocking in UI and API
  - [ ] 8.6 Verify renewal date display accuracy
  - [ ] 8.7 Test error scenarios (checkout failure, cancel failure)
  - [ ] 8.8 Verify all tests pass

- [ ] 9. Documentation and Deployment
  - [ ] 9.1 Update README with new environment variables
  - [ ] 9.2 Document migration flow for team
  - [ ] 9.3 Create rollback plan for database migration
  - [ ] 9.4 Deploy to production
  - [ ] 9.5 Monitor logs for migration events
  - [ ] 9.6 Verify production monthly→yearly upgrade works
  - [ ] 9.7 Verify production yearly→monthly blocking works
  - [ ] 9.8 All production tests verified
