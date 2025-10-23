/**
 * Permission system for three-tier role-based access control
 * Supports: employee, manager, admin roles
 */

export type UserRole = 'admin' | 'manager' | 'employee'

export interface RolePermissions {
  canViewDashboard: boolean
  canViewCalendar: boolean
  canEditOwnProfile: boolean
  canManageOwnLeave: boolean
  canViewTeam: boolean
  canEditTeam: boolean
  canViewGroups: boolean
  canEditGroups: boolean
  canManageLeaveRequests: boolean
  canCreateLeaveForTeam: boolean
  canAccessSettings: boolean
  canManageUsers: boolean
  canManageAbsenceTypes: boolean
}

/**
 * Permission matrix for each role
 */
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  employee: {
    canViewDashboard: true,
    canViewCalendar: true,
    canEditOwnProfile: true,
    canManageOwnLeave: true,
    canViewTeam: false,
    canEditTeam: false,
    canViewGroups: false,
    canEditGroups: false,
    canManageLeaveRequests: false,
    canCreateLeaveForTeam: false,
    canAccessSettings: false,
    canManageUsers: false,
    canManageAbsenceTypes: false,
  },
  manager: {
    canViewDashboard: true,
    canViewCalendar: true,
    canEditOwnProfile: true,
    canManageOwnLeave: true,
    canViewTeam: true,
    canEditTeam: false,
    canViewGroups: true,
    canEditGroups: false,
    canManageLeaveRequests: true,
    canCreateLeaveForTeam: true,
    canAccessSettings: false,
    canManageUsers: false,
    canManageAbsenceTypes: false,
  },
  admin: {
    canViewDashboard: true,
    canViewCalendar: true,
    canEditOwnProfile: true,
    canManageOwnLeave: true,
    canViewTeam: true,
    canEditTeam: true,
    canViewGroups: true,
    canEditGroups: true,
    canManageLeaveRequests: true,
    canCreateLeaveForTeam: true,
    canAccessSettings: true,
    canManageUsers: true,
    canManageAbsenceTypes: true,
  },
}

/**
 * Check if a user role has a specific permission
 */
export function hasPermission(
  role: UserRole | null | undefined,
  permission: keyof RolePermissions
): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role]?.[permission] ?? false
}

/**
 * Check if user can edit a resource (admin only)
 */
export function canEditResource(role: UserRole | null | undefined): boolean {
  return role === 'admin'
}

/**
 * Check if user can view a resource (manager or admin)
 */
export function canViewResource(
  role: UserRole | null | undefined,
  resource: 'team' | 'groups'
): boolean {
  if (!role) return false

  if (resource === 'team') {
    return hasPermission(role, 'canViewTeam')
  }
  if (resource === 'groups') {
    return hasPermission(role, 'canViewGroups')
  }
  return false
}

/**
 * Check if user is admin
 */
export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === 'admin'
}

/**
 * Check if user is manager or admin
 */
export function isManagerOrAdmin(role: UserRole | null | undefined): boolean {
  return role === 'manager' || role === 'admin'
}

/**
 * Check if user is employee only
 */
export function isEmployee(role: UserRole | null | undefined): boolean {
  return role === 'employee'
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole | null | undefined): RolePermissions | null {
  if (!role) return null
  return ROLE_PERMISSIONS[role] ?? null
}

/**
 * Validate if a role value is valid
 */
export function isValidRole(role: string | null | undefined): role is UserRole {
  if (!role) return false
  return role === 'admin' || role === 'manager' || role === 'employee'
}
