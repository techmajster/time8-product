# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-08-07-performance-optimization-rls-caching/spec.md

## Index Optimizations

### Composite Indexes for Multi-Organization Queries
```sql
-- Optimize organization-scoped leave request queries
CREATE INDEX idx_leave_requests_org_status_date ON leave_requests(organization_id, status, start_date);

-- Optimize user leave balance lookups
CREATE INDEX idx_leave_balances_org_user ON leave_balances(organization_id, user_id);

-- Optimize calendar view queries
CREATE INDEX idx_leave_requests_org_date_range ON leave_requests(organization_id, start_date, end_date);

-- Optimize team management queries
CREATE INDEX idx_organization_members_org_role ON organization_members(organization_id, role);
```

### RLS Policy Supporting Indexes
```sql
-- Support RLS policies that filter by user permissions
CREATE INDEX idx_organization_members_user_org ON organization_members(user_id, organization_id);

-- Support date-based RLS filtering
CREATE INDEX idx_leave_requests_user_dates ON leave_requests(user_id, start_date, end_date);
```

### Query Performance Indexes
```sql
-- Optimize user lookup by email (invitation flows)
CREATE INDEX idx_users_email_verified ON users(email) WHERE email_verified = true;

-- Optimize leave type lookups per organization
CREATE INDEX idx_leave_types_org_active ON leave_types(organization_id) WHERE is_active = true;
```

## Performance Analysis Queries

### Identify Slow Queries
```sql
-- Enable query performance tracking
SELECT pg_stat_statements_reset();

-- Monitor RLS policy performance
SELECT query, calls, mean_exec_time, total_exec_time 
FROM pg_stat_statements 
WHERE query LIKE '%organization_id%' 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

## Migration Strategy

1. **Phase 1**: Add non-blocking indexes during low-traffic periods
2. **Phase 2**: Monitor performance improvements and query plan changes
3. **Phase 3**: Remove unused indexes if any create maintenance overhead

## Rationale

- **Composite indexes**: Multi-column indexes support the most common query patterns in multi-organization systems
- **RLS support**: Indexes specifically designed to make Row Level Security policies execute efficiently
- **Selective indexing**: Only create indexes that provide measurable performance benefits
- **Maintenance consideration**: Balance query performance with index maintenance overhead