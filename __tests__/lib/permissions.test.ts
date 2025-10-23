/**
 * Permission Utilities Test Suite
 *
 * Tests the permission utility functions and role-based access control logic
 */

import { describe, test, expect } from '@jest/globals'
import {
  UserRole,
  ROLE_PERMISSIONS,
  hasPermission,
  canEditResource,
  canViewResource,
  isAdmin,
  isManagerOrAdmin,
  isEmployee,
  getRolePermissions,
  isValidRole,
} from '@/lib/permissions'

describe('Permission Utilities', () => {
  describe('ROLE_PERMISSIONS matrix', () => {
    test('should have permissions defined for all roles', () => {
      expect(ROLE_PERMISSIONS.employee).toBeDefined()
      expect(ROLE_PERMISSIONS.manager).toBeDefined()
      expect(ROLE_PERMISSIONS.admin).toBeDefined()
    })

    test('employee should have limited permissions', () => {
      const employeePerms = ROLE_PERMISSIONS.employee
      expect(employeePerms.canViewDashboard).toBe(true)
      expect(employeePerms.canManageOwnLeave).toBe(true)
      expect(employeePerms.canViewTeam).toBe(false)
      expect(employeePerms.canEditTeam).toBe(false)
      expect(employeePerms.canAccessSettings).toBe(false)
      expect(employeePerms.canManageUsers).toBe(false)
    })

    test('manager should have READ-ONLY access to team and groups', () => {
      const managerPerms = ROLE_PERMISSIONS.manager
      expect(managerPerms.canViewTeam).toBe(true)
      expect(managerPerms.canEditTeam).toBe(false)
      expect(managerPerms.canViewGroups).toBe(true)
      expect(managerPerms.canEditGroups).toBe(false)
      expect(managerPerms.canManageLeaveRequests).toBe(true)
      expect(managerPerms.canAccessSettings).toBe(false)
    })

    test('admin should have full permissions', () => {
      const adminPerms = ROLE_PERMISSIONS.admin
      expect(adminPerms.canViewTeam).toBe(true)
      expect(adminPerms.canEditTeam).toBe(true)
      expect(adminPerms.canViewGroups).toBe(true)
      expect(adminPerms.canEditGroups).toBe(true)
      expect(adminPerms.canAccessSettings).toBe(true)
      expect(adminPerms.canManageUsers).toBe(true)
      expect(adminPerms.canManageAbsenceTypes).toBe(true)
    })
  })

  describe('hasPermission', () => {
    test('should return true for valid role and permission', () => {
      expect(hasPermission('admin', 'canEditTeam')).toBe(true)
      expect(hasPermission('manager', 'canViewTeam')).toBe(true)
      expect(hasPermission('employee', 'canViewDashboard')).toBe(true)
    })

    test('should return false for invalid role and permission', () => {
      expect(hasPermission('employee', 'canEditTeam')).toBe(false)
      expect(hasPermission('manager', 'canManageUsers')).toBe(false)
      expect(hasPermission('employee', 'canAccessSettings')).toBe(false)
    })

    test('should return false for null or undefined role', () => {
      expect(hasPermission(null, 'canEditTeam')).toBe(false)
      expect(hasPermission(undefined, 'canEditTeam')).toBe(false)
    })
  })

  describe('canEditResource', () => {
    test('should return true only for admin', () => {
      expect(canEditResource('admin')).toBe(true)
      expect(canEditResource('manager')).toBe(false)
      expect(canEditResource('employee')).toBe(false)
    })

    test('should return false for null or undefined role', () => {
      expect(canEditResource(null)).toBe(false)
      expect(canEditResource(undefined)).toBe(false)
    })
  })

  describe('canViewResource', () => {
    test('should allow manager and admin to view team', () => {
      expect(canViewResource('admin', 'team')).toBe(true)
      expect(canViewResource('manager', 'team')).toBe(true)
      expect(canViewResource('employee', 'team')).toBe(false)
    })

    test('should allow manager and admin to view groups', () => {
      expect(canViewResource('admin', 'groups')).toBe(true)
      expect(canViewResource('manager', 'groups')).toBe(true)
      expect(canViewResource('employee', 'groups')).toBe(false)
    })

    test('should return false for null or undefined role', () => {
      expect(canViewResource(null, 'team')).toBe(false)
      expect(canViewResource(undefined, 'groups')).toBe(false)
    })
  })

  describe('isAdmin', () => {
    test('should return true only for admin role', () => {
      expect(isAdmin('admin')).toBe(true)
      expect(isAdmin('manager')).toBe(false)
      expect(isAdmin('employee')).toBe(false)
      expect(isAdmin(null)).toBe(false)
    })
  })

  describe('isManagerOrAdmin', () => {
    test('should return true for manager and admin', () => {
      expect(isManagerOrAdmin('admin')).toBe(true)
      expect(isManagerOrAdmin('manager')).toBe(true)
      expect(isManagerOrAdmin('employee')).toBe(false)
      expect(isManagerOrAdmin(null)).toBe(false)
    })
  })

  describe('isEmployee', () => {
    test('should return true only for employee role', () => {
      expect(isEmployee('employee')).toBe(true)
      expect(isEmployee('manager')).toBe(false)
      expect(isEmployee('admin')).toBe(false)
      expect(isEmployee(null)).toBe(false)
    })
  })

  describe('getRolePermissions', () => {
    test('should return permissions object for valid role', () => {
      const adminPerms = getRolePermissions('admin')
      expect(adminPerms).toBeDefined()
      expect(adminPerms?.canEditTeam).toBe(true)

      const managerPerms = getRolePermissions('manager')
      expect(managerPerms).toBeDefined()
      expect(managerPerms?.canViewTeam).toBe(true)
      expect(managerPerms?.canEditTeam).toBe(false)
    })

    test('should return null for invalid role', () => {
      expect(getRolePermissions(null)).toBe(null)
      expect(getRolePermissions(undefined)).toBe(null)
    })
  })

  describe('isValidRole', () => {
    test('should return true for valid roles', () => {
      expect(isValidRole('admin')).toBe(true)
      expect(isValidRole('manager')).toBe(true)
      expect(isValidRole('employee')).toBe(true)
    })

    test('should return false for invalid roles', () => {
      expect(isValidRole('invalid')).toBe(false)
      expect(isValidRole('superadmin')).toBe(false)
      expect(isValidRole(null)).toBe(false)
      expect(isValidRole(undefined)).toBe(false)
      expect(isValidRole('')).toBe(false)
    })
  })

  describe('Permission consistency', () => {
    test('admin should have all permissions that manager has', () => {
      const adminPerms = ROLE_PERMISSIONS.admin
      const managerPerms = ROLE_PERMISSIONS.manager

      Object.keys(managerPerms).forEach((key) => {
        const permKey = key as keyof typeof managerPerms
        if (managerPerms[permKey] === true) {
          expect(adminPerms[permKey]).toBe(true)
        }
      })
    })

    test('manager should have all permissions that employee has', () => {
      const managerPerms = ROLE_PERMISSIONS.manager
      const employeePerms = ROLE_PERMISSIONS.employee

      // Basic permissions that employee has should be available to manager
      expect(managerPerms.canViewDashboard).toBe(employeePerms.canViewDashboard)
      expect(managerPerms.canViewCalendar).toBe(employeePerms.canViewCalendar)
      expect(managerPerms.canEditOwnProfile).toBe(employeePerms.canEditOwnProfile)
      expect(managerPerms.canManageOwnLeave).toBe(employeePerms.canManageOwnLeave)
    })
  })
})
