import { UserProfile, LeaveType, LeaveBalance, LeaveRequest } from '@/types/leave'

// Leave balance configuration - which types require balances vs. no limit
export const BALANCE_REQUIRED_TYPES = [
  'Urlop wypoczynkowy',
  'Urlop rodzicielski'
] as const

// Validation functions
export function validateLeaveRequest(
  startDate: Date,
  endDate: Date,
  leaveTypeId: string,
  leaveTypes: LeaveType[],
  leaveBalances: LeaveBalance[],
  existingRequests: LeaveRequest[] = []
): { isValid: boolean; error?: string } {
  // Basic date validation
  if (startDate >= endDate) {
    return { isValid: false, error: 'Data zakończenia musi być późniejsza niż data rozpoczęcia.' }
  }

  if (startDate < new Date()) {
    return { isValid: false, error: 'Nie można wnioskować o urlop wstecz.' }
  }

  // Get leave type
  const leaveType = leaveTypes.find(lt => lt.id === leaveTypeId)
  if (!leaveType) {
    return { isValid: false, error: 'Nieprawidłowy typ urlopu.' }
  }

  // Check for overlapping requests
  const hasOverlap = existingRequests.some(req => {
    if (req.status === 'cancelled' || req.status === 'rejected') return false
    return (startDate <= new Date(req.end_date)) && (endDate >= new Date(req.start_date))
  })

  if (hasOverlap) {
    return { isValid: false, error: 'Istnieje już wniosek urlopowy w tym okresie.' }
  }

  return { isValid: true }
}

export function getApplicableLeaveTypes(
  _userProfile: UserProfile,
  leaveTypes: LeaveType[],
  leaveBalances: LeaveBalance[],
  organizationId: string,
  _leaveType?: LeaveType
): LeaveType[] {
  // Filter leave types by organization first
  const orgLeaveTypes = leaveTypes.filter(lt => lt.organization_id === organizationId)
  
  // Define conditional leave types that should be hidden if user has no entitlement (entitled_days = 0)
  // These are truly conditional - only hide if user has NO entitlement at all
  const conditionalLeaveTypes = [
    'Urlop macierzyński',      // Maternity - only for pregnant employees
    'Urlop ojcowski',          // Paternity - only for employees with children
    'Dni wolne wychowawcze',   // Childcare days - only for employees with children under 14
    'Urlop rodzicielski',      // Parental - only for employees with children
    // NOTE: "Urlop na poszukiwanie pracy" removed - should be visible but disabled when remaining_days = 0
  ]
  
  return orgLeaveTypes.filter(leaveType => {
    // For conditional leave types, check if user has them assigned via balance
    if (conditionalLeaveTypes.includes(leaveType.name)) {
      const balance = leaveBalances.find(lb => lb.leave_type_id === leaveType.id)
      // Hide only if user has absolutely no entitlement (entitled_days = 0)
      return balance && balance.entitled_days > 0
    }
    
    // Show all other leave types (they'll be disabled via isLeaveTypeDisabled if needed)
    return true
  })
}

/**
 * Checks if a leave type should be disabled in the UI
 *
 * Mandatory Absence Types (Phase 2) logic:
 * - Urlop wypoczynkowy: requires balance tracking, check remaining_days
 * - Urlop bezpłatny: unlimited (requires_balance = false), never disabled
 *
 * @param leaveType - The leave type to check
 * @param leaveBalance - The employee's balance for this leave type (may be undefined for unlimited types)
 * @param requestedDays - Number of days being requested
 * @returns Object with disabled state and optional reason message
 */
export function isLeaveTypeDisabled(
  leaveType: LeaveType,
  leaveBalance: LeaveBalance | undefined,
  requestedDays: number = 1
): { disabled: boolean; reason?: string } {
  // FIRST: Check if this leave type requires balance tracking
  // Unlimited leave types (like Urlop bezpłatny with requires_balance = false) are NEVER disabled
  if (!leaveType.requires_balance) {
    return { disabled: false }
  }

  // For balance-required types, check if there's a balance record
  if (leaveBalance) {
    // If insufficient remaining days, disable it
    if (leaveBalance.remaining_days < requestedDays) {
      // Only show error message for negative balances, not zero balances
      const errorMessage = leaveBalance.remaining_days < 0
        ? `Niewystarczające saldo (pozostało ${leaveBalance.remaining_days} dni)`
        : undefined
      return {
        disabled: true,
        reason: errorMessage
      }
    }
    return { disabled: false }
  }

  // If leave type requires balance tracking but no balance exists, disable it
  if (leaveType.requires_balance && !leaveBalance) {
    return { disabled: true, reason: 'Brak przypisanego salda' }
  }

  // Fallback: never disable
  return { disabled: false }
}

export function calculateWorkingDays(startDate: Date, endDate: Date): number {
  let count = 0
  const current = new Date(startDate)
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      count++
    }
    current.setDate(current.getDate() + 1)
  }
  
  return count
}

export function hasAvailableBalance(_organizationId: string, leaveTypeId: string, requestedDays: number, leaveBalances: LeaveBalance[]): { hasBalance: boolean; availableDays?: number; is_unlimited?: boolean } {
  const balance = leaveBalances.find(b => b.leave_type_id === leaveTypeId)

  if (!balance) {
    // If no balance exists, it means it's unlimited (like sick leave, unpaid leave)
    return { hasBalance: true, is_unlimited: true }
  }

  // Check if this leave type requires balance tracking
  // If requires_balance is false (like Urlop bezpłatny), it's unlimited
  if (balance.leave_types && balance.leave_types.requires_balance === false) {
    return { hasBalance: true, is_unlimited: true }
  }

  // Use remaining_days directly from the database (it's calculated as entitled_days - used_days)
  const availableDays = balance.remaining_days

  // Special case for "Urlop na żądanie" - also check "Urlop wypoczynkowy" balance
  // since on-demand leave is part of vacation leave in Polish law
  if (balance.leave_types?.name === 'Urlop na żądanie') {
    const vacationBalance = leaveBalances.find(b => b.leave_types?.name === 'Urlop wypoczynkowy')
    if (vacationBalance) {
      // Calculate remaining annual limit for "Urlop na żądanie" (max 4 days per year)
      const annualLimit = 4
      const usedThisYear = Math.min(balance.used_days, annualLimit)
      const remainingAnnual = annualLimit - usedThisYear

      // Can only take on-demand leave if both annual limit and vacation balance allow it
      const actualAvailable = Math.min(remainingAnnual, vacationBalance.remaining_days)
      return {
        hasBalance: actualAvailable >= requestedDays,
        availableDays: actualAvailable,
        is_unlimited: false
      }
    }
  }

  return {
    hasBalance: availableDays >= requestedDays,
    availableDays,
    is_unlimited: false
  }
}

export function formatValidationErrors(validationResult: { isValid: boolean; error?: string }): string[] {
  if (validationResult.isValid) {
    return []
  }
  return validationResult.error ? [validationResult.error] : ['Wystąpił błąd walidacji']
} 