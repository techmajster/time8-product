'use client'

import { useState } from 'react'
import Link from 'next/link'
import CalendarClient from '@/app/calendar/components/CalendarClient'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ChevronLeft, ChevronRight, Fullscreen } from 'lucide-react'

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
}

const monthNames = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
]

export function DashboardCalendar({
  organizationId,
  countryCode,
  userId,
  colleagues,
  teamMemberIds,
  teamScope,
  calendarTitle
}: DashboardCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }


  return (
    <Card className="border border-border p-0 flex flex-col">
      <CardContent className="p-0 flex flex-col">
        {/* Header - Single line with title, navigation, and button */}
        <div className="flex items-center justify-between px-6 pt-6 pb-6">
          {/* Title */}
          <h3 className="text-xl font-semibold text-foreground">
            {calendarTitle}
          </h3>

          {/* Month Navigation - Center */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePreviousMonth}
              className="h-8 w-8 opacity-50 hover:opacity-100 bg-card"
              aria-label="Previous month"
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
              className="h-8 w-8 opacity-50 hover:opacity-100 bg-card"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          {/* Pełny widok Button */}
          <Button
            variant="outline"
            asChild
            className="h-8"
          >
            <Link href="/calendar">
              <Fullscreen className="h-4 w-4 mr-2" />
              Pełny widok
            </Link>
          </Button>
        </div>

        {/* Calendar */}
        <div className="px-6 mb-6">
          <CalendarClient
            organizationId={organizationId}
            countryCode={countryCode}
            userId={userId}
            colleagues={colleagues}
            teamMemberIds={teamMemberIds}
            teamScope={teamScope}
            showHeader={false}
            showPadding={false}
            externalCurrentDate={currentDate}
            onDateChange={setCurrentDate}
            hideNavigation={true}
          />
        </div>
      </CardContent>
    </Card>
  )
}

