# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-11-12-billing-period-pricing-fix/spec.md

## Technical Requirements

### 1. Fix Billing Period Page Pricing Fetch

**File**: `app/onboarding/change-billing-period/page.tsx`

**Current Implementation** (Line 85):
```typescript
// ❌ WRONG: Calls server-only function from client component
const pricing = await getDynamicPricing()
```

**Required Changes**:
```typescript
// ✅ CORRECT: Fetch from server-side API endpoint
const response = await fetch('/api/billing/pricing', {
  cache: 'no-cache',
  headers: {
    'Cache-Control': 'no-cache'
  }
})

if (!response.ok) {
  throw new Error('Failed to fetch pricing')
}

const result = await response.json()
const pricing = result.pricing
```

**Why This Works**:
- `/api/billing/pricing` is a server-side route with access to `LEMONSQUEEZY_API_KEY`
- Existing endpoint already fetches from LemonSqueezy API safely
- Returns pricing data without exposing credentials
- Has built-in fallback if LemonSqueezy API fails

**Technical Details**:
- Server endpoint location: `app/api/billing/pricing/route.ts`
- Response format: `{ success: boolean, pricing: PricingInfo, lastUpdated: string }`
- Cache headers prevent stale pricing data
- Endpoint handles both test mode and production mode

### 2. Add Error Handling and Retry Mechanism

**File**: `app/onboarding/change-billing-period/page.tsx`

**Implementation**:
```typescript
const [pricingError, setPricingError] = useState<string | null>(null)
const [retryCount, setRetryCount] = useState(0)

const loadPricing = async () => {
  try {
    setPricingError(null)
    setIsLoading(true)

    const response = await fetch('/api/billing/pricing', {
      cache: 'no-cache',
      headers: { 'Cache-Control': 'no-cache' }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch pricing: ${response.status}`)
    }

    const result = await response.json()
    setPricingInfo(result.pricing)
  } catch (error: any) {
    console.error('Pricing fetch error:', error)
    setPricingError(error.message || 'Unable to load pricing information')

    // Optional: Fallback to static pricing
    const staticPricing = getStaticPricingInfo()
    if (staticPricing) {
      setPricingInfo(staticPricing)
      setPricingError('Using fallback pricing (LemonSqueezy API unavailable)')
    }
  } finally {
    setIsLoading(false)
  }
}

const handleRetry = () => {
  setRetryCount(prev => prev + 1)
  loadPricing()
}
```

**Error UI Component**:
```tsx
{pricingError && (
  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
    <div className="flex items-start gap-4">
      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
      <div className="flex-1">
        <h3 className="font-semibold text-red-900">
          Unable to Load Pricing
        </h3>
        <p className="text-sm text-red-700 mt-1">
          {pricingError}
        </p>
        <div className="flex gap-2 mt-3">
          <Button onClick={handleRetry} variant="outline">
            Retry
          </Button>
          <Button onClick={() => router.push('/admin/settings?tab=billing')} variant="ghost">
            Go Back
          </Button>
        </div>
      </div>
    </div>
  </div>
)}
```

### 3. Fix Reconciliation Cron Job Field Comparison

**File**: `app/api/cron/reconcile-subscriptions/route.ts`

**Current Implementation** (Line 107):
```typescript
// ❌ WRONG: Compares user access vs billing amount
const dbQuantity = subscription.current_seats
```

**Required Change**:
```typescript
// ✅ CORRECT: Compares billing amount vs billing amount
const dbQuantity = subscription.quantity
```

**Field Meanings**:
- `subscription.quantity` (DB) = What organization is being charged for (updated after API call)
- `subscription.current_seats` (DB) = What users have access to (updated after payment webhook)
- `lemonSqueezyData.data.attributes.quantity` (API) = What LemonSqueezy is billing

**Why This Fix Works**:
- Eliminates false positives during in-flight upgrades
- Both sides of comparison now represent billing state
- Matches actual billing reconciliation purpose
- Alerts only for genuine billing discrepancies

**Additional Context** (Line 106-110):
```typescript
const lsQuantity = lemonSqueezyData.data.attributes.quantity || 0
const dbQuantity = subscription.quantity // Fixed from current_seats

if (lsQuantity !== dbQuantity) {
  // Create CRITICAL alert - genuine billing mismatch
}
```

### 4. Add Fallback Pricing Support

**File**: `lib/lemon-squeezy/pricing.ts`

**Existing Function** (Already implemented):
```typescript
export function getStaticPricingInfo(): PricingInfo {
  return {
    monthlyPricePerSeat: parseFloat(process.env.NEXT_PUBLIC_MONTHLY_PRICE_PER_SEAT || '10.00'),
    annualPricePerSeat: parseFloat(process.env.NEXT_PUBLIC_ANNUAL_PRICE_PER_SEAT || '8.00'),
    currency: process.env.NEXT_PUBLIC_CURRENCY || 'PLN',
    monthlyVariantId: process.env.NEXT_PUBLIC_LEMONSQUEEZY_MONTHLY_VARIANT_ID || '972634',
    yearlyVariantId: process.env.NEXT_PUBLIC_LEMONSQUEEZY_YEARLY_VARIANT_ID || '972635'
  }
}
```

**Usage in Billing Period Page**:
- Call `getStaticPricingInfo()` when fetch fails
- Display pricing with notice: "Using fallback pricing"
- Allow user to proceed with known static values
- Log that static pricing was used for monitoring

**Environment Variables Required**:
```env
NEXT_PUBLIC_MONTHLY_PRICE_PER_SEAT=10.00
NEXT_PUBLIC_ANNUAL_PRICE_PER_SEAT=8.00
NEXT_PUBLIC_CURRENCY=PLN
NEXT_PUBLIC_LEMONSQUEEZY_MONTHLY_VARIANT_ID=972634
NEXT_PUBLIC_LEMONSQUEEZY_YEARLY_VARIANT_ID=972635
```

### 5. Testing Requirements

**Unit Tests**:
- Test pricing fetch from server-side API
- Test error handling and retry mechanism
- Test fallback to static pricing
- Test reconciliation field comparison

**Integration Tests**:
- Test complete billing period change flow (monthly → annual)
- Test complete billing period change flow (annual → monthly)
- Test pricing fetch failure scenarios
- Test reconciliation with in-flight upgrades

**End-to-End Tests**:
- Test full user journey from settings to billing period change
- Verify webhook payment confirmations still work
- Verify no false positive reconciliation alerts
- Test error recovery flows

## External Dependencies

**None Required** - All fixes use existing:
- Server-side API endpoint: `/api/billing/pricing`
- Existing function: `getStaticPricingInfo()`
- Existing fields in database schema
- Existing UI components (Button, Alert, etc.)

## Security Considerations

1. **API Key Protection**: Ensures `LEMONSQUEEZY_API_KEY` never exposed to client
2. **Server-Side Validation**: All pricing fetches happen server-side with proper auth
3. **No New Attack Surface**: Only changes data source location, not flow logic
4. **Existing Security Maintained**: Webhook payment confirmation flow unchanged

## Performance Considerations

1. **Caching**: Pricing endpoint has caching, reduces LemonSqueezy API calls
2. **Fallback Speed**: Static pricing loads instantly if API fails
3. **No Additional Latency**: Fetch vs direct call has negligible difference
4. **Reconciliation Impact**: Field change has zero performance impact

## Rollback Plan

If issues arise:
1. **Billing Period Page**: Revert to previous version (page will be broken as before)
2. **Reconciliation Cron**: Change field back to `current_seats` (will have false positives)
3. **No Database Changes**: No schema modifications required
4. **No API Changes**: Existing endpoints remain unchanged
