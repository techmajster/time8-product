/**
 * Work Mode API Validation Tests
 *
 * Tests for the /api/admin/settings/work-mode endpoint
 * Ensures proper validation of working days, hours, and shift configurations
 */

import { validateWorkModePayload, WorkModeValidationError } from '@/lib/validations/work-mode'

describe('Work Mode API Validation', () => {
  describe('Working Days Validation', () => {
    it('should accept valid working days array', () => {
      const payload = {
        working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      }

      const result = validateWorkModePayload(payload)

      expect(result.workingDays).toEqual(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
    })

    it('should normalize working days to lowercase', () => {
      const payload = {
        working_days: ['Monday', 'TUESDAY', 'WeDnEsDay']
      }

      const result = validateWorkModePayload(payload)

      expect(result.workingDays).toEqual(['monday', 'tuesday', 'wednesday'])
    })

    it('should accept weekend days', () => {
      const payload = {
        working_days: ['saturday', 'sunday']
      }

      const result = validateWorkModePayload(payload)

      expect(result.workingDays).toEqual(['saturday', 'sunday'])
    })

    it('should remove duplicate days', () => {
      const payload = {
        working_days: ['monday', 'monday', 'tuesday', 'tuesday']
      }

      const result = validateWorkModePayload(payload)

      expect(result.workingDays).toHaveLength(2)
      expect(result.workingDays).toEqual(['monday', 'tuesday'])
    })

    it('should reject invalid day names', () => {
      const payload = {
        working_days: ['monday', 'invalidday', 'tuesday']
      }

      expect(() => validateWorkModePayload(payload)).toThrow(WorkModeValidationError)
      expect(() => validateWorkModePayload(payload)).toThrow('Invalid weekday names: invalidday')
    })

    it('should reject non-array working_days', () => {
      const payload = {
        working_days: 'monday' as any
      }

      expect(() => validateWorkModePayload(payload)).toThrow(WorkModeValidationError)
      expect(() => validateWorkModePayload(payload)).toThrow('working_days must be an array')
    })

    it('should reject non-string values in working_days array', () => {
      const payload = {
        working_days: ['monday', 123, 'tuesday'] as any
      }

      expect(() => validateWorkModePayload(payload)).toThrow(WorkModeValidationError)
      expect(() => validateWorkModePayload(payload)).toThrow('working_days must contain only strings')
    })

    it('should reject empty working_days array', () => {
      const payload = {
        working_days: []
      }

      expect(() => validateWorkModePayload(payload)).toThrow(WorkModeValidationError)
      expect(() => validateWorkModePayload(payload)).toThrow('working_days must include at least one day')
    })

    it('should use default working days when not provided', () => {
      const payload = {}

      const result = validateWorkModePayload(payload)

      expect(result.workingDays).toEqual(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
    })
  })

  describe('Holiday Toggle Validation', () => {
    it('should accept true for exclude_public_holidays', () => {
      const payload = {
        exclude_public_holidays: true
      }

      const result = validateWorkModePayload(payload)

      expect(result.excludePublicHolidays).toBe(true)
    })

    it('should accept false for exclude_public_holidays', () => {
      const payload = {
        exclude_public_holidays: false
      }

      const result = validateWorkModePayload(payload)

      expect(result.excludePublicHolidays).toBe(false)
    })

    it('should default to true when not provided', () => {
      const payload = {}

      const result = validateWorkModePayload(payload)

      expect(result.excludePublicHolidays).toBe(true)
    })
  })

  describe('Daily Schedule Validation', () => {
    it('should accept valid daily start and end times', () => {
      const payload = {
        work_schedule_type: 'daily' as const,
        daily_start_time: '09:00',
        daily_end_time: '17:00'
      }

      const result = validateWorkModePayload(payload)

      expect(result.workScheduleType).toBe('daily')
      expect(result.dailyStartTime).toBe('09:00')
      expect(result.dailyEndTime).toBe('17:00')
    })

    it('should accept different valid time formats', () => {
      const payload = {
        work_schedule_type: 'daily' as const,
        daily_start_time: '08:30',
        daily_end_time: '16:45'
      }

      const result = validateWorkModePayload(payload)

      expect(result.dailyStartTime).toBe('08:30')
      expect(result.dailyEndTime).toBe('16:45')
    })

    it('should reject invalid time format for start_time', () => {
      const payload = {
        work_schedule_type: 'daily' as const,
        daily_start_time: '9:00', // Missing leading zero
        daily_end_time: '17:00'
      }

      expect(() => validateWorkModePayload(payload)).toThrow(WorkModeValidationError)
      expect(() => validateWorkModePayload(payload)).toThrow('daily start_time must be in HH:MM format (24-hour)')
    })

    it('should reject invalid time format for end_time', () => {
      const payload = {
        work_schedule_type: 'daily' as const,
        daily_start_time: '09:00',
        daily_end_time: '25:00' // Invalid hour
      }

      expect(() => validateWorkModePayload(payload)).toThrow(WorkModeValidationError)
      expect(() => validateWorkModePayload(payload)).toThrow('daily end_time must be in HH:MM format (24-hour)')
    })

    it('should reject start_time equal to end_time', () => {
      const payload = {
        work_schedule_type: 'daily' as const,
        daily_start_time: '09:00',
        daily_end_time: '09:00'
      }

      expect(() => validateWorkModePayload(payload)).toThrow(WorkModeValidationError)
      expect(() => validateWorkModePayload(payload)).toThrow('daily_start_time must be before daily_end_time')
    })

    it('should reject start_time after end_time', () => {
      const payload = {
        work_schedule_type: 'daily' as const,
        daily_start_time: '17:00',
        daily_end_time: '09:00'
      }

      expect(() => validateWorkModePayload(payload)).toThrow(WorkModeValidationError)
      expect(() => validateWorkModePayload(payload)).toThrow('daily_start_time must be before daily_end_time')
    })

    it('should use default times when not provided', () => {
      const payload = {
        work_schedule_type: 'daily' as const
      }

      const result = validateWorkModePayload(payload)

      expect(result.dailyStartTime).toBe('09:00')
      expect(result.dailyEndTime).toBe('17:00')
    })

    it('should accept edge case times like midnight to noon', () => {
      const payload = {
        work_schedule_type: 'daily' as const,
        daily_start_time: '00:00',
        daily_end_time: '12:00'
      }

      const result = validateWorkModePayload(payload)

      expect(result.dailyStartTime).toBe('00:00')
      expect(result.dailyEndTime).toBe('12:00')
    })

    it('should accept late shift times', () => {
      const payload = {
        work_schedule_type: 'daily' as const,
        daily_start_time: '22:00',
        daily_end_time: '23:59'
      }

      const result = validateWorkModePayload(payload)

      expect(result.dailyStartTime).toBe('22:00')
      expect(result.dailyEndTime).toBe('23:59')
    })
  })

  describe('Multi-Shift Schedule Validation', () => {
    it('should accept valid single shift configuration', () => {
      const payload = {
        work_schedule_type: 'multi_shift' as const,
        shift_count: 1,
        work_shifts: [
          { label: 'Morning', start_time: '08:00', end_time: '16:00' }
        ]
      }

      const result = validateWorkModePayload(payload)

      expect(result.workScheduleType).toBe('multi_shift')
      expect(result.shiftCount).toBe(1)
      expect(result.workShifts).toHaveLength(1)
      expect(result.workShifts[0].label).toBe('Morning')
      expect(result.workShifts[0].start_time).toBe('08:00')
      expect(result.workShifts[0].end_time).toBe('16:00')
    })

    it('should accept valid two-shift configuration', () => {
      const payload = {
        work_schedule_type: 'multi_shift' as const,
        shift_count: 2,
        work_shifts: [
          { label: 'Morning', start_time: '06:00', end_time: '14:00' },
          { label: 'Afternoon', start_time: '14:00', end_time: '22:00' }
        ]
      }

      const result = validateWorkModePayload(payload)

      expect(result.shiftCount).toBe(2)
      expect(result.workShifts).toHaveLength(2)
    })

    it('should accept valid three-shift configuration', () => {
      const payload = {
        work_schedule_type: 'multi_shift' as const,
        shift_count: 3,
        work_shifts: [
          { label: 'Morning', start_time: '06:00', end_time: '14:00' },
          { label: 'Afternoon', start_time: '14:00', end_time: '22:00' },
          { label: 'Night', start_time: '22:00', end_time: '23:59' } // Can't go to next day
        ]
      }

      const result = validateWorkModePayload(payload)

      expect(result.shiftCount).toBe(3)
      expect(result.workShifts).toHaveLength(3)
    })

    it('should accept shifts without labels', () => {
      const payload = {
        work_schedule_type: 'multi_shift' as const,
        shift_count: 1,
        work_shifts: [
          { start_time: '09:00', end_time: '17:00' }
        ]
      }

      const result = validateWorkModePayload(payload)

      expect(result.workShifts[0].label).toBeUndefined()
    })

    it('should trim shift labels', () => {
      const payload = {
        work_schedule_type: 'multi_shift' as const,
        shift_count: 1,
        work_shifts: [
          { label: '  Morning Shift  ', start_time: '08:00', end_time: '16:00' }
        ]
      }

      const result = validateWorkModePayload(payload)

      expect(result.workShifts[0].label).toBe('Morning Shift')
    })

    it('should reject shift_count greater than 3', () => {
      const payload = {
        work_schedule_type: 'multi_shift' as const,
        shift_count: 4,
        work_shifts: [
          { start_time: '06:00', end_time: '14:00' },
          { start_time: '14:00', end_time: '22:00' },
          { start_time: '22:00', end_time: '06:00' },
          { start_time: '08:00', end_time: '16:00' }
        ]
      }

      expect(() => validateWorkModePayload(payload)).toThrow(WorkModeValidationError)
      expect(() => validateWorkModePayload(payload)).toThrow('multi_shift supports a maximum of 3 shifts')
    })

    it('should reject shift_count less than 1', () => {
      const payload = {
        work_schedule_type: 'multi_shift' as const,
        shift_count: 0,
        work_shifts: []
      }

      expect(() => validateWorkModePayload(payload)).toThrow(WorkModeValidationError)
      expect(() => validateWorkModePayload(payload)).toThrow('multi_shift configuration requires shift_count to be between 1 and 3')
    })

    it('should reject missing work_shifts array', () => {
      const payload = {
        work_schedule_type: 'multi_shift' as const,
        shift_count: 1
      }

      expect(() => validateWorkModePayload(payload)).toThrow(WorkModeValidationError)
      expect(() => validateWorkModePayload(payload)).toThrow('At least one shift must be defined')
    })

    it('should reject empty work_shifts array', () => {
      const payload = {
        work_schedule_type: 'multi_shift' as const,
        shift_count: 1,
        work_shifts: []
      }

      expect(() => validateWorkModePayload(payload)).toThrow(WorkModeValidationError)
      expect(() => validateWorkModePayload(payload)).toThrow('At least one shift must be defined')
    })

    it('should reject mismatch between shift_count and work_shifts length', () => {
      const payload = {
        work_schedule_type: 'multi_shift' as const,
        shift_count: 2,
        work_shifts: [
          { start_time: '08:00', end_time: '16:00' }
        ]
      }

      expect(() => validateWorkModePayload(payload)).toThrow(WorkModeValidationError)
      expect(() => validateWorkModePayload(payload)).toThrow('shift_count must match the number of provided work_shifts')
    })

    it('should reject shift with invalid start_time format', () => {
      const payload = {
        work_schedule_type: 'multi_shift' as const,
        shift_count: 1,
        work_shifts: [
          { start_time: '8:00', end_time: '16:00' }
        ]
      }

      expect(() => validateWorkModePayload(payload)).toThrow(WorkModeValidationError)
      expect(() => validateWorkModePayload(payload)).toThrow('start time must be in HH:MM format')
    })

    it('should reject shift with start_time equal to end_time', () => {
      const payload = {
        work_schedule_type: 'multi_shift' as const,
        shift_count: 1,
        work_shifts: [
          { start_time: '08:00', end_time: '08:00' }
        ]
      }

      expect(() => validateWorkModePayload(payload)).toThrow(WorkModeValidationError)
      expect(() => validateWorkModePayload(payload)).toThrow('Shift 1 must have start_time before end_time')
    })

    it('should reject shift with start_time after end_time', () => {
      const payload = {
        work_schedule_type: 'multi_shift' as const,
        shift_count: 1,
        work_shifts: [
          { start_time: '16:00', end_time: '08:00' }
        ]
      }

      expect(() => validateWorkModePayload(payload)).toThrow(WorkModeValidationError)
      expect(() => validateWorkModePayload(payload)).toThrow('Shift 1 must have start_time before end_time')
    })

    it('should reject overlapping shifts', () => {
      const payload = {
        work_schedule_type: 'multi_shift' as const,
        shift_count: 2,
        work_shifts: [
          { start_time: '08:00', end_time: '16:00' },
          { start_time: '15:00', end_time: '23:00' } // Overlaps with first shift
        ]
      }

      expect(() => validateWorkModePayload(payload)).toThrow(WorkModeValidationError)
      expect(() => validateWorkModePayload(payload)).toThrow('work_shifts cannot overlap in time')
    })

    it('should accept adjacent shifts (no gap)', () => {
      const payload = {
        work_schedule_type: 'multi_shift' as const,
        shift_count: 2,
        work_shifts: [
          { start_time: '08:00', end_time: '16:00' },
          { start_time: '16:00', end_time: '23:00' } // Starts exactly when first ends
        ]
      }

      const result = validateWorkModePayload(payload)

      expect(result.workShifts).toHaveLength(2)
    })

    it('should accept shifts with gaps between them', () => {
      const payload = {
        work_schedule_type: 'multi_shift' as const,
        shift_count: 2,
        work_shifts: [
          { start_time: '08:00', end_time: '12:00' },
          { start_time: '14:00', end_time: '18:00' } // 2-hour gap
        ]
      }

      const result = validateWorkModePayload(payload)

      expect(result.workShifts).toHaveLength(2)
    })

    it('should reject non-object shift entry', () => {
      const payload = {
        work_schedule_type: 'multi_shift' as const,
        shift_count: 1,
        work_shifts: ['invalid'] as any
      }

      expect(() => validateWorkModePayload(payload)).toThrow(WorkModeValidationError)
      expect(() => validateWorkModePayload(payload)).toThrow('work_shifts[0] must be an object')
    })
  })

  describe('Legacy Payload Detection', () => {
    it('should detect legacy payload with only working_days', () => {
      const payload = {
        working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      }

      const result = validateWorkModePayload(payload)

      expect(result.isLegacyPayload).toBe(true)
      expect(result.workScheduleType).toBe('daily')
      expect(result.dailyStartTime).toBe('09:00')
      expect(result.dailyEndTime).toBe('17:00')
    })

    it('should not detect as legacy when new fields are present', () => {
      const payload = {
        working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        exclude_public_holidays: true,
        daily_start_time: '09:00',
        daily_end_time: '17:00'
      }

      const result = validateWorkModePayload(payload)

      expect(result.isLegacyPayload).toBe(false)
    })
  })

  describe('Complete Configuration Scenarios', () => {
    it('should accept complete daily schedule configuration', () => {
      const payload = {
        working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        exclude_public_holidays: true,
        work_schedule_type: 'daily' as const,
        daily_start_time: '08:30',
        daily_end_time: '17:00'
      }

      const result = validateWorkModePayload(payload)

      expect(result.workingDays).toEqual(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
      expect(result.excludePublicHolidays).toBe(true)
      expect(result.workScheduleType).toBe('daily')
      expect(result.dailyStartTime).toBe('08:30')
      expect(result.dailyEndTime).toBe('17:00')
      expect(result.shiftCount).toBe(1)
      expect(result.workShifts).toEqual([])
    })

    it('should accept complete multi-shift configuration', () => {
      const payload = {
        working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        exclude_public_holidays: false,
        work_schedule_type: 'multi_shift' as const,
        shift_count: 3,
        work_shifts: [
          { label: 'Morning', start_time: '06:00', end_time: '14:00' },
          { label: 'Afternoon', start_time: '14:00', end_time: '22:00' },
          { label: 'Night', start_time: '22:00', end_time: '23:59' }
        ]
      }

      const result = validateWorkModePayload(payload)

      expect(result.workingDays).toHaveLength(7)
      expect(result.excludePublicHolidays).toBe(false)
      expect(result.workScheduleType).toBe('multi_shift')
      expect(result.shiftCount).toBe(3)
      expect(result.workShifts).toHaveLength(3)
      expect(result.workMode).toBe('multi_shift')
    })

    it('should reject invalid JSON payload', () => {
      expect(() => validateWorkModePayload(null)).toThrow(WorkModeValidationError)
      expect(() => validateWorkModePayload(null)).toThrow('Invalid payload')
    })

    it('should reject non-object payload', () => {
      expect(() => validateWorkModePayload('string' as any)).toThrow(WorkModeValidationError)
      expect(() => validateWorkModePayload('string' as any)).toThrow('Invalid payload')
    })
  })
})
