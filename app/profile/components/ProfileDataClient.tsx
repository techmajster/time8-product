'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar } from 'lucide-react'
import { useProfileLeaveBalances, useRecentLeaveRequests } from '@/hooks/use-profile-queries'

interface LeaveBalance {
  id: string
  user_id: string
  leave_type_id: string
  remaining_days: number
  leave_types: {
    name: string
    color: string
  }
}

interface RecentLeaveRequest {
  id: string
  start_date: string
  end_date: string
  status: string
  leave_types: {
    name: string
    color: string
  }[]
}

interface ProfileDataClientProps {
  userId: string
  initialLeaveBalances: LeaveBalance[]
  initialRecentRequests: RecentLeaveRequest[]
  monthNames: string[]
}

export function ProfileDataClient({
  userId,
  initialLeaveBalances,
  initialRecentRequests,
  monthNames,
}: ProfileDataClientProps) {
  // Use React Query hooks with initial SSR data
  const { data: leaveBalances = initialLeaveBalances } = useProfileLeaveBalances(
    userId,
    new Date().getFullYear(),
    initialLeaveBalances
  )
  const { data: recentRequests = initialRecentRequests } = useRecentLeaveRequests(
    userId,
    initialRecentRequests
  )

  return (
    <>
      {/* Leave Balance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Saldo urlopowe
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaveBalances && leaveBalances.length > 0 ? (
            <div className="space-y-3">
              {leaveBalances.map((balance) => (
                <div key={balance.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: balance.leave_types?.color }}
                    />
                    <span className="text-sm text-foreground">{balance.leave_types?.name}</span>
                  </div>
                  <span className="font-medium text-foreground">
                    {balance.remaining_days} dni
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Brak przydzielonych urlopów</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Ostatnie wnioski
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentRequests && recentRequests.length > 0 ? (
            <div className="space-y-3">
              {recentRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: request.leave_types?.[0]?.color }}
                    />
                    <span>{request.leave_types?.[0]?.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                      {new Date(request.start_date).toLocaleDateString('pl-PL')} -{' '}
                      {new Date(request.end_date).toLocaleDateString('pl-PL')}
                    </div>
                    <Badge
                      variant={
                        request.status === 'approved'
                          ? 'default'
                          : request.status === 'pending'
                          ? 'secondary'
                          : 'destructive'
                      }
                      className="text-xs"
                    >
                      {request.status === 'approved'
                        ? 'Zatwierdzony'
                        : request.status === 'pending'
                        ? 'Oczekujący'
                        : request.status === 'rejected'
                        ? 'Odrzucony'
                        : 'Anulowany'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Brak wniosków urlopowych</p>
          )}
        </CardContent>
      </Card>
    </>
  )
}
