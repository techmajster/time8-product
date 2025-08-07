"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { useTranslations, useLocale } from 'next-intl'
import { pl, enUS } from 'date-fns/locale'

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { CalendarWithDropdowns } from "@/components/ui/calendar-with-dropdowns"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { plWithCapitals } from "@/lib/utils"

interface DatePickerProps {
  value?: Date
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({ 
  value, 
  date, 
  onDateChange, 
  placeholder, 
  disabled = false,
  className 
}: DatePickerProps) {
  const t = useTranslations('common')
  const locale = useLocale()
  const dateLocale = locale === 'pl' ? plWithCapitals : enUS

  // Support both 'value' and 'date' props for compatibility
  const selectedDate = value || date
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? format(selectedDate, "PPP", { locale: dateLocale }) : <span>{placeholder || t('datePicker.pickDate')}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[9999]" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onDateChange}
          initialFocus
          weekStartsOn={1}
          locale={dateLocale}
        />
      </PopoverContent>
    </Popover>
  )
}

export function DatePickerWithDropdowns({ 
  value, 
  date, 
  onDateChange, 
  placeholder, 
  disabled = false,
  className 
}: DatePickerProps) {
  const t = useTranslations('common')
  const locale = useLocale()
  const dateLocale = locale === 'pl' ? plWithCapitals : enUS

  // Support both 'value' and 'date' props for compatibility
  const selectedDate = value || date
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? format(selectedDate, "PPP", { locale: dateLocale }) : <span>{placeholder || t('datePicker.pickDate')}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[9999]" align="start">
        <CalendarWithDropdowns
          mode="single"
          selected={selectedDate}
          onSelect={onDateChange}
          initialFocus
          weekStartsOn={1}
          locale={dateLocale}
        />
      </PopoverContent>
    </Popover>
  )
} 