'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter
} from '@/components/ui/sheet'
import { ChevronLeft, ChevronRight, Plus, TreePalm, Gift, BriefcaseMedical, Calendar, Info, User, Plane, Briefcase, Star } from 'lucide-react'
import { LeaveRequestButton } from '@/app/dashboard/components/LeaveRequestButton'
import { TeamScope } from '@/lib/team-utils'
import { useCalendarLeaveRequests } from '@/hooks/useLeaveRequests'
import { useHolidays, holidayKeys } from '@/hooks/useHolidays'
import { CalendarSkeleton } from './CalendarSkeleton'
import { DaySheetSkeleton } from './DaySheetSkeleton'
import { useSonnerToast } from '@/hooks/use-sonner-toast'
import {
  CALENDAR_GRID_SIZE,
  MAX_VISIBLE_AVATARS,
  ERROR_TOAST_DURATION,
  DAY_NAMES_LOWERCASE,
  LEAVE_TYPE_NAMES,
  USER_LEAVE_STATUS,
} from '@/lib/calendar-constants'

interface CalendarClientProps {
  organizationId: string
  countryCode: string
  userId: string
  colleagues: Array<{
    id: string
    full_name: string
    birth_date: string
    avatar_url?: string
  }>
  teamMemberIds: string[]
  teamScope: TeamScope
  showHeader?: boolean
  showPadding?: boolean
  workingDays?: string[]
  workScheduleConfig?: {
    excludePublicHolidays: boolean
    dailyStartTime: string
    dailyEndTime: string
  }
  externalCurrentDate?: Date
  onDateChange?: (date: Date) => void
  hideNavigation?: boolean
  disableResponsive?: boolean
  headerLayout?: 'default' | 'compact'
}

interface Holiday {
  id: string
  name: string
  date: string
  type: 'national' | 'company'
  country_code: string
}

interface LeaveRequest {
  id: string
  user_id: string
  start_date: string
  end_date: string
  status: string
  profiles: any
  leave_types: any
}

interface SelectedDayData {
  day: number
  month: string
  year: string
  dayName: string
  leaves: Array<{
    id: string
    name: string
    email: string
    type: string
    endDate: string
    avatar_url?: string
    icon: React.ReactNode
  }>
  holiday?: {
    name: string
    type: 'national' | 'company'
  }
  birthdays: Array<{
    id: string
    full_name: string
    birth_date: string
    avatar_url?: string
  }>
  plannedLeaves: Array<{
    id: string
    user_id: string
    user_name: string
    user_email: string
    user_avatar?: string
    leave_type_name: string
    leave_type_color: string
    end_date: string
  }>
  workSchedule?: {
    start: string
    end: string
    isReady: boolean
  }
  workingTeamMembers?: Array<{
    id: string
    name: string
    avatar?: string
    teamName?: string
  }>
  userLeaveStatus?: 'default' | 'vacation' | 'sick-leave'
  dayStatus?: {
    type: 'working' | 'leave' | 'weekend' | 'holiday'
    message: string
    workHours?: string
    leaveTypeName?: string
    holidayName?: string
    holidayType?: 'national' | 'company'
  }
}

export default function CalendarClient({ organizationId, countryCode, userId, colleagues, teamMemberIds, teamScope, showHeader = true, showPadding = true, workingDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], workScheduleConfig, externalCurrentDate, onDateChange, hideNavigation = false, disableResponsive = false, headerLayout = 'default' }: CalendarClientProps) {
  const [internalDate, setInternalDate] = useState(new Date())
  
  // Use external date if provided, otherwise use internal state
  const currentDate = useMemo(() => {
    return externalCurrentDate || internalDate
  }, [externalCurrentDate, internalDate])
  
  // Sync internal state when external date changes
  useEffect(() => {
    if (externalCurrentDate) {
      setInternalDate(externalCurrentDate)
    }
  }, [externalCurrentDate])
  
  const setCurrentDate = (date: Date) => {
    if (externalCurrentDate && onDateChange) {
      onDateChange(date)
    } else {
      setInternalDate(date)
    }
  }
  const [selectedDay, setSelectedDay] = useState<SelectedDayData | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isLoadingDayDetails, setIsLoadingDayDetails] = useState(false)

  // Toast notifications
  const { showError } = useSonnerToast()

  // Query client for prefetching
  const queryClient = useQueryClient()

  // Translations
  const t = useTranslations('calendar')

  // Month names from i18n
  const monthNames = [
    t('months.january'), t('months.february'), t('months.march'), t('months.april'),
    t('months.may'), t('months.june'), t('months.july'), t('months.august'),
    t('months.september'), t('months.october'), t('months.november'), t('months.december')
  ]

  // Day names from i18n
  const dayNames = [
    t('days.monday'), t('days.tuesday'), t('days.wednesday'), t('days.thursday'),
    t('days.friday'), t('days.saturday'), t('days.sunday')
  ]

  // Calculate date range for current month
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1
  const startOfMonth = `${year}-${month.toString().padStart(2, '0')}-01`
  const lastDayOfMonth = new Date(year, month, 0).getDate()
  const endOfMonth = `${year}-${month.toString().padStart(2, '0')}-${lastDayOfMonth.toString().padStart(2, '0')}`

  // Use shared calendar leave requests hook with automatic cache invalidation
  const { data: leaveRequestsData = [], isLoading: isLoadingLeaveRequests } = useCalendarLeaveRequests(
    startOfMonth,
    endOfMonth,
    teamMemberIds
  )

  // Use transformed data
  const leaveRequests = leaveRequestsData

  // Fetch holidays using React Query hook with automatic caching
  const { data: holidays = [], isLoading: isLoadingHolidays } = useHolidays({
    organizationId,
    countryCode,
    startDate: startOfMonth,
    endDate: endOfMonth
  })

  // Prefetch adjacent months for better UX
  const prefetchAdjacentMonth = (monthOffset: 1 | -1) => {
    const adjacentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + monthOffset, 1)
    const adjYear = adjacentDate.getFullYear()
    const adjMonth = adjacentDate.getMonth() + 1
    const adjStartOfMonth = `${adjYear}-${adjMonth.toString().padStart(2, '0')}-01`
    const adjLastDayOfMonth = new Date(adjYear, adjMonth, 0).getDate()
    const adjEndOfMonth = `${adjYear}-${adjMonth.toString().padStart(2, '0')}-${adjLastDayOfMonth.toString().padStart(2, '0')}`

    // Prefetch leave requests
    queryClient.prefetchQuery({
      queryKey: ['calendar-leave-requests', adjStartOfMonth, adjEndOfMonth, teamMemberIds.join(',')],
      queryFn: async () => {
        const params = new URLSearchParams({
          start_date: adjStartOfMonth,
          end_date: adjEndOfMonth,
          team_member_ids: teamMemberIds.join(',')
        })
        const response = await fetch(`/api/calendar/leave-requests?${params}`)
        if (!response.ok) throw new Error('Failed to prefetch leave requests')
        return await response.json()
      }
    })

    // Prefetch holidays
    queryClient.prefetchQuery({
      queryKey: holidayKeys.range(organizationId, countryCode, adjStartOfMonth, adjEndOfMonth),
      queryFn: async () => {
        const params = new URLSearchParams({
          start_date: adjStartOfMonth,
          end_date: adjEndOfMonth,
          country_code: countryCode
        })
        const response = await fetch(`/api/calendar/holidays?${params}`)
        if (!response.ok) throw new Error('Failed to prefetch holidays')
        return await response.json()
      }
    })
  }

  // Fetch user's schedule for a specific date
  const fetchUserSchedule = async (dateStr: string): Promise<{ start: string, end: string, isReady: boolean } | null> => {
    try {
      const params = new URLSearchParams({
        userId,
        organizationId,
        date: dateStr
      })

      const response = await fetch(`/api/calendar/user-schedule?${params}`)

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching user schedule:', error)
      return null
    }
  }

  // Fetch working team members for a specific date
  const fetchWorkingTeamMembers = async (dateStr: string): Promise<Array<{ id: string, name: string, avatar?: string, teamName?: string }>> => {
    try {
      const params = new URLSearchParams({
        organizationId,
        date: dateStr,
        userId,
        teamMemberIds: teamMemberIds.join(',')
      })

      const response = await fetch(`/api/calendar/working-team-members?${params}`)

      if (!response.ok) {
        return []
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching working team members:', error)
      return []
    }
  }


  const getLeaveRequestsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
    
    return leaveRequests.filter((leave: LeaveRequest) => {
      const startDate = leave.start_date
      const endDate = leave.end_date
      return dateStr >= startDate && dateStr <= endDate
    })
  }

  const getHolidayForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
    const holiday = holidays.find(holiday => holiday.date === dateStr)
    return holiday
  }

  // Check if a day is a free day (holiday, weekend, or your own leave)
  const isFreeDay = (day: number) => {
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    const dayOfWeek = selectedDate.getDay() // 0 = Sunday, 6 = Saturday
    const holiday = getHolidayForDay(day)

    // Check if it's a weekend based on organization's working days
    const dayName = DAY_NAMES_LOWERCASE[dayOfWeek]
    const isWeekend = !workingDays.includes(dayName)

    // Check if it's a holiday (respect excludePublicHolidays setting)
    const excludeHolidays = workScheduleConfig?.excludePublicHolidays ?? true
    const isHoliday = excludeHolidays && !!holiday

    // Check if you have approved leave on this day
    const dateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`

    const hasPersonalLeave = leaveRequests.some((leave: LeaveRequest) =>
      leave.user_id === userId &&
      leave.status === 'approved' &&
      dateStr >= leave.start_date &&
      dateStr <= leave.end_date
    )

    return isWeekend || isHoliday || hasPersonalLeave
  }

  // Get colleagues who have birthdays on a specific day
  const getBirthdaysForDay = (day: number) => {
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    const monthDay = `${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
    
    return colleagues.filter(colleague => {
      if (!colleague.birth_date) return false
      const birthDate = new Date(colleague.birth_date)
      const birthMonthDay = `${(birthDate.getMonth() + 1).toString().padStart(2, '0')}-${birthDate.getDate().toString().padStart(2, '0')}`
      return birthMonthDay === monthDay
    })
  }

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleDayClick = async (day: number) => {
    // Set loading state and open sheet immediately
    setIsLoadingDayDetails(true)
    setIsSheetOpen(true)

    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    const dayName = selectedDate.toLocaleDateString('pl-PL', { weekday: 'long' })

    // Find holiday for this day
    const holiday = getHolidayForDay(day)
    const isFree = isFreeDay(day)

    // Get leave requests for this day
    const dayLeaves = getLeaveRequestsForDay(day)
    const mappedLeaves = dayLeaves.map((leave: LeaveRequest) => ({
      id: leave.id,
      name: leave.profiles?.first_name ? `${leave.profiles.first_name} ${leave.profiles.last_name}` : 'Unknown User',
      email: leave.profiles?.email || '',
      type: leave.leave_types?.name || 'Urlop',
      endDate: leave.end_date,
      avatar_url: leave.profiles?.avatar_url,
      icon: <TreePalm className="h-4 w-4" />
    }))

    // Get birthdays for this day
    const dayBirthdays = getBirthdaysForDay(day)

    // Get planned leaves for this day (team members on leave on this specific date)
    const selectedDateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
    
    const dayPlannedLeaves = leaveRequests
      .filter((leave: LeaveRequest) => {
        // Check if the selected date falls within the leave period and exclude your own requests
        return selectedDateStr >= leave.start_date && 
               selectedDateStr <= leave.end_date &&
               leave.user_id !== userId
      })
      .map((leave: LeaveRequest) => ({
        id: leave.id,
        user_id: leave.user_id,
        user_name: leave.profiles?.full_name || `${leave.profiles?.first_name || ''} ${leave.profiles?.last_name || ''}`.trim() || 'Unknown User',
        user_email: leave.profiles?.email || '',
        user_avatar: leave.profiles?.avatar_url,
        leave_type_name: leave.leave_types?.name || 'Urlop',
        leave_type_color: leave.leave_types?.color || '#3b82f6',
        end_date: leave.end_date
      }))

    // Fetch schedule data for the selected day with error handling
    let workSchedule = null
    let workingTeamMembers: Array<{ id: string, name: string, avatar?: string, teamName?: string }> = []

    try {
      workSchedule = await fetchUserSchedule(selectedDateStr)
    } catch (error) {
      console.error('Error fetching user schedule:', error)
      showError(t('errors.failedToFetchSchedule'), {
        description: t('errors.tryAgainLater'),
        duration: ERROR_TOAST_DURATION
      })
    }

    try {
      workingTeamMembers = await fetchWorkingTeamMembers(selectedDateStr)
    } catch (error) {
      console.error('Error fetching working team members:', error)
      showError(t('errors.failedToFetchTeamMembers'), {
        description: t('errors.tryAgainLater'),
        duration: ERROR_TOAST_DURATION
      })
    }

    // Check if user has approved leave on this day to determine background color
    let userLeaveStatus: 'default' | 'vacation' | 'sick-leave' = USER_LEAVE_STATUS.DEFAULT as 'default'
    const userLeave = leaveRequests.find((leave: LeaveRequest) =>
      leave.user_id === userId &&
      leave.status === 'approved' &&
      selectedDateStr >= leave.start_date &&
      selectedDateStr <= leave.end_date
    )

    if (userLeave && userLeave.leave_types) {
      const leaveTypeName = userLeave.leave_types.name || ''
      // Determine background based on leave type name (same logic as useUserBackground hook)
      if (leaveTypeName === LEAVE_TYPE_NAMES.VACATION || leaveTypeName.toLowerCase().includes('urlop')) {
        userLeaveStatus = USER_LEAVE_STATUS.VACATION as 'vacation'
      } else if (leaveTypeName === LEAVE_TYPE_NAMES.SICK_LEAVE || leaveTypeName.toLowerCase().includes('zwolnienie')) {
        userLeaveStatus = USER_LEAVE_STATUS.SICK_LEAVE as 'sick-leave'
      } else {
        // For other leave types, default to vacation background
        userLeaveStatus = USER_LEAVE_STATUS.VACATION as 'vacation'
      }
    }

    // Determine day status for dynamic message
    const dayOfWeek = selectedDate.getDay() // 0 = Sunday, 6 = Saturday
    const dayNameLower = DAY_NAMES_LOWERCASE[dayOfWeek]
    const isNonWorkingDay = !workingDays.includes(dayNameLower)

    // Check if it's a traditional weekend day (Saturday or Sunday)
    const isTraditionalWeekend = dayOfWeek === 0 || dayOfWeek === 6

    let dayStatus: SelectedDayData['dayStatus']

    if (userLeave && userLeave.leave_types) {
      // User has approved leave on this day
      dayStatus = {
        type: 'leave',
        message: userLeave.leave_types.name || t('youHaveLeave'),
        leaveTypeName: userLeave.leave_types.name || t('youHaveLeave')
      }
    } else if (isNonWorkingDay && holiday) {
      // Non-working day with holiday
      dayStatus = {
        type: isTraditionalWeekend ? 'weekend' : 'holiday',
        message: holiday.name,
        holidayName: holiday.name,
        holidayType: holiday.type as 'national' | 'company'
      }
    } else if (isNonWorkingDay) {
      // Non-working day without holiday
      // Use "Weekend" for Sat/Sun, "Niepracujący" for custom non-working days
      dayStatus = {
        type: 'weekend',
        message: isTraditionalWeekend ? t('weekend') : 'Niepracujący'
      }
    } else if (holiday) {
      // It's a holiday (not weekend)
      dayStatus = {
        type: 'holiday',
        message: holiday.name,
        holidayName: holiday.name,
        holidayType: holiday.type as 'national' | 'company'
      }
    } else if (workSchedule) {
      // It's a working day with schedule
      dayStatus = {
        type: 'working',
        message: `${workSchedule.start} - ${workSchedule.end}`,
        workHours: `${workSchedule.start} - ${workSchedule.end}`
      }
    } else {
      // It's a working day without schedule
      dayStatus = {
        type: 'working',
        message: t('workingDay')
      }
    }

    setSelectedDay({
      day,
      month: monthNames[currentDate.getMonth()],
      year: currentDate.getFullYear().toString(),
      dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
      leaves: mappedLeaves,
      holiday: holiday ? { name: holiday.name, type: holiday.type as 'national' | 'company' } : undefined,
      birthdays: dayBirthdays,
      plannedLeaves: dayPlannedLeaves,
      workSchedule: workSchedule || undefined,
      workingTeamMembers: workingTeamMembers.length > 0 ? workingTeamMembers : undefined,
      userLeaveStatus,
      dayStatus
    })

    // Reset loading state
    setIsLoadingDayDetails(false)
  }

  // Helper function to get day status for calendar cell
  const getDayStatus = (day: number) => {
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    const dayOfWeek = selectedDate.getDay()
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayName = dayNames[dayOfWeek]
    const isWeekend = !workingDays.includes(dayName)
    
    const holiday = getHolidayForDay(day)
    const dateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
    
    // Check if user has approved leave on this day
    const userLeave = leaveRequests.find((leave: LeaveRequest) =>
      leave.user_id === userId &&
      leave.status === 'approved' &&
      dateStr >= leave.start_date &&
      dateStr <= leave.end_date
    )

    // Get work hours from config
    const dailyStart = workScheduleConfig?.dailyStartTime || '09:00'
    const dailyEnd = workScheduleConfig?.dailyEndTime || '17:00'
    const workHours = `${dailyStart.substring(0, 5)} - ${dailyEnd.substring(0, 5)}`

    // Check if holidays should be treated as non-working days
    const excludeHolidays = workScheduleConfig?.excludePublicHolidays ?? true

    // Determine background color and status label
    let bgClass = 'bg-[var(--card-violet)]' // Default: working day (uses CSS variable that adapts to dark mode)
    let patternClass = ''
    let statusLabel = workHours

    if (userLeave) {
      // User has leave - determine type
      const leaveTypeName = userLeave.leave_types?.name || 'Urlop'
      if (leaveTypeName.toLowerCase().includes('zwolnienie') || leaveTypeName.toLowerCase().includes('zdrowie')) {
        bgClass = 'bg-destructive/10' // Sick leave (adapts to dark mode)
        statusLabel = leaveTypeName
      } else {
        bgClass = 'bg-green-500/10 dark:bg-green-500/20' // Vacation (adapts to dark mode)
        statusLabel = leaveTypeName
      }
    } else if (isWeekend && holiday) {
      // Weekend with holiday - respect excludeHolidays setting
      bgClass = 'bg-accent'
      patternClass = 'calendar-weekend-pattern'
      statusLabel = excludeHolidays ? holiday.name : workHours
    } else if (isWeekend) {
      // Weekend without holiday
      bgClass = 'bg-accent'
      patternClass = 'calendar-weekend-pattern'
      statusLabel = 'Niepracujący'
    } else if (holiday && excludeHolidays) {
      // Holiday on working day (only if excludeHolidays is true)
      bgClass = 'bg-accent'
      patternClass = 'calendar-holiday-pattern'
      statusLabel = holiday.name
    } else if (holiday && !excludeHolidays) {
      // Holiday but treated as working day (excludeHolidays is false)
      // Keep working day styling but don't show holiday pattern
      statusLabel = workHours
    }
    
    return {
      bgClass,
      patternClass,
      statusLabel,
      holiday
    }
  }

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7 // Convert to Monday = 0
    
    const days = []
    
    // Previous month days
    const prevMonth = new Date(year, month, 0)
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonth.getDate() - i,
        isOutside: true,
        isCurrentMonth: false
      })
    }
    
    // Current month days
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const today = new Date()
      const isToday = year === today.getFullYear() && 
                     month === today.getMonth() && 
                     day === today.getDate()
      
      const dayStatus = getDayStatus(day)
      
      days.push({
        day,
        isOutside: false,
        isCurrentMonth: true,
        isToday,
        leaves: getLeaveRequestsForDay(day),
        holiday: getHolidayForDay(day),
        birthdays: getBirthdaysForDay(day),
        bgClass: dayStatus.bgClass,
        patternClass: dayStatus.patternClass,
        statusLabel: dayStatus.statusLabel
      })
    }
    
    // Next month days to fill the grid (up to 5 weeks = 35 days max)
    const remainingDays = Math.min(CALENDAR_GRID_SIZE - days.length, 35 - days.length)
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        day,
        isOutside: true,
        isCurrentMonth: false
      })
    }
    
    // If the last week has only next-month days (all outside), remove that week
    const lastWeekStart = days.length - 7
    if (lastWeekStart >= 0) {
      const lastWeek = days.slice(lastWeekStart)
      const allOutside = lastWeek.every(day => day.isOutside)
      if (allOutside && lastWeek.length === 7) {
        // Remove the last week if it's all outside days
        return days.slice(0, lastWeekStart)
      }
    }
    
    return days
  }

  const calendarDays = generateCalendarDays()

  // Split days into weeks
  const weeks = []
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7))
  }

  // Show loading skeleton while data is being fetched
  const isLoading = isLoadingLeaveRequests || isLoadingHolidays

  return (
    <div className={showPadding ? "py-11" : ""}>
      {/* Page Header */}
      {showHeader && (
        <>
          {headerLayout === 'compact' ? (
            /* Compact single-line header matching Figma design */
            <div className="flex items-center justify-between mb-6">
              {/* Left: Title */}
              <h1 className="text-3xl font-semibold text-foreground">{t('title')}</h1>

              {/* Center: Month Navigation */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePreviousMonth}
                  onMouseEnter={() => prefetchAdjacentMonth(-1)}
                  disabled={isLoading}
                  className="h-8 w-8 opacity-50 hover:opacity-100 bg-card disabled:opacity-25"
                  aria-label={`Previous month`}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </Button>

                <h2 className="text-base font-semibold min-w-[140px] text-center" aria-live="polite" aria-atomic="true">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextMonth}
                  onMouseEnter={() => prefetchAdjacentMonth(1)}
                  disabled={isLoading}
                  className="h-8 w-8 opacity-50 hover:opacity-100 bg-card disabled:opacity-25"
                  aria-label={`Next month`}
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>

              {/* Right: Filter button + Leave Request button */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="h-9"
                  disabled
                  aria-label={t('filter')}
                >
                  {t('filter')}
                </Button>
                <LeaveRequestButton />
              </div>
            </div>
          ) : (
            /* Default two-line header layout */
            <div className="flex justify-between items-center mb-6">
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-semibold text-foreground">{t('title')}</h1>
              </div>
              <div className="flex items-center gap-3">
                <LeaveRequestButton />
              </div>
            </div>
          )}
        </>
      )}

      {/* Calendar */}
      {isLoading ? (
        <CalendarSkeleton />
      ) : (
      <div className="flex flex-col gap-6">
        {/* Month Navigation - Hide when hideNavigation is true OR when using compact layout */}
        {!hideNavigation && headerLayout !== 'compact' && (
          <div className="flex items-center justify-between h-8" role="navigation" aria-label="Month navigation">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePreviousMonth}
              onMouseEnter={() => prefetchAdjacentMonth(-1)}
              disabled={isLoading}
              className="h-8 w-8 opacity-50 hover:opacity-100 bg-card disabled:opacity-25"
              aria-label={`Previous month`}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>

            <h2 className="text-base font-semibold" aria-live="polite" aria-atomic="true">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              onMouseEnter={() => prefetchAdjacentMonth(1)}
              disabled={isLoading}
              className="h-8 w-8 opacity-50 hover:opacity-100 bg-card disabled:opacity-25"
              aria-label={`Next month`}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        )}

        {/* Calendar Grid */}
        <div className="flex flex-col gap-2" role="grid" aria-label="Calendar">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2" role="row">
            {dayNames.map((dayName) => (
              <div key={dayName} className="flex items-center justify-center h-8" role="columnheader">
                <span className="text-xs text-muted-foreground font-normal">
                  {dayName}
                </span>
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-2" role="row">
              {week.map((dayData, dayIndex) => {
                const dateStr = dayData.isCurrentMonth
                  ? `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${dayData.day.toString().padStart(2, '0')}`
                  : '';
                const ariaLabel = dayData.isCurrentMonth
                  ? `${dayData.day} ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}${dayData.isToday ? ', Today' : ''}${dayData.holiday ? `, ${dayData.holiday.name}` : ''}${dayData.leaves && dayData.leaves.length > 0 ? `, ${dayData.leaves.length} team member${dayData.leaves.length > 1 ? 's' : ''} on leave` : ''}`
                  : '';

                return (
                <button
                  key={`${weekIndex}-${dayIndex}`}
                  onClick={() => dayData.isCurrentMonth && handleDayClick(dayData.day)}
                  className={`
                    relative h-32 ${disableResponsive ? '' : 'min-[850px]:h-auto min-[850px]:aspect-square'} rounded-lg overflow-hidden cursor-pointer transition-colors
                    ${dayData.isOutside
                      ? 'opacity-50 bg-accent'
                      : `${dayData.bgClass || 'bg-accent'} ${dayData.patternClass || ''} hover:opacity-90`
                    }
                  `}
                  disabled={dayData.isOutside}
                  role="gridcell"
                  aria-label={ariaLabel}
                  aria-current={dayData.isToday ? 'date' : undefined}
                  aria-disabled={dayData.isOutside}
                >
                  {/* Day Number - Top Left */}
                  <div className="absolute left-2 top-2">
                    <span className={`text-base font-semibold ${dayData.isOutside ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {dayData.day}
                    </span>
                  </div>

                  {/* Holiday Star Icon - Top Right */}
                  {dayData.holiday && (
                    <div className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center" aria-hidden="true">
                      <Star className="w-4 h-4 text-foreground" />
                    </div>
                  )}

                  {/* Status Label - Bottom Left */}
                  {dayData.isCurrentMonth && dayData.statusLabel && (
                    <div className="absolute bottom-1.5 left-1.5 text-xs text-muted-foreground font-normal text-left max-w-[calc(100%-12px)]">
                      <p className="leading-4 whitespace-pre-wrap break-words text-left">
                        {dayData.statusLabel}
                      </p>
                    </div>
                  )}

                  {/* Birthday indicator - Keep existing position */}
                  {dayData.birthdays && dayData.birthdays.length > 0 && (
                    <div className="absolute bottom-2 left-2" aria-hidden="true">
                      <div className="w-[21px] h-[21px] rounded-full overflow-hidden">
                        <Gift className="w-5 h-5 text-foreground absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                  )}

                  {/* Avatars - Top right, vertically stacked */}
                  {dayData.leaves && dayData.leaves.length > 0 && (
                    <div className="absolute top-2 right-2" aria-hidden="true">
                      <div className="flex flex-col items-start justify-center pb-2 pt-0 px-0">
                        {/* Show first avatars up to MAX_VISIBLE_AVATARS */}
                        {dayData.leaves.slice(0, MAX_VISIBLE_AVATARS).map((leave: LeaveRequest, index: number) => (
                          <Avatar key={leave.id} className="w-8 h-8 mb-[-8px] border-2 border-card">
                            {leave.profiles?.avatar_url ? (
                              <AvatarImage src={leave.profiles.avatar_url} alt="" />
                            ) : null}
                            <AvatarFallback className="text-sm">
                              {(leave.profiles?.first_name?.[0] || '') + (leave.profiles?.last_name?.[0] || '')}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {/* Show count indicator if more people than max visible */}
                        {dayData.leaves.length > MAX_VISIBLE_AVATARS && (
                          <div className="w-8 h-8 mb-[-8px] bg-muted border-2 border-card rounded-full flex items-center justify-center">
                            <span className="text-sm font-normal text-foreground">
                              +{dayData.leaves.length - MAX_VISIBLE_AVATARS}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Day Details Sheet */}
      <Sheet open={!!selectedDay || isLoadingDayDetails} onOpenChange={() => {
        setSelectedDay(null)
        setIsLoadingDayDetails(false)
      }}>
        <SheetContent size="content">
          {/* Accessibility title - visually hidden */}
          <SheetTitle className="sr-only">
            {t('selectedDay')}
          </SheetTitle>

          {isLoadingDayDetails ? (
            <DaySheetSkeleton />
          ) : (
          <>
          <div className="flex flex-col gap-4 p-6">
            {/* Header */}
            <div className="flex flex-col gap-1.5">
              <h2 className="text-xl font-semibold text-foreground">
                {t('selectedDay')}
              </h2>
            </div>

            {selectedDay && (
              <>
                {/* Date Card - Dynamic background based on user leave status (matches dashboard background logic) */}
                <Card 
                  className="border border-border" 
                  style={{ 
                    backgroundImage: selectedDay.userLeaveStatus === 'vacation' 
                      ? 'var(--bg-vacation)' 
                      : selectedDay.userLeaveStatus === 'sick-leave'
                      ? 'var(--bg-sick-leave)'
                      : undefined,
                    backgroundColor: selectedDay.userLeaveStatus === 'vacation' || selectedDay.userLeaveStatus === 'sick-leave'
                      ? undefined
                      : 'var(--bg-default, var(--card-violet))'
                  }}
                >
                  <CardContent className="flex gap-6 items-start">
                    <div className="flex flex-1 flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xl font-normal text-foreground">
                            {selectedDay.dayName}
                          </p>
                          <p className="text-xl font-normal text-muted-foreground">
                            {selectedDay.year}
                          </p>
                        </div>
                        <div className="flex items-end justify-between">
                          <p className="text-5xl font-semibold text-foreground">
                            {selectedDay.day} {selectedDay.month.toLowerCase()}
                          </p>
                          {selectedDay.workSchedule?.isReady && (
                            <Badge variant="default" className="bg-primary text-primary-foreground">
                              {t('scheduleReady')}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Separator />
                      <div className="flex flex-col gap-1">
                        {selectedDay.dayStatus && (
                          <>
                            {(selectedDay.dayStatus.type === 'weekend' && !selectedDay.dayStatus.holidayName) || selectedDay.dayStatus.type === 'working' ? (
                              // Weekend without holiday or working day - single text only
                              <p className="text-xl font-semibold text-foreground">
                                {selectedDay.dayStatus.type === 'working'
                                  ? selectedDay.dayStatus.workHours
                                    ? t('youWorkThisDayHours', { hours: selectedDay.dayStatus.workHours })
                                    : t('youWorkThisDay')
                                  : selectedDay.dayStatus.message}
                              </p>
                            ) : (
                              // All other cases - header + message
                              <>
                                <p className="text-xl font-semibold text-foreground">
                                  {selectedDay.dayStatus.type === 'leave'
                                    ? t('youHaveLeave')
                                    : selectedDay.dayStatus.type === 'weekend' && selectedDay.dayStatus.holidayName
                                    ? t('weekendWithHoliday', {
                                        holidayType: selectedDay.dayStatus.holidayType === 'national'
                                          ? t('nationalHoliday')
                                          : t('companyHoliday')
                                      })
                                    : selectedDay.dayStatus.holidayType === 'national'
                                      ? t('nationalHoliday')
                                      : t('companyHoliday')
                                  }
                                </p>
                                <p className="text-xl font-normal text-muted-foreground">
                                  {selectedDay.dayStatus.message}
                                </p>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Request Leave Section - Only show if you don't already have leave on this day */}
                {!isFreeDay(selectedDay.day) && (
                  <Card>
                    <CardContent>
                      <div className="flex flex-col gap-2">
                        <CardHeader className="p-0 pb-2">
                          <p className="text-sm font-medium text-foreground">
                            {t('planLeave')}
                          </p>
                        </CardHeader>
                        <Button
                          variant="outline"
                          onClick={() => {
                            // Create date object from selected day
                            const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay.day)

                            // Dispatch custom event with the selected date
                            const event = new CustomEvent('openLeaveRequest', {
                              detail: { date: selectedDate }
                            })
                            window.dispatchEvent(event)

                            // Close the current day details sheet
                            setSelectedDay(null)
                          }}
                          aria-label={`Submit leave request for ${selectedDay.day} ${selectedDay.month}`}
                        >
                          <Plus className="h-4 w-4" aria-hidden="true" />
                          {t('submitLeaveRequest')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Working Team Members Section - "Na zmianie będą" */}
                {selectedDay.workingTeamMembers && selectedDay.workingTeamMembers.length > 0 && (
                  <Card>
                    <CardContent>
                      <CardHeader className="p-0 pb-3">
                        <p className="text-sm font-medium text-foreground">
                          {t('onShift')}
                        </p>
                      </CardHeader>
                      <div className="flex flex-col gap-2" role="list" aria-label="Working team members">
                        {selectedDay.workingTeamMembers.map((member) => (
                          <div key={member.id} className="flex gap-4 items-center min-w-[85px] w-full" role="listitem">
                            <Avatar className="w-10 h-10 shrink-0">
                              <AvatarImage src={member.avatar} alt={`${member.name}'s avatar`} />
                              <AvatarFallback>
                                {member.name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-1 flex-col items-start leading-0 min-h-px min-w-px text-sm">
                              <p className="font-medium text-foreground leading-5 overflow-ellipsis overflow-hidden whitespace-nowrap w-full">
                                {member.name}
                              </p>
                              {member.teamName && (
                                <p className="font-normal text-muted-foreground leading-5 overflow-ellipsis overflow-hidden whitespace-nowrap w-full">
                                  {member.teamName}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Planned Leaves Section - "Zaplanowane urlopy" */}
                {selectedDay.plannedLeaves && selectedDay.plannedLeaves.length > 0 && (
                  <Card>
                    <CardContent>
                      <CardHeader className="p-0 pb-3">
                        <p className="text-sm font-medium text-foreground">
                          {t('plannedLeaves')}
                        </p>
                      </CardHeader>
                      <div className="flex flex-col gap-2" role="list" aria-label="Planned leaves">
                        {selectedDay.plannedLeaves.map((leave) => {
                          const endDate = new Date(leave.end_date)
                          const formattedEndDate = `${endDate.getDate().toString().padStart(2, '0')}.${(endDate.getMonth() + 1).toString().padStart(2, '0')}`

                          return (
                            <div key={leave.id} className="flex gap-4 items-center min-w-[85px] w-full" role="listitem">
                              <Avatar className="w-10 h-10 shrink-0">
                                <AvatarImage src={leave.user_avatar} alt={`${leave.user_name}'s avatar`} />
                                <AvatarFallback>
                                  {leave.user_name.split(' ').map(n => n[0]).join('').toUpperCase() || leave.user_email[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-1 flex-col items-start leading-0 min-h-px min-w-px text-sm">
                                <p className="font-medium text-foreground leading-5 overflow-ellipsis overflow-hidden whitespace-nowrap w-full">
                                  {leave.user_name}
                                </p>
                                <p className="font-normal text-muted-foreground leading-5 overflow-ellipsis overflow-hidden whitespace-nowrap w-full">
                                  {leave.user_email}
                                </p>
                              </div>
                              <div className="flex flex-col items-end justify-center text-sm text-right shrink-0">
                                <p className="font-medium text-foreground leading-5 overflow-ellipsis overflow-hidden whitespace-nowrap">
                                  {leave.leave_type_name}
                                </p>
                                <p className="font-normal text-muted-foreground leading-5 overflow-ellipsis overflow-hidden whitespace-nowrap">
                                  {t('until')} {formattedEndDate}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
          
          {/* Footer with Close button - positioned right */}
          <SheetFooter className="flex flex-row justify-end gap-2 p-6">
            <Button
              variant="outline"
              onClick={() => setSelectedDay(null)}
            >
              {t('close')}
            </Button>
          </SheetFooter>
          </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
} 