# Spec Requirements Document

> Spec: Database Optimization for Scaling to 100,000+ Accounts
> Created: 2025-10-27
> Status: Planning

## Overview

Optimize database performance to handle 100,000+ user accounts across 10,000+ organizations with sub-second query response times. This spec focuses on adding composite indexes, fixing SQL anti-patterns, and optionally optimizing RLS policies to ensure the application scales smoothly without breaking current functionality.

## User Stories

### Performance at Scale

As a product owner, I want the application to handle 100,000+ accounts efficiently, so that we can scale to enterprise customers without performance degradation or infrastructure costs spiraling.

**Workflow:** Users in large organizations (5,000+ members) should experience fast page loads (<500ms for dashboards, <200ms for API responses) without any changes to current behavior.

### Developer Confidence

As a developer, I want database optimizations that are safe and reversible, so that we can improve performance without risking production stability or breaking existing functionality.

**Workflow:** Each optimization phase includes comprehensive testing, rollback procedures, and validation that current behavior is unchanged.

## Spec Scope

This spec covers four optimization phases with increasing risk levels:

1. **Composite Index Additions** - Add 6 performance indexes to optimize common query patterns (ZERO RISK)

2. **Fix team-utils.ts Anti-Pattern** - Replace string-interpolated SQL with parameterized queries (LOW RISK)

3. **RLS Policy Optimization** - Optimize 4 RLS policies from IN+subquery to EXISTS+JOIN pattern (MEDIUM RISK, OPTIONAL)

4. **Materialized Views** - Add aggregation views for dashboard queries (LOW RISK, OPTIONAL)

## Out of Scope

- Changing admin client usage patterns (current architecture is valid)
- Modifying `authenticateAndGetOrgContext()` authorization logic
- Touching 24+ other RLS policies that aren't performance bottlenecks
- Changing application-level security enforcement
- Database sharding or horizontal scaling
- Caching layer implementation (separate spec)

## Expected Deliverable

1. All composite indexes added via migration with `CREATE INDEX CONCURRENTLY`
2. `lib/team-utils.ts` refactored to use parameterized queries
3. (Optional) RLS policies optimized with EXISTS pattern
4. (Optional) Materialized views created for seat counting and aggregations
5. Comprehensive test suite validates unchanged behavior
6. Performance benchmarks show 50-90% improvement on key queries
7. Rollback procedures documented and tested
8. Production deployment with zero downtime
