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
  
  // Define child-specific and conditional leave types that should be hidden
  // if user doesn't have access to them (regardless of balance tracking)
  const conditionalLeaveTypes = [
    'Urlop macierzyński',      // Maternity - only for pregnant employees
    'Urlop ojcowski',          // Paternity - only for employees with children
    'Dni wolne wychowawcze',   // Childcare days - only for employees with children under 14
    'Urlop rodzicielski',      // Parental - only for employees with children
    'Urlop szkoleniowy',       // Training - only when applicable
    'Urlop rehabilitacyjny',   // Rehabilitation - only for disabled employees
    'Urlop na poszukiwanie pracy' // Job search - only when terminated
  ]
  
  return orgLeaveTypes.filter(leaveType => {
    // For conditional leave types, check if user has them assigned via balance
    if (conditionalLeaveTypes.includes(leaveType.name)) {
      // Find the user's balance for this leave type
      const balance = leaveBalances.find(b => b.leave_type_id === leaveType.id)
      
      // If no balance exists or user has 0 entitled days, don't show it
      if (!balance || balance.entitled_days === 0) {
        return false
      }
    }
    
    // For regular leave types that require balance tracking, check entitled days
    if (leaveType.requires_balance && !conditionalLeaveTypes.includes(leaveType.name)) {
      const balance = leaveBalances.find(b => b.leave_type_id === leaveType.id)
      
      // If no balance exists, don't show it (shouldn't happen with proper setup)
      if (!balance) {
        return false
      }
      
      // Only show if user has entitled days (> 0)
      return balance.entitled_days > 0
    }
    
    // Show all other leave types (general purpose ones like unpaid leave, circumstantial leave)
    return true
  })
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

export function hasAvailableBalance(_organizationId: string, leaveTypeId: string, requestedDays: number, leaveBalances: LeaveBalance[]): { hasBalance: boolean; availableDays?: number } {
  const balance = leaveBalances.find(b => b.leave_type_id === leaveTypeId)
  
  if (!balance) {
    // If no balance exists, it means it's unlimited (like sick leave, unpaid leave)
    return { hasBalance: true }
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
        availableDays: actualAvailable
      }
    }
  }
  
  return {
    hasBalance: availableDays >= requestedDays,
    availableDays
  }
}

export function formatValidationErrors(validationResult: { isValid: boolean; error?: string }): string[] {
  if (validationResult.isValid) {
    return []
  }
  return validationResult.error ? [validationResult.error] : ['Wystąpił błąd walidacji']
} 