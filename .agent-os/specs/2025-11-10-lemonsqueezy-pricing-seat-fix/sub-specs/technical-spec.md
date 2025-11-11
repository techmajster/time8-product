# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-11-10-lemonsqueezy-pricing-seat-fix/spec.md

## Technical Requirements

### 1. Pricing API Fix (lib/lemon-squeezy/pricing.ts)

**Problem:** The `getDynamicPricing()` function (lines 131-174) uses deprecated `fetchVariantPricing()` which relies on `@lemonsqueezy/lemonsqueezy.js` SDK and doesn't fetch graduated pricing tiers correctly.

**Solution:**
- Replace calls to `fetchVariantPricing()` with `getVariantPrice()` (already exists at lines 56-99)
- `getVariantPrice()` uses direct REST API calls and properly handles graduated pricing
- Update `getDynamicPricing()` to extract tier 4+ pricing from the response
- Mark `fetchVariantPricing()` as deprecated or remove it entirely

**Implementation Details:**
```typescript
// Current (WRONG):
const [monthlyPricing, yearlyPricing] = await Promise.all([
  fetchVariantPricing(monthlyVariantId),
  fetchVariantPricing(yearlyVariantId)
])

// Fixed (CORRECT):
const [monthlyPricing, yearlyPricing] = await Promise.all([
  getVariantPrice(monthlyVariantId),
  getVariantPrice(yearlyVariantId)
])
```

**Expected Results:**
- Monthly variant (972634): Returns 1000 cents = 10.00 PLN (tier 4+ price)
- Yearly variant (972635): Returns 9600 cents = 96.00 PLN (tier 4+ price)
- Fallback values remain 10.00/8.00 PLN if API fails

**Files Modified:**
- `lib/lemon-squeezy/pricing.ts` lines 131-174

---

### 2. Seat Info API Response Restructuring (app/api/organizations/[organizationId]/seat-info/route.ts)

**Problem:** API response (line 188) returns `freeSeats: seatInfo.availableSeats` which is confusing. The field name suggests "free tier seats (3)" but contains "available empty seats".

**Solution:**
- Rename response field from `freeSeats` to `availableSeats`
- Add new field `freeTierSeats: 3` to explicitly show the tier threshold
- Update response interface/type definition

**Implementation Details:**
```typescript
// Current (CONFUSING):
const response = {
  currentSeats: seatInfo.totalUsedSeats,
  maxSeats: seatInfo.totalSeats,
  freeSeats: seatInfo.availableSeats,  // ❌ WRONG NAME
  ...
}

// Fixed (CLEAR):
const response = {
  currentSeats: seatInfo.totalUsedSeats,
  maxSeats: seatInfo.totalSeats,
  availableSeats: seatInfo.availableSeats,  // ✅ CLEAR
  freeTierSeats: 3,  // ✅ EXPLICIT CONSTANT
  ...
}
```

**Expected Results:**
- API returns both `availableSeats` (empty seats) and `freeTierSeats` (tier threshold)
- No more confusion between the two concepts
- Backward compatibility maintained by keeping both fields temporarily

**Files Modified:**
- `app/api/organizations/[organizationId]/seat-info/route.ts` lines 185-201

---

### 3. Invite Users Dialog Component Updates (components/invitations/invite-users-dialog.tsx)

**Problem:**
- Lines 67-68: Hardcoded fallback `pricePerSeat: 10.99 EUR` (should be 10.00 PLN)
- Lines 71-73: Uses confusing `freeSeats` variable name
- Line 245: Display text uses `freeSeats` which is ambiguous

**Solution:**
- Update state initialization with correct fallback values
- Rename `freeSeats` to `availableSeats` throughout component
- Update Polish display text for clarity
- Use `seatInfo.availableSeats` instead of `seatInfo.freeSeats`

**Implementation Details:**
```typescript
// Current (WRONG):
const [pricePerSeat, setPricePerSeat] = React.useState<number>(10.99)
const [currency, setCurrency] = React.useState<string>('EUR')
const freeSeats = seatInfo ? seatInfo.freeSeats : 0

// Fixed (CORRECT):
const [pricePerSeat, setPricePerSeat] = React.useState<number>(10.00)
const [currency, setCurrency] = React.useState<string>('PLN')
const availableSeats = seatInfo ? seatInfo.availableSeats : 0

// Display text update:
"Masz {availableSeats}/{totalSeats} wolnych miejsc w Twoim planie"
```

**Expected Results:**
- Dialog shows correct PLN currency and 10.00 price if API fails
- Displays "X/Y available seats" clearly
- No more confusion about "free seats" meaning

**Files Modified:**
- `components/invitations/invite-users-dialog.tsx` lines 67-73, 245

---

### 4. Admin Settings Billing Tab Fix (app/admin/settings/components/AdminSettingsClient.tsx)

**Problem:** The `getSeatUsage()` function (lines 613-652) incorrectly handles free tier by setting `total: 3` which implies a cap of 3 total seats instead of "3 free seats used".

**Solution:**
- Update free tier logic to clarify that 3 is the FREE_TIER_LIMIT, not total capacity
- Update display logic to show "X/3 free seats used" for free tier
- For paid tier, show "X/Y seats used (3 free + Z paid)"
- Add `isFreeTier` flag to response for conditional rendering

**Implementation Details:**
```typescript
// Current (CONFUSING):
if (!subscriptionData?.seat_info) {
  const currentEmployees = users.length || 0
  const freeSeats = 3
  return {
    used: currentEmployees,
    total: freeSeats,  // ❌ Implies cap at 3
    ...
  }
}

// Fixed (CLEAR):
if (!subscriptionData?.seat_info) {
  const currentEmployees = users.length || 0
  const FREE_TIER_LIMIT = 3
  return {
    used: currentEmployees,
    total: FREE_TIER_LIMIT,  // ✅ Max for free tier
    freeSeats: FREE_TIER_LIMIT,
    paidSeats: 0,
    isFreeTier: true,  // ✅ Flag for rendering
    ...
  }
}
```

**Expected Results:**
- Free tier: Shows "2/3 free seats used, 1 available"
- Paid tier: Shows "5/13 seats used (3 free + 10 paid), 8 available"
- Clear distinction between free tier limit and total capacity

**Files Modified:**
- `app/admin/settings/components/AdminSettingsClient.tsx` lines 613-652

---

### 5. Team Management Client Updates (app/admin/team-management/components/TeamManagementClient.tsx)

**Problem:** Component uses `seatInfo.freeSeats` which will be renamed to `seatInfo.availableSeats` in the API response.

**Solution:**
- Update component to use `seatInfo.availableSeats` instead of `seatInfo.freeSeats`
- Update any display logic that references seat counts
- Ensure compatibility with new API response structure

**Implementation Details:**
```typescript
// Update references:
const availableSeats = seatInfo ? seatInfo.availableSeats : 0
const freeTierLimit = seatInfo ? seatInfo.freeTierSeats : 3
```

**Expected Results:**
- Component correctly reads `availableSeats` from API
- Displays accurate seat counts matching other pages
- No breaking changes or rendering errors

**Files Modified:**
- `app/admin/team-management/components/TeamManagementClient.tsx` (lines referencing seat info)

---

### 6. Environment Variables Update (.env.example)

**Problem:** Fallback values are incorrect:
- `MONTHLY_PRICE_PER_SEAT=12.99` (should be 10.00)
- `ANNUAL_PRICE_PER_SEAT=10.83` (should be 8.00)
- `NEXT_PUBLIC_MONTHLY_PRICE_PER_SEAT=12.99` (should be 10.00)
- `NEXT_PUBLIC_ANNUAL_PRICE_PER_SEAT=10.83` (should be 8.00)

**Solution:**
- Update all fallback pricing values to match actual LemonSqueezy graduated pricing
- Add comments explaining the graduated pricing model
- Document that these are fallbacks only used when API fails

**Implementation Details:**
```env
# Pricing Configuration (dynamic pricing fallback)
# Graduated pricing: First 3 seats FREE, 4+ users pay for ALL seats
# Tier 4+ pricing from LemonSqueezy:
MONTHLY_PRICE_PER_SEAT=10.00  # PLN per seat per month
ANNUAL_PRICE_PER_SEAT=8.00     # PLN per seat per month (96 PLN/year ÷ 12)

# Public pricing (for client-side fallback)
NEXT_PUBLIC_MONTHLY_PRICE_PER_SEAT=10.00
NEXT_PUBLIC_ANNUAL_PRICE_PER_SEAT=8.00
NEXT_PUBLIC_CURRENCY=PLN
```

**Expected Results:**
- Fallback values match actual LemonSqueezy pricing
- Comments clearly explain graduated pricing model
- Developers understand these are fallbacks, not primary source

**Files Modified:**
- `.env.example` lines 37-42

---

### 7. User Education & Help Text

**Requirement:** Add tooltips and help text across affected pages explaining the graduated pricing model.

**Implementation:**
- Add tooltip component to onboarding add-users page
- Add info icon with explanation in admin settings billing tab
- Add help text in invite users dialog
- Consistent messaging: "First 3 seats FREE. 4+ users pay for ALL seats."

**Example Tooltip Content:**
```
💡 Graduated Pricing Model:
• Seats 1-3: FREE (no charge)
• Seats 4+: Pay for ALL seats
• Example: 5 users = 5 × 10 PLN = 50 PLN/month
```

**Files Modified:**
- `app/onboarding/add-users/page.tsx`
- `app/admin/settings/components/AdminSettingsClient.tsx`
- `components/invitations/invite-users-dialog.tsx`

---

## Testing Requirements

### Unit Tests
1. Test `getVariantPrice()` returns correct tier 4+ pricing (10 PLN, 96 PLN)
2. Test `getDynamicPricing()` correctly calls `getVariantPrice()`
3. Test seat calculation API returns correct field names
4. Test fallback values are used when API fails

### Integration Tests
1. Test free tier org (0-3 users) displays correctly across all 4 pages
2. Test paid tier org (4+ users) displays correctly across all 4 pages
3. Test pending invitations count against available seats
4. Test users marked for removal don't affect seat counts
5. Test API failure gracefully falls back to correct values

### Browser Testing
1. Navigate to admin team management - verify seat display
2. Navigate to admin settings billing tab - verify seat usage
3. Navigate to onboarding add-users - verify pricing calculation
4. Open invite users dialog - verify available seats and pricing

### Test Scenarios

**Scenario 1: Free Tier Org (2 active users)**
- Expected: "2/3 free seats used, 1 available"
- Total cost: 0 PLN
- Can add: 1 more user before payment

**Scenario 2: Paid Tier Org (10 paid seats, 5 active users)**
- Expected: "5/13 seats used (3 free + 10 paid), 8 available"
- Total cost: 10 seats × 10 PLN = 100 PLN/month
- Can add: 8 more users without upgrading

**Scenario 3: Paid Tier Org (10 paid seats, 8 active, 3 pending invites)**
- Expected: "11/13 seats used (8 active + 3 pending), 2 available"
- Pending invites count against capacity
- Can add: 2 more invites before needing upgrade

---

## Performance Considerations

- Replace SDK-based API calls with direct REST API (reduces overhead)
- No additional API calls (uses existing endpoints)
- Minimal component re-renders (only affected by state changes)
- Fallback values prevent UI blocking if API is slow

---

## Rollback Plan

If issues arise after deployment:

1. **Revert pricing API change:**
   - Restore `fetchVariantPricing()` calls in `getDynamicPricing()`
   - Keep `getVariantPrice()` for future use

2. **Revert API response changes:**
   - Change `availableSeats` back to `freeSeats` in seat-info API
   - Remove `freeTierSeats` field

3. **Revert component updates:**
   - Restore original variable names in components
   - Revert display text changes

4. **Revert environment variables:**
   - Restore original fallback values (if critical issue)

**Note:** Changes are non-breaking - old client code will continue to work during transition period.
