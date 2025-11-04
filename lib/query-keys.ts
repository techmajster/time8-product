/**
 * Centralized Query Keys for React Query
 *
 * This file exports all query key factories used across the application.
 * Centralizing query keys ensures consistency and makes cache invalidation easier.
 *
 * Pattern: Each domain has its own query key factory with hierarchical structure
 * Example: ['leaveRequests', 'list', { filters }] for filtered lists
 */

// Re-export all query key factories from individual hooks
export { leaveRequestKeys } from '@/hooks/useLeaveRequests'
export { holidayKeys } from '@/hooks/useHolidays'
export { dashboardKeys } from '@/hooks/use-dashboard-queries'
export { teamKeys } from '@/hooks/use-team-queries'
export { organizationKeys } from '@/hooks/useOrganization'

/**
 * Query Keys Documentation
 *
 * leaveRequestKeys:
 *   - all: ['leaveRequests']
 *   - lists(): ['leaveRequests', 'list']
 *   - list(filters): ['leaveRequests', 'list', { filters }]
 *   - calendar(startDate, endDate, teamMemberIds): ['calendar-leave-requests', startDate, endDate, teamMemberIds]
 *   - details(): ['leaveRequests', 'detail']
 *   - detail(id): ['leaveRequests', 'detail', id]
 *
 * holidayKeys:
 *   - all: ['holidays']
 *   - byOrg(orgId, country): ['holidays', orgId, country]
 *   - range(orgId, country, start, end): ['holidays', orgId, country, start, end]
 *
 * dashboardKeys:
 *   - leaveBalances(userId, year): ['dashboard-leave-balances', userId, year]
 *   - teamMembers(organizationId, teamMemberIds): ['dashboard-team-members', organizationId, teamMemberIds]
 *   - currentLeaveRequests(teamMemberIds, date): ['dashboard-current-leaves', teamMemberIds, date]
 *   - pendingRequests(teamMemberIds): ['dashboard-pending-requests', teamMemberIds]
 *
 * teamKeys:
 *   - members(organizationId, teamId?): ['team-members', organizationId, teamId]
 *   - leaveBalances(organizationId, year): ['team-leave-balances', organizationId, year]
 *
 * organizationKeys:
 *   - all: ['organizations']
 *   - details(): ['organizations', 'detail']
 *   - detail(id): ['organizations', 'detail', id]
 *   - members(id): ['organizations', 'detail', id, 'members']
 */

/**
 * Cache Invalidation Helpers
 *
 * Use these patterns when invalidating queries after mutations:
 *
 * @example
 * // Invalidate all leave requests
 * queryClient.invalidateQueries({ queryKey: leaveRequestKeys.lists() })
 *
 * @example
 * // Invalidate specific leave request
 * queryClient.invalidateQueries({ queryKey: leaveRequestKeys.detail(id) })
 *
 * @example
 * // Invalidate all dashboard queries
 * queryClient.invalidateQueries({ queryKey: ['dashboard-leave-balances'] })
 */
