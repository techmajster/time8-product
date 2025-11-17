'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface CurrentDayCardProps {
  todayText: string
  day: number
  dateText: string
  year: number
  workStatus: string
  workHours: string
  organization?: any
  currentDayName: string
}

export function CurrentDayCard({
  todayText,
  day,
  dateText,
  year,
  workStatus,
  workHours,
  organization,
  currentDayName
}: CurrentDayCardProps) {
  // Calculate actual work status and hours based on organization settings
  const { actualWorkStatus, actualWorkHours } = useMemo(() => {
    if (!organization) {
      return { actualWorkStatus: workStatus, actualWorkHours: workHours }
    }

    const workingDays = organization.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    const dailyStartTime = organization.daily_start_time || '09:00'
    const dailyEndTime = organization.daily_end_time || '17:00'

    // Map Polish day names to English
    const polishToEnglish: Record<string, string> = {
      'poniedziałek': 'monday',
      'wtorek': 'tuesday',
      'środa': 'wednesday',
      'czwartek': 'thursday',
      'piątek': 'friday',
      'sobota': 'saturday',
      'niedziela': 'sunday'
    }

    // Convert current day name to English lowercase
    const dayNameLower = currentDayName.toLowerCase()
    const englishDayName = polishToEnglish[dayNameLower] || dayNameLower

    // Check if today is a working day
    const isWorkingDay = workingDays.includes(englishDayName)

    if (!isWorkingDay) {
      return {
        actualWorkStatus: 'Nie pracujemy',
        actualWorkHours: '—'
      }
    }

    // Format work hours
    const formattedHours = `${dailyStartTime.substring(0, 5)} - ${dailyEndTime.substring(0, 5)}`

    return {
      actualWorkStatus: workStatus,
      actualWorkHours: formattedHours
    }
  }, [organization, currentDayName, workStatus, workHours])
  return (
    <Card className="border border-border rounded-lg bg-transparent p-0">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4">
          {/* Date header */}
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between w-full">
              <p className="flex-1 text-xl font-normal leading-7 text-card-foreground whitespace-pre-wrap">
                {todayText}
              </p>
              <p className="text-xl font-normal leading-7 text-muted-foreground">
                {year}
              </p>
            </div>
            <div className="flex items-end justify-between w-full">
              <p className="flex-1 text-5xl font-semibold leading-tight text-card-foreground whitespace-pre-wrap">
                {dateText}
              </p>
            </div>
          </div>

          {/* Separator */}
          <Separator />

          {/* Work status */}
          <div className="flex flex-col gap-1">
            <p className="text-xl font-semibold leading-7 text-card-foreground whitespace-pre-wrap w-full">
              {actualWorkStatus}
            </p>
            <div className="flex flex-col justify-end text-muted-foreground whitespace-nowrap">
              <p className="text-xl font-normal leading-7">{actualWorkHours}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

