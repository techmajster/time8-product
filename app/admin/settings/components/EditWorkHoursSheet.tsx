'use client'

import React, { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { useUpdateWorkMode } from '@/hooks/use-admin-mutations'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

interface EditWorkHoursSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organization: {
    id: string
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
  onSave?: (data: {
    work_schedule_type: 'daily' | 'multi_shift'
    daily_start_time?: string
    daily_end_time?: string
    shift_count?: number
    work_shifts?: Array<{ label?: string; start_time: string; end_time: string }>
  }) => void
}

interface WorkShift {
  label?: string
  start_time: string
  end_time: string
}

// Generate time options in 1-hour intervals
const generateTimeOptions = () => {
  const options: string[] = []
  for (let hour = 0; hour < 24; hour++) {
    const timeString = `${hour.toString().padStart(2, '0')}:00`
    options.push(timeString)
  }
  return options
}

const TIME_OPTIONS = generateTimeOptions()

export function EditWorkHoursSheet({
  open,
  onOpenChange,
  organization,
  onSave,
}: EditWorkHoursSheetProps) {
  const t = useTranslations('adminSettings.workMode.workHours')
  const [scheduleType, setScheduleType] = useState<'daily' | 'multi_shift'>(
    organization?.work_schedule_type || 'daily'
  )
  const [dailyStartTime, setDailyStartTime] = useState<string>(
    organization?.daily_start_time?.split(':').slice(0, 2).join(':') || '09:00'
  )
  const [dailyEndTime, setDailyEndTime] = useState<string>(
    organization?.daily_end_time?.split(':').slice(0, 2).join(':') || '17:00'
  )
  const [shiftCount, setShiftCount] = useState<number>(
    organization?.shift_count || 1
  )
  const [shifts, setShifts] = useState<WorkShift[]>(
    organization?.work_shifts && organization.work_shifts.length > 0
      ? organization.work_shifts
      : [{ start_time: '09:00', end_time: '17:00' }]
  )

  const updateWorkModeMutation = useUpdateWorkMode()

  // Sync state when organization changes
  useEffect(() => {
    if (organization) {
      const formattedStartTime = organization.daily_start_time?.split(':').slice(0, 2).join(':') || '09:00'
      const formattedEndTime = organization.daily_end_time?.split(':').slice(0, 2).join(':') || '17:00'

      setScheduleType(organization.work_schedule_type || 'daily')
      setDailyStartTime(formattedStartTime)
      setDailyEndTime(formattedEndTime)
      setShiftCount(organization.shift_count || 1)
      setShifts(
        organization.work_shifts && organization.work_shifts.length > 0
          ? organization.work_shifts
          : [{ start_time: '09:00', end_time: '17:00' }]
      )
    }
  }, [organization])

  // Update shifts when shift count changes
  useEffect(() => {
    if (scheduleType === 'multi_shift') {
      const newShifts: WorkShift[] = []
      for (let i = 0; i < shiftCount; i++) {
        if (shifts[i]) {
          newShifts.push(shifts[i])
        } else {
          newShifts.push({
            label: `Zmiana ${i + 1}`,
            start_time: '09:00',
            end_time: '17:00',
          })
        }
      }
      setShifts(newShifts)
    }
  }, [shiftCount, scheduleType])

  const hasChanges = () => {
    const currentType = organization?.work_schedule_type || 'daily'
    const currentDailyStart = organization?.daily_start_time || '09:00'
    const currentDailyEnd = organization?.daily_end_time || '17:00'
    const currentShiftCount = organization?.shift_count || 1
    const currentShifts = organization?.work_shifts || [{ start_time: '09:00', end_time: '17:00' }]

    if (scheduleType === 'daily') {
      return (
        currentType !== scheduleType ||
        currentDailyStart !== dailyStartTime ||
        currentDailyEnd !== dailyEndTime
      )
    } else {
      return (
        currentType !== scheduleType ||
        currentShiftCount !== shiftCount ||
        JSON.stringify(currentShifts) !== JSON.stringify(shifts)
      )
    }
  }

  const handleSave = async () => {
    try {
      const payload: any = {
        work_schedule_type: scheduleType,
      }

      if (scheduleType === 'daily') {
        payload.daily_start_time = dailyStartTime
        payload.daily_end_time = dailyEndTime
      } else {
        // For multi-shift, validate that we have shifts
        if (shifts.length === 0 || shifts.length !== shiftCount) {
          throw new Error('Proszę skonfigurować wszystkie zmiany')
        }

        // Validate shift times
        for (const shift of shifts) {
          if (!shift.start_time || !shift.end_time) {
            throw new Error('Wszystkie zmiany muszą mieć ustawione godziny')
          }
          if (shift.start_time >= shift.end_time) {
            throw new Error('Godzina rozpoczęcia musi być wcześniejsza niż zakończenia')
          }
        }

        payload.shift_count = shiftCount
        payload.work_shifts = shifts
      }

      const updatedOrganization = await updateWorkModeMutation.mutateAsync(payload)

      if (onSave) {
        onSave(updatedOrganization)
      }

      onOpenChange(false)
    } catch (error) {
      // Error is handled by the mutation hook
      console.error('Error saving work hours:', error)
    }
  }

  const handleCancel = () => {
    // Reset to original values
    setScheduleType(organization?.work_schedule_type || 'daily')
    setDailyStartTime(organization?.daily_start_time || '09:00')
    setDailyEndTime(organization?.daily_end_time || '17:00')
    setShiftCount(organization?.shift_count || 1)
    setShifts(
      organization?.work_shifts && organization.work_shifts.length > 0
        ? organization.work_shifts
        : [{ start_time: '09:00', end_time: '17:00' }]
    )
    onOpenChange(false)
  }

  const updateShift = (index: number, field: 'label' | 'start_time' | 'end_time', value: string) => {
    setShifts((prev) => {
      const newShifts = [...prev]
      newShifts[index] = { ...newShifts[index], [field]: value }
      return newShifts
    })
  }


  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="lg" className="overflow-y-auto p-0">
        <div className="bg-background relative rounded-lg h-full flex flex-col">
          {/* Header */}
          <div className="p-6 pb-0">
            <SheetTitle className="text-xl font-semibold text-foreground">
              {t('title')}
            </SheetTitle>
          </div>

          {/* Separator */}
          <div className="h-px bg-border mt-6 mx-6" />

          {/* Scrollable Form Content */}
          <div className="flex-1 overflow-y-auto p-6 pt-6 space-y-6">
            {/* Schedule Type Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">{t('defineWorkMode')}</Label>
              <div className={cn(scheduleType === 'daily' ? 'space-y-6' : 'space-y-3')}>
                <div
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-lg border transition-colors cursor-pointer',
                    scheduleType === 'daily'
                      ? 'bg-violet-100 border-primary'
                      : 'bg-white dark:bg-secondary border-border hover:border-primary/50'
                  )}
                  onClick={() => setScheduleType('daily')}
                >
                  <RadioGroup
                    value={scheduleType}
                    onValueChange={(value) => setScheduleType(value as 'daily' | 'multi_shift')}
                  >
                    <RadioGroupItem value="daily" id="daily" className="pointer-events-none mt-0.5" />
                  </RadioGroup>
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="daily" className="text-sm font-medium leading-none cursor-pointer">
                      {t('dailyWork')}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t('dailyWorkDescription')}
                    </p>
                  </div>
                </div>

                {/* Hours BETWEEN the cards */}
                {scheduleType === 'daily' && (
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">{t('workHoursLabel')}</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{t('from')}</span>
                      <Select value={dailyStartTime} onValueChange={setDailyStartTime}>
                        <SelectTrigger className="w-[90px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {TIME_OPTIONS.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm font-medium">{t('to')}</span>
                      <Select value={dailyEndTime} onValueChange={setDailyEndTime}>
                        <SelectTrigger className="w-[90px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {TIME_OPTIONS.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-lg border transition-colors cursor-pointer',
                    scheduleType === 'multi_shift'
                      ? 'bg-violet-100 border-primary'
                      : 'bg-white dark:bg-secondary border-border hover:border-primary/50'
                  )}
                  onClick={() => setScheduleType('multi_shift')}
                >
                  <RadioGroup
                    value={scheduleType}
                    onValueChange={(value) => setScheduleType(value as 'daily' | 'multi_shift')}
                  >
                    <RadioGroupItem value="multi_shift" id="multi_shift" className="pointer-events-none mt-0.5" />
                  </RadioGroup>
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="multi_shift" className="text-sm font-medium leading-none cursor-pointer">
                      {t('multiShiftWork')}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t('multiShiftWorkDescription')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Multi-Shift Schedule */}
            {scheduleType === 'multi_shift' && (
              <div className="space-y-6">
                <div className="space-y-6">
                  <Label className="text-base font-semibold">{t('selectShiftCount')}</Label>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((count) => (
                      <div
                        key={count}
                        onClick={() => setShiftCount(count)}
                        className={cn(
                          'flex-1 flex items-center gap-2 p-3 rounded-lg border transition-colors cursor-pointer',
                          shiftCount === count
                            ? 'bg-violet-100 border-primary'
                            : 'bg-white dark:bg-secondary border-border hover:border-primary/50'
                        )}
                      >
                        <RadioGroup
                          value={shiftCount.toString()}
                          onValueChange={(value) => setShiftCount(parseInt(value))}
                        >
                          <RadioGroupItem value={count.toString()} className="pointer-events-none" />
                        </RadioGroup>
                        <span className="text-sm font-medium">
                          {count} {count === 1 ? t('shift') : t('shifts')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <Label className="text-base font-semibold">{t('defineWorkHours')}</Label>
                  <div className="space-y-6">
                    {shifts.map((shift, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <Label className="text-sm font-medium min-w-[120px]">
                          {t('shiftWorks', { number: index + 1 })}
                        </Label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{t('from')}</span>
                          <Select
                            value={shift.start_time}
                            onValueChange={(value) => updateShift(index, 'start_time', value)}
                          >
                            <SelectTrigger className="w-[90px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              {TIME_OPTIONS.map((time) => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-sm font-medium">{t('to')}</span>
                          <Select
                            value={shift.end_time}
                            onValueChange={(value) => updateShift(index, 'end_time', value)}
                          >
                            <SelectTrigger className="w-[90px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              {TIME_OPTIONS.map((time) => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Separator before footer */}
          <div className="h-px bg-border mx-6" />

          {/* Footer - Fixed at Bottom */}
          <SheetFooter className="flex flex-row gap-2 items-center justify-between w-full p-6 bg-background">
            <Button variant="outline" onClick={handleCancel} className="h-9">
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges() || updateWorkModeMutation.isPending}
              className="h-9"
            >
              {updateWorkModeMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t('save')}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  )
}

