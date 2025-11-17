const DEFAULT_WORKING_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const
const VALID_WEEK_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
] as const

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/

export type WorkScheduleType = 'daily' | 'multi_shift'
export type WorkMode = 'monday_to_friday' | 'multi_shift'

export interface WorkShift {
  label?: string
  start_time: string
  end_time: string
}

export interface WorkModePayloadInput {
  working_days?: string[]
  exclude_public_holidays?: boolean
  work_schedule_type?: WorkScheduleType
  daily_start_time?: string
  daily_end_time?: string
  shift_count?: number
  work_shifts?: WorkShift[]
  work_mode?: WorkMode
}

export interface ValidatedWorkModeConfig {
  workingDays: string[]
  excludePublicHolidays: boolean
  workScheduleType: WorkScheduleType
  dailyStartTime: string
  dailyEndTime: string
  shiftCount: number
  workShifts: WorkShift[]
  workMode: WorkMode
  isLegacyPayload: boolean
}

export class WorkModeValidationError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.status = status
    this.name = 'WorkModeValidationError'
  }
}

const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

const normalizeWorkingDays = (value: unknown): string[] => {
  if (value === undefined) {
    return [...DEFAULT_WORKING_DAYS]
  }

  if (!Array.isArray(value)) {
    throw new WorkModeValidationError('working_days must be an array of weekday names')
  }

  const normalized = value.map((day) => {
    if (typeof day !== 'string') {
      throw new WorkModeValidationError('working_days must contain only strings')
    }
    return day.toLowerCase()
  })

  const invalidDays = normalized.filter((day) => !VALID_WEEK_DAYS.includes(day as typeof VALID_WEEK_DAYS[number]))
  if (invalidDays.length > 0) {
    throw new WorkModeValidationError(`Invalid weekday names: ${invalidDays.join(', ')}`)
  }

  const uniqueDays = Array.from(new Set(normalized))
  if (uniqueDays.length === 0) {
    throw new WorkModeValidationError('working_days must include at least one day')
  }

  return uniqueDays
}

const normalizeTime = (value: unknown, fieldName: 'daily_start_time' | 'daily_end_time' | 'start_time' | 'end_time'): string => {
  if (typeof value !== 'string' || !TIME_REGEX.test(value)) {
    throw new WorkModeValidationError(`${fieldName.replace('_', ' ')} must be in HH:MM format (24-hour)`)
  }
  return value
}

const validateDailySchedule = (payload: WorkModePayloadInput): { start: string; end: string } => {
  const startTime = normalizeTime(payload.daily_start_time ?? '09:00', 'daily_start_time')
  const endTime = normalizeTime(payload.daily_end_time ?? '17:00', 'daily_end_time')

  if (toMinutes(startTime) >= toMinutes(endTime)) {
    throw new WorkModeValidationError('daily_start_time must be before daily_end_time')
  }

  return { start: startTime, end: endTime }
}

const validateMultiShiftSchedule = (payload: WorkModePayloadInput): { shiftCount: number; shifts: WorkShift[] } => {
  const shiftCount = payload.shift_count
  const shifts = payload.work_shifts

  if (!shiftCount || shiftCount < 1) {
    throw new WorkModeValidationError(
      'multi_shift configuration requires shift_count to be between 1 and 3',
      422
    )
  }

  if (shiftCount > 3) {
    throw new WorkModeValidationError('multi_shift supports a maximum of 3 shifts', 422)
  }

  if (!Array.isArray(shifts) || shifts.length === 0) {
    throw new WorkModeValidationError('At least one shift must be defined before enabling multi_shift', 422)
  }

  if (shifts.length !== shiftCount) {
    throw new WorkModeValidationError('shift_count must match the number of provided work_shifts', 422)
  }

  const normalizedShifts = shifts.map((shift, index) => {
    if (typeof shift !== 'object' || shift === null) {
      throw new WorkModeValidationError(`work_shifts[${index}] must be an object`, 422)
    }

    const start = normalizeTime(shift.start_time, 'start_time')
    const end = normalizeTime(shift.end_time, 'end_time')

    if (toMinutes(start) >= toMinutes(end)) {
      throw new WorkModeValidationError(`Shift ${index + 1} must have start_time before end_time`, 422)
    }

    return {
      label: shift.label?.trim() || undefined,
      start_time: start,
      end_time: end
    }
  })

  const sortedShifts = [...normalizedShifts].sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time))

  for (let i = 1; i < sortedShifts.length; i += 1) {
    const prev = sortedShifts[i - 1]
    const current = sortedShifts[i]
    if (toMinutes(prev.end_time) > toMinutes(current.start_time)) {
      throw new WorkModeValidationError('work_shifts cannot overlap in time', 422)
    }
  }

  return {
    shiftCount,
    shifts: normalizedShifts
  }
}

export const validateWorkModePayload = (payload: unknown): ValidatedWorkModeConfig => {
  if (!payload || typeof payload !== 'object') {
    throw new WorkModeValidationError('Invalid payload. Expected JSON body.')
  }

  const body = payload as WorkModePayloadInput
  const workingDays = normalizeWorkingDays(body.working_days)
  const excludePublicHolidays = body.exclude_public_holidays ?? true
  const scheduleType = body.work_schedule_type ?? 'daily'
  const isLegacyPayload = !body.work_schedule_type && !body.exclude_public_holidays && !body.daily_start_time && !body.daily_end_time && !body.shift_count && !body.work_shifts

  if (scheduleType === 'multi_shift') {
    const { shiftCount, shifts } = validateMultiShiftSchedule(body)
    return {
      workingDays,
      excludePublicHolidays,
      workScheduleType: 'multi_shift',
      dailyStartTime: body.daily_start_time ?? '09:00',
      dailyEndTime: body.daily_end_time ?? '17:00',
      shiftCount,
      workShifts: shifts,
      workMode: 'multi_shift',
      isLegacyPayload
    }
  }

  const { start, end } = validateDailySchedule(body)
  return {
    workingDays,
    excludePublicHolidays,
    workScheduleType: 'daily',
    dailyStartTime: start,
    dailyEndTime: end,
    shiftCount: 1,
    workShifts: [],
    workMode: body.work_mode === 'multi_shift' ? 'multi_shift' : 'monday_to_friday',
    isLegacyPayload
  }
}

export const WORK_MODE_CONSTANTS = {
  DEFAULT_WORKING_DAYS: [...DEFAULT_WORKING_DAYS],
  VALID_WEEK_DAYS: [...VALID_WEEK_DAYS],
  TIME_REGEX
}

