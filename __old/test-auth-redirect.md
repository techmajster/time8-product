# Authentication Redirect Testing Plan

## 🧪 Test Cases for Authentication Login Redirect Fix

### Prerequisites
- Development server running on http://localhost:3001
- Test user account with existing workspace (e.g., admin@bb8.pl)
- Test invitation link/token

### Test 1: Login Form Redirect
**Expected:** Login should redirect to `/onboarding` instead of `/dashboard`

1. Go to http://localhost:3001/login
2. Login with existing user (admin@bb8.pl)
3. ✅ **PASS if:** Redirected to `/onboarding` 
4. ❌ **FAIL if:** Redirected to `/dashboard`

### Test 2: Multi-Option Scenario Display
**Expected:** Users with existing workspaces see all options

1. After successful login at `/onboarding`
2. ✅ **PASS if:** See multi-option scenario with:
   - Current workspaces (BB8 Studio with 2 avatars)
   - "Enter workspace" button
   - "Create new workspace" option
3. ❌ **FAIL if:** See welcome/choice scenario or missing workspaces

### Test 3: Authenticated User with Invitation Token
**Expected:** Show existing workspaces + invitation together

1. While logged in, visit invitation link: `/onboarding?token=XXX`
2. ✅ **PASS if:** Multi-option scenario shows:
   - Existing workspaces (BB8 Studio)
   - New invitation card
   - Create new workspace option
3. ❌ **FAIL if:** Only shows invitation or missing existing workspaces

### Test 4: Middleware Coordination
**Expected:** No redirect loops, proper onboarding access

1. Direct navigation to `/onboarding` while authenticated
2. ✅ **PASS if:** Page loads normally, shows appropriate scenario
3. ❌ **FAIL if:** Redirect loop or access denied

### Test 5: Dashboard Access After Choice
**Expected:** Choosing workspace redirects to dashboard

1. From onboarding multi-option, click "Enter workspace" 
2. ✅ **PASS if:** Redirected to `/dashboard` with correct workspace
3. ❌ **FAIL if:** Stays on onboarding or error

## 🔍 Debug Information to Check

### Browser Console Logs
Look for these console messages:
- `🍪 Dashboard: Using active organization from cookie`
- `✅ Authenticated user accepting invitation - fetching existing workspaces for multi-option`
- `🏢 Fetched user workspaces for invitation:`
- `🎫 Allowing authenticated user to access onboarding`

### Network Tab
Check API calls:
- `/api/user/organization-status` - should return user workspaces
- `/api/invitations/lookup?token=XXX` - for invitation tokens

### Current State Summary
- ✅ Login forms redirect to `/onboarding`
- ✅ OAuth callback redirects to `/onboarding` 
- ✅ Multi-option scenario fetches existing workspaces
- ✅ Middleware allows onboarding access
- ✅ Invitation tokens merged with existing workspace data

## 🐛 Common Issues to Watch For
1. Empty workspace list when user should have workspaces
2. Invitation not showing alongside existing workspaces
3. Redirect loops between login and onboarding
4. Dashboard direct access bypassing onboarding choice

Ready to test! 🚀