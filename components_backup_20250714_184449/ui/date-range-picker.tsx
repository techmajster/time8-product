"use client"

import * as React from "react"
import { format, Locale } from "date-fns"
import { pl, enUS } from 'date-fns/locale'
import { CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { useTranslations, useLocale } from 'next-intl'

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { plWithCapitals } from "@/lib/utils"

interface DateRangePickerProps {
  value?: DateRange
  date?: DateRange
  onDateRangeChange?: (range: DateRange | undefined) => void
  onDateChange?: (range: DateRange | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

// Helper function to capitalize first letter while preserving the rest of the string
const capitalizeFirst = (str: string) => {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

// Helper function to format date with capitalized month in Polish
const formatDateWithCapitals = (date: Date, formatStr: string, locale: Locale) => {
  // For Polish, we'll format month and day separately to ensure proper capitalization
  if (locale === pl) {
    const month = capitalizeFirst(format(date, "LLL", { locale }))
    const day = format(date, "dd", { locale })
    const year = format(date, "y", { locale })
    return `${month} ${day}, ${year}`
  }
  return format(date, formatStr, { locale })
}

export function DateRangePicker({
  value,
  date,
  onDateRangeChange,
  onDateChange,
  placeholder,
  disabled = false,
  className,
}: DateRangePickerProps) {
  const t = useTranslations('common')
  const locale = useLocale()
  const dateLocale = locale === 'pl' ? plWithCapitals : enUS
  
  // Support both prop naming conventions for compatibility
  const selectedRange = value || date
  const handleChange = onDateRangeChange || onDateChange

  // Custom formatters for the calendar
  const customFormatters = {
    formatCaption: (date: Date, options?: { locale?: Locale }) => {
      if (options?.locale === pl) {
        const month = capitalizeFirst(format(date, "LLLL", { locale: pl }))
        const year = format(date, "y", { locale: pl })
        return `${month} ${year}`
      }
      return format(date, "LLLL y", { locale: options?.locale })
    },
    formatWeekdayName: (date: Date, options?: { locale?: Locale }) => {
      if (options?.locale === pl) {
        return capitalizeFirst(format(date, "EEEEEE", { locale: pl }))
      }
      return format(date, "EEEEEE", { locale: options?.locale })
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !selectedRange && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedRange?.from ? (
              selectedRange.to ? (
                <>
                  {format(selectedRange.from, "LLL dd, y", { locale: dateLocale })} -{" "}
                  {format(selectedRange.to, "LLL dd, y", { locale: dateLocale })}
                </>
              ) : (
                format(selectedRange.from, "LLL dd, y", { locale: dateLocale })
              )
            ) : (
              <span>{placeholder || t('datePicker.pickDateRange')}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={selectedRange?.from}
            selected={selectedRange}
            onSelect={handleChange}
            numberOfMonths={2}
            weekStartsOn={1}
            locale={dateLocale}
            formatters={customFormatters}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
} 