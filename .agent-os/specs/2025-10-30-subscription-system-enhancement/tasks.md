# Spec Tasks

## Tasks

- [x] 1. Add Missing Webhook Handlers
  - [x] 1.1 Write tests for subscription_payment_failed handler
  - [x] 1.2 Implement subscription_payment_failed handler in handlers.ts
  - [x] 1.3 Add subscription_payment_failed case to webhook route.ts
  - [x] 1.4 Write tests for subscription_paused handler
  - [x] 1.5 Implement subscription_paused handler in handlers.ts
  - [x] 1.6 Add subscription_paused case to webhook route.ts
  - [x] 1.7 Write tests for subscription_resumed handler
  - [x] 1.8 Implement subscription_resumed handler in handlers.ts
  - [x] 1.9 Add subscription_resumed case to webhook route.ts
  - [x] 1.10 Verify all webhook tests pass

- [x] 2. Add Translation Keys
  - [x] 2.1 Add subscription status translations (on_trial, expired) to messages/en.json
  - [x] 2.2 Add trial period translations to messages/en.json
  - [x] 2.3 Add payment failure translations to messages/en.json
  - [x] 2.4 Add pause/resume translations to messages/en.json
  - [x] 2.5 Add subscription status translations (on_trial, expired) to messages/pl.json
  - [x] 2.6 Add trial period translations to messages/pl.json
  - [x] 2.7 Add payment failure translations to messages/pl.json
  - [x] 2.8 Add pause/resume translations to messages/pl.json
  - [ ] 2.9 Verify translations render correctly in UI

- [x] 3. Implement UI Status Displays
  - [ ] 3.1 Write tests for on_trial status badge rendering
  - [x] 3.2 Add on_trial status badge to AdminSettingsClient.tsx
  - [ ] 3.3 Write tests for expired status badge rendering
  - [x] 3.4 Add expired status badge to AdminSettingsClient.tsx
  - [ ] 3.5 Write tests for trial countdown banner logic
  - [x] 3.6 Implement trial countdown banner component
  - [x] 3.7 Add trial countdown banner to AdminSettingsClient.tsx
  - [ ] 3.8 Verify status displays work in browser

- [x] 4. Add Context-Aware CTAs
  - [ ] 4.1 Write tests for context-aware CTA logic
  - [x] 4.2 Add "Upgrade to Paid Plan" CTA for on_trial status
  - [x] 4.3 Add "Update Payment Method" CTA for past_due status (already existed)
  - [x] 4.4 Add "Resume Subscription" CTA for paused status
  - [x] 4.5 Add "Reactivate Subscription" CTA for expired status
  - [ ] 4.6 Verify CTAs display correctly for each status

- [ ] 5. Integration Testing
  - [ ] 5.1 Test payment_failed webhook with LemonSqueezy test mode
  - [ ] 5.2 Test paused webhook with LemonSqueezy test mode
  - [ ] 5.3 Test resumed webhook with LemonSqueezy test mode
  - [ ] 5.4 Test trial countdown display with mock trial subscription
  - [ ] 5.5 Test status badges for all 7 subscription statuses
  - [ ] 5.6 Verify all tests pass
