'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Check, X } from 'lucide-react'
import { EditWorkingDaysSheet } from './EditWorkingDaysSheet'
import { EditWorkHoursSheet } from './EditWorkHoursSheet'
import { cn } from '@/lib/utils'

interface WorkModeSettingsProps {
  currentOrganization: {
    id: string
    work_mode?: 'monday_to_friday' | 'multi_shift'
    working_days?: string[]
    exclude_public_holidays?: boolean
    work_schedule_type?: 'daily' | 'multi_shift'
    daily_start_time?: string | null
    daily_end_time?: string | null
    shift_count?: number | null
    work_shifts?: Array<{
      label?: string
      start_time: string
      end_time: string
    }>
  }
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Pon',
  tuesday: 'Wt',
  wednesday: 'Śr',
  thursday: 'Czw',
  friday: 'Pt',
  saturday: 'Sob',
  sunday: 'Niedz',
}

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

export function WorkModeSettings({ currentOrganization: initialOrganization }: WorkModeSettingsProps) {
  const [editWorkingDaysOpen, setEditWorkingDaysOpen] = useState(false)
  const [editWorkHoursOpen, setEditWorkHoursOpen] = useState(false)
  const [organization, setOrganization] = useState(initialOrganization)

  // Sync with prop changes
  React.useEffect(() => {
    setOrganization(initialOrganization)
  }, [initialOrganization])

  const workingDays = organization?.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  const excludeHolidays = organization?.exclude_public_holidays ?? true
  const scheduleType = organization?.work_schedule_type || 'daily'
  const dailyStartTime = organization?.daily_start_time || '09:00'
  const dailyEndTime = organization?.daily_end_time || '17:00'
  const workShifts = organization?.work_shifts || []

  const handleOrganizationUpdate = (updatedOrg: any) => {
    setOrganization(prev => ({ ...prev, ...updatedOrg }))
  }

  const formatTime = (time: string | null | undefined) => {
    if (!time) return '09:00'
    // Handle both HH:MM and HH:MM:SS formats
    return time.split(':').slice(0, 2).join(':')
  }

  return (
    <div className="space-y-6">
      {/* Working Days Card */}
      <Card className="border-0 p-0">
        <CardHeader className="pb-0 p-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <CardTitle className="text-xl font-semibold">Dni pracujące</CardTitle>
              <CardDescription>
                Podstawowe informacje o przestrzeni roboczej
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditWorkingDaysOpen(true)}
              className="h-9"
            >
              Edytuj
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-0 p-0 space-y-6">
          {/* Day Chips - NO border */}
          <div className="flex gap-1 flex-wrap">
            {DAY_ORDER.map((dayKey) => {
              const isWorking = workingDays.includes(dayKey)
              return (
                <div
                  key={dayKey}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5',
                    isWorking
                      ? 'bg-card-violet text-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {isWorking ? (
                    <Check className="h-3 w-3 opacity-50" />
                  ) : (
                    <X className="h-3 w-3 opacity-50" />
                  )}
                  {DAY_LABELS[dayKey]}
                </div>
              )
            })}
          </div>

          {/* Public Holidays Checkbox - Disabled */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={excludeHolidays}
                disabled
              />
              <Label className="text-sm font-medium text-foreground">
                Wolne święta państwowe
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Święta wypadające w dni pracujące zostaną wyłączone z harmonogramu
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Separator */}
      <Separator />

      {/* Work Hours Card */}
      <Card className="border-0 p-0">
        <CardHeader className="pb-0 p-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <CardTitle className="text-xl font-semibold">Godziny pracy</CardTitle>
              <CardDescription>
                Podstawowe informacje o przestrzeni roboczej
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditWorkHoursOpen(true)}
              className="h-9"
            >
              Edytuj
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-0 p-0 space-y-6">
          {scheduleType === 'daily' ? (
            <>
              <div>
                <p className="text-sm font-medium">Praca codzienna</p>
                <p className="text-xs text-muted-foreground">
                  Stałe godziny pracy każdego dnia pracującego
                </p>
              </div>
              <div className="flex items-center gap-6">
                <p className="text-sm font-medium">Godziny pracy</p>
                <div className="flex items-center gap-3.5">
                  <p className="text-sm font-medium">Od</p>
                  <Select value={formatTime(dailyStartTime)} disabled>
                    <SelectTrigger className="w-[90px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={formatTime(dailyStartTime)}>{formatTime(dailyStartTime)}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm font-medium">do</p>
                  <Select value={formatTime(dailyEndTime)} disabled>
                    <SelectTrigger className="w-[90px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={formatTime(dailyEndTime)}>{formatTime(dailyEndTime)}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-sm font-medium">Praca według grafiku</p>
                <p className="text-xs text-muted-foreground">
                  Praca zmianowa w różnych dniach i/lub godzinach
                </p>
              </div>
              {workShifts.length > 0 && (
                <div className="space-y-6">
                  {workShifts.map((shift, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <p className="text-sm font-medium min-w-[120px]">
                        Zmiana {index + 1} pracuje
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Od</span>
                        <Select value={formatTime(shift.start_time)} disabled>
                          <SelectTrigger className="w-[90px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={formatTime(shift.start_time)}>{formatTime(shift.start_time)}</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-sm font-medium">do</span>
                        <Select value={formatTime(shift.end_time)} disabled>
                          <SelectTrigger className="w-[90px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={formatTime(shift.end_time)}>{formatTime(shift.end_time)}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Sheets */}
      <EditWorkingDaysSheet
        open={editWorkingDaysOpen}
        onOpenChange={setEditWorkingDaysOpen}
        organization={organization}
        onSave={handleOrganizationUpdate}
      />
      <EditWorkHoursSheet
        open={editWorkHoursOpen}
        onOpenChange={setEditWorkHoursOpen}
        organization={organization}
        onSave={handleOrganizationUpdate}
      />
    </div>
  )
}
