'use client'

import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, TrendingDown, AlertTriangle, Users } from 'lucide-react'

interface TeamMember {
  id: string
  full_name: string | null
  email: string
  avatar_url?: string | null
}

interface LeaveRequest {
  id: string
  user_id: string
  start_date: string
  end_date: string
  status: string
  working_days: number
  leave_types: {
    name: string
    color: string
  } | null
  profiles: {
    full_name: string | null
    email: string
    avatar_url?: string | null
  } | null
}

interface CapacityOverviewProps {
  teamMembers: TeamMember[]
  leaveRequests: LeaveRequest[]
}

export function CapacityOverview({ teamMembers, leaveRequests }: CapacityOverviewProps) {
  const totalTeamSize = teamMembers.length

  // Helper function to get week dates
  const getWeekDates = (weekOffset: number) => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay() + (weekOffset * 7))
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    return { start: startOfWeek, end: endOfWeek }
  }

  // Calculate capacity for a given week
  const calculateWeekCapacity = (weekOffset: number) => {
    const { start, end } = getWeekDates(weekOffset)
    
    const peopleOnLeave = new Set()
    
    leaveRequests.forEach(leave => {
      if (leave.status !== 'approved') return
      
      const leaveStart = new Date(leave.start_date)
      const leaveEnd = new Date(leave.end_date)
      
      // Check if leave overlaps with this week
      if (leaveStart <= end && leaveEnd >= start) {
        peopleOnLeave.add(leave.user_id)
      }
    })

    const availablePeople = totalTeamSize - peopleOnLeave.size
    const capacity = totalTeamSize > 0 ? Math.round((availablePeople / totalTeamSize) * 100) : 100
    
    return {
      capacity,
      availablePeople,
      peopleOnLeave: peopleOnLeave.size,
      start,
      end
    }
  }

  // Get capacity for next 4 weeks
  const weeklyCapacity = Array.from({ length: 4 }, (_, i) => ({
    week: i,
    ...calculateWeekCapacity(i)
  }))

  const formatWeekLabel = (start: Date, end: Date) => {
    const startDay = start.getDate()
    const endDay = end.getDate()
    const month = start.toLocaleDateString('pl-PL', { month: 'short' })
    
    if (start.getMonth() === end.getMonth()) {
      return `${startDay}-${endDay} ${month}`
    } else {
      const endMonth = end.toLocaleDateString('pl-PL', { month: 'short' })
      return `${startDay} ${month} - ${endDay} ${endMonth}`
    }
  }

  const getCapacityColor = (capacity: number) => {
    if (capacity >= 80) return 'text-success'
    if (capacity >= 60) return 'text-warning'
    return 'text-destructive'
  }

  const getCapacityIcon = (capacity: number) => {
    if (capacity >= 80) return <TrendingUp className="h-4 w-4 text-success" />
    if (capacity >= 60) return <AlertTriangle className="h-4 w-4 text-warning" />
    return <TrendingDown className="h-4 w-4 text-destructive" />
  }

  const getCapacityBadge = (capacity: number) => {
    if (capacity >= 80) return <Badge className="bg-success/10 text-success-foreground border-success/20">Dobra</Badge>
    if (capacity >= 60) return <Badge className="bg-warning/10 text-warning-foreground border-warning/20">Średnia</Badge>
    return <Badge className="bg-destructive/10 text-destructive-foreground border-destructive/20">Niska</Badge>
  }

  // Calculate average capacity
  const averageCapacity = Math.round(
    weeklyCapacity.reduce((sum, week) => sum + week.capacity, 0) / weeklyCapacity.length
  )

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-foreground">Średnia dostępność zespołu</h4>
          <Users className="h-5 w-5 text-primary" />
        </div>
                  <div className="text-2xl font-bold text-foreground mb-1">
          {averageCapacity}%
        </div>
                  <p className="text-sm text-muted-foreground">
          na najbliższe 4 tygodnie
        </p>
      </div>

      {/* Weekly Breakdown */}
      <div className="space-y-4">
        <h4 className="font-medium">Dostępność tygodniowa</h4>
        
        {weeklyCapacity.map((week) => (
          <div key={week.week} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getCapacityIcon(week.capacity)}
                <span className="text-sm font-medium">
                  {week.week === 0 ? 'Ten tydzień' : 
                   week.week === 1 ? 'Przyszły tydzień' : 
                   `Za ${week.week + 1} tygodnie`}
                </span>
                {getCapacityBadge(week.capacity)}
              </div>
              <span className={`font-bold ${getCapacityColor(week.capacity)}`}>
                {week.capacity}%
              </span>
            </div>
            
            <div className="text-xs text-muted-foreground mb-2">
              {formatWeekLabel(week.start, week.end)}
            </div>
            
            <Progress 
              value={week.capacity} 
              className="h-2"
            />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{week.availablePeople} dostępnych</span>
              <span>{week.peopleOnLeave} na urlopie</span>
            </div>
          </div>
        ))}
      </div>

      {/* Capacity Alerts */}
      <div className="space-y-3">
        <h4 className="font-medium">Ostrzeżenia</h4>
        
        {weeklyCapacity.some(week => week.capacity < 60) ? (
          <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive-foreground">Niska dostępność</span>
            </div>
            <p className="text-xs text-destructive">
              Zespół będzie miał mniej niż 60% dostępności w niektórych tygodniach.
              Rozważ przesunięcie niektórych projektów.
            </p>
          </div>
        ) : weeklyCapacity.some(week => week.capacity < 80) ? (
          <div className="p-3 bg-warning/5 border border-warning/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium text-warning-foreground">Średnia dostępność</span>
            </div>
            <p className="text-xs text-warning">
              Dostępność zespołu będzie ograniczona w niektórych tygodniach.
              Planuj z tego względu.
            </p>
          </div>
        ) : (
          <div className="p-3 bg-success/5 border border-success/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-sm font-medium text-success-foreground">Dobra dostępność</span>
            </div>
            <p className="text-xs text-success">
              Zespół ma dobrą dostępność w najbliższych tygodniach.
            </p>
          </div>
        )}
      </div>

      {/* Team Stats */}
      <div className="pt-4 border-t">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-gray-900">{totalTeamSize}</div>
            <div className="text-xs text-muted-foreground">Członków zespołu</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">
              {leaveRequests.filter(l => l.status === 'pending').length}
            </div>
            <div className="text-xs text-muted-foreground">Oczekujących wniosków</div>
          </div>
        </div>
      </div>
    </div>
  )
} 