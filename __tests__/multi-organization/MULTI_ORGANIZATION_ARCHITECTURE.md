# Multi-Organization Architecture Documentation

## Overview

This document provides a comprehensive analysis of the multi-organization (multi-tenant) architecture implementation in the SaaS Leave System. This documentation is generated as part of Task 5.8 from the auth-onboarding-analysis specification.

## Architecture Summary

The system implements a **shared database, multi-tenant architecture** where:
- All organizations share the same database instance
- Data isolation is enforced through Row Level Security (RLS) policies
- Organization context is maintained through cookies and API headers
- Each user can belong to multiple organizations with different roles

## Core Components

### 1. Database Schema Architecture

#### Organizations Table
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  google_domain TEXT,
  require_google_domain BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### User Organizations Junction Table
```sql
CREATE TABLE user_organizations (
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'employee')),
  team_id UUID REFERENCES teams(id),
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  joined_via TEXT CHECK (joined_via IN ('google_domain', 'invitation', 'created', 'request')),
  employment_type TEXT DEFAULT 'full_time',
  contract_start_date DATE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, organization_id)
);
```

#### Organization Settings Table
```sql
CREATE TABLE organization_settings (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id),
  allow_domain_join_requests BOOLEAN DEFAULT true,
  is_discoverable_by_domain BOOLEAN DEFAULT true,
  require_admin_approval_for_domain_join BOOLEAN DEFAULT false,
  auto_approve_verified_domains BOOLEAN DEFAULT false,
  default_employment_type TEXT DEFAULT 'full_time',
  require_contract_dates BOOLEAN DEFAULT true,
  data_retention_days INTEGER DEFAULT 365,
  allow_data_export BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. Data Isolation Implementation

#### Row Level Security (RLS) Policies
All multi-tenant tables implement RLS policies that filter data based on organization context:

```sql
-- Example RLS policy for leave_requests table
CREATE POLICY "leave_requests_isolation" ON leave_requests
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );
```

#### Organization Context Resolution
The system resolves organization context through a priority hierarchy:
1. **Request Headers** (`x-organization-id`) - for API calls
2. **HTTP Cookies** (`active-organization-id`) - for web requests  
3. **Default Organization** - user's `is_default = true` organization
4. **First Active Organization** - fallback if no default set

### 3. Authentication and Authorization

#### Multi-Organization User Management
- Users are stored in Supabase Auth (`auth.users`)
- Organization membership is managed through `user_organizations` table
- Each membership defines role within that specific organization
- Users can have different roles across different organizations

#### Permission System
```typescript
interface AuthContext {
  user: { id: string; email: string }
  profile: UserProfile
  organization: Organization
  organizationSettings: OrganizationSettings
  userOrganization: UserOrganization
  role: 'admin' | 'manager' | 'employee'
  organizations: UserOrganization[]
  permissions: {
    canManageUsers: boolean
    canManageTeams: boolean
    canApproveLeave: boolean
    canViewReports: boolean
    canManageSettings: boolean
  }
}
```

### 4. Organization Context Management

#### Context Switching Flow
1. User initiates organization switch via `/api/workspace/switch`
2. System validates user membership in target organization
3. Updates `active-organization-id` cookie
4. Subsequent requests use new organization context
5. All data access filtered by new organization

#### Context Preservation
- Organization context maintained across page navigation
- Cookie-based persistence with 30-day expiration
- Middleware enforces organization context on protected routes
- API endpoints validate organization membership before data access

## Key API Endpoints

### Organization Management
- `POST /api/organizations` - Create new organization
- `GET /api/user/organization-status` - Get user's organizations and invitations
- `GET /api/user/current-organization` - Get current organization context
- `POST /api/workspace/switch` - Switch active organization

### Multi-Organization Data Access
- `GET /api/employees` - Organization-scoped employee listing
- `GET /api/leave-requests` - Organization-scoped leave requests
- `GET /api/organization/members` - Organization membership management
- `GET /api/teams` - Organization-scoped team management

## Multi-Tenancy Patterns

### 1. Shared Database Pattern
- **Advantages**: Cost-effective, easier maintenance, shared resources
- **Implementation**: RLS policies for data isolation
- **Security**: Database-level enforcement of tenant boundaries

### 2. Organization-Scoped Resources
All major entities are scoped to organizations:
- **Employees**: `profiles.organization_id`
- **Teams**: `teams.organization_id`  
- **Leave Requests**: `leave_requests.organization_id`
- **Invitations**: `invitations.organization_id`
- **Settings**: `organization_settings.organization_id`

### 3. Cross-Organization User Management
Users can belong to multiple organizations with different roles:
- **Employee** in Organization A
- **Manager** in Organization B  
- **Admin** in Organization C

## Security Considerations

### 1. Data Isolation Mechanisms
- **Database Level**: RLS policies prevent cross-tenant data access
- **Application Level**: Organization context validation in API routes
- **UI Level**: Organization-specific data rendering

### 2. Permission Inheritance
- Permissions are **organization-specific** and do not inherit across organizations
- Admin in Organization A has **no privileges** in Organization B
- Role-based access control enforced per organization

### 3. Invitation and Access Control
- Invitations are organization-scoped
- Email-based invitation system with secure tokens
- Cross-organization access requires explicit invitation/approval

## Performance Considerations

### 1. Database Query Optimization
```sql
-- Indexes for efficient organization filtering
CREATE INDEX idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX idx_leave_requests_organization_id ON leave_requests(organization_id);
CREATE INDEX idx_user_organizations_lookup ON user_organizations(user_id, organization_id, is_active);
```

### 2. Caching Strategy
- Organization context cached in cookies (client-side)
- User organization memberships cached per session
- Database query optimization through proper indexing

### 3. Connection Pooling
- Shared database connections across all organizations
- Supabase handles connection pooling automatically
- RLS policies add minimal query overhead

## Testing Strategy

### 1. Data Isolation Testing
- Cross-organization data leakage prevention
- Multi-organization user context switching
- Permission inheritance validation across organizations

### 2. Integration Testing
- Organization creation and initialization workflows
- User onboarding across multiple organizations
- Cross-organization permission enforcement

### 3. Performance Testing
- Concurrent multi-organization operations
- Database query performance under organization filtering
- Context switching performance validation

## Deployment and Scaling

### 1. Horizontal Scaling
- Database-per-tenant not required due to RLS isolation
- Application servers scale independently of tenant count
- Supabase handles database scaling automatically

### 2. Monitoring and Observability
- Organization-specific metrics and logging
- Cross-tenant performance monitoring
- Data isolation compliance monitoring

### 3. Backup and Recovery
- Organization data can be backed up selectively
- Point-in-time recovery maintains organization boundaries
- Data export features respect organization isolation

## Migration and Maintenance

### 1. Schema Migrations
- All organizations share same schema version
- Migrations must preserve organization isolation
- RLS policies updated alongside schema changes

### 2. Data Migrations
- Organization-scoped data transformations
- Batch processing respects organization boundaries
- Rollback procedures maintain data integrity

## Component Architecture

### 1. Frontend Components

#### WorkspaceSwitcher Component
```typescript
// Location: components/workspace-switcher.tsx
// Features:
// - Displays available organizations for current user
// - Shows pending invitations
// - Handles organization switching workflow
// - Manages organization context state
```

#### Organization Context Providers
- React context providers for organization state
- Automatic organization switching on route changes
- Cookie-based persistence integration

### 2. Backend Utilities

#### Auth Utils V2
```typescript
// Location: lib/auth-utils-v2.ts
// Key Functions:
// - authenticateAndGetOrgContext(): Complete auth with org context
// - switchOrganization(): Handle organization switching
// - getUserOrganizations(): Get all user organizations
// - createOrganization(): Create new organization with admin user
```

#### Organization Management
- Organization creation with default settings
- User-organization relationship management
- Role-based permission calculation

## Best Practices Implemented

### 1. Security Best Practices
- ✅ Database-level isolation through RLS
- ✅ API-level organization context validation
- ✅ Cross-organization access prevention
- ✅ Secure token-based invitation system

### 2. Performance Best Practices
- ✅ Efficient database indexing strategy
- ✅ Cookie-based context caching
- ✅ Minimal query overhead from RLS policies
- ✅ Connection pooling optimization

### 3. Development Best Practices
- ✅ Comprehensive test coverage for isolation
- ✅ Clear separation of organization-scoped resources
- ✅ Consistent API patterns across endpoints
- ✅ Error handling for context validation

## Known Limitations and Future Considerations

### 1. Current Limitations
- **Cookie-based context**: May not work in cookieless environments
- **Single database**: All organizations share compute resources
- **No organization-level customization**: Shared application logic

### 2. Future Enhancements
- **API-key based authentication**: For programmatic access
- **Organization-specific branding**: Custom themes and logos
- **Advanced permission systems**: Fine-grained access control
- **Audit logging**: Organization-scoped activity tracking

## Conclusion

The multi-organization architecture successfully implements secure, scalable multi-tenancy through:

1. **Database-level isolation** via Row Level Security policies
2. **Application-level context management** via cookies and headers
3. **Role-based permissions** scoped to individual organizations
4. **Comprehensive testing** ensuring data isolation and security
5. **Scalable design** supporting unlimited organizations on shared infrastructure

The architecture provides a solid foundation for SaaS multi-tenancy while maintaining security, performance, and development velocity.