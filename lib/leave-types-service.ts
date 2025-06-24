import { createClient } from '@/lib/supabase/server'
import { getOrSetCache, cacheKeys, cacheTTL } from '@/lib/cache-utils'

export interface LeaveType {
  id: string
  organization_id: string
  name: string
  days_per_year: number
  color: string
  requires_approval: boolean
  requires_balance: boolean
  leave_category: string
  created_at: string
  updated_at: string
}

/**
 * Get leave types for an organization with caching
 */
export async function getLeaveTypes(organizationId: string): Promise<LeaveType[]> {
  const cacheKey = cacheKeys.leaveTypes(organizationId)
  
  return getOrSetCache(
    cacheKey,
    async () => {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('leave_types')
        .select('id, name, color, leave_category, requires_balance, days_per_year, organization_id, created_at, requires_approval, updated_at')
        .eq('organization_id', organizationId)
        .order('name')

      if (error) {
        throw new Error(`Failed to fetch leave types: ${error.message}`)
      }

      return data || []
    },
    cacheTTL.leaveTypes
  )
}

/**
 * Get specific leave type by ID with caching
 */
export async function getLeaveType(organizationId: string, leaveTypeId: string): Promise<LeaveType | null> {
  const leaveTypes = await getLeaveTypes(organizationId)
  return leaveTypes.find(type => type.id === leaveTypeId) || null
}

/**
 * Invalidate leave types cache when data changes
 */
export function invalidateLeaveTypesCache(organizationId: string): void {
  const { cache, cacheKeys } = require('@/lib/cache-utils')
  cache.delete(cacheKeys.leaveTypes(organizationId))
}

/**
 * Get leave types that require balance tracking
 */
export async function getBalanceRequiredLeaveTypes(organizationId: string): Promise<LeaveType[]> {
  const leaveTypes = await getLeaveTypes(organizationId)
  return leaveTypes.filter(type => type.requires_balance)
}

/**
 * Get leave types by category
 */
export async function getLeaveTypesByCategory(organizationId: string, category: string): Promise<LeaveType[]> {
  const leaveTypes = await getLeaveTypes(organizationId)
  return leaveTypes.filter(type => type.leave_category === category)
} 