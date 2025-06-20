// Polish Labor Law Leave Types and Business Rules

export interface LeaveType {
  id: string
  name: string
  color: string
  days_per_year: number
  organization_id: string
  // Business rules
  is_paid: boolean
  requires_balance: boolean // Whether this leave type requires a configured balance
  min_days_per_request?: number
  max_days_per_request?: number
  advance_notice_days?: number // Minimum days notice required
  max_consecutive_days?: number
  requires_approval: boolean
  can_be_split: boolean // Can be taken in multiple periods
  carry_over_allowed?: boolean
  leave_category: LeaveCategory
  special_rules?: LeaveSpecialRules
  description?: string
  created_at: string
  updated_at: string
}

export enum LeaveCategory {
  ANNUAL = 'annual', // Urlop wypoczynkowy
  ON_DEMAND = 'on_demand', // Urlop na żądanie  
  SPECIAL = 'special', // Urlop okolicznościowy
  UNPAID = 'unpaid', // Urlop bezpłatny
  PARENTAL = 'parental', // Urlop rodzicielski (covers maternity, paternity, parental, childcare)
  CARE = 'care', // Urlop opiekuńczy
  FORCE_MAJEURE = 'force_majeure' // Urlop siły wyższej
}

export interface LeaveSpecialRules {
  // For paternity leave - calculated per child
  per_child_multiplier?: boolean
  
  // For annual leave - different allocations based on seniority
  seniority_based_allocation?: {
    under_10_years: number // 20 days
    over_10_years: number  // 26 days
  }
  
  // For special leave - specific reasons and days
  special_occasions?: Array<{
    reason: string
    days_granted: number
    description: string
  }>
  
  // For on-demand leave
  annual_limit?: number // 4 days per year
  
  // For force majeure
  requires_immediate_notice?: boolean
  max_days_without_documentation?: number
}

export interface LeaveBalance {
  id: string
  user_id: string
  leave_type_id: string
  year: number
  total_days: number
  used_days: number
  remaining_days: number
  carry_over_days?: number
  organization_id: string
  leave_types?: {
    id: string
    name: string
    color: string
    leave_category: LeaveCategory
  }
  profiles?: {
    id: string
    full_name: string | null
    email: string
    role: string
  }
  created_at: string
  updated_at: string
}

export interface LeaveRequest {
  id: string
  user_id: string
  leave_type_id: string
  start_date: string
  end_date: string
  days_requested: number
  reason?: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  reviewed_by?: string
  reviewed_at?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
  leave_types?: {
    id: string
    name: string
    color: string
    days_per_year: number
    leave_category: LeaveCategory
  } | null
  profiles?: {
    id: string
    full_name: string | null
    email: string
    role: string
  }
}

// Polish labor law predefined leave types
export const POLISH_LEAVE_TYPES = {
  ANNUAL: {
    name: 'Urlop wypoczynkowy',
    color: 'hsl(var(--info))',
    is_paid: true,
    requires_balance: true,
    min_days_per_request: 1,
    advance_notice_days: 14,
    requires_approval: true,
    can_be_split: true,
    carry_over_allowed: true,
    leave_category: LeaveCategory.ANNUAL,
    special_rules: {
      seniority_based_allocation: {
        under_10_years: 20,
        over_10_years: 26
      }
    }
  },
  
  ON_DEMAND: {
    name: 'Urlop na żądanie',
    color: 'hsl(var(--success))',
    is_paid: true,
    requires_balance: true,
    min_days_per_request: 1,
    max_days_per_request: 1, // Max 1 day per request
    advance_notice_days: 0, // Can be taken same day
    requires_approval: false, // Employee right
    can_be_split: true,
    carry_over_allowed: false,
    leave_category: LeaveCategory.ON_DEMAND,
    special_rules: {
      annual_limit: 4 // Max 4 days per year
    }
  },
  
  SPECIAL: {
    name: 'Urlop okolicznościowy',
    color: 'hsl(var(--success))',
    is_paid: true,
    requires_balance: false, // Granted based on circumstances
    requires_approval: true,
    can_be_split: false,
    carry_over_allowed: false,
    leave_category: LeaveCategory.SPECIAL,
    special_rules: {
      special_occasions: [
        { reason: 'Własny ślub', days_granted: 2, description: 'Marriage of employee' },
        { reason: 'Śmierć małżonka', days_granted: 2, description: 'Death of spouse' },
        { reason: 'Śmierć dziecka', days_granted: 2, description: 'Death of child' },
        { reason: 'Śmierć rodzica', days_granted: 2, description: 'Death of parent' },
        { reason: 'Ślub dziecka', days_granted: 1, description: 'Marriage of child' },
        { reason: 'Poród żony', days_granted: 2, description: 'Birth of child (father)' }
      ]
    }
  },
  
  UNPAID: {
    name: 'Urlop bezpłatny',
    color: 'hsl(var(--warning))',
    is_paid: false,
    requires_balance: false,
    requires_approval: true,
    can_be_split: true,
    carry_over_allowed: false,
    leave_category: LeaveCategory.UNPAID
  },
  
  PARENTAL: {
    name: 'Urlop rodzicielski',
    color: 'hsl(var(--primary))',
    is_paid: true,
    requires_balance: true,
    requires_approval: true,
    can_be_split: true,
    carry_over_allowed: false,
    leave_category: LeaveCategory.PARENTAL,
    special_rules: {
      per_child_multiplier: true
    }
  },
  
  CARE: {
    name: 'Urlop opiekuńczy',
    color: 'hsl(var(--muted))',
    is_paid: false,
    requires_balance: false,
    requires_approval: true,
    can_be_split: true,
    carry_over_allowed: false,
    leave_category: LeaveCategory.CARE
  },
  
  FORCE_MAJEURE: {
    name: 'Urlop siły wyższej',
    color: 'hsl(var(--destructive))',
    is_paid: true,
    requires_balance: false,
    requires_approval: true,
    can_be_split: false,
    carry_over_allowed: false,
    leave_category: LeaveCategory.FORCE_MAJEURE,
    special_rules: {
      requires_immediate_notice: true,
      max_days_without_documentation: 3
    }
  }
}

// Validation rules and helpers
export interface LeaveValidationRule {
  check: (request: Partial<LeaveRequest>, balance?: LeaveBalance) => boolean
  message: string
  severity: 'error' | 'warning'
}

export interface LeaveValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// Additional interfaces for the app
export interface UserProfile {
  id: string
  full_name: string | null
  email: string
  role: string
  employment_start_date?: string | null
  organization_id: string
}

export interface Holiday {
  id: string
  organization_id?: string | null
  name: string
  date: string
  holiday_type: 'national' | 'organization' | 'regional'
  is_recurring: boolean
  is_work_day: boolean
  description?: string | null
  created_at: string
  updated_at: string
}

export interface UpcomingHoliday extends Holiday {
  organization_name?: string | null
  day_of_week: number
  days_until: number
}

export interface HolidayWithDisplay extends Holiday {
  type_display: string
  formatted_date: string
}

export interface Organization {
  id: string
  name: string
  created_at: string
  updated_at: string
  google_domain?: string
}

export interface Profile {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'manager' | 'employee'
  organization_id: string
  employment_start_date?: string
  phone?: string
  department?: string
  manager_id?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Invitation {
  id: string
  organization_id: string
  email: string
  role: 'admin' | 'manager' | 'employee'
  status: 'pending' | 'accepted' | 'expired'
  invited_by: string
  expires_at: string
  created_at: string
  updated_at: string
  invitation_code?: string
}

// Default leave types for new organizations
export const DEFAULT_LEAVE_TYPES = [
  {
    name: 'Urlop wypoczynkowy',
    days_per_year: 21,
    color: 'hsl(var(--info))',
    requires_approval: true,
    leave_category: 'vacation' as const,
    description: 'Standardowy urlop wypoczynkowy',
    requires_balance: true
  },
  {
    name: 'Zwolnienie lekarskie',
    days_per_year: 30,
    color: 'hsl(var(--destructive))',
    requires_approval: false,
    leave_category: 'sick' as const,
    description: 'Zwolnienie lekarskie',
    requires_balance: false
  },
  {
    name: 'Urlop okolicznościowy',
    days_per_year: 4,
    color: 'hsl(var(--success))',
    requires_approval: true,
    leave_category: 'personal' as const,
    description: 'Urlop z powodów rodzinnych',
    requires_balance: true
  },
  {
    name: 'Urlop macierzyński',
    days_per_year: 365,
    color: 'hsl(var(--primary))',
    requires_approval: true,
    leave_category: 'maternity' as const,
    description: 'Urlop macierzyński',
    requires_balance: false
  },
  {
    name: 'Urlop bezpłatny',
    days_per_year: 30,
    color: 'hsl(var(--warning))',
    requires_approval: true,
    leave_category: 'other' as const,
    description: 'Urlop bezpłatny',
    requires_balance: false
  }
] 