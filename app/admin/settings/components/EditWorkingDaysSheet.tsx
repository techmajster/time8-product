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
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'
import { useUpdateWorkMode } from '@/hooks/use-admin-mutations'
import { cn } from '@/lib/utils'

interface EditWorkingDaysSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organization: {
    id: string
    working_days?: string[]
    exclude_public_holidays?: boolean
  }
  onSave?: (data: { working_days: string[]; exclude_public_holidays: boolean }) => void
}

const DAYS = [
  { key: 'monday', label: 'Pon', fullLabel: 'Poniedziałek' },
  { key: 'tuesday', label: 'Wt', fullLabel: 'Wtorek' },
  { key: 'wednesday', label: 'Śr', fullLabel: 'Środa' },
  { key: 'thursday', label: 'Czw', fullLabel: 'Czwartek' },
  { key: 'friday', label: 'Pt', fullLabel: 'Piątek' },
  { key: 'saturday', label: 'Sob', fullLabel: 'Sobota' },
  { key: 'sunday', label: 'Niedz', fullLabel: 'Niedziela' },
] as const

export function EditWorkingDaysSheet({
  open,
  onOpenChange,
  organization,
  onSave,
}: EditWorkingDaysSheetProps) {
  const [selectedDays, setSelectedDays] = useState<string[]>(
    organization?.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  )
  const [excludeHolidays, setExcludeHolidays] = useState<boolean>(
    organization?.exclude_public_holidays ?? true
  )

  const updateWorkModeMutation = useUpdateWorkMode()

  // Sync state when organization changes
  useEffect(() => {
    if (organization) {
      setSelectedDays(organization.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
      setExcludeHolidays(organization.exclude_public_holidays ?? true)
    }
  }, [organization])

  const toggleDay = (dayKey: string) => {
    setSelectedDays((prev) => {
      if (prev.includes(dayKey)) {
        return prev.filter((d) => d !== dayKey)
      } else {
        return [...prev, dayKey]
      }
    })
  }

  const hasChanges = () => {
    const currentDays = organization?.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    const currentHolidays = organization?.exclude_public_holidays ?? true
    
    const daysChanged = 
      currentDays.length !== selectedDays.length ||
      !currentDays.every((day) => selectedDays.includes(day))
    
    const holidaysChanged = currentHolidays !== excludeHolidays
    
    return daysChanged || holidaysChanged
  }

  const handleSave = async () => {
    try {
      const updatedOrganization = await updateWorkModeMutation.mutateAsync({
        working_days: selectedDays,
        exclude_public_holidays: excludeHolidays,
      })

      if (onSave) {
        onSave(updatedOrganization)
      }

      onOpenChange(false)
    } catch (error) {
      // Error is handled by the mutation hook
      console.error('Error saving working days:', error)
    }
  }

  const handleCancel = () => {
    // Reset to original values
    setSelectedDays(organization?.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
    setExcludeHolidays(organization?.exclude_public_holidays ?? true)
    onOpenChange(false)
  }

  const isDaySelected = (dayKey: string) => selectedDays.includes(dayKey)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="lg" className="overflow-y-auto p-0">
        <div className="bg-background relative rounded-lg h-full flex flex-col">
          {/* Header */}
          <div className="p-6 pb-0">
            <SheetTitle className="text-xl font-semibold text-foreground">
              Wybierz dni pracujące
            </SheetTitle>
          </div>

          {/* Separator */}
          <div className="h-px bg-border mt-6 mx-6" />

          {/* Scrollable Form Content */}
          <div className="flex-1 overflow-y-auto p-6 pt-6 space-y-6">
            {/* Working Days Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Wybierz dni pracujące</Label>
              <div className="flex flex-col gap-1">
                {DAYS.map((day) => {
                  const selected = isDaySelected(day.key)
                  return (
                    <div
                      key={day.key}
                      onClick={() => toggleDay(day.key)}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg transition-colors w-full cursor-pointer',
                        selected
                          ? 'bg-violet-100'
                          : 'bg-secondary'
                      )}
                    >
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => toggleDay(day.key)}
                        className={cn(
                          'pointer-events-none',
                          !selected && 'bg-white dark:bg-secondary'
                        )}
                      />
                      <div className="flex-1 pt-px">
                        <p className="text-sm font-medium leading-none text-foreground">
                          {day.fullLabel}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Separator */}
            <Separator />

            {/* Public Holidays */}
            <div
              onClick={() => setExcludeHolidays(!excludeHolidays)}
              className="flex items-start gap-2 w-full cursor-pointer"
            >
              <Checkbox
                checked={excludeHolidays}
                onCheckedChange={() => setExcludeHolidays(!excludeHolidays)}
                className="pointer-events-none"
              />
              <div className="flex-1 space-y-1.5">
                <p className="text-sm font-medium leading-none text-foreground">
                  Wolne święta państwowe
                </p>
                <p className="text-sm leading-normal text-muted-foreground">
                  Święta wypadające w dni pracujące zostaną wyłączone z harmonogramu
                </p>
              </div>
            </div>
          </div>

          {/* Separator before footer */}
          <div className="h-px bg-border mx-6" />

          {/* Footer - Fixed at Bottom */}
          <SheetFooter className="flex flex-row gap-2 items-center justify-between w-full p-6 bg-background">
            <Button variant="outline" onClick={handleCancel} className="h-9">
              Anuluj
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges() || updateWorkModeMutation.isPending}
              className="h-9"
            >
              {updateWorkModeMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Zapisz
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  )
}

