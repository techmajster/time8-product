'use client'

import { useState, useEffect } from 'react'
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
import { ChevronLeft, ChevronRight, Plus, TreePalm, Gift, BriefcaseMedical, Calendar, Info, User, Plane, Briefcase } from 'lucide-react'
import { LeaveRequestButton } from '@/app/dashboard/components/LeaveRequestButton'
import { TeamScope } from '@/lib/team-utils'
import { useCalendarLeaveRequests } from '@/hooks/useLeaveRequests'

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

export default function CalendarClient({ organizationId, countryCode, userId, colleagues, teamMemberIds, teamScope, showHeader = true, showPadding = true, workingDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] }: CalendarClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [selectedDay, setSelectedDay] = useState<SelectedDayData | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  console.log('📅 CalendarClient rendering with props:', {
    organizationId,
    countryCode,
    userId: userId ? `${userId.substring(0, 8)}...` : 'none',
    colleaguesCount: colleagues?.length || 0,
    teamMemberIdsCount: teamMemberIds?.length || 0
  })

  // Polish month names
  const monthNames = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
  ]

  // Polish day names
  const dayNames = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela']

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

  // Fetch holidays when component mounts or month changes
  useEffect(() => {
    fetchHolidays()
  }, [currentDate, organizationId, countryCode])

  const fetchHolidays = async () => {
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1

      console.log('🔍 Fetching holidays via API:', { year, month, countryCode })

      const params = new URLSearchParams({
        year: year.toString(),
        month: month.toString(),
        country_code: countryCode
      })

      console.log('🔍 Making holidays API request to:', `/api/calendar/holidays?${params}`)
      
      const response = await fetch(`/api/calendar/holidays?${params}`)
      
      console.log('🔍 Holidays API response status:', response.status, response.statusText)
      
      if (!response.ok) {
        let errorDetails
        try {
          errorDetails = await response.json()
        } catch {
          errorDetails = await response.text()
        }
        console.error('❌ Error fetching holidays from API:', {
          status: response.status,
          statusText: response.statusText,
          errorDetails,
          url: `/api/calendar/holidays?${params}`,
          countryCode
        })
        setHolidays([])
        return
      }

      const holidays = await response.json()
      console.log('📅 Fetched holidays from API:', holidays)
      setHolidays(holidays)
    } catch (error) {
      console.error('❌ Error fetching holidays:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      })
      setHolidays([])
    }
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
    
    return leaveRequests.filter(leave => {
      const startDate = leave.start_date
      const endDate = leave.end_date
      return dateStr >= startDate && dateStr <= endDate
    })
  }

  const getHolidayForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
    const holiday = holidays.find(holiday => holiday.date === dateStr)
    
    if (dateStr === '2025-07-22' || dateStr === '2025-07-23' || dateStr === '2025-07-24') {
      console.log('🔍 Holiday check for date:', dateStr, 'found:', holiday, 'all holidays:', holidays)
    }
    
    return holiday
  }

  // Check if a day is a free day (holiday, weekend, or your own leave)
  const isFreeDay = (day: number) => {
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    const dayOfWeek = selectedDate.getDay() // 0 = Sunday, 6 = Saturday
    const holiday = getHolidayForDay(day)

    // Check if it's a weekend based on organization's working days
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayName = dayNames[dayOfWeek]
    const isWeekend = !workingDays.includes(dayName)
    
    // Check if it's a holiday
    const isHoliday = !!holiday
    
    // Check if you have approved leave on this day
    const dateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
    
    if (dateStr === '2025-07-23') {
      console.log('🔍 Leave check for 2025-07-23:', {
        dateStr,
        userId,
        leaveRequests: leaveRequests.length,
        yourLeaves: leaveRequests.filter(leave => leave.user_id === userId),
        allApprovedLeaves: leaveRequests.filter(leave => leave.status === 'approved')
      })
    }
    
    const hasPersonalLeave = leaveRequests.some(leave => 
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
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    const dayName = selectedDate.toLocaleDateString('pl-PL', { weekday: 'long' })
    
    // Find holiday for this day
    const holiday = getHolidayForDay(day)
    const isFree = isFreeDay(day)
    
    console.log('🎯 Day clicked:', { day, selectedDate, holiday, isFree })
    
    // Get leave requests for this day
    const dayLeaves = getLeaveRequestsForDay(day)
    const mappedLeaves = dayLeaves.map(leave => ({
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
      .filter(leave => {
        // Check if the selected date falls within the leave period and exclude your own requests
        return selectedDateStr >= leave.start_date && 
               selectedDateStr <= leave.end_date &&
               leave.user_id !== userId
      })
      .map(leave => ({
        id: leave.id,
        user_id: leave.user_id,
        user_name: leave.profiles?.full_name || `${leave.profiles?.first_name || ''} ${leave.profiles?.last_name || ''}`.trim() || 'Unknown User',
        user_email: leave.profiles?.email || '',
        user_avatar: leave.profiles?.avatar_url,
        leave_type_name: leave.leave_types?.name || 'Urlop',
        leave_type_color: leave.leave_types?.color || '#3b82f6',
        end_date: leave.end_date
      }))

    // Fetch schedule data for the selected day
    const workSchedule = await fetchUserSchedule(selectedDateStr)
    const workingTeamMembers = await fetchWorkingTeamMembers(selectedDateStr)

    // Check if user has approved leave on this day to determine background color
    let userLeaveStatus: 'default' | 'vacation' | 'sick-leave' = 'default'
    const userLeave = leaveRequests.find(leave => 
      leave.user_id === userId && 
      leave.status === 'approved' &&
      selectedDateStr >= leave.start_date && 
      selectedDateStr <= leave.end_date
    )

    if (userLeave && userLeave.leave_types) {
      const leaveTypeName = userLeave.leave_types.name || ''
      // Determine background based on leave type name (same logic as useUserBackground hook)
      if (leaveTypeName === 'Urlop wypoczynkowy' || leaveTypeName.toLowerCase().includes('urlop')) {
        userLeaveStatus = 'vacation'
      } else if (leaveTypeName === 'Zwolnienie lekarskie' || leaveTypeName.toLowerCase().includes('zwolnienie')) {
        userLeaveStatus = 'sick-leave'
      } else {
        // For other leave types, default to vacation background
        userLeaveStatus = 'vacation'
      }
    }

    // Determine day status for dynamic message
    const dayOfWeek = selectedDate.getDay() // 0 = Sunday, 6 = Saturday
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayNameLower = dayNames[dayOfWeek]
    const isWeekend = !workingDays.includes(dayNameLower)
    
    let dayStatus: SelectedDayData['dayStatus']
    
    if (userLeave && userLeave.leave_types) {
      // User has approved leave on this day
      dayStatus = {
        type: 'leave',
        message: userLeave.leave_types.name || 'Urlop',
        leaveTypeName: userLeave.leave_types.name || 'Urlop'
      }
    } else if (isWeekend && holiday) {
      // Weekend with holiday - show weekend as header, holiday name below
      dayStatus = {
        type: 'weekend',
        message: holiday.name,
        holidayName: holiday.name,
        holidayType: holiday.type as 'national' | 'company'
      }
    } else if (isWeekend) {
      // Weekend without holiday - single text only
      dayStatus = {
        type: 'weekend',
        message: 'Weekend'
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
        message: 'Dzień roboczy'
      }
    }

    setSelectedDay({
      day,
      month: monthNames[currentDate.getMonth()],
      year: currentDate.getFullYear().toString(),
      dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
      leaves: mappedLeaves,
      holiday: holiday ? { name: holiday.name, type: holiday.type } : undefined,
      birthdays: dayBirthdays,
      plannedLeaves: dayPlannedLeaves,
      workSchedule: workSchedule || undefined,
      workingTeamMembers: workingTeamMembers.length > 0 ? workingTeamMembers : undefined,
      userLeaveStatus,
      dayStatus
    })
    setIsSheetOpen(true)
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
      
      days.push({
        day,
        isOutside: false,
        isCurrentMonth: true,
        isToday,
        leaves: getLeaveRequestsForDay(day),
        holiday: getHolidayForDay(day),
        birthdays: getBirthdaysForDay(day)
      })
    }
    
    // Next month days to fill the grid
    const remainingDays = 42 - days.length // 6 weeks * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        day,
        isOutside: true,
        isCurrentMonth: false
      })
    }
    
    return days
  }

  const calendarDays = generateCalendarDays()

  // Split days into weeks
  const weeks = []
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7))
  }

  return (
    <div className={showPadding ? "py-11" : ""}>
      {/* Page Header */}
      {showHeader && (
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold text-foreground">Kalendarz</h1>
          </div>
          <div className="flex items-center gap-3">
            <LeaveRequestButton />
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="flex flex-col gap-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between h-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePreviousMonth}
            className="h-8 w-8 opacity-50 hover:opacity-100 bg-card"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h2 className="text-base font-semibold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            className="h-8 w-8 opacity-50 hover:opacity-100 bg-card"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="flex flex-col gap-2">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2">
            {dayNames.map((dayName) => (
              <div key={dayName} className="flex items-center justify-center h-8">
                <span className="text-xs text-muted-foreground font-normal">
                  {dayName}
                </span>
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-2">
              {week.map((dayData, dayIndex) => (
                <button
                  key={`${weekIndex}-${dayIndex}`}
                  onClick={() => dayData.isCurrentMonth && handleDayClick(dayData.day)}
                  className={`
                    relative h-24 rounded-lg flex flex-col cursor-pointer transition-colors
                    ${dayData.isOutside 
                      ? 'opacity-50 bg-accent' 
                      : dayData.isToday 
                        ? 'bg-accent' 
                        : 'bg-accent hover:bg-accent/80'
                    }
                  `}
                  disabled={dayData.isOutside}
                >
                  {/* Day Number */}
                  <div className="flex items-start justify-start p-1.5">
                    <span className={`text-base ${dayData.isOutside ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {dayData.day}
                    </span>
                  </div>

                  {/* Holiday indicator */}
                  {dayData.holiday && (
                    <div className="absolute top-1 right-1">
                      <span className="text-xs">
                        {dayData.holiday.type === 'national' ? '🇵🇱' : '🏢'}
                      </span>
                    </div>
                  )}

                  {/* Birthday indicator - Bottom left */}
                  {dayData.birthdays && dayData.birthdays.length > 0 && (
                    <div className="absolute bottom-2 left-2">
                      <div className="w-[21px] h-[21px] rounded-full overflow-hidden">
                        <Gift className="w-5 h-5 text-foreground absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                  )}

                  {/* Avatars - Top right, vertically stacked as per Figma */}
                  {dayData.leaves && dayData.leaves.length > 0 && (
                    <div className="absolute top-2 right-2">
                      <div className="flex flex-col items-start justify-center pb-2 pt-0 px-0">
                        {/* Show first 2 avatars */}
                        {dayData.leaves.slice(0, 2).map((leave, index) => (
                          <Avatar key={leave.id} className="w-8 h-8 mb-[-8px] border-2 border-white">
                            {leave.profiles?.avatar_url ? (
                              <AvatarImage src={leave.profiles.avatar_url} />
                            ) : null}
                            <AvatarFallback className="text-sm">
                              {(leave.profiles?.first_name?.[0] || '') + (leave.profiles?.last_name?.[0] || '')}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {/* Show count indicator if more than 2 people */}
                        {dayData.leaves.length > 2 && (
                          <div className="w-8 h-8 mb-[-8px] bg-muted border-2 border-white rounded-full flex items-center justify-center">
                            <span className="text-sm font-normal text-foreground">
                              +{dayData.leaves.length - 2}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Day Details Sheet */}
      <Sheet open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <SheetContent size="content">
          {/* Accessibility title - visually hidden */}
          <SheetTitle className="sr-only">
            Szczegóły wybranego dnia
          </SheetTitle>
          
          <div className="flex flex-col gap-4 p-6">
            {/* Header */}
            <div className="flex flex-col gap-1.5">
              <h2 className="text-xl font-semibold text-foreground">
                Wybrany dzień
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
                              Grafik gotowy
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
                                    ? `Tego dnia pracujesz ${selectedDay.dayStatus.workHours}`
                                    : 'Tego dnia pracujesz'
                                  : selectedDay.dayStatus.message}
                              </p>
                            ) : (
                              // All other cases - header + message
                              <>
                                <p className="text-xl font-semibold text-foreground">
                                  {selectedDay.dayStatus.type === 'leave' 
                                    ? 'Masz urlop' 
                                    : selectedDay.dayStatus.type === 'weekend' && selectedDay.dayStatus.holidayName
                                    ? `Weekend, ${selectedDay.dayStatus.holidayType === 'national' ? 'Święto narodowe' : 'Święto firmowe'}`
                                    : selectedDay.dayStatus.holidayType === 'national'
                                      ? 'Święto narodowe'
                                      : 'Święto firmowe'
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
                            Planujesz urlop tego dnia?
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
                        >
                          <Plus className="h-4 w-4" />
                          Złóż wniosek o urlop
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
                          Na zmianie będą
                        </p>
                      </CardHeader>
                      <div className="flex flex-col gap-2">
                        {selectedDay.workingTeamMembers.map((member) => (
                          <div key={member.id} className="flex gap-4 items-center min-w-[85px] w-full">
                            <Avatar className="w-10 h-10 shrink-0">
                              <AvatarImage src={member.avatar} />
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
                          Zaplanowane urlopy
                        </p>
                      </CardHeader>
                      <div className="flex flex-col gap-2">
                        {selectedDay.plannedLeaves.map((leave) => {
                          const endDate = new Date(leave.end_date)
                          const formattedEndDate = `${endDate.getDate().toString().padStart(2, '0')}.${(endDate.getMonth() + 1).toString().padStart(2, '0')}`
                          
                          return (
                            <div key={leave.id} className="flex gap-4 items-center min-w-[85px] w-full">
                              <Avatar className="w-10 h-10 shrink-0">
                                <AvatarImage src={leave.user_avatar} />
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
                                  do {formattedEndDate}
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
              Zamknij
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
} 