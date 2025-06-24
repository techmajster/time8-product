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
  ANNUAL = 'annual',          // Urlop wypoczynkowy, na żądanie
  MATERNITY = 'maternity',    // Urlop macierzyński
  PATERNITY = 'paternity',    // Urlop ojcowski
  PARENTAL = 'parental',      // Urlop rodzicielski
  CHILDCARE = 'childcare',    // Dni wolne wychowawcze
  UNPAID = 'unpaid',          // Urlop bezpłatny
  CARE = 'care',              // Urlop opiekuńczy
  SPECIAL = 'special',        // Urlop okolicznościowy, na poszukiwanie pracy
  TRAINING = 'training',      // Urlop szkoleniowy
  MEDICAL = 'medical',        // Urlop rehabilitacyjny
  EMERGENCY = 'emergency'     // Zwolnienie z powodu siły wyższej
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
  entitled_days: number
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
    leave_category: LeaveCategory.ANNUAL,
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
    leave_category: LeaveCategory.EMERGENCY,
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

// Default leave types for new organizations based on Polish Labor Law
export const DEFAULT_LEAVE_TYPES = [
  // Basic vacation leave - varies by seniority
  {
    name: 'Urlop wypoczynkowy',
    days_per_year: 20, // Default for <10 years seniority, can be adjusted to 26
    color: '#3B82F6',
    requires_approval: true,
    requires_balance: true,
    is_paid: true,
    leave_category: 'annual',
    description: '20 dni (mniej niż 10 lat stażu) lub 26 dni (co najmniej 10 lat stażu)'
  },
  // On-demand leave - part of vacation leave
  {
    name: 'Urlop na żądanie',
    days_per_year: 4, // 4 days annually (part of vacation leave)
    color: '#10B981',
    requires_approval: false,
    requires_balance: true,
    is_paid: true,
    leave_category: 'annual',
    description: '4 dni rocznie (część urlopu wypoczynkowego)'
  },
  // Unpaid leave
  {
    name: 'Urlop bezpłatny',
    days_per_year: 0, // No limit
    color: '#F59E0B',
    requires_approval: true,
    requires_balance: false,
    is_paid: false,
    leave_category: 'unpaid',
    description: '1 dzień do ∞, brak wynagrodzenia'
  },
  // Maternity leave
  {
    name: 'Urlop macierzyński',
    days_per_year: 0, // 0 by default - assigned per user when they become pregnant
    color: '#EC4899',
    requires_approval: true,
    requires_balance: true,
    is_paid: true,
    leave_category: 'maternity',
    description: '20 tygodni (140 dni) na dziecko, 100% z ZUS'
  },
  // Paternity leave
  {
    name: 'Urlop ojcowski',
    days_per_year: 0, // 0 by default - assigned per user when they have children
    color: '#8B5CF6',
    requires_approval: true,
    requires_balance: true,
    is_paid: true,
    leave_category: 'paternity',
    description: '14 dni kalendarzowych na dziecko, 100% z ZUS'
  },
  // Parental leave
  {
    name: 'Urlop rodzicielski',
    days_per_year: 0, // Calculated in weeks (41-43 weeks)
    color: '#06B6D4',
    requires_approval: true,
    requires_balance: false,
    is_paid: true,
    leave_category: 'parental',
    description: '41 lub 43 tygodnie, 70% lub 81.5% z ZUS'
  },
  // Free childcare days
  {
    name: 'Dni wolne wychowawcze',
    days_per_year: 0, // 0 by default - assigned per user when they have children under 14
    color: '#A3A3A3',
    requires_approval: true,
    requires_balance: true,
    is_paid: true,
    leave_category: 'childcare',
    description: '2 dni (16 godzin) rocznie na dziecko do 14 lat, 100%'
  },
  // Circumstantial leave
  {
    name: 'Urlop okolicznościowy',
    days_per_year: 0, // 1-2 days when conditions are met
    color: '#10B981',
    requires_approval: true,
    requires_balance: false,
    is_paid: true,
    leave_category: 'special',
    description: '1 lub 2 dni, 100%, gdy spełnione warunki'
  },
  // Care leave
  {
    name: 'Urlop opiekuńczy',
    days_per_year: 5, // 0 by default - assigned per user when they have dependents
    color: '#F97316',
    requires_approval: true,
    requires_balance: true,
    is_paid: false,
    leave_category: 'care',
    description: '5 dni rocznie na opiekę nad bliskimi, brak wynagrodzenia'
  },
  // Training leave
  {
    name: 'Urlop szkoleniowy',
    days_per_year: 0, // 6 or 21 days when applicable
    color: '#6366F1',
    requires_approval: true,
    requires_balance: false,
    is_paid: true,
    leave_category: 'training',
    description: '6 lub 21 dni, 100%, dla podnoszących kwalifikacje'
  },
  // Rehabilitation leave
  {
    name: 'Urlop rehabilitacyjny',
    days_per_year: 0, // 10 additional days + 21 days for rehabilitation
    color: '#059669',
    requires_approval: true,
    requires_balance: false,
    is_paid: true,
    leave_category: 'medical',
    description: '10 dni dodatkowych + 21 dni na turnus, 100%'
  },
  // Job search leave
  {
    name: 'Urlop na poszukiwanie pracy',
    days_per_year: 0, // 2-3 days when terminated
    color: '#DC2626',
    requires_approval: false,
    requires_balance: false,
    is_paid: true,
    leave_category: 'special',
    description: '2-3 dni przy wypowiedzeniu, 100%'
  },
  // Force majeure leave
  {
    name: 'Zwolnienie z powodu siły wyższej',
    days_per_year: 2, // 2 days (16 hours) annually
    color: '#EF4444',
    requires_approval: false,
    requires_balance: true,
    is_paid: true,
    leave_category: 'emergency',
    description: '2 dni (16 godzin) rocznie, 50%'
  }
] 