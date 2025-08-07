# RLS Policy Manual Verification Guide

This guide provides step-by-step instructions to manually verify that Row Level Security (RLS) policies are working correctly across all authentication methods.

## 🎯 Testing Scenarios

### 1. Unauthenticated Access (Critical)
**Expected**: All API endpoints should reject unauthenticated requests

**Test Steps:**
```bash
# Test critical endpoints without authentication
curl -X GET "http://localhost:3000/api/employees"
curl -X GET "http://localhost:3000/api/leave-requests" 
curl -X GET "http://localhost:3000/api/teams"
curl -X GET "http://localhost:3000/api/organizations"
```

**Expected Response:** 401 Unauthorized for all endpoints

---

### 2. Cross-Organization Access (Critical)
**Expected**: Users should only see data from their own organization

**Test Steps:**
1. Log in as User A from Organization 1
2. Try to access data that belongs to Organization 2
3. Verify access is denied

**Browser Test:**
1. Login as admin@org1.com
2. Open browser dev tools → Network tab
3. Navigate to /admin/team-management
4. Look for any API calls that return data from other organizations
5. Check employee lists, leave requests, teams

---

### 3. Role-Based Access Control
**Expected**: Different roles should have different access levels

#### Employee Access
- ✅ Can view: Their own leave requests, team members, organization settings (read-only)
- ❌ Cannot: Create/edit teams, manage other employees, approve leave requests

#### Manager Access  
- ✅ Can view: Team members' leave requests, team management
- ❌ Cannot: Manage employees outside their team, organization settings

#### Admin Access
- ✅ Can: Full access within their organization
- ❌ Cannot: Access other organizations' data

**Test Steps:**
1. Login with different role accounts
2. Navigate to restricted areas (/admin/*)
3. Try API calls that should be restricted
4. Verify appropriate access controls

---

### 4. API Endpoint Security Matrix

| Endpoint | Unauthenticated | Employee | Manager | Admin | Cross-Org |
|----------|----------------|----------|---------|-------|-----------|
| `/api/employees` | ❌ | ✅ (own org) | ✅ (own org) | ✅ (own org) | ❌ |
| `/api/leave-requests` | ❌ | ✅ (own only) | ✅ (team) | ✅ (all org) | ❌ |
| `/api/teams` | ❌ | ✅ (view) | ✅ (manage) | ✅ (manage) | ❌ |
| `/api/organizations` | ❌ | ✅ (own) | ✅ (own) | ✅ (own) | ❌ |
| `/api/admin/*` | ❌ | ❌ | ❌ | ✅ | ❌ |

---

## 🔍 Database-Level Verification

### Check RLS Status
Connect to your Supabase database and run:

```sql
-- Check which tables have RLS enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('user_organizations', 'leave_requests', 'teams', 'organizations', 'invitations', 'leave_types', 'profiles');

-- List all RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Expected Results:
- All critical tables should have `rowsecurity = true`
- Each table should have appropriate policies for SELECT, INSERT, UPDATE, DELETE
- Policies should reference `user_organizations` table for organization filtering

---

## 🛡️ Security Anti-Patterns to Check

### 1. Direct Profile Organization Reference
**Anti-pattern:** `profiles.organization_id = X`
**Correct:** Use `user_organizations` table for multi-org support

### 2. Missing Organization Filtering
**Anti-pattern:** Policies that don't filter by organization
**Correct:** All policies should include organization membership checks

### 3. Overly Permissive Policies
**Anti-pattern:** `USING (true)` or no WHERE conditions
**Correct:** Restrictive conditions based on user context

---

## 🧪 Browser Testing Checklist

### Authentication Flow
- [ ] Google OAuth redirects correctly
- [ ] Users land on correct dashboard
- [ ] Unauthenticated users redirected to login
- [ ] Session persistence works

### Data Isolation  
- [ ] Employee dropdown shows only organization members
- [ ] Leave requests filtered to user's organization
- [ ] Teams list shows only user's organization
- [ ] Calendar events scoped to organization

### Role Permissions
- [ ] Employee cannot access admin areas
- [ ] Manager can access team management
- [ ] Admin has full access to organization features
- [ ] Cross-organization access blocked

### API Behavior
- [ ] Network tab shows no unauthorized data
- [ ] Error responses for forbidden actions
- [ ] Consistent data filtering across endpoints

---

## 🚨 Critical Security Checks

### High Priority
1. **Multi-tenant isolation** - Users cannot see other organizations' data
2. **Unauthenticated access** - No endpoints accessible without auth
3. **Admin privilege escalation** - Non-admins cannot access admin features
4. **Data leakage** - No sensitive data in client-side code/responses

### Medium Priority  
1. **Role consistency** - Same role behaves consistently across features
2. **API error handling** - Appropriate error codes and messages
3. **Client-side validation** - UI reflects server-side permissions

### Monitor For
1. **Console errors** - Authentication or permission failures
2. **Network requests** - Unexpected data or failed requests  
3. **URL manipulation** - Direct navigation to restricted areas
4. **Browser storage** - No sensitive data in localStorage/cookies

---

## 📊 Verification Results Template

```
RLS POLICY VERIFICATION RESULTS
================================

✅ PASSED TESTS:
- [ ] Unauthenticated access blocked
- [ ] Multi-organization isolation 
- [ ] Role-based access control
- [ ] API endpoint security
- [ ] Database RLS policies active

⚠️  WARNINGS:
- [ ] List any non-critical issues found

🚨 CRITICAL ISSUES:
- [ ] List any security vulnerabilities

OVERALL ASSESSMENT: [GOOD/ACCEPTABLE/NEEDS ATTENTION]

RECOMMENDATIONS:
- Action items to improve security
- Additional testing needed
- Policy updates required
```

---

## 🎯 Quick Verification Commands

```bash
# Test auth requirement
curl -i http://localhost:3000/api/employees

# Test with valid session (copy from browser)
curl -i -H "Cookie: your-session-cookie" http://localhost:3000/api/employees

# Monitor logs during testing
tail -f dev.log | grep -E "(RLS|authentication|403|401)"
```

Run through this checklist systematically to ensure comprehensive RLS policy verification across all authentication methods and user roles.