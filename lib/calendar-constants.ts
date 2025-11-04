/**
 * Calendar component constants
 * Centralized constants for magic numbers and configuration values
 */

// Calendar grid configuration
export const CALENDAR_GRID_SIZE = 42 // 6 weeks × 7 days
export const DAYS_PER_WEEK = 7
export const WEEKS_IN_GRID = 6

// Day cell dimensions (in Tailwind units)
export const DAY_CELL_HEIGHT = 24 // h-24 = 96px
export const DAY_HEADER_HEIGHT = 8 // h-8 = 32px
export const MONTH_NAV_HEIGHT = 8 // h-8 = 32px

// Avatar configuration
export const AVATAR_SIZE = 8 // w-8 h-8 = 32px
export const AVATAR_OVERLAP_MARGIN = -8 // mb-[-8px] for stacked avatars
export const MAX_VISIBLE_AVATARS = 2 // Show first 2 avatars, rest in "+N" badge

// React Query cache durations (in milliseconds)
export const LEAVE_REQUESTS_STALE_TIME = 1000 * 30 // 30 seconds
export const HOLIDAYS_STALE_TIME = 1000 * 60 * 30 // 30 minutes
export const HOLIDAYS_GC_TIME = 1000 * 60 * 60 // 1 hour

// Toast notification durations (in milliseconds)
export const ERROR_TOAST_DURATION = 3000 // 3 seconds

// Day names in Polish (lowercase for comparison)
export const DAY_NAMES_LOWERCASE = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const

// Default working days (Monday-Friday)
export const DEFAULT_WORKING_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
] as const

// Leave type names (for background determination)
export const LEAVE_TYPE_NAMES = {
  VACATION: 'Urlop wypoczynkowy',
  SICK_LEAVE: 'Zwolnienie lekarskie',
} as const

// User leave status types (for background styling)
export const USER_LEAVE_STATUS = {
  DEFAULT: 'default',
  VACATION: 'vacation',
  SICK_LEAVE: 'sick-leave',
} as const

// Day status types
export const DAY_STATUS_TYPES = {
  WORKING: 'working',
  LEAVE: 'leave',
  WEEKEND: 'weekend',
  HOLIDAY: 'holiday',
} as const

// Holiday types
export const HOLIDAY_TYPES = {
  NATIONAL: 'national',
  COMPANY: 'company',
} as const
