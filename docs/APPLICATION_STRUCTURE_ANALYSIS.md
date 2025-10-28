# TeamLeave Application Architecture Analysis

## Application Overview

**Product:** TeamLeave - A SaaS leave management platform for SMBs (3+ employees)  
**Tech Stack:** Next.js 14, React, TypeScript, Supabase (PostgreSQL), TailwindCSS  
**Multi-Organization Support:** Full multi-org architecture with per-org configuration  
**Authentication:** Supabase Auth with email/password and Google OAuth  
**Database:** PostgreSQL with Row Level Security (RLS) policies  

---

## 1. ACCOUNT TYPES & USER ROLES

### Role Hierarchy

The application implements a **3-tier role system** per organization:

#### 1.1 ADMIN Role
- **Capabilities:**
  - Create and manage the entire organization
  - Access admin dashboard (`/admin`)
  - Manage team members (add, edit, delete, assign roles)
  - Configure organization settings
  - Configure leave types and policies
  - Access leave request management
  - View all team calendars and availability
  - Manage billing and subscriptions
  - Create and manage teams
  - Invite users to organization
  - View comprehensive analytics and reports

- **Database:** 
  - Role value: `'admin'` in `user_organizations` table
  - Permission level: Full organization access

#### 1.2 MANAGER Role
- **Capabilities:**
  - Manage only their assigned team
  - View team members' leave requests
  - Approve/reject leave requests (for their team)
  - View team calendars and availability
  - Cannot access admin settings
  - Cannot manage users outside their team
  - Can see leave balances for team members
  - View team-level reports
  - Cannot create/manage organizations

- **Database:**
  - Role value: `'manager'` in `user_organizations` table
  - Limited to `team_id` assigned in `user_organizations`
  - Typically has a `teams.manager_id` reference

#### 1.3 EMPLOYEE Role
- **Capabilities:**
  - View own leave balance
  - Submit personal leave requests
  - View own leave history
  - View team calendar (read-only)
  - View profile and settings
  - Cannot approve leave requests
  - Cannot manage team members
  - Cannot access admin features

- **Database:**
  - Role value: `'employee'` in `user_organizations` table
  - Full self-service access to own data only

### Role Distribution (Multi-Organization Context)

Users can have **different roles in different organizations**:
- User A: Admin in Organization 1, Manager in Organization 2
- User B: Employee in multiple organizations
- Roles stored per user-organization relationship in `user_organizations` table

---

## 2. PERMISSION SYSTEM ARCHITECTURE

### 2.1 Permission Enforcement Layers

The application uses a **multi-layered permission system**:

#### Layer 1: Route-Level Middleware Protection
**File:** `middleware.ts`

- Unauthenticated users → redirected to `/login`
- Authenticated users without organization → redirected to `/onboarding`
- Public routes whitelist:
  - `/login`, `/signup`, `/forgot-password`, `/reset-password`
  - `/onboarding/*` (invitation join flow)
  - Public API endpoints (auth, billing webhooks, locale)

#### Layer 2: Page-Level Server-Side Access Control
**Pattern:** All protected pages perform role checks before rendering

```typescript
// Example from /admin/page.tsx
if (profile.role !== 'admin') {
  redirect('/dashboard')  // Non-admins redirected
}

// Example from /team/page.tsx
if (profile.role !== 'manager' && profile.role !== 'admin') {
  redirect('/dashboard')  // Only managers/admins
}
```

Key pages with role checks:
- `/admin` - Admin only
- `/admin/settings` - Admin only
- `/admin/team-management` - Admin only
- `/team` - Manager/Admin only
- `/leave-requests` - Manager/Admin (see requests) or Employee (own requests)
- `/dashboard` - All authenticated users
- `/profile`, `/settings`, `/leave`, `/calendar`, `/schedule` - All authenticated users

#### Layer 3: API Route Protection
**File:** `lib/auth-utils.ts`

Functions for API route protection:

```typescript
// Get user and validate they have an organization
authenticateAndGetProfile() → AuthResult

// Lightweight auth check with caching
getBasicAuth() → BasicAuthResult

// Role validation helper
requireRole(profile, requiredRoles) → NextResponse | null
isAdmin(role) → boolean
isManagerOrAdmin(role) → boolean
```

#### Layer 4: Database Row Level Security (RLS)
**File:** `supabase/migrations/20250127000000_multi_organization_support.sql`

RLS policies enforce organization boundaries:

```sql
-- Users can only see their own organization memberships
CREATE POLICY "Users can view their own organization memberships" 
  ON user_organizations
  FOR SELECT USING (user_id = auth.uid());

-- Organization admins can view all memberships in their org
CREATE POLICY "Organization admins can view all memberships" 
  ON user_organizations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND role IN ('admin') 
      AND is_active = true
    )
  );

-- Similar policies for join_requests, organization_domains, etc.
```

### 2.2 Organization Context Management

#### Active Organization Cookie
```typescript
// File: lib/auth-utils-v2.ts
setActiveOrganization(orgId) // Sets active-organization-id cookie
```

Pages respect the active organization:
```typescript
const cookieStore = await cookies()
const activeOrgId = cookieStore.get('active-organization-id')?.value

// Query respects cookie OR defaults to is_default = true
if (activeOrgId) {
  userOrgQuery = userOrgQuery.eq('organization_id', activeOrgId)
} else {
  userOrgQuery = userOrgQuery.eq('is_default', true)
}
```

### 2.3 User-Organization Relationships

**Database Table:** `user_organizations`

```typescript
{
  user_id: UUID,              // Foreign key to profiles
  organization_id: UUID,      // Foreign key to organizations
  role: 'admin' | 'manager' | 'employee',
  team_id: UUID | null,       // Assignment within organization
  is_active: boolean,         // Can user access this org?
  is_default: boolean,        // User's primary organization
  joined_via: 'google_domain' | 'invitation' | 'created' | 'request',
  employment_type: string,    // Polish labor law compliance
  contract_start_date: date,  // Polish labor law compliance
  joined_at: timestamp,
  updated_at: timestamp
}
```

**Key Constraints:**
- Unique constraint: (user_id, organization_id)
- Each user has exactly ONE default organization (unique index)
- Organizations are isolated by RLS policies

---

## 3. PAGE STRUCTURE & ROUTES

### 3.1 Authentication Pages (Public)

| Route | Purpose | Authentication | Notes |
|-------|---------|-----------------|-------|
| `/` | Home/Redirect | Public | Redirects to `/dashboard` if auth, `/login` if not |
| `/login` | Login page | Public | Email/password or Google OAuth |
| `/signup` | Signup page | Public | New account creation |
| `/forgot-password` | Password reset request | Public | Send reset email |
| `/reset-password` | Password reset form | Public | Complete password reset |

### 3.2 Onboarding Flow Pages

| Route | Purpose | Access |
|-------|---------|--------|
| `/onboarding` | Onboarding hub | Authenticated, no org OR with token |
| `/onboarding/welcome` | Welcome intro | Authenticated |
| `/onboarding/choose` | Scenario selection | Authenticated |
| `/onboarding/register` | Register with invitation | Public + token |
| `/onboarding/join` | Join organization | Public or Authenticated |
| `/onboarding/create-workspace` | Create new organization | Authenticated |
| `/onboarding/add-users` | Invite team members | During org creation |
| `/onboarding/payment-success` | Billing success | Authenticated |
| `/onboarding/payment-failure` | Billing failure | Authenticated |
| `/onboarding/complete` | Onboarding completion | Authenticated |

### 3.3 Core Application Pages (Authenticated)

#### Dashboard & Main Views
| Route | Purpose | Required Role | Notes |
|-------|---------|----------------|-------|
| `/dashboard` | Main dashboard | All authenticated | Personalized view based on role |
| `/calendar` | Team calendar view | All | Shows team's leave schedule |
| `/leave` | Leave history | All | View own leave requests |
| `/leave/new` | Submit leave request | All | Create new leave request |
| `/leave-requests` | Manage leave requests | Manager/Admin | Approve/reject requests |
| `/team` | Team management | Manager/Admin | Team members and their info |
| `/team/invite` | Invite to organization | Manager/Admin | Send team member invites |
| `/schedule` | Work schedules | All | View and manage work patterns |
| `/settings` | User settings | All | Personal profile settings |
| `/profile` | User profile | All | View/edit personal info |
| `/help` | Help/Documentation | All | Support and guidance |

#### Admin Exclusive Pages
| Route | Purpose | Required Role | Notes |
|-------|---------|----------------|-------|
| `/admin` | Admin dashboard | Admin | Organization overview & stats |
| `/admin/settings` | Admin settings | Admin | Org config, leave types, policies |
| `/admin/team-management` | Team management | Admin | Add/edit/delete team members |
| `/admin/team-management/add-employee` | Add employee | Admin | Form to add new employee |
| `/admin/team-management/edit-employee/[id]` | Edit employee | Admin | Modify employee details |
| `/admin/fix-workspace-owners-balances` | Fix balances | Admin | Data correction utility |

#### Debug Pages (Development)
| Route | Purpose | Notes |
|-------|---------|-------|
| `/debug-role` | Debug user role | Development utility |
| `/debug/billing` | Debug billing state | Development utility |
| `/email-preview` | Email template preview | Development utility |

### 3.4 API Routes (Backend Endpoints)

#### Authentication API
- `/api/auth/signup` - Custom signup
- `/api/auth/signup-with-invitation` - Invitation signup
- `/api/auth/verify-email` - Email verification
- `/api/logout` - Logout endpoint

#### Organization Management API
- `POST /api/organizations` - Create organization
- `GET/POST /api/organization/members` - Manage members
- `POST /api/organization/request-access` - Request org access

#### Leave Management API
- `/api/leave-requests` - Fetch/manage leave requests
- `/api/calendar/leave-requests` - Leave requests for calendar
- `/api/calendar/holidays` - Holiday calendar data

#### Schedule Management API
- `/api/schedule/templates` - Work schedule templates
- `/api/schedule/employee/[id]` - Employee schedule
- `/api/schedule/assign-template` - Assign schedule
- `/api/schedule/custom` - Custom schedules
- `/api/schedule/weekly` - Weekly schedules

#### Billing API
- `/api/billing/products` - Available billing products
- `/api/billing/create-checkout` - Create checkout session
- `/api/webhooks/lemonsqueezy` - Webhook for billing events

#### Utility API
- `/api/locale` - Language/locale switching
- `/api/invitations/lookup` - Look up invitation details
- `/api/user/organization-status` - Check org status
- `/api/test-db` - Database connection test
- `/api/test-auth` - Auth diagnostic

### 3.5 Protected Resource Access Pattern

#### For Managers:
1. Can only access `/team` (their team view)
2. Can view leave requests from their team members only
3. Dashboard filtered to show only team-related data
4. Cannot create organizations or modify team roster

#### For Admins:
1. Full access to `/admin`, `/admin/settings`, `/admin/team-management`
2. Dashboard shows organization-wide statistics
3. Can see all teams and team members
4. Can modify leave types, policies, and settings

#### For Employees:
1. Access to `/dashboard`, `/leave`, `/calendar`, `/settings`, `/profile`
2. Cannot access `/team` or `/admin` pages
3. Can view own leave history and submit requests
4. Can see team calendar but read-only

---

## 4. DATA ISOLATION & SECURITY

### 4.1 Organization Isolation Strategy

Every data table includes `organization_id` for isolation:

```sql
-- Core tables
teams (organization_id)
leave_types (organization_id)
leave_requests (organization_id)
leave_balances (organization_id)
company_holidays (organization_id)
schedules (organization_id)
```

### 4.2 Team-Level Filtering

Managers are further filtered by team:
```typescript
// Get only team members for a manager
const teamMembers = await supabaseAdmin
  .from('user_organizations')
  .select('*')
  .eq('team_id', userOrg.team_id)  // Team isolation
  .eq('is_active', true)
```

### 4.3 RLS Policy Examples

```sql
-- Leave requests: Only accessible by admins, managers of same org, or requesting user
CREATE POLICY "Users can view their own leave requests"
  ON leave_requests
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Managers can view team leave requests"
  ON leave_requests
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
      AND role = 'manager'
      AND is_active = true
    )
  );
```

---

## 5. EMPLOYMENT TYPES (Polish Labor Law Support)

```typescript
employment_type IN (
  'full_time',      // Umowa o pracę - pełny etat
  'part_time',      // Umowa o pracę - część etatu
  'contract',       // Umowa zlecenie/o dzieło
  'internship',     // Praktyki/staż
  'temporary',      // Umowa na czas określony
  'consultant'      // Konsultant/B2B
)
```

---

## 6. KEY AUTHENTICATION FLOWS

### 6.1 Login Flow
1. User enters credentials → `/login`
2. Supabase Auth validates
3. Middleware checks user has organization
4. Redirect to `/dashboard` or `/onboarding`

### 6.2 Onboarding Flow
1. **Create Workspace:** User creates org → assigned `admin` role
2. **Join by Invitation:** User accepts invite → assigned invited role
3. **Join by Domain:** Auto-join if Google domain matches
4. **Join by Request:** User requests access → admin approves

### 6.3 Multi-Organization Switching
```typescript
// User sets active organization via cookie
setActiveOrganization(newOrgId)
// Pages respect this cookie for context
```

---

## 7. CACHING & PERFORMANCE

### Auth Caching

```typescript
// File: lib/auth-utils.ts
const cacheKey = cacheKeys.userProfileWithOrg(user.id)
const cachedProfile = await getOrSetCache(
  cacheKey,
  fetchFunction,
  cacheTTL.userProfileWithOrg
)
```

Caches: User organization relationships to reduce database queries

---

## 8. PERMISSION ENFORCEMENT SUMMARY TABLE

| Feature | Admin | Manager | Employee |
|---------|-------|---------|----------|
| View own data | ✓ | ✓ | ✓ |
| View team data | ✓ Team | ✓ Own team | ✗ |
| Approve leave | ✓ Org | ✓ Own team | ✗ |
| Manage team | ✓ | ✗ | ✗ |
| Manage org settings | ✓ | ✗ | ✗ |
| Invite users | ✓ | ✗ | ✗ |
| View admin panel | ✓ | ✗ | ✗ |
| Create leave request | ✓ | ✓ | ✓ |

---

## 9. CRITICAL FILES REFERENCE

**Authentication & Authorization:**
- `/lib/auth-utils.ts` - Core auth functions and role checks
- `/lib/auth-utils-v2.ts` - Multi-org auth utilities
- `/lib/rls-utils.ts` - RLS policy helpers
- `/middleware.ts` - Route protection middleware

**Database Schema:**
- `/supabase/migrations/20250127000000_multi_organization_support.sql` - Multi-org architecture
- `/supabase/migrations/20250127000001_multi_org_rls_policies.sql` - RLS policies

**Page Guards:**
- `/app/admin/page.tsx` - Admin role check example
- `/app/team/page.tsx` - Manager/Admin role check example
- `/app/dashboard/page.tsx` - Organization context setup example

---

## 10. PERMISSION HIERARCHY DIAGRAM

```
Unauthenticated User
    ↓
Authentication (Supabase Auth)
    ↓
Organization Assignment (user_organizations)
    ├─ Organization 1 → Role (admin/manager/employee)
    │   ├─ Team Assignment (optional)
    │   └�� Access Control (RLS policies)
    ├─ Organization 2 → Role (admin/manager/employee)
    └─ Organization N → Role (admin/manager/employee)

Role-Based Access:
    admin → All organization features + /admin pages
    manager → Team management only + /team pages
    employee → Self-service only + /dashboard pages
```

