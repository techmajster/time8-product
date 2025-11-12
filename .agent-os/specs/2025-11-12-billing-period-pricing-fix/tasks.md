# Spec Tasks

## Tasks

- [x] 1. Fix Billing Period Page Pricing Fetch
  - [x] 1.1 Write tests for server-side pricing fetch behavior
  - [x] 1.2 Update page.tsx to fetch from /api/billing/pricing endpoint
  - [x] 1.3 Replace getDynamicPricing() call with fetch() call
  - [x] 1.4 Add cache control headers to pricing fetch
  - [x] 1.5 Test monthly → annual billing period transition
  - [x] 1.6 Test annual → monthly billing period transition
  - [x] 1.7 Verify variant ID is correctly populated from pricing response
  - [x] 1.8 Verify all tests pass

- [ ] 2. Add Error Handling and Fallback Mechanism
  - [ ] 2.1 Write tests for pricing fetch error scenarios
  - [ ] 2.2 Add try/catch around pricing fetch with error state management
  - [ ] 2.3 Implement fallback to getStaticPricingInfo() when API fails
  - [ ] 2.4 Create error UI component with AlertCircle icon
  - [ ] 2.5 Add "Retry" button functionality with retry counter
  - [ ] 2.6 Add "Go Back" button to return to settings
  - [ ] 2.7 Add error logging for debugging failed fetches
  - [ ] 2.8 Test error UI displays correctly on API failure
  - [ ] 2.9 Verify all tests pass

- [ ] 3. Fix Reconciliation Cron Job Field Comparison
  - [ ] 3.1 Write tests for reconciliation field comparison logic
  - [ ] 3.2 Update route.ts line 107 from subscription.current_seats to subscription.quantity
  - [ ] 3.3 Add code comment explaining field meanings
  - [ ] 3.4 Test reconciliation with in-flight upgrade scenario
  - [ ] 3.5 Test reconciliation with genuine billing mismatch
  - [ ] 3.6 Verify no false positive alerts during normal operations
  - [ ] 3.7 Verify all tests pass

- [ ] 4. Add Documentation and Logging
  - [ ] 4.1 Document why pricing must be fetched server-side
  - [ ] 4.2 Document field meanings (quantity vs current_seats vs pending_seats)
  - [ ] 4.3 Add inline comments in billing period page explaining fetch pattern
  - [ ] 4.4 Add inline comments in reconciliation cron explaining comparison logic
  - [ ] 4.5 Update technical documentation with architecture notes

- [ ] 5. End-to-End Testing and Verification
  - [ ] 5.1 Test complete billing period change flow (monthly → annual)
  - [ ] 5.2 Test complete billing period change flow (annual → monthly)
  - [ ] 5.3 Test pricing fetch failure and recovery
  - [ ] 5.4 Test fallback pricing display
  - [ ] 5.5 Test reconciliation accuracy with sample subscriptions
  - [ ] 5.6 Verify webhook payment confirmations still work correctly
  - [ ] 5.7 Verify invite dialog still functions (no regression)
  - [ ] 5.8 Verify update-subscription-quantity endpoint still works
  - [ ] 5.9 Verify all existing payment flows remain functional
  - [ ] 5.10 Verify all tests pass
