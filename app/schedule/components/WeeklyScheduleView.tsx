'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ChevronLeft, ChevronRight, Clock, User, Calendar } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface TeamMember {
  id: string
  full_name: string | null
  email: string
  role: string
  avatar_url?: string | null
}

interface EmployeeSchedule {
  id: string
  user_id: string
  organization_id: string
  date: string
  shift_start_time?: string
  shift_end_time?: string
  is_working_day: boolean
  notes?: string
  created_at?: string
  updated_at?: string
}

interface WeeklyScheduleViewProps {
  teamMembers: TeamMember[]
  userRole: 'admin' | 'manager' | 'employee'
}

export function WeeklyScheduleView({ teamMembers, userRole }: WeeklyScheduleViewProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [schedules, setSchedules] = useState<EmployeeSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSchedules()
  }, [currentWeek])

  const loadSchedules = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/schedule/weekly')
      const data = await response.json()
      
      if (!response.ok) {
        console.error('API Error Response:', data)
        throw new Error(`${data.error || 'Failed to fetch schedules'}${data.details ? ' - ' + data.details : ''}`)
      }
      
      setSchedules(data.schedules || [])
    } catch (err) {
      console.error('Error fetching schedules:', err)
      setError(err instanceof Error ? err.message : 'Błąd podczas ładowania harmonogramów')
    } finally {
      setLoading(false)
    }
  }

  const getWeekDates = () => {
    const startOfWeek = new Date(currentWeek)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Monday as first day
    startOfWeek.setDate(diff)
    
    const dates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7))
    setCurrentWeek(newWeek)
  }

  const goToToday = () => {
    setCurrentWeek(new Date())
  }

  const formatTime = (time?: string | null) => {
    if (!time) return '--:--'
    return time.slice(0, 5) // Extract HH:MM from HH:MM:SS
  }

  const getDayName = (date: Date) => {
    return date.toLocaleDateString('pl-PL', { weekday: 'short' })
  }

  const getDateDisplay = (date: Date) => {
    return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const getWeekRange = () => {
    const dates = getWeekDates()
    const start = dates[0]
    const end = dates[6]
    
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()}-${end.getDate()} ${start.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}`
    } else {
      return `${start.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })}`
    }
  }

  const getUserSchedule = (userId: string) => {
    // Find the most recent schedule for this user
    const userSchedules = schedules.filter(s => s.user_id === userId)
    
    if (userSchedules.length === 0) return null
    
    // For now, just return the first schedule without date sorting since we don't know the date field name yet
    return userSchedules[0]
  }

  const getScheduleForDay = (userId: string, date: Date) => {
    const dateString = date.toISOString().split('T')[0]
    
    // Find schedule for this specific user and date
    const daySchedule = schedules.find(s => 
      s.user_id === userId && s.date === dateString
    )
    
    if (!daySchedule) {
      return { isWorking: false, start: null, end: null }
    }
    
    return {
      isWorking: daySchedule.is_working_day,
      start: daySchedule.shift_start_time,
      end: daySchedule.shift_end_time
    }
  }

  const weekDates = getWeekDates()
  const dayNames = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd']

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Harmonogramy tygodniowe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Ładowanie harmonogramów...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Harmonogramy tygodniowe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={loadSchedules} 
            variant="outline" 
            className="mt-4"
          >
            Spróbuj ponownie
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Harmonogramy tygodniowe
            </CardTitle>
            <CardDescription>
              {getWeekRange()}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Dziś
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          {/* Header Row */}
          <div className="grid grid-cols-8 border-b bg-muted">
            <div className="p-3 font-medium text-sm">Pracownik</div>
            {weekDates.map((date, index) => (
              <div 
                key={index} 
                className={`p-3 text-center text-sm font-medium ${
                  isToday(date) ? 'bg-primary/10 text-primary' : ''
                }`}
              >
                <div className="font-semibold">{dayNames[index]}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {getDateDisplay(date)}
                </div>
              </div>
            ))}
          </div>

          {/* Team Member Rows */}
          {teamMembers.length === 0 ? (
            <div className="p-8 text-center">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Brak członków zespołu</h3>
              <p className="text-sm text-muted-foreground">
                Nie znaleziono członków zespołu do wyświetlenia harmonogramów.
              </p>
            </div>
          ) : (
            teamMembers.map((member) => {
              return (
                <div key={member.id} className="grid grid-cols-8 border-b hover:bg-muted/50">
                  {/* Team Member Info */}
                  <div className="p-3 flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage 
                        src={member.avatar_url || undefined} 
                        alt={member.full_name || member.email || undefined} 
                      />
                      <AvatarFallback>
                        {member.full_name?.split(' ').map(n => n[0]).join('') || member.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {member.full_name || member.email}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {member.role}
                      </div>
                    </div>
                  </div>

                  {/* Schedule for each day */}
                  {weekDates.map((date, dayIndex) => {
                    const daySchedule = getScheduleForDay(member.id, date)
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6
                    
                    return (
                      <div 
                        key={dayIndex} 
                        className={`p-3 text-center border-r ${
                          isToday(date) ? 'bg-primary/5' : ''
                        } ${isWeekend ? 'bg-muted/30' : ''}`}
                      >
                        {daySchedule.isWorking ? (
                          <div className="space-y-1">
                            <Badge 
                              variant="default" 
                              className="text-xs bg-green-100 text-green-800 border-green-200"
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Praca
                            </Badge>
                            <div className="text-xs text-muted-foreground">
                              {formatTime(daySchedule.start)} - {formatTime(daySchedule.end)}
                            </div>
                          </div>
                        ) : (
                          <Badge 
                            variant="outline" 
                            className="text-xs text-muted-foreground"
                          >
                            Wolne
                          </Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded"></div>
            <span>Dziś</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-200">
              Praca
            </Badge>
            <span>Dzień roboczy</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Wolne</Badge>
            <span>Dzień wolny</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-muted/50 border border-input rounded"></div>
            <span>Weekend</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 