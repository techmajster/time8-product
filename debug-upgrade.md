# Debug: Upgrade Flow Issue (6 → 8 users)

## Problem
When trying to upgrade from 6 to 8 users via `/onboarding/add-users?upgrade=true`, nothing happens when clicking Continue.

## Debugging Steps

### 1. Check Browser Console
Open browser console and look for:
- ✓ Initial load logs: `🔄 Upgrade flow initialized:`
- ✓ Button click logs: `🔄 Upgrade flow: detecting changes`
- ✓ API call logs: `🔄 Updating seat quantity: 6 → 8`
- ❌ Error logs: Any errors in red

### 2. Check Network Tab
- Look for POST request to `/api/billing/update-subscription-quantity`
- Check if request is made
- Check response status (200, 400, 500?)
- Check response body

### 3. Check URL Parameters
Current URL should be:
```
/onboarding/add-users?upgrade=true&current_org=[ORG_ID]&seats=[CURRENT_SEATS]
```

### 4. Check State Values
Add these console.logs in handleContinue (line 315):
```typescript
console.log('DEBUG STATE:', {
  userCount,
  initialUserCount,
  seatsChanged: userCount !== initialUserCount,
  isUpgradeFlow,
  organizationData
});
```

## Possible Issues

### Issue A: Button Not Responding
**Symptom**: No console logs at all when clicking Continue
**Cause**: Button might be disabled or event handler not attached
**Check**:
- Is `isLoading` stuck as `true`?
- Is button visible in DOM?

### Issue B: State Not Updating
**Symptom**: Console shows `seatsChanged: false` when it should be `true`
**Cause**: `initialUserCount` might not be set correctly
**Fix**: Check line 71-72 and 92-94 logic

### Issue C: API Call Failing Silently
**Symptom**: API call made but no visible effect
**Cause**: Error caught but not displayed
**Check**: Look for error in catch block (line 460)

### Issue D: Redirect Happens Too Fast
**Symptom**: Page redirects before you notice
**Cause**: Line 398 redirects to payment-success
**Check**: Does page redirect to `/onboarding/payment-success?upgrade=true`?

## Expected Flow

1. User clicks Continue → `setIsLoading(true)`
2. Console: `🔄 Upgrade flow: detecting changes`
3. Console: `🔄 Updating seat quantity: 6 → 8`
4. Network: POST `/api/billing/update-subscription-quantity`
5. Console: `✅ Subscription quantity updated:`
6. Console: `✅ Subscription updated: seats updated to 8`
7. Page redirects to `/onboarding/payment-success?upgrade=true&org_id=[ID]`

## Quick Test

Open browser console and paste this to see current state:
```javascript
// Check if page variables are accessible
console.log({
  url: window.location.href,
  params: Object.fromEntries(new URLSearchParams(window.location.search))
});
```
