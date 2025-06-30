'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, User } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { format, addDays, startOfWeek, endOfWeek, isSameDay, isToday, isSameMonth, addWeeks, subWeeks, startOfMonth, endOfMonth } from 'date-fns'
import { pl } from 'date-fns/locale'

interface TeamMember {
  id: string
  full_name: string | null
  email: string
  avatar_url?: string | null
  role: string
}

interface LeaveRequest {
  id: string
  userId: string
  startDate: string
  endDate: string
  status: string
  workingDays: number
  leaveType: {
    name: string
    color: string
  }
  user: {
    fullName: string
    email: string
    avatarUrl?: string | null
  }
}

interface Holiday {
  id: string
  name: string
  date: string
  holiday_type: string
}

interface TeamCalendarViewProps {
  teamMembers: TeamMember[]
  leaveRequests: LeaveRequest[]
  holidays: Holiday[]
}

interface DayDetails {
  date: Date
  leaves: LeaveRequest[]
  holiday: Holiday | null
  isWeekend: boolean
  isCurrentMonth: boolean
  isToday: boolean
}

// ✅ OPTIMIZATION: Memoize this heavy component to prevent unnecessary re-renders
export const TeamCalendarView = React.memo(function TeamCalendarView({ teamMembers, leaveRequests, holidays }: TeamCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<DayDetails | null>(null)
  const [dayDetailsOpen, setDayDetailsOpen] = useState(false)

  // Helper function to safely get date string without timezone issues
  const getDateString = (date: Date | string) => {
    if (typeof date === 'string') {
      return date
    }
    // Use local date string instead of ISO to avoid timezone issues
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Generate calendar grid for current month
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    // Get first day of month and calculate starting point
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    
    // Adjust to start from Monday (1) instead of Sunday (0)
    const firstDayOfWeek = firstDay.getDay()
    const mondayOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
    startDate.setDate(startDate.getDate() - mondayOffset)
    
    const days = []
    const endDate = new Date(lastDay)
    
    // Adjust end date to end on Sunday
    const lastDayOfWeek = lastDay.getDay()
    const sundayOffset = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek
    endDate.setDate(endDate.getDate() + sundayOffset)
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      days.push(new Date(date))
    }
    
    return days
  }

  const calendarDays = generateCalendarDays()

  const getLeavesForDate = (date: Date) => {
    const dateString = getDateString(date)
    const matchingLeaves = leaveRequests.filter(leave => {
      const startDate = leave.startDate
      const endDate = leave.endDate
      return dateString >= startDate && dateString <= endDate && leave.status === 'approved'
    })
    
    return matchingLeaves
  }

  // Function to get leave periods that should display their block starting on this date
  const getLeavePeriodsStartingOnDate = (date: Date) => {
    const dateString = getDateString(date)
    
    return leaveRequests.filter(leave => {
      if (leave.status !== 'approved') return false
      
      // Create proper date objects from the leave date strings
      const leaveStartParts = leave.startDate.split('-')
      const leaveStart = new Date(parseInt(leaveStartParts[0]), parseInt(leaveStartParts[1]) - 1, parseInt(leaveStartParts[2]))
      
      const leaveEndParts = leave.endDate.split('-')
      const leaveEnd = new Date(parseInt(leaveEndParts[0]), parseInt(leaveEndParts[1]) - 1, parseInt(leaveEndParts[2]))
      
      const currentDate = new Date(date)
      
      // Check if this date is within the leave period
      if (currentDate < leaveStart || currentDate > leaveEnd) return false
      
      // Simple approach: show the block on the first day of the leave that falls in this week
      // Calculate week boundaries (Monday to Sunday)
      const weekStart = new Date(currentDate)
      const dayOfWeek = currentDate.getDay()
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      weekStart.setDate(currentDate.getDate() - mondayOffset)
      
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      
      // Find the first day of this leave period that falls within this week
      let firstLeaveDay = null
      const testDate = new Date(weekStart)
      
      while (testDate <= weekEnd) {
        if (testDate >= leaveStart && testDate <= leaveEnd) {
          firstLeaveDay = new Date(testDate)
          break
        }
        testDate.setDate(testDate.getDate() + 1)
      }
      
      // Show block only on the first day of leave in this week
      if (firstLeaveDay && getDateString(firstLeaveDay) === dateString) {
        return true
      }
      
      return false
    })
  }

  // Function to calculate how many days a leave period spans in the current week row
  const getLeaveSpanInWeek = (leave: any, startDate: Date) => {
    // Create proper date objects from the leave date strings
    const leaveStartParts = leave.startDate.split('-')
    const leaveStart = new Date(parseInt(leaveStartParts[0]), parseInt(leaveStartParts[1]) - 1, parseInt(leaveStartParts[2]))
    
    const leaveEndParts = leave.endDate.split('-')
    const leaveEnd = new Date(parseInt(leaveEndParts[0]), parseInt(leaveEndParts[1]) - 1, parseInt(leaveEndParts[2]))
    
    // Calculate week boundaries (Monday to Sunday)
    const weekStart = new Date(startDate)
    const dayOfWeek = startDate.getDay()
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    weekStart.setDate(startDate.getDate() - mondayOffset)
    
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    
    // Find the actual overlap between leave and this week
    const overlapStart = new Date(Math.max(leaveStart.getTime(), weekStart.getTime()))
    const overlapEnd = new Date(Math.min(leaveEnd.getTime(), weekEnd.getTime()))
    
    // Count days from startDate to the end of the overlap
    let dayCount = 0
    for (let d = new Date(startDate); d <= overlapEnd; d.setDate(d.getDate() + 1)) {
      if (d >= leaveStart && d <= leaveEnd) {
        dayCount++
      }
    }
    
    return Math.max(1, dayCount)
  }

  const getHolidayForDate = (date: Date) => {
    const dateString = getDateString(date)
    const holiday = holidays.find(holiday => holiday.date === dateString)
    
    return holiday || null
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth()
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const handleDayClick = (date: Date) => {
    const leaves = getLeavesForDate(date)
    const holiday = getHolidayForDate(date)
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    
    const dayDetails: DayDetails = {
      date,
      leaves,
      holiday,
      isWeekend,
      isCurrentMonth: isCurrentMonth(date),
      isToday: isToday(date)
    }
    
    setSelectedDay(dayDetails)
    setDayDetailsOpen(true)
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1))
    setCurrentDate(newDate)
  }

  const monthNames = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
  ]

  const dayNames = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd']

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pl-PL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getHolidayTypeDisplayName = (type: string) => {
    switch (type) {
      case 'national': return 'Święto państwowe'
      case 'organization': return 'Święto firmowe'
      default: return 'Święto'
    }
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Dziś
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b bg-muted">
          {dayNames.map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 bg-background relative">
          {/* Holiday badges layer - positioned above leave blocks */}
          <div className="absolute inset-0 z-20 pointer-events-none">
            {calendarDays.map((date, index) => {
              const holiday = getHolidayForDate(date)
              if (!holiday) return null
              
              const row = Math.floor(index / 7)
              const col = index % 7
              const cellWidth = 100 / 7
              const leftPercent = col * cellWidth
              const topPixels = row * 160 + 8 // 160px = min-h-40, 8px = top margin
              
              return (
                <div
                  key={`holiday-${index}`}
                  className="absolute"
                  style={{
                    left: `${leftPercent}%`,
                    width: `${cellWidth}%`,
                    top: `${topPixels}px`,
                    paddingLeft: '8px',
                    paddingRight: '8px'
                  }}
                >
                  <Badge 
                    variant="secondary" 
                    className={`text-xs w-full justify-start ${
                      holiday.holiday_type === 'national' 
                        ? 'bg-destructive/10 text-destructive-foreground border-destructive/20' 
                        : 'bg-warning/10 text-warning border-warning/20'
                    }`}
                  >
                    {holiday.name.length > 12 ? holiday.name.substring(0, 12) + '...' : holiday.name}
                  </Badge>
                </div>
              )
            })}
          </div>
          
          {/* Leave blocks layer - positioned relative to entire grid */}
          <div className="absolute inset-0 z-10 pointer-events-none">
            {calendarDays.map((date, index) => {
              const leavesStartingToday = getLeavePeriodsStartingOnDate(date)
              const holiday = getHolidayForDate(date)
              const row = Math.floor(index / 7)
              const col = index % 7
              
              return leavesStartingToday.slice(0, 3).map((leave, leaveIndex) => {
                const spanDays = getLeaveSpanInWeek(leave, date)
                const holidayOffset = holiday ? 35 : 0 // Space for holiday badge
                const baseTop = 8 + holidayOffset // Start from top with small margin
                const topPosition = baseTop + (leaveIndex * 24) // 24px spacing between blocks
                
                // Calculate position relative to entire grid
                const cellWidth = 100 / 7 // Each cell = 14.28% of total width
                const leftPercent = col * cellWidth
                const widthPercent = spanDays * cellWidth
                const topPixels = row * 160 + topPosition // 160px = min-h-40
                
                return (
                  <div
                    key={`${leave.id}-${index}`}
                    className="absolute flex items-center text-xs pointer-events-auto"
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                      top: `${topPixels}px`,
                      height: '20px',
                      paddingLeft: '8px',
                      paddingRight: '8px'
                    }}
                    title={`${leave.user?.fullName} - ${leave.leaveType?.name} (${leave.startDate} do ${leave.endDate})`}
                  >
                    <div
                      className="w-full px-2 py-1 rounded text-white text-xs font-medium flex items-center truncate"
                      style={{ backgroundColor: leave.leaveType?.color || 'hsl(var(--primary))' }}
                    >
                      {leave.user?.fullName || leave.user?.email?.split('@')[0]}
                      {leave.status === 'pending' && (
                        <div className="w-2 h-2 bg-warning rounded-full ml-1 flex-shrink-0" title="Oczekujący" />
                      )}
                    </div>
                  </div>
                )
              })
            })}
          </div>
          
          {/* Calendar cells - just content, no leave blocks or holiday badges */}
          {calendarDays.map((date, index) => {
            const dateStr = getDateString(date)
            const leavesToday = getLeavesForDate(date)
            const leavesStartingToday = getLeavePeriodsStartingOnDate(date)
            const holiday = getHolidayForDate(date)
            const isNonWorkingDay = date.getDay() === 0 || date.getDay() === 6 || !!holiday

            return (
              <div
                key={index}
                className={`border-r border-b border-border min-h-40 p-2 cursor-pointer transition-colors hover:bg-muted relative ${
                  !isCurrentMonth(date) 
                    ? 'bg-muted text-muted-foreground' 
                    : isToday(date)
                    ? 'bg-primary/5 border-primary/20'
                    : isNonWorkingDay
                    ? 'bg-muted opacity-75'
                    : 'bg-background'
                }`}
                onClick={() => handleDayClick(date)}
              >
                {/* Day number */}
                <div className={`absolute bottom-2 left-2 text-sm ${
                  isToday(date) 
                    ? 'font-bold text-primary' 
                    : isNonWorkingDay
                    ? 'text-muted-foreground'
                    : 'text-foreground'
                }`}>
                  {date.getDate()}
                </div>

                {/* Show overflow indicator if needed */}
                {leavesStartingToday.length > 3 && (
                  <div className="absolute bottom-8 left-2 text-xs text-muted-foreground">
                    +{leavesStartingToday.length - 3} więcej
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary rounded"></div>
          <span>Dziś</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-destructive/10 border border-destructive/20 rounded"></div>
          <span>Święta państwowe</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-warning/10 border border-warning/20 rounded"></div>
          <span>Święta firmowe</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-warning rounded-full"></div>
          <span>Oczekujący wniosek</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-muted border border-input rounded opacity-75"></div>
          <span>Dni wolne (weekendy i święta)</span>
        </div>
        <div className="text-muted-foreground">
          <strong>Kliknij na dzień, aby zobaczyć szczegóły</strong>
        </div>
      </div>

      {/* Day Details Dialog */}
      <Dialog open={dayDetailsOpen} onOpenChange={setDayDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDay && formatDate(selectedDay.date)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedDay && (
            <div className="space-y-4">
              {/* Holiday Information */}
              {selectedDay.holiday && (
                <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <h4 className="font-medium text-destructive-foreground mb-1">
                    {selectedDay.holiday.name}
                  </h4>
                  <p className="text-sm text-destructive">
                    {getHolidayTypeDisplayName(selectedDay.holiday.holiday_type)}
                  </p>
                </div>
              )}

              {/* Weekend Information */}
              {selectedDay.isWeekend && (
                <div className="p-3 bg-muted border border-border rounded-lg">
                  <h4 className="font-medium text-foreground">
                    Weekend
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Dzień wolny od pracy
                  </p>
                </div>
              )}

              {/* Leave Requests */}
              {selectedDay.leaves.length > 0 ? (
                <div>
                  <h4 className="font-medium mb-2">
                    Urlopy ({selectedDay.leaves.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedDay.leaves.map((leave) => (
                      <div key={leave.id} className="flex items-center gap-3 p-2 bg-muted rounded">
                        {leave.user?.avatarUrl ? (
                          <Image
                            src={leave.user.avatarUrl}
                            alt={leave.user.fullName || leave.user.email}
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {leave.user?.fullName || leave.user?.email}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              style={{ backgroundColor: leave.leaveType?.color }}
                              className="text-xs text-white"
                            >
                              {leave.leaveType?.name}
                            </Badge>
                            {leave.status === 'pending' && (
                              <Badge variant="outline" className="text-xs">
                                Oczekuje
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                !selectedDay.holiday && !selectedDay.isWeekend && (
                  <div className="text-center py-4 text-muted-foreground">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-2">
                      <User className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm">Brak urlopów w tym dniu</p>
                    <p className="text-xs">Wszyscy członkowie zespołu dostępni</p>
                  </div>
                )
              )}

              {/* Capacity Information */}
              {teamMembers.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Dostępność zespołu:</span>
                    <span className="font-medium">
                      {Math.round(((teamMembers.length - selectedDay.leaves.length) / teamMembers.length) * 100)}%
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {teamMembers.length - selectedDay.leaves.length} z {teamMembers.length} osób dostępnych
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}) 