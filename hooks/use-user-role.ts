'use client'

import { createContext, useContext } from 'react'
import { UserRole } from '@/lib/permissions'

/**
 * Context for user role information
 */
interface UserRoleContextType {
  role: UserRole | null
  userId: string | null
}

export const UserRoleContext = createContext<UserRoleContextType>({
  role: null,
  userId: null,
})

/**
 * Hook to access the current user's role
 * Returns the user's role from the context
 *
 * @returns UserRole | null - The current user's role or null if not authenticated
 *
 * @example
 * ```tsx
 * const role = useUserRole()
 * if (role === 'admin') {
 *   // Show admin features
 * }
 * ```
 */
export function useUserRole(): UserRole | null {
  const context = useContext(UserRoleContext)
  return context.role
}

/**
 * Hook to access both user ID and role
 *
 * @returns { role, userId } - User role and ID
 *
 * @example
 * ```tsx
 * const { role, userId } = useUserRoleContext()
 * ```
 */
export function useUserRoleContext(): UserRoleContextType {
  return useContext(UserRoleContext)
}
