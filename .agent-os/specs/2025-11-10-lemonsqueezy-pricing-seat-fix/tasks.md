# Spec Tasks

## Critical Bugs Fixed (Production Issues)

- [x] **Webhook Handler Bug:** Fixed `subscription_updated` to sync `current_seats` with `quantity`
  - **Issue:** When user updated seats in LemonSqueezy (6→9), webhook updated `quantity` but NOT `current_seats`, causing UI to show stale data
  - **Fix:** Added `current_seats: quantity` to subscription update in `handlers.ts` line 429
  - **Impact:** Future LemonSqueezy updates will now immediately reflect in the UI

- [x] **Seat Calculation Bug:** Fixed `calculateTotalSeats()` for graduated pricing model
  - **Issue:** Function added 3 free seats to ALL subscriptions (`paidSeats + 3`), causing incorrect totals (e.g., 9 paid → 12 total instead of 9)
  - **Fix:** Changed logic to `paidSeats > 0 ? paidSeats : 3` in `seat-calculation.ts` line 38-41
  - **Impact:** Seat counts now match LemonSqueezy's graduated pricing (BB8 Studio now shows 2/9 instead of 5/12)

## Tasks

- [x] 1. Fix Pricing API to Use REST Instead of SDK
  - [x] 1.1 Write tests for `getVariantPrice()` fetching graduated pricing
  - [x] 1.2 Update `getDynamicPricing()` to call `getVariantPrice()` instead of `fetchVariantPricing()`
  - [x] 1.3 Verify correct pricing returned (10 PLN monthly, 96 PLN yearly)
  - [x] 1.4 Mark `fetchVariantPricing()` as deprecated with comment
  - [x] 1.5 Test fallback behavior when API fails
  - [x] 1.6 Verify all tests pass

- [x] 2. Restructure Seat Info API Response
  - [x] 2.1 Write tests for seat-info API with new field names
  - [x] 2.2 Update API response to use `availableSeats` instead of `freeSeats`
  - [x] 2.3 Add `freeTierSeats: 3` field to response
  - [x] 2.4 Update TypeScript interface for API response (if exists)
  - [x] 2.5 Document the distinction in code comments
  - [x] 2.6 Verify all tests pass

- [x] 3. Update Invite Users Dialog Component
  - [x] 3.1 Write tests for dialog component with correct pricing
  - [x] 3.2 Fix hardcoded fallback values (10.99 EUR → 10.00 PLN)
  - [x] 3.3 Rename `freeSeats` variable to `availableSeats`
  - [x] 3.4 Update display text from `freeSeats` to `availableSeats`
  - [x] 3.5 Test dialog displays correct seat counts and pricing
  - [x] 3.6 Verify all tests pass

- [ ] 4. Fix Admin Settings Billing Tab
  - [ ] 4.1 Write tests for seat usage calculation (free and paid tiers)
  - [ ] 4.2 Update `getSeatUsage()` free tier logic
  - [ ] 4.3 Add `isFreeTier` flag to response
  - [ ] 4.4 Update display logic for "X/3 free seats used" vs "X/Y seats used"
  - [ ] 4.5 Test free tier display (0-3 users)
  - [ ] 4.6 Test paid tier display (4+ users with pending invites)
  - [ ] 4.7 Verify all tests pass

- [ ] 5. Update Team Management Component
  - [ ] 5.1 Write tests for team management seat display
  - [ ] 5.2 Update component to use `seatInfo.availableSeats`
  - [ ] 5.3 Add reference to `seatInfo.freeTierSeats` if needed
  - [ ] 5.4 Test component renders correctly with new API response
  - [ ] 5.5 Verify all tests pass

- [ ] 6. Update Environment Variables
  - [ ] 6.1 Update `.env.example` fallback pricing (12.99 → 10.00, 10.83 → 8.00)
  - [ ] 6.2 Add comments explaining graduated pricing model
  - [ ] 6.3 Verify `.env.local` has correct values
  - [ ] 6.4 Update any documentation referencing environment variables

- [ ] 7. Add User Education & Help Text
  - [ ] 7.1 Create reusable pricing tooltip component
  - [ ] 7.2 Add tooltip to onboarding add-users page
  - [ ] 7.3 Add info icon with explanation in admin settings billing tab
  - [ ] 7.4 Add help text in invite users dialog
  - [ ] 7.5 Test tooltip displays and content is accurate

- [ ] 8. Comprehensive Integration Testing
  - [ ] 8.1 Test free tier org (0-3 users) across all 4 pages
  - [ ] 8.2 Test paid tier org (4+ users) across all 4 pages
  - [ ] 8.3 Test pending invitations counting correctly
  - [ ] 8.4 Test users marked for removal handling
  - [ ] 8.5 Test API failure scenarios with fallback values
  - [ ] 8.6 Test pricing display consistency (10 PLN monthly, 96 PLN yearly)
  - [ ] 8.7 Verify browser testing checklist complete
  - [ ] 8.8 Document any edge cases found
  - [ ] 8.9 Verify all tests pass
