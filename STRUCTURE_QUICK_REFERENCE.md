# TeamLeave Application Structure - Quick Reference

## Three User Roles with Hierarchical Permissions

### ADMIN (Organization Owner)
- Full system access
- Access: `/admin`, `/admin/settings`, `/admin/team-management`, all dashboards
- Can: Create orgs, manage users, configure leave types, approve all leave requests
- Database: `role = 'admin'` in `user_organizations`

### MANAGER (Team Lead)
- Team-scoped management
- Access: `/team`, `/leave-requests` (team only), `/dashboard`
- Can: View/approve team's leave requests, manage team members, view team calendar
- Database: `role = 'manager'` + `team_id` in `user_organizations`

### EMPLOYEE (Team Member)
- Self-service only
- Access: `/dashboard`, `/leave`, `/calendar`, `/profile`, `/settings`
- Can: Submit own leave requests, view team calendar (read-only)
- Database: `role = 'employee'` in `user_organizations`

---

## Permission Enforcement (4 Layers)

1. **Middleware** → Routes require authentication
2. **Pages** → Server-side role checks redirect unauthorized users
3. **APIs** → `requireRole()` validation on endpoints
4. **Database** → RLS policies enforce organization/team boundaries

---

## Key Database Tables

| Table | Purpose | Key Field |
|-------|---------|-----------|
| `user_organizations` | User-to-org-role mapping | `(user_id, org_id, role)` |
| `organizations` | Organization entities | `id` |
| `teams` | Team groups per org | `organization_id` |
| `profiles` | User profile data | `id` |
| `leave_requests` | Leave submission history | `user_id, organization_id` |
| `leave_types` | Configurable leave types | `organization_id` |
| `leave_balances` | Leave entitlements | `user_id, year` |

---

## Complete Route Map (36 Pages)

**Protected Routes (Require Authentication + Org):**
- `/dashboard` - Main dashboard (all roles)
- `/admin` - Admin panel (admin only)
- `/admin/settings` - Admin configuration
- `/admin/team-management` - User management
- `/team` - Team management (manager/admin)
- `/leave-requests` - Leave approval (manager/admin)
- `/leave` - Personal leave history
- `/leave/new` - Submit leave request
- `/calendar` - Team calendar view
- `/schedule` - Work schedules
- `/settings`, `/profile`, `/help` - Self-service pages

**Public Routes:**
- `/login` - Authentication
- `/signup` - New user registration
- `/forgot-password`, `/reset-password` - Password recovery
- `/onboarding/*` - User onboarding (10 pages)

**API Endpoints (21 core):**
- Auth: signup, login, verify-email, logout
- Org: create, manage members, request access
- Leave: fetch, approve, reject, create
- Schedule: manage templates and assignments
- Billing: product info, checkout, webhooks
- Utilities: locale, invitations, status checks

---

## Multi-Organization Support

- Users have different roles in different organizations
- Active org selected via `active-organization-id` cookie
- Each org has isolated data (RLS enforced)
- Default org used if no active cookie set

---

## File Structure for Authorization

```
/lib/auth-utils.ts              → Role validation helpers
/lib/auth-utils-v2.ts           → Multi-org utilities
/lib/rls-utils.ts               → RLS policy checks
/middleware.ts                  → Route protection

/app/admin/page.tsx             → Admin role guard
/app/team/page.tsx              → Manager/Admin guard
/app/dashboard/page.tsx          → Org context setup

/supabase/migrations/*          → RLS policies
```

---

## Security Highlights

✓ Row Level Security (RLS) on all data tables
✓ Organization isolation enforced at DB level
✓ Team-level filtering for managers
✓ Role-based page access control
✓ API endpoint authentication
✓ Session-based active organization
✓ Employment type tracking (Polish labor law)

---

## Development Notes

- Polish-specific compliance fields: `employment_type`, `contract_start_date`
- Supports Google Workspace domain auto-join
- GDPR compliance with join request auto-expiration (30 days)
- Admin client used to bypass RLS for fetch operations
- Caching on user-org relationships for performance

