"use client"

import * as React from "react"
import { format, Locale } from "date-fns"
import { pl, enUS } from 'date-fns/locale'
import { CalendarIcon, Loader2 } from "lucide-react"
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { plWithCapitals } from "@/lib/utils"
import { eachDayOfInterval, parseISO } from "date-fns"
import { CalendarDayButton } from "@/components/ui/calendar"

interface LeaveRequestForCalendar {
  start_date: string
  end_date: string
  leave_type_name: string
  status: string
}

interface HolidayForCalendar {
  id: string
  name: string
  date: string
  type: string
  description?: string | null
}

interface DisabledDateInfo {
  type: 'holiday' | 'leave' | 'weekend'
  name: string
  leaveTypeName?: string
  holidayType?: string
}

interface DateRangePickerProps {
  value?: DateRange
  date?: DateRange
  onDateRangeChange?: (range: DateRange | undefined) => void
  onDateChange?: (range: DateRange | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  container?: HTMLElement | null
  existingLeaveRequests?: LeaveRequestForCalendar[]
  holidaysToDisable?: HolidayForCalendar[]
  isLoadingHolidays?: boolean
  workingDays?: string[]
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
  container,
  existingLeaveRequests = [],
  holidaysToDisable = [],
  isLoadingHolidays = false,
  workingDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
}: DateRangePickerProps) {
  const t = useTranslations('common')
  const locale = useLocale()
  const dateLocale = locale === 'pl' ? plWithCapitals : enUS

  // Support both prop naming conventions for compatibility
  const selectedRange = value || date
  const handleChange = onDateRangeChange || onDateChange

  // Custom handler to fix double-click issue when changing date ranges
  const handleRangeSelect = React.useCallback((newRange: DateRange | undefined) => {
    // If we currently have a complete range selected (both from and to dates)
    if (selectedRange?.from && selectedRange?.to && newRange?.from && newRange?.to) {
      // Check if this is actually a new date being clicked
      const fromChanged = selectedRange.from.getTime() !== newRange.from.getTime()
      const toChanged = selectedRange.to.getTime() !== newRange.to.getTime()

      // If both dates changed, user clicked a date outside the existing range
      // Reset to start a new selection with just that date
      if (fromChanged && toChanged) {
        // The 'to' date in newRange is the date the user just clicked
        // Set it as the new 'from' date and clear 'to' to start fresh
        handleChange?.({ from: newRange.to, to: undefined })
        return
      }
    }

    // For all other cases (incomplete ranges, extending ranges, etc.), use default behavior
    handleChange?.(newRange)
  }, [selectedRange, handleChange])

  // Helper function to check if a date is a weekend based on working days
  const isWeekend = React.useCallback((date: Date): boolean => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayName = dayNames[date.getDay()]
    return !workingDays.includes(dayName)
  }, [workingDays])

  // Create a map of disabled dates with their information (leave requests, holidays, and weekends)
  const disabledDatesMap = React.useMemo(() => {
    const dateMap = new Map<string, DisabledDateInfo>()

    // Add leave requests to the map
    existingLeaveRequests.forEach(request => {
      const startDate = parseISO(request.start_date)
      const endDate = parseISO(request.end_date)
      const datesInRange = eachDayOfInterval({ start: startDate, end: endDate })

      datesInRange.forEach(date => {
        const dateKey = format(date, 'yyyy-MM-dd')
        dateMap.set(dateKey, {
          type: 'leave',
          name: request.leave_type_name,
          leaveTypeName: request.leave_type_name
        })
      })
    })

    // Add holidays to the map
    holidaysToDisable.forEach(holiday => {
      const dateKey = format(parseISO(holiday.date), 'yyyy-MM-dd')
      dateMap.set(dateKey, {
        type: 'holiday',
        name: holiday.name,
        holidayType: holiday.type
      })
    })

    return dateMap
  }, [existingLeaveRequests, holidaysToDisable])

  // Function to check if a date is disabled (holidays, leave requests, or weekends)
  const isDateDisabled = (date: Date): boolean => {
    // Check if it's a weekend based on working days
    if (isWeekend(date)) {
      return true
    }

    // Check if it's a holiday or has existing leave request
    const dateKey = format(date, 'yyyy-MM-dd')
    return disabledDatesMap.has(dateKey)
  }

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

  // Custom DayButton wrapper with tooltip for disabled dates
  const DayButtonWithTooltip = React.useCallback((props: any) => {
    const { day, modifiers, ...rest } = props
    const dateKey = format(day.date, 'yyyy-MM-dd')
    const dateInfo = disabledDatesMap.get(dateKey)
    const isWeekendDate = isWeekend(day.date)

    // Show tooltip for disabled dates (holidays, leave requests, or weekends)
    if (modifiers?.disabled && (dateInfo || isWeekendDate)) {
      const tooltipText = isWeekendDate && !dateInfo
        ? 'Weekend'
        : dateInfo?.name || ''

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative w-full h-full">
              <CalendarDayButton day={day} modifiers={modifiers} {...rest} />
            </div>
          </TooltipTrigger>
          <TooltipContent className="z-[9999]">
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      )
    }

    return <CalendarDayButton day={day} modifiers={modifiers} {...rest} />
  }, [disabledDatesMap, isWeekend, t])

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover modal={false}>
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
        {isLoadingHolidays && (
          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>{t('datePicker.loadingHolidays')}</span>
          </div>
        )}
        <PopoverContent className="w-auto p-0" align="start" container={container}>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={selectedRange?.from}
            selected={selectedRange}
            onSelect={handleRangeSelect}
            numberOfMonths={2}
            weekStartsOn={1}
            locale={dateLocale}
            formatters={customFormatters}
            disabled={isDateDisabled}
            components={{
              DayButton: DayButtonWithTooltip as any
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
} 