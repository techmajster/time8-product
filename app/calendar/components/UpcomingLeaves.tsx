'use client'

import { Badge } from '@/components/ui/badge'
import { User, Calendar } from 'lucide-react'
import Image from 'next/image'

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

interface UpcomingLeavesProps {
  leaveRequests: LeaveRequest[]
}

export function UpcomingLeaves({ leaveRequests }: UpcomingLeavesProps) {
  // Filter and sort upcoming leaves (next 30 days)
  const now = new Date()
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(now.getDate() + 30)

  const upcomingLeaves = leaveRequests
    .filter(leave => {
      const startDate = new Date(leave.startDate)
      return startDate >= now && startDate <= thirtyDaysFromNow
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 10) // Show max 10 upcoming leaves

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getDaysUntil = (dateString: string) => {
    const startDate = new Date(dateString)
    const now = new Date()
    const diffTime = startDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Dziś'
    if (diffDays === 1) return 'Jutro'
    if (diffDays <= 7) return `Za ${diffDays} dni`
    return formatDate(dateString)
  }

  const getStatusBadge = (status: string) => {
    // Unified status badge styling matching reference implementation
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-500 text-white border-transparent">Zatwierdzony</Badge>
      case 'pending':
        return <Badge variant="default">Oczekujący</Badge>
      case 'rejected':
        return <Badge variant="destructive">Odrzucony</Badge>
      case 'cancelled':
        return <Badge variant="secondary">Anulowany</Badge>
      case 'completed':
        return <Badge variant="secondary">Zakończony</Badge>
      default:
        return <Badge variant="secondary">Nieznany</Badge>
    }
  }

  if (upcomingLeaves.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Brak nadchodzących urlopów</p>
        <p className="text-xs">w najbliższych 30 dniach</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {upcomingLeaves.map((leave) => (
        <div key={leave.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted transition-colors">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {leave.user.avatarUrl ? (
              <Image
                src={leave.user.avatarUrl}
                alt={leave.user.fullName || leave.user.email}
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Leave Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-medium text-sm truncate">
                {leave.user.fullName || leave.user.email}
              </h4>
              {getStatusBadge(leave.status)}
            </div>

            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: leave.leaveType.color || '#gray' }}
              />
              <span className="text-sm text-muted-foreground truncate">
                {leave.leaveType.name}
              </span>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center justify-between">
                <span>
                  {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                </span>
                <span className="font-medium">
                  {leave.workingDays} dni
                </span>
              </div>
              <div className="text-primary font-medium">
                {getDaysUntil(leave.startDate)}
              </div>
            </div>
          </div>
        </div>
      ))}

      {leaveRequests.length > 10 && (
        <div className="text-center text-sm text-muted-foreground pt-2 border-t">
          Pokazano 10 z {upcomingLeaves.length} nadchodzących urlopów
        </div>
      )}
    </div>
  )
} 