# Spec Tasks

## Tasks

- [x] 1. Fix Critical Billing Logic
  - [x] 1.1 Remove incorrect paid seats calculation from create-checkout
  - [x] 1.2 Implement correct free tier logic in subscription_created webhook (1-3 = quantity 0, 4+ = quantity all)
  - [x] 1.3 Store subscription_item_id at subscription creation
  - [x] 1.4 Implement correct free tier logic in update-subscription-quantity API
  - [x] 1.5 Verify all tests pass for billing logic

- [x] 2. Add Data Storage Improvements
  - [x] 2.1 Create database migration for billing_type column
  - [x] 2.2 Run migration and verify column created
  - [x] 2.3 Update subscription_created webhook to set billing_type
  - [x] 2.4 Add proactive legacy subscription detection in update-subscription-quantity
  - [x] 2.5 Verify billing_type is set correctly for new subscriptions

- [ ] 3. Improve Webhook Clarity
  - [ ] 3.1 Update comments in subscription_updated webhook
  - [ ] 3.2 Add usage-based verification in subscription_payment_success
  - [ ] 3.3 Review and update change-billing-period logic
  - [ ] 3.4 Verify all webhooks have clear comments

- [ ] 4. Enhance Frontend UX
  - [ ] 4.1 Improve error handling in add-users page (billing period + seats)
  - [ ] 4.2 Add user-friendly error messages for legacy subscriptions
  - [ ] 4.3 Test combined changes flow
  - [ ] 4.4 Verify error messages are clear and actionable

- [ ] 5. Update Documentation
  - [ ] 5.1 Fix API endpoint documentation in original spec
  - [ ] 5.2 Update terminology to match LemonSqueezy dashboard
  - [ ] 5.3 Document free tier logic in specs
  - [ ] 5.4 Verify all documentation is accurate

- [ ] 6. Improve Code Quality
  - [ ] 6.1 Create subscription_item_id extraction helper function
  - [ ] 6.2 Add comprehensive logging with correlation IDs
  - [ ] 6.3 Standardize error handling patterns
  - [ ] 6.4 Verify code is consistent and maintainable

- [ ] 7. Testing & Verification
  - [ ] 7.1 Create comprehensive testing checklist document
  - [ ] 7.2 Enhance E2E test script with free tier tests
  - [ ] 7.3 Run complete E2E test suite
  - [ ] 7.4 Create new test workspace and verify complete flow
  - [ ] 7.5 Verify all success criteria met
