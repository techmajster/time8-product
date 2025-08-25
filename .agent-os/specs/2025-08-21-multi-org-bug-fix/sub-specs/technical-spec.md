# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-21-multi-org-bug-fix/spec.md

## Technical Requirements

### Cookie-Based Organization Context Pattern
- Replace hardcoded `.eq('is_default', true)` with cookie-aware organization selection
- Use `cookies().get('active-organization-id')?.value` to retrieve active organization
- Implement conditional query logic: if cookie exists, use `eq('organization_id', activeOrgId)`, otherwise use `eq('is_default', true)`
- Add console logging for debugging organization context (matches app-layout.tsx pattern)

### Query Pattern Standardization
- Update all affected Supabase queries to use organization_id filtering based on active organization
- Ensure user_organizations table joins include proper organization context
- Maintain backward compatibility with existing organization_id profile assignment pattern
- Preserve all existing query selections and only modify the organization filtering logic

### Organization Access Validation
- Verify user has access to requested organization through user_organizations table
- Ensure `is_active: true` validation for user organization relationships
- Redirect to `/onboarding` if user has no valid organization access
- Maintain existing authentication and authorization checks

### Implementation Consistency
- Follow exact pattern established in `/components/app-layout.tsx` lines 32-56
- Use identical cookie retrieval and conditional query logic across all files
- Preserve existing error handling and redirect logic
- Maintain all existing data transformations and profile augmentation

### Affected File Categories
- **Dashboard Pages**: `/app/dashboard/page.tsx`, `/app/admin/page.tsx`
- **Calendar & Scheduling**: `/app/calendar/page.tsx`, `/app/schedule/page.tsx`
- **Leave Management**: `/app/leave/page.tsx`, `/app/leave-requests/page.tsx`
- **Team Management**: `/app/team/page.tsx`, `/app/admin/team-management/` pages
- **Settings & Admin**: `/app/settings/page.tsx`, `/app/admin/settings/page.tsx`, `/app/admin/holidays/page.tsx`
- **User Profile**: `/app/profile/page.tsx`
- **API Routes**: All affected API endpoints that use organization filtering
- **Utility Functions**: `/lib/auth-utils.ts`, `/lib/team-utils.ts`, `/lib/rls-utils.ts`
- **Components**: `/components/AddAbsenceSheet.tsx`

### Performance Considerations
- No additional database queries required - reusing existing cookie mechanism
- No caching invalidation needed - organization context is request-scoped
- Minimal performance impact as only changing query conditions, not query structure
- Cookie access is already optimized in Next.js server components