'use client'

import CalendarClient from '@/app/calendar/components/CalendarClient'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface DashboardCalendarProps {
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
  teamScope: any
  calendarTitle: string
  badgeText: string
  lastUpdateLabel?: string
  lastUpdateUser?: string
  lastUpdateDate?: string
}

export function DashboardCalendar({
  organizationId,
  countryCode,
  userId,
  colleagues,
  teamMemberIds,
  teamScope,
  calendarTitle,
  badgeText,
  lastUpdateLabel,
  lastUpdateUser,
  lastUpdateDate
}: DashboardCalendarProps) {
  return (
    <Card className="border border-border">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold text-foreground">
              {calendarTitle}
            </h3>
            <Badge variant="secondary" className="text-xs">
              {badgeText}
            </Badge>
          </div>
        </div>

        {/* Calendar */}
        <div className="mb-6">
          <CalendarClient
            organizationId={organizationId}
            countryCode={countryCode}
            userId={userId}
            colleagues={colleagues}
            teamMemberIds={teamMemberIds}
            teamScope={teamScope}
            showHeader={false}
            showPadding={false}
          />
        </div>

        {/* Separator */}
        <Separator className="mb-4" />

        {/* Last update info */}
        {lastUpdateLabel && lastUpdateUser && lastUpdateDate && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>{lastUpdateLabel}</span>
            <span>{lastUpdateUser}</span>
            <span>{lastUpdateDate}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

