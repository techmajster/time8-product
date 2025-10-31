'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface CurrentDayCardProps {
  todayText: string
  day: number
  dateText: string
  year: number
  workStatus: string
  workHours: string
}

export function CurrentDayCard({
  todayText,
  day,
  dateText,
  year,
  workStatus,
  workHours
}: CurrentDayCardProps) {
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
              {workStatus}
            </p>
            <div className="flex flex-col justify-end text-muted-foreground whitespace-nowrap">
              <p className="text-xl font-normal leading-7">{workHours}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

