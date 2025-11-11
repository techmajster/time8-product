# Spec Tasks

## Phase 1: Fix Immediate Upgrade Flow (Invite Dialog)

- [x] 1. Add subscription_payment_success webhook handler
  - [x] 1.1 Write tests for processSubscriptionPaymentSuccess handler
  - [x] 1.2 Implement processSubscriptionPaymentSuccess in handlers.ts
  - [x] 1.3 Add case for subscription_payment_success in webhook route
  - [ ] 1.4 Test webhook with LemonSqueezy test mode
  - [x] 1.5 Verify handler updates current_seats only after payment confirmation
  - [ ] 1.6 Verify all tests pass

- [x] 2. Fix update-subscription-quantity endpoint payment flow
  - [x] 2.1 Write tests for update endpoint changes
  - [x] 2.2 Remove immediate current_seats update (keep quantity update only)
  - [x] 2.3 Add temporary storage for queued_invitations
  - [x] 2.4 Update response to indicate "Processing payment..."
  - [x] 2.5 Test endpoint with mock LemonSqueezy API
  - [x] 2.6 Verify all tests pass

- [x] 3. Update invite dialog payment flow
  - [x] 3.1 Write tests for invite dialog payment logic
  - [x] 3.2 Replace new checkout creation with update-subscription-quantity call
  - [x] 3.3 Add paymentStatus state tracking ('idle' | 'processing' | 'success' | 'failed')
  - [x] 3.4 Implement "Processing payment..." UI state
  - [x] 3.5 Add polling or webhook notification mechanism
  - [x] 3.6 Handle payment failure scenarios
  - [x] 3.7 Test complete flow in UI
  - [x] 3.8 Verify all tests pass

## Phase 2: Fix Webhook Sync Issues

- [x] 4. Fix subscription_created webhook
  - [x] 4.1 Write tests for subscription_created changes
  - [x] 4.2 Add current_seats = totalUsers to insert statement
  - [x] 4.3 Add logging for new subscription creation
  - [x] 4.4 Test with new checkout flow
  - [x] 4.5 Verify all tests pass

- [x] 5. Remove conditional logic from subscription_updated webhook
  - [x] 5.1 Write tests for subscription_updated changes
  - [x] 5.2 Remove if (variantChanged || quantityChanged) condition
  - [x] 5.3 Always sync current_seats = quantity on subscription_updated
  - [x] 5.4 Always call updateOrganizationSubscription
  - [x] 5.5 Add comprehensive logging
  - [ ] 5.6 Test with manual LemonSqueezy dashboard updates
  - [ ] 5.7 Verify all tests pass

- [x] 6. Fix cron job database sync
  - [x] 6.1 Write tests for cron job changes
  - [x] 6.2 Add database update after successful LemonSqueezy API call
  - [x] 6.3 Sync quantity with pending_seats (NOT current_seats - wait for payment)
  - [x] 6.4 Update organizations.paid_seats
  - [x] 6.5 Add error handling and rollback logic
  - [x] 6.6 Add comprehensive logging
  - [ ] 6.7 Test cron job execution
  - [ ] 6.8 Verify all tests pass

## Phase 3: Logging & Testing

- [x] 7. Add comprehensive webhook sync logging
  - [x] 7.1 Add before/after logging to all webhook handlers
  - [x] 7.2 Include correlation IDs (event_id) in all logs
  - [x] 7.3 Log payment flow tracking
  - [x] 7.4 Add performance metrics logging
  - [ ] 7.5 Test logging in development environment
  - [ ] 7.6 Verify logs are useful for debugging

- [ ] 8. End-to-end testing of subscription flows
  - [ ] 8.1 Test upgrade flow (9 seats → 10 seats)
  - [ ] 8.2 Verify prorated payment charged correctly
  - [ ] 8.3 Verify seats not granted until webhook confirms payment
  - [ ] 8.4 Verify invitations sent after payment confirmation
  - [ ] 8.5 Test downgrade flow (10 seats → 7 seats)
  - [ ] 8.6 Verify pending_seats pattern works correctly
  - [ ] 8.7 Verify cron job applies changes at renewal
  - [ ] 8.8 Test manual LemonSqueezy dashboard update
  - [ ] 8.9 Verify changes sync to app immediately
  - [ ] 8.10 Test payment failure scenario
  - [ ] 8.11 Verify seats not granted on payment failure
  - [ ] 8.12 Test new subscription checkout flow
  - [ ] 8.13 Verify immediate access after checkout completes
  - [ ] 8.14 Verify all tests pass

- [ ] 9. Verify payment security and manual sync
  - [ ] 9.1 Security audit: Verify no payment bypass vulnerabilities
  - [ ] 9.2 Test with declined credit card
  - [ ] 9.3 Verify seats not granted on payment failure
  - [ ] 9.4 Test webhook idempotency
  - [ ] 9.5 Test concurrent webhook processing
  - [ ] 9.6 Verify manual LemonSqueezy updates sync within 5 seconds
  - [ ] 9.7 Test all webhook events fire correctly
  - [ ] 9.8 Review all logs for completeness
  - [ ] 9.9 Document any edge cases discovered
  - [ ] 9.10 Verify all tests pass
