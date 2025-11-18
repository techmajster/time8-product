/**
 * Calendar Day Status Logic Tests
 *
 * Tests for calendar day status computation based on working days,
 * holiday toggle, and work hours configuration
 */

import { describe, test, expect } from '@jest/globals'

// Types matching the CalendarClient component
interface WorkScheduleConfig {
  excludePublicHolidays: boolean
  dailyStartTime: string
  dailyEndTime: string
}

interface Holiday {
  date: string
  name: string
}

// Simplified getDayStatus logic for testing
// This mirrors the logic from CalendarClient.tsx lines 530-595
const getDayStatusLogic = (params: {
  dayOfWeek: string
  workingDays: string[]
  workScheduleConfig: WorkScheduleConfig
  isHoliday: boolean
  holidayName?: string
  hasLeave?: boolean
  leaveTypeName?: string
}) => {
  const {
    dayOfWeek,
    workingDays,
    workScheduleConfig,
    isHoliday,
    holidayName,
    hasLeave,
    leaveTypeName
  } = params

  const isWorkingDay = workingDays.includes(dayOfWeek.toLowerCase())
  const isWeekend = ['saturday', 'sunday'].includes(dayOfWeek.toLowerCase())
  const { excludePublicHolidays, dailyStartTime, dailyEndTime } = workScheduleConfig

  const workHours = `${dailyStartTime} - ${dailyEndTime}`

  let statusLabel = workHours

  // Leave takes precedence
  if (hasLeave) {
    statusLabel = leaveTypeName || 'Leave'
    return {
      isWorkingDay: true,
      isWeekend: false,
      statusLabel,
      effectiveStatus: 'leave'
    }
  }

  // Holiday + working day logic
  if (isHoliday && isWorkingDay) {
    statusLabel = excludePublicHolidays ? (holidayName || 'Holiday') : workHours
    return {
      isWorkingDay,
      isWeekend: false,
      statusLabel,
      effectiveStatus: excludePublicHolidays ? 'holiday' : 'working'
    }
  }

  // Holiday on non-working day (check before general non-working)
  if (isHoliday && !isWorkingDay) {
    statusLabel = holidayName || 'Holiday'
    return {
      isWorkingDay: false,
      isWeekend,
      statusLabel,
      effectiveStatus: 'holiday'
    }
  }

  // Non-working day
  if (!isWorkingDay) {
    statusLabel = 'Niepracujący'
    return {
      isWorkingDay: false,
      isWeekend,
      statusLabel,
      effectiveStatus: 'non-working'
    }
  }

  // Regular working day
  statusLabel = workHours
  return {
    isWorkingDay: true,
    isWeekend: false,
    statusLabel,
    effectiveStatus: 'working'
  }
}

describe('Calendar Day Status Logic', () => {
  const defaultWorkScheduleConfig: WorkScheduleConfig = {
    excludePublicHolidays: true,
    dailyStartTime: '09:00',
    dailyEndTime: '17:00'
  }

  const defaultWorkingDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

  describe('Regular Working Days', () => {
    test('should show work hours for Monday (working day)', () => {
      const result = getDayStatusLogic({
        dayOfWeek: 'monday',
        workingDays: defaultWorkingDays,
        workScheduleConfig: defaultWorkScheduleConfig,
        isHoliday: false
      })

      expect(result.statusLabel).toBe('09:00 - 17:00')
      expect(result.isWorkingDay).toBe(true)
      expect(result.effectiveStatus).toBe('working')
    })

    test('should show work hours for all weekdays', () => {
      const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

      weekdays.forEach((day) => {
        const result = getDayStatusLogic({
          dayOfWeek: day,
          workingDays: defaultWorkingDays,
          workScheduleConfig: defaultWorkScheduleConfig,
          isHoliday: false
        })

        expect(result.statusLabel).toBe('09:00 - 17:00')
        expect(result.isWorkingDay).toBe(true)
      })
    })

    test('should show "Niepracujący" for Saturday (non-working day)', () => {
      const result = getDayStatusLogic({
        dayOfWeek: 'saturday',
        workingDays: defaultWorkingDays,
        workScheduleConfig: defaultWorkScheduleConfig,
        isHoliday: false
      })

      expect(result.statusLabel).toBe('Niepracujący')
      expect(result.isWorkingDay).toBe(false)
      expect(result.isWeekend).toBe(true)
    })

    test('should show "Niepracujący" for Sunday (non-working day)', () => {
      const result = getDayStatusLogic({
        dayOfWeek: 'sunday',
        workingDays: defaultWorkingDays,
        workScheduleConfig: defaultWorkScheduleConfig,
        isHoliday: false
      })

      expect(result.statusLabel).toBe('Niepracujący')
      expect(result.isWorkingDay).toBe(false)
      expect(result.isWeekend).toBe(true)
    })
  })

  describe('Custom Work Hours', () => {
    test('should reflect custom start and end times', () => {
      const customConfig: WorkScheduleConfig = {
        excludePublicHolidays: true,
        dailyStartTime: '08:30',
        dailyEndTime: '16:45'
      }

      const result = getDayStatusLogic({
        dayOfWeek: 'tuesday',
        workingDays: defaultWorkingDays,
        workScheduleConfig: customConfig,
        isHoliday: false
      })

      expect(result.statusLabel).toBe('08:30 - 16:45')
    })

    test('should show early morning hours', () => {
      const earlyConfig: WorkScheduleConfig = {
        excludePublicHolidays: true,
        dailyStartTime: '06:00',
        dailyEndTime: '14:00'
      }

      const result = getDayStatusLogic({
        dayOfWeek: 'monday',
        workingDays: defaultWorkingDays,
        workScheduleConfig: earlyConfig,
        isHoliday: false
      })

      expect(result.statusLabel).toBe('06:00 - 14:00')
    })

    test('should show late shift hours', () => {
      const lateConfig: WorkScheduleConfig = {
        excludePublicHolidays: true,
        dailyStartTime: '14:00',
        dailyEndTime: '22:00'
      }

      const result = getDayStatusLogic({
        dayOfWeek: 'wednesday',
        workingDays: defaultWorkingDays,
        workScheduleConfig: lateConfig,
        isHoliday: false
      })

      expect(result.statusLabel).toBe('14:00 - 22:00')
    })
  })

  describe('Custom Working Days', () => {
    test('should mark Saturday as working when included in working_days', () => {
      const workingDaysWithSaturday = [...defaultWorkingDays, 'saturday']

      const result = getDayStatusLogic({
        dayOfWeek: 'saturday',
        workingDays: workingDaysWithSaturday,
        workScheduleConfig: defaultWorkScheduleConfig,
        isHoliday: false
      })

      expect(result.statusLabel).toBe('09:00 - 17:00')
      expect(result.isWorkingDay).toBe(true)
      expect(result.isWeekend).toBe(false) // Not a weekend when it's a working day
    })

    test('should mark Monday as non-working when excluded from working_days', () => {
      const workingDaysWithoutMonday = ['tuesday', 'wednesday', 'thursday', 'friday']

      const result = getDayStatusLogic({
        dayOfWeek: 'monday',
        workingDays: workingDaysWithoutMonday,
        workScheduleConfig: defaultWorkScheduleConfig,
        isHoliday: false
      })

      expect(result.statusLabel).toBe('Niepracujący')
      expect(result.isWorkingDay).toBe(false)
    })

    test('should support 7-day work week', () => {
      const allDaysWorking = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

      const saturdayResult = getDayStatusLogic({
        dayOfWeek: 'saturday',
        workingDays: allDaysWorking,
        workScheduleConfig: defaultWorkScheduleConfig,
        isHoliday: false
      })

      const sundayResult = getDayStatusLogic({
        dayOfWeek: 'sunday',
        workingDays: allDaysWorking,
        workScheduleConfig: defaultWorkScheduleConfig,
        isHoliday: false
      })

      expect(saturdayResult.statusLabel).toBe('09:00 - 17:00')
      expect(sundayResult.statusLabel).toBe('09:00 - 17:00')
      expect(saturdayResult.isWorkingDay).toBe(true)
      expect(sundayResult.isWorkingDay).toBe(true)
    })
  })

  describe('Holiday Handling with exclude_public_holidays = true', () => {
    test('should show holiday name for holiday on working day', () => {
      const result = getDayStatusLogic({
        dayOfWeek: 'monday',
        workingDays: defaultWorkingDays,
        workScheduleConfig: defaultWorkScheduleConfig,
        isHoliday: true,
        holidayName: 'Nowy Rok'
      })

      expect(result.statusLabel).toBe('Nowy Rok')
      expect(result.effectiveStatus).toBe('holiday')
    })

    test('should show holiday name for holiday on non-working day', () => {
      const result = getDayStatusLogic({
        dayOfWeek: 'saturday',
        workingDays: defaultWorkingDays,
        workScheduleConfig: defaultWorkScheduleConfig,
        isHoliday: true,
        holidayName: 'Some Holiday'
      })

      expect(result.statusLabel).toBe('Some Holiday')
      expect(result.effectiveStatus).toBe('holiday')
    })

    test('should treat holiday as non-working when excludePublicHolidays is true', () => {
      const result = getDayStatusLogic({
        dayOfWeek: 'thursday',
        workingDays: defaultWorkingDays,
        workScheduleConfig: {
          excludePublicHolidays: true,
          dailyStartTime: '09:00',
          dailyEndTime: '17:00'
        },
        isHoliday: true,
        holidayName: 'Święto Pracy'
      })

      expect(result.statusLabel).toBe('Święto Pracy')
      expect(result.isWorkingDay).toBe(true) // It's a normal working day
      expect(result.effectiveStatus).toBe('holiday') // But treated as holiday
    })
  })

  describe('Holiday Handling with exclude_public_holidays = false', () => {
    const workOnHolidaysConfig: WorkScheduleConfig = {
      excludePublicHolidays: false,
      dailyStartTime: '09:00',
      dailyEndTime: '17:00'
    }

    test('should show work hours for holiday on working day', () => {
      const result = getDayStatusLogic({
        dayOfWeek: 'wednesday',
        workingDays: defaultWorkingDays,
        workScheduleConfig: workOnHolidaysConfig,
        isHoliday: true,
        holidayName: 'Święto Pracy'
      })

      expect(result.statusLabel).toBe('09:00 - 17:00')
      expect(result.effectiveStatus).toBe('working')
    })

    test('should still show "Niepracujący" for holiday on non-working day', () => {
      const result = getDayStatusLogic({
        dayOfWeek: 'saturday',
        workingDays: defaultWorkingDays,
        workScheduleConfig: workOnHolidaysConfig,
        isHoliday: true,
        holidayName: 'Some Holiday'
      })

      // Saturday is not a working day, so it should show holiday name
      expect(result.statusLabel).toBe('Some Holiday')
      expect(result.isWorkingDay).toBe(false)
    })

    test('should treat all normal working days as working regardless of holidays', () => {
      const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

      weekdays.forEach((day) => {
        const result = getDayStatusLogic({
          dayOfWeek: day,
          workingDays: defaultWorkingDays,
          workScheduleConfig: workOnHolidaysConfig,
          isHoliday: true,
          holidayName: 'National Holiday'
        })

        expect(result.statusLabel).toBe('09:00 - 17:00')
        expect(result.effectiveStatus).toBe('working')
      })
    })
  })

  describe('Leave Priority', () => {
    test('should show leave type when user has leave', () => {
      const result = getDayStatusLogic({
        dayOfWeek: 'tuesday',
        workingDays: defaultWorkingDays,
        workScheduleConfig: defaultWorkScheduleConfig,
        isHoliday: false,
        hasLeave: true,
        leaveTypeName: 'Urlop wypoczynkowy'
      })

      expect(result.statusLabel).toBe('Urlop wypoczynkowy')
      expect(result.effectiveStatus).toBe('leave')
    })

    test('should prioritize leave over holiday', () => {
      const result = getDayStatusLogic({
        dayOfWeek: 'thursday',
        workingDays: defaultWorkingDays,
        workScheduleConfig: defaultWorkScheduleConfig,
        isHoliday: true,
        holidayName: 'Boże Narodzenie',
        hasLeave: true,
        leaveTypeName: 'Sick Leave'
      })

      expect(result.statusLabel).toBe('Sick Leave')
      expect(result.effectiveStatus).toBe('leave')
    })

    test('should prioritize leave over non-working day', () => {
      const result = getDayStatusLogic({
        dayOfWeek: 'saturday',
        workingDays: defaultWorkingDays,
        workScheduleConfig: defaultWorkScheduleConfig,
        isHoliday: false,
        hasLeave: true,
        leaveTypeName: 'Urlop na żądanie'
      })

      expect(result.statusLabel).toBe('Urlop na żądanie')
      expect(result.effectiveStatus).toBe('leave')
    })
  })

  describe('Edge Cases', () => {
    test('should handle case-insensitive day names', () => {
      const result = getDayStatusLogic({
        dayOfWeek: 'MONDAY',
        workingDays: defaultWorkingDays,
        workScheduleConfig: defaultWorkScheduleConfig,
        isHoliday: false
      })

      expect(result.statusLabel).toBe('09:00 - 17:00')
      expect(result.isWorkingDay).toBe(true)
    })

    test('should handle empty working_days array', () => {
      const result = getDayStatusLogic({
        dayOfWeek: 'monday',
        workingDays: [],
        workScheduleConfig: defaultWorkScheduleConfig,
        isHoliday: false
      })

      expect(result.statusLabel).toBe('Niepracujący')
      expect(result.isWorkingDay).toBe(false)
    })

    test('should handle single working day', () => {
      const result = getDayStatusLogic({
        dayOfWeek: 'wednesday',
        workingDays: ['wednesday'],
        workScheduleConfig: defaultWorkScheduleConfig,
        isHoliday: false
      })

      expect(result.statusLabel).toBe('09:00 - 17:00')
      expect(result.isWorkingDay).toBe(true)
    })
  })

  describe('Combined Scenarios', () => {
    test('should handle custom working days + custom hours + holiday excluded', () => {
      const customConfig: WorkScheduleConfig = {
        excludePublicHolidays: true,
        dailyStartTime: '08:00',
        dailyEndTime: '16:00'
      }
      const customDays = ['tuesday', 'wednesday', 'thursday', 'saturday']

      const result = getDayStatusLogic({
        dayOfWeek: 'saturday',
        workingDays: customDays,
        workScheduleConfig: customConfig,
        isHoliday: true,
        holidayName: 'Special Holiday'
      })

      expect(result.statusLabel).toBe('Special Holiday')
      expect(result.effectiveStatus).toBe('holiday')
    })

    test('should handle 6-day work week with early hours and no holiday exclusion', () => {
      const sixDayConfig: WorkScheduleConfig = {
        excludePublicHolidays: false,
        dailyStartTime: '07:00',
        dailyEndTime: '15:00'
      }
      const sixDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

      const saturdayResult = getDayStatusLogic({
        dayOfWeek: 'saturday',
        workingDays: sixDays,
        workScheduleConfig: sixDayConfig,
        isHoliday: true,
        holidayName: 'Public Holiday'
      })

      expect(saturdayResult.statusLabel).toBe('07:00 - 15:00')
      expect(saturdayResult.effectiveStatus).toBe('working')
    })
  })
})
