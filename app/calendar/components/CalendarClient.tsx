'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
}

export default function CalendarClient({ organizationId, countryCode, userId, colleagues, teamMemberIds, teamScope, showHeader = true, showPadding = true }: CalendarClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [selectedDay, setSelectedDay] = useState<SelectedDayData | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const supabase = createClient()

  // Polish month names
  const monthNames = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
  ]

  // Polish day names
  const dayNames = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela']

  // Fetch data when component mounts or month changes
  useEffect(() => {
    fetchHolidays()
    fetchLeaveRequests()
  }, [currentDate, organizationId, countryCode, teamMemberIds])

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
        const errorText = await response.text()
        console.error('❌ Error fetching holidays from API:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          url: `/api/calendar/holidays?${params}`
        })
        setHolidays([])
        return
      }

      const holidays = await response.json()
      console.log('📅 Fetched holidays from API:', holidays)
      setHolidays(holidays)
    } catch (error) {
      console.error('❌ Error fetching holidays:', error)
      setHolidays([])
    }
  }

  const fetchLeaveRequests = async () => {
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1
      const startOfMonth = `${year}-${month.toString().padStart(2, '0')}-01`
      // Get the last day of the month properly
      const lastDayOfMonth = new Date(year, month, 0).getDate()
      const endOfMonth = `${year}-${month.toString().padStart(2, '0')}-${lastDayOfMonth.toString().padStart(2, '0')}`

      console.log('🔍 Fetching leave requests:', { year, month, startOfMonth, endOfMonth, organizationId, userId, teamScope: teamScope.type })

      // Use calendar-specific API endpoint with filtering parameters
      const params = new URLSearchParams({
        start_date: startOfMonth,
        end_date: endOfMonth,
        team_member_ids: teamMemberIds.join(',')
      })
      
      console.log('🔍 Making leave requests API request to:', `/api/calendar/leave-requests?${params}`)
      
      const response = await fetch(`/api/calendar/leave-requests?${params}`)
      
      console.log('🔍 Leave requests API response status:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Error fetching calendar leave requests:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          url: `/api/calendar/leave-requests?${params}`
        })
        setLeaveRequests([])
        return
      }

      const leaveData = await response.json()

      // Process leave requests data (already enriched from API)
      if (leaveData && leaveData.length > 0) {
        console.log('📝 Calendar leave requests from API:', leaveData)
        
        // Transform to match expected calendar format
        const transformedData = leaveData.map((leave: any) => ({
          ...leave,
          profiles: {
            id: leave.profiles?.id || leave.user_id,
            first_name: leave.profiles?.full_name?.split(' ')[0] || 'Unknown',
            last_name: leave.profiles?.full_name?.split(' ').slice(1).join(' ') || 'User',
            full_name: leave.profiles?.full_name || 'Unknown User',
            email: leave.profiles?.email || '',
            avatar_url: leave.profiles?.avatar_url || null
          },
          leave_types: {
            id: leave.leave_types?.id || leave.leave_type_id,
            name: leave.leave_types?.name || 'Unknown Type',
            color: leave.leave_types?.color || '#6b7280'
          }
        }))

        console.log('✅ Transformed calendar leave requests:', transformedData)
        setLeaveRequests(transformedData)
      } else {
        console.log('📝 No leave requests found for calendar')
        setLeaveRequests([])
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error)
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
    
    // Check if it's a weekend (Saturday or Sunday)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    
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

  const handleDayClick = (day: number) => {
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

    setSelectedDay({
      day,
      month: monthNames[currentDate.getMonth()],
      year: currentDate.getFullYear().toString(),
      dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
      leaves: mappedLeaves,
      holiday: holiday ? { name: holiday.name, type: holiday.type } : undefined,
      birthdays: dayBirthdays,
      plannedLeaves: dayPlannedLeaves
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
    <div className={showPadding ? "p-8" : ""}>
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
            className="h-8 w-8 opacity-50 hover:opacity-100 bg-white"
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
            className="h-8 w-8 opacity-50 hover:opacity-100 bg-white"
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
                        <Gift className="w-5 h-5 text-neutral-950 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
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
                          <div className="w-8 h-8 mb-[-8px] bg-neutral-100 border-2 border-white rounded-full flex items-center justify-center">
                            <span className="text-sm font-normal text-neutral-950">
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
          
          <div className="p-6">
            {/* Header */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Wybrany dzień
              </h2>
            </div>

            {selectedDay && (
              <>
                {/* Date Card - Exact Figma layout with separate date box */}
                <div className="flex items-start gap-6 mb-4">
                  {/* Date Box - Separate contained card */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-center min-w-[80px]">
                    <div className="text-4xl font-bold text-gray-900">
                      {selectedDay.day}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {selectedDay.month}
                    </div>
                  </div>
                  
                  {/* Date Info - Next to the date box */}
                  <div className="flex-1 pt-2">
                    <div className="text-lg font-medium text-gray-900">
                      {selectedDay.day} {selectedDay.month.toLowerCase()}
                    </div>
                    <div className="text-sm text-gray-600">
                      {selectedDay.dayName.toLowerCase()}
                    </div>
                    <div className="text-sm text-gray-600">
                      {selectedDay.year}
                    </div>
                  </div>
                </div>

                {/* Request Leave Section - Only show if you don't already have leave on this day */}
                {!isFreeDay(selectedDay.day) && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-gray-900">
                        Planujesz urlop tego dnia?
                      </p>
                      <Calendar className="h-4 w-4 text-gray-400" />
                    </div>
                    <Button 
                      className="bg-gray-900 text-white hover:bg-gray-800"
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
                      Złóż wniosek o urlop
                    </Button>
                  </div>
                )}

                {/* Day Status - Only show if it's a free day */}
                {isFreeDay(selectedDay.day) && (
                  <div className="bg-green-100 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-900">
                        Status dnia
                      </h3>
                      <Info className="h-4 w-4 text-gray-400" />
                    </div>
                    <p className="text-base font-semibold text-gray-900">
                      {selectedDay.holiday 
                        ? `Święto: ${selectedDay.holiday.name}`
                        : (() => {
                            // Check if you have leave on this day
                            const selectedDateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedDay.day.toString().padStart(2, '0')}`
                            const personalLeave = leaveRequests.find(leave => 
                              leave.user_id === userId && 
                              leave.status === 'approved' &&
                              selectedDateStr >= leave.start_date && 
                              selectedDateStr <= leave.end_date
                            )
                            
                            return personalLeave 
                              ? personalLeave.leave_types?.name || 'Urlop'
                              : 'Dziś masz wolne'
                          })()
                      }
                    </p>
                  </div>
                )}

                {/* Birthday Section - Only show if there are birthdays */}
                {selectedDay.birthdays && selectedDay.birthdays.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-900">
                        Dziś urodziny obchodzi
                      </h3>
                      <Gift className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="space-y-2">
                      {selectedDay.birthdays.map((birthday) => {
                        const birthDate = new Date(birthday.birth_date)
                        const formattedDate = `${birthDate.getDate()} ${monthNames[birthDate.getMonth()].toLowerCase()}`
                        
                        return (
                          <div key={birthday.id} className="text-sm">
                            <p className="font-medium text-gray-900">{birthday.full_name}</p>
                            <p className="text-gray-600">{formattedDate}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Planned Leaves Section - unified with Figma design */}
                {selectedDay.plannedLeaves && selectedDay.plannedLeaves.length > 0 && (
                  <div className="bg-white border border-neutral-200 rounded-[10px] p-4">
                    <div className="flex flex-row gap-3 items-start w-full mb-3">
                      <Info className="w-4 h-4 text-neutral-950 mt-0.5 shrink-0" />
                      <div className="text-sm font-medium leading-5 text-neutral-950">
                        Zaplanowane urlopy
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-8 w-full">
                      {selectedDay.plannedLeaves.map((leave) => {
                        const endDate = new Date(leave.end_date)
                        const formattedEndDate = `${endDate.getDate().toString().padStart(2, '0')}.${(endDate.getMonth() + 1).toString().padStart(2, '0')}`
                        
                        return (
                          <div key={leave.id} className="flex flex-row gap-4 items-center justify-start min-w-[85px] w-full">
                            <Avatar className="w-10 h-10 rounded-full bg-neutral-100">
                              <AvatarImage src={leave.user_avatar || undefined} />
                              <AvatarFallback className="bg-neutral-100 text-neutral-950">
                                {leave.user_name.split(' ').map(n => n[0]).join('') || leave.user_email[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="basis-0 flex flex-col grow items-start justify-start min-h-px min-w-px">
                              <div className="font-medium text-sm text-neutral-950 leading-5 w-full overflow-ellipsis overflow-hidden">
                                {leave.user_name}
                              </div>
                              <div className="font-normal text-sm text-neutral-500 leading-5 w-full overflow-ellipsis overflow-hidden">
                                {leave.user_email}
                              </div>
                            </div>
                            <div className="flex flex-col items-end justify-center text-sm text-right">
                              <div className="font-medium text-neutral-950 leading-5">
                                {leave.leave_type_name}
                              </div>
                              <div className="font-normal text-neutral-500 leading-5">
                                do {formattedEndDate}
                              </div>
                            </div>
                            <div className="bg-cyan-200 rounded-lg shrink-0 w-10 h-10 flex items-center justify-center">
                              <TreePalm className="w-6 h-6 text-neutral-950" />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Footer with Close button - positioned right */}
          <SheetFooter className="flex flex-row justify-end mt-auto p-4 gap-2">
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