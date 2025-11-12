# Spec Tasks

## ⚠️ RESET: Starting Fresh with Working Webhooks

Previous implementation was built on broken webhooks. Now that webhooks work (checkout + subscription_created + subscription_payment_success), we need to verify and re-test everything from scratch.

## Phase 0: Webhook Foundation (COMPLETED)

- [x] 0. Fix webhook processing
  - [x] 0.1 Fix LemonSqueezy API string requirement for custom fields
  - [x] 0.2 Support both nested and flat organization data formats
  - [x] 0.3 Add retry logic for subscription_payment_success race condition
  - [x] 0.4 Verify checkout creation works end-to-end
  - [x] 0.5 Verify subscription_created webhook processes successfully
  - [x] 0.6 Verify subscription_payment_success webhook processes successfully

## Phase 1: Verify Immediate Upgrade Flow (Invite Dialog)

- [ ] 1. Test subscription_payment_success webhook behavior
  - [ ] 1.1 Test webhook with real LemonSqueezy test mode payment
  - [ ] 1.2 Verify handler updates current_seats after payment confirmation
  - [ ] 1.3 Verify organization paid_seats gets updated
  - [ ] 1.4 Check database state before/after webhook
  - [ ] 1.5 Review logs for correct payment flow tracking
  - [ ] 1.6 Run automated tests and verify they pass

- [ ] 2. Test update-subscription-quantity endpoint with working webhooks
  - [ ] 2.1 Test endpoint updates LemonSqueezy quantity
  - [ ] 2.2 Verify current_seats stays unchanged (waits for webhook)
  - [ ] 2.3 Verify queued_invitations are stored correctly
  - [ ] 2.4 Test response indicates "Processing payment..."
  - [ ] 2.5 Verify webhook grants seats after payment
  - [ ] 2.6 Run automated tests and verify they pass

- [ ] 3. Test invite dialog payment flow end-to-end
  - [ ] 3.1 Test inviting user triggers update-subscription-quantity
  - [ ] 3.2 Verify payment status UI shows "Processing..."
  - [ ] 3.3 Verify seats granted only after webhook confirms payment
  - [ ] 3.4 Verify invitation sent after webhook completes
  - [ ] 3.5 Test payment failure scenario
  - [ ] 3.6 Verify UI handles all states correctly
  - [ ] 3.7 Run automated tests and verify they pass

## Phase 2: Verify Webhook Sync Behavior

- [ ] 4. Test subscription_created webhook with real checkout
  - [ ] 4.1 Create new subscription via checkout flow
  - [ ] 4.2 Verify current_seats = quantity immediately
  - [ ] 4.3 Verify organization gets updated correctly
  - [ ] 4.4 Check custom_data is parsed correctly (flat format)
  - [ ] 4.5 Review webhook logs for completeness
  - [ ] 4.6 Run automated tests and verify they pass

- [ ] 5. Test subscription_updated webhook behavior
  - [ ] 5.1 Make manual update in LemonSqueezy dashboard
  - [ ] 5.2 Verify webhook fires within 5 seconds
  - [ ] 5.3 Verify current_seats syncs with quantity
  - [ ] 5.4 Verify organization paid_seats updates
  - [ ] 5.5 Check logs show correct sync behavior
  - [ ] 5.6 Run automated tests and verify they pass

- [ ] 6. Test cron job for deferred seat changes
  - [ ] 6.1 Create downgrade scenario (pending_seats set)
  - [ ] 6.2 Trigger cron job manually
  - [ ] 6.3 Verify LemonSqueezy API gets updated
  - [ ] 6.4 Verify database quantity syncs with pending_seats
  - [ ] 6.5 Verify pending_seats gets cleared
  - [ ] 6.6 Verify organization paid_seats updates
  - [ ] 6.7 Check error handling and rollback logic
  - [ ] 6.8 Run automated tests and verify they pass

## Phase 3: End-to-End Testing & Security

- [ ] 7. Test logging completeness
  - [ ] 7.1 Review logs for subscription_created events
  - [ ] 7.2 Review logs for subscription_payment_success events
  - [ ] 7.3 Review logs for subscription_updated events
  - [ ] 7.4 Review logs for cron job execution
  - [ ] 7.5 Verify correlation IDs present in all logs
  - [ ] 7.6 Verify logs useful for debugging issues

- [ ] 8. End-to-end testing of subscription flows
  - [ ] 8.1 Test new subscription checkout (4 users)
  - [ ] 8.2 Verify immediate access after checkout completes
  - [ ] 8.3 Test upgrade flow (4 seats → 7 seats via invite)
  - [ ] 8.4 Verify prorated payment charged correctly
  - [ ] 8.5 Verify seats not granted until webhook confirms payment
  - [ ] 8.6 Verify invitations sent after payment confirmation
  - [ ] 8.7 Test downgrade flow (7 seats → 5 seats)
  - [ ] 8.8 Verify pending_seats pattern works correctly
  - [ ] 8.9 Verify cron job applies changes at renewal
  - [ ] 8.10 Test manual LemonSqueezy dashboard update (quantity change)
  - [ ] 8.11 Verify changes sync to app within 5 seconds
  - [ ] 8.12 Test payment failure scenario (declined card)
  - [ ] 8.13 Verify seats not granted on payment failure
  - [ ] 8.14 Run full automated test suite

- [ ] 9. Security audit and edge cases
  - [ ] 9.1 Security audit: Verify no payment bypass vulnerabilities
  - [ ] 9.2 Test with declined credit card
  - [ ] 9.3 Verify seats not granted on payment failure
  - [ ] 9.4 Test webhook idempotency (resend same webhook)
  - [ ] 9.5 Test concurrent webhook processing
  - [ ] 9.6 Test edge case: webhook arrives before DB commit
  - [ ] 9.7 Test edge case: duplicate webhooks from LemonSqueezy
  - [ ] 9.8 Review all logs for security concerns
  - [ ] 9.9 Document any edge cases discovered
  - [ ] 9.10 Final automated test suite verification
