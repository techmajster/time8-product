// Centralized event system for triggering data refetch operations

export const REFETCH_LEAVE_REQUESTS = 'refetch-leave-requests'
export const REFETCH_TEAM_MANAGEMENT = 'refetch-team-management'
export const REFETCH_SETTINGS = 'refetch-settings'

/**
 * Dispatches a custom refetch event to trigger data reload
 */
export function dispatchRefetchEvent(eventName: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(eventName))
  }
}

/**
 * Triggers refetch for leave requests page
 */
export function refetchLeaveRequests(): void {
  dispatchRefetchEvent(REFETCH_LEAVE_REQUESTS)
}

/**
 * Triggers refetch for team management page
 */
export function refetchTeamManagement(): void {
  dispatchRefetchEvent(REFETCH_TEAM_MANAGEMENT)
}

/**
 * Triggers refetch for settings pages (both admin and user)
 */
export function refetchSettings(): void {
  dispatchRefetchEvent(REFETCH_SETTINGS)
}
