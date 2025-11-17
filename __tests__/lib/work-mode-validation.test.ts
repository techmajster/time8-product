import {
  validateWorkModePayload,
  WorkModeValidationError
} from '@/lib/validations/work-mode'

describe('validateWorkModePayload', () => {
  it('validates daily schedule payloads with explicit times', () => {
    const result = validateWorkModePayload({
      working_days: ['monday', 'wednesday', 'friday'],
      exclude_public_holidays: false,
      work_schedule_type: 'daily',
      daily_start_time: '08:00',
      daily_end_time: '16:00'
    })

    expect(result).toEqual({
      workingDays: ['monday', 'wednesday', 'friday'],
      excludePublicHolidays: false,
      workScheduleType: 'daily',
      dailyStartTime: '08:00',
      dailyEndTime: '16:00',
      shiftCount: 1,
      workShifts: [],
      workMode: 'monday_to_friday',
      isLegacyPayload: false
    })
  })

  it('applies defaults when optional fields are missing', () => {
    const result = validateWorkModePayload({
      working_days: undefined
    })

    expect(result.workingDays).toEqual(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
    expect(result.excludePublicHolidays).toBe(true)
    expect(result.dailyStartTime).toBe('09:00')
    expect(result.dailyEndTime).toBe('17:00')
    expect(result.isLegacyPayload).toBe(true)
  })

  it('rejects invalid weekday names', () => {
    expect(() =>
      validateWorkModePayload({
        working_days: ['monday', 'funday']
      })
    ).toThrow(new WorkModeValidationError('Invalid weekday names: funday'))
  })

  it('rejects end times that are before start times', () => {
    expect(() =>
      validateWorkModePayload({
        working_days: ['monday'],
        work_schedule_type: 'daily',
        daily_start_time: '18:00',
        daily_end_time: '17:00'
      })
    ).toThrow(new WorkModeValidationError('daily_start_time must be before daily_end_time'))
  })

  it('validates multi-shift schedules and detects overlaps', () => {
    const validPayload = {
      working_days: ['monday', 'tuesday'],
      work_schedule_type: 'multi_shift',
      shift_count: 2,
      work_shifts: [
        { label: 'Morning', start_time: '07:00', end_time: '11:00' },
        { label: 'Evening', start_time: '12:00', end_time: '16:00' }
      ]
    }

    expect(validateWorkModePayload(validPayload)).toMatchObject({
      workScheduleType: 'multi_shift',
      shiftCount: 2
    })

    const overlappingPayload = {
      ...validPayload,
      work_shifts: [
        { label: 'Morning', start_time: '07:00', end_time: '12:00' },
        { label: 'Evening', start_time: '11:30', end_time: '16:00' }
      ]
    }

    expect(() => validateWorkModePayload(overlappingPayload)).toThrow(
      new WorkModeValidationError('work_shifts cannot overlap in time', 422)
    )
  })

  it('blocks multi-shift payloads without defined shifts', () => {
    expect(() =>
      validateWorkModePayload({
        working_days: ['monday'],
        work_schedule_type: 'multi_shift',
        shift_count: 0
      })
    ).toThrow(new WorkModeValidationError('multi_shift configuration requires shift_count to be between 1 and 3', 422))

    expect(() =>
      validateWorkModePayload({
        working_days: ['monday'],
        work_schedule_type: 'multi_shift',
        shift_count: 2,
        work_shifts: [{ start_time: '08:00', end_time: '12:00' }]
      })
    ).toThrow(new WorkModeValidationError('shift_count must match the number of provided work_shifts', 422))
  })
})

