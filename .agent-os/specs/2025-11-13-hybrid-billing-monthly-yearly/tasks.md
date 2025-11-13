# Spec Tasks

## Tasks

- [x] 1. Database Schema Migration
  - [x] 1.1 Create migration file `20251113000001_add_quantity_based_billing_type.sql`
  - [x] 1.2 Run migration on staging database
  - [x] 1.3 Verify CHECK constraint updated with verification queries
  - [x] 1.4 Test inserting subscription with 'quantity_based' value
  - [x] 1.5 Verify existing subscriptions unchanged
  - [x] 1.6 Verify column comment updated

- [ ] 2. Create SeatManager Service (Core Routing Logic)
  - [ ] 2.1 Write tests for SeatManager.addSeats() routing
  - [ ] 2.2 Create `lib/billing/seat-manager.ts` with class structure
  - [ ] 2.3 Implement addSeats() main routing function
  - [ ] 2.4 Write tests for addSeatsUsageBased() (monthly path)
  - [ ] 2.5 Implement addSeatsUsageBased() with usage records API
  - [ ] 2.6 Write tests for addSeatsQuantityBased() (yearly path)
  - [ ] 2.7 Implement addSeatsQuantityBased() with PATCH API and invoice_immediately: true
  - [ ] 2.8 Write tests for calculateProration()
  - [ ] 2.9 Implement calculateProration() with LemonSqueezy API fetch
  - [ ] 2.10 Verify all SeatManager tests pass

- [ ] 3. Update subscription_created Webhook (Critical for Routing)
  - [ ] 3.1 Write tests for variant detection logic (monthly vs yearly)
  - [ ] 3.2 Add billing_type detection based on variant_id
  - [ ] 3.3 Add conditional logic: create usage record ONLY for monthly
  - [ ] 3.4 Add logging for billing_type detection and routing
  - [ ] 3.5 Write test: monthly subscription creates usage record
  - [ ] 3.6 Write test: yearly subscription does NOT create usage record
  - [ ] 3.7 Write test: unknown variant_id throws error
  - [ ] 3.8 Verify all subscription_created tests pass

- [ ] 4. Update Seat Management API Endpoint
  - [ ] 4.1 Write tests for update-subscription-quantity with SeatManager
  - [ ] 4.2 Replace direct LemonSqueezy API calls with SeatManager.addSeats()
  - [ ] 4.3 Add support for SeatManager.removeSeats()
  - [ ] 4.4 Add error handling for both billing types
  - [ ] 4.5 Write test: monthly subscription uses usage records path
  - [ ] 4.6 Write test: yearly subscription uses quantity path
  - [ ] 4.7 Verify all API endpoint tests pass

- [ ] 5. Frontend UX Updates for Yearly Subscriptions
  - [ ] 5.1 Add proration preview API endpoint
  - [ ] 5.2 Update add-users page to detect billing_type
  - [ ] 5.3 Add conditional UI: monthly shows "billed at end of period"
  - [ ] 5.4 Add conditional UI: yearly shows proration amount and "charged immediately"
  - [ ] 5.5 Add loading state while fetching proration preview
  - [ ] 5.6 Test UI with monthly subscription (verify unchanged)
  - [ ] 5.7 Test UI with yearly subscription (verify proration display)

- [ ] 6. Environment Configuration
  - [ ] 6.1 Add YEARLY_PRICE_PER_SEAT to .env.local
  - [ ] 6.2 Add YEARLY_PRICE_PER_SEAT to Vercel environment variables
  - [ ] 6.3 Verify LEMONSQUEEZY_MONTHLY_VARIANT_ID exists
  - [ ] 6.4 Verify LEMONSQUEEZY_YEARLY_VARIANT_ID exists
  - [ ] 6.5 Verify all environment variables loaded correctly

- [ ] 7. LemonSqueezy Dashboard Configuration
  - [ ] 7.1 Verify monthly variant (513746) has usage-based billing ENABLED
  - [ ] 7.2 Verify yearly variant (513747) has usage-based billing DISABLED
  - [ ] 7.3 Document current variant settings for reference

- [ ] 8. End-to-End Testing (Monthly - Verify Unchanged)
  - [ ] 8.1 Clear all test subscriptions from database
  - [ ] 8.2 Create new monthly subscription with 6 users
  - [ ] 8.3 Verify billing_type = 'usage_based' in database
  - [ ] 8.4 Verify usage record created at subscription_created webhook
  - [ ] 8.5 Add 2 seats via add-users page
  - [ ] 8.6 Verify new usage record created with quantity: 8
  - [ ] 8.7 Verify NO immediate charge (charged at end of period)
  - [ ] 8.8 Verify subscription_updated did NOT overwrite current_seats
  - [ ] 8.9 Verify free tier (1-3 users) still works for monthly

- [ ] 9. End-to-End Testing (Yearly - New Flow)
  - [ ] 9.1 Create new yearly subscription with 6 users
  - [ ] 9.2 Verify billing_type = 'quantity_based' in database
  - [ ] 9.3 Verify NO usage record created at subscription_created webhook
  - [ ] 9.4 Verify immediate charge for 6 seats × yearly rate
  - [ ] 9.5 Add 2 seats via add-users page
  - [ ] 9.6 Verify proration preview shown in UI before confirmation
  - [ ] 9.7 Confirm seat addition
  - [ ] 9.8 Verify PATCH to subscription-items with invoice_immediately: true
  - [ ] 9.9 Verify immediate proration charge applied
  - [ ] 9.10 Verify subscription quantity updated to 8 in LemonSqueezy
  - [ ] 9.11 Verify current_seats updated to 8 in database
  - [ ] 9.12 Verify free tier (1-3 users) works for yearly

- [ ] 10. Proration Accuracy Testing
  - [ ] 10.1 Create yearly subscription that renews in exactly 183 days (half year)
  - [ ] 10.2 Add 1 seat via API
  - [ ] 10.3 Calculate expected proration: (1 × $1200 × 183) / 365 ≈ $600
  - [ ] 10.4 Verify actual charge matches expected within $0.50
  - [ ] 10.5 Test with different days remaining (30, 90, 270 days)
  - [ ] 10.6 Verify all proration calculations accurate

- [ ] 11. Seat Removal Testing
  - [ ] 11.1 Test removing seats for monthly subscription
  - [ ] 11.2 Verify usage record created with lower quantity
  - [ ] 11.3 Verify credit applied at end of period
  - [ ] 11.4 Test removing seats for yearly subscription
  - [ ] 11.5 Verify PATCH with lower quantity
  - [ ] 11.6 Verify credit applied at next renewal

- [ ] 12. Error Handling and Edge Cases
  - [ ] 12.1 Test unknown variant_id throws clear error
  - [ ] 12.2 Test missing subscription_item_id handled gracefully
  - [ ] 12.3 Test LemonSqueezy API failure returns user-friendly error
  - [ ] 12.4 Test adding 0 seats returns no-op response
  - [ ] 12.5 Test adding negative seats treated as removal
  - [ ] 12.6 Verify all error messages logged comprehensively

- [ ] 13. Code Quality and Documentation
  - [ ] 13.1 Add comprehensive inline comments to SeatManager
  - [ ] 13.2 Add comprehensive comments to subscription_created routing logic
  - [ ] 13.3 Update existing comments to clarify monthly (unchanged) vs yearly (new)
  - [ ] 13.4 Add JSDoc comments to all public SeatManager methods
  - [ ] 13.5 Add type definitions with clear descriptions
  - [ ] 13.6 Verify code follows project conventions

- [ ] 14. Deployment and Monitoring
  - [ ] 14.1 Deploy to staging environment
  - [ ] 14.2 Run all E2E tests on staging
  - [ ] 14.3 Monitor logs for any errors or unexpected behavior
  - [ ] 14.4 Create test yearly subscription on staging
  - [ ] 14.5 Verify complete flow: create → add seats → verify proration
  - [ ] 14.6 Deploy to production
  - [ ] 14.7 Monitor production logs for first 24 hours
  - [ ] 14.8 Create test yearly subscription on production
  - [ ] 14.9 Verify production deployment successful

- [ ] 15. Final Verification and Cleanup
  - [ ] 15.1 Verify monthly subscriptions still working correctly in production
  - [ ] 15.2 Verify yearly subscriptions working correctly in production
  - [ ] 15.3 Delete all test subscriptions from database
  - [ ] 15.4 Update project README if needed
  - [ ] 15.5 Document proration formula for future reference
  - [ ] 15.6 Verify all success criteria met from spec.md
