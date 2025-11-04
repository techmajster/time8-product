'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { LeaveType, LeaveBalance, UserProfile } from '@/types/leave'
import { useRouter } from 'next/navigation'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { useLeaveSystemToasts } from '@/hooks/use-sonner-toast'
import { DateRange } from 'react-day-picker'
import { ChevronDownIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { getApplicableLeaveTypes, isLeaveTypeDisabled } from '@/lib/leave-validation'
import { useDisabledDates } from '@/hooks/use-disabled-dates'
import { useHolidays } from '@/hooks/useHolidays'
import { useCreateLeaveRequest } from '@/hooks/use-leave-mutations'

interface PendingRequest {
  leave_type_id: string
  days_requested: number
}

interface NewLeaveRequestSheetProps {
  leaveTypes: LeaveType[]
  leaveBalances: LeaveBalance[]
  userProfile?: UserProfile & {
    organizations?: {
      id: string
      name: string
      work_mode?: 'monday_to_friday' | 'multi_shift'
      working_days?: string[]
    }
  }
  initialDate?: Date
  pendingRequests?: PendingRequest[] // For balance calculation
}

export function NewLeaveRequestSheet({ leaveTypes, leaveBalances, userProfile, initialDate, pendingRequests = [] }: NewLeaveRequestSheetProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  // React Query mutation
  const createMutation = useCreateLeaveRequest()

  // Fetch disabled dates for current user
  const { disabledDates } = useDisabledDates({
    userId: userProfile?.id || null,
    organizationId: userProfile?.organization_id || ''
  })

  // Fetch holidays for disabled dates using React Query
  const { data: holidays = [], isLoading: isLoadingHolidays } = useHolidays({
    organizationId: userProfile?.organization_id || '',
    countryCode: userProfile?.country_code || 'PL'
  })

  // Calculate available balance (remaining_days - pending days for each leave type)
  const calculateAvailableDays = (leaveTypeId: string, remainingDays: number): number => {
    const pendingDays = pendingRequests
      .filter(req => req.leave_type_id === leaveTypeId)
      .reduce((sum, req) => sum + req.days_requested, 0)
    return Math.max(0, remainingDays - pendingDays)
  }
  const { leaveRequestSubmitted } = useLeaveSystemToasts()
  const [calculatedDays, setCalculatedDays] = useState<number | null>(null)
  const sheetContentRef = React.useRef<HTMLDivElement>(null)

  // Listen for custom event to open the sheet
  useEffect(() => {
    const handleOpenLeaveRequest = (event: CustomEvent) => {
      setIsOpen(true)
      // If event has a date, set it as initial date range
      if (event.detail?.date) {
        const selectedDate = new Date(event.detail.date)
        setDateRange({
          from: selectedDate,
          to: selectedDate
        })
      }
    }

    window.addEventListener('openLeaveRequest', handleOpenLeaveRequest as EventListener)
    return () => {
      window.removeEventListener('openLeaveRequest', handleOpenLeaveRequest as EventListener)
    }
  }, [])

  // Set initial date range if initialDate is provided
  useEffect(() => {
    if (initialDate && isOpen) {
      setDateRange({
        from: initialDate,
        to: initialDate
      })
    }
  }, [initialDate, isOpen])

  const [formData, setFormData] = useState({
    leave_type_id: '',
    reason: ''
  })
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  const handleClose = () => {
    setIsOpen(false)
    // Reset form state
    setFormData({ leave_type_id: '', reason: '' })
    setDateRange(undefined)
    setCalculatedDays(null)
  }

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      calculateWorkingDays()
    } else {
      setCalculatedDays(null)
    }
  }, [dateRange])

  const calculateWorkingDays = async () => {
    if (!dateRange?.from || !dateRange?.to) return

    try {
      const response = await fetch('/api/working-days', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: dateRange.from.toISOString().split('T')[0],
          endDate: dateRange.to.toISOString().split('T')[0],
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setCalculatedDays(result.working_days)
      } else {
        // Fallback to basic calculation if API fails
        const days = calculateBasicWorkingDays(dateRange.from, dateRange.to)
        setCalculatedDays(days)
      }
    } catch (error) {
      console.error('Error calculating working days:', error)
      // Fallback to basic calculation
      const days = calculateBasicWorkingDays(dateRange.from, dateRange.to)
      setCalculatedDays(days)
    }
  }

  const calculateBasicWorkingDays = (start: Date, end: Date) => {
    let count = 0
    const current = new Date(start)
    while (current <= end) {
      const day = current.getDay()
      if (day !== 0 && day !== 6) count++ // Skip weekends
      current.setDate(current.getDate() + 1)
    }
    return count
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.leave_type_id || !dateRange?.from || !dateRange?.to || !userProfile?.organization_id || !userProfile?.id) {
      toast.error('Missing required information')
      return
    }

    if (!calculatedDays || calculatedDays <= 0) {
      toast.error('Invalid date range - no working days selected')
      return
    }

    // Format dates in local timezone to avoid off-by-one errors
    const formatDateLocal = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    // Use React Query mutation
    createMutation.mutate({
      leave_type_id: formData.leave_type_id,
      start_date: formatDateLocal(dateRange.from),
      end_date: formatDateLocal(dateRange.to),
      days_requested: calculatedDays,
      reason: formData.reason || null,
    }, {
      onSuccess: () => {
        setTimeout(() => {
          handleClose()
        }, 1500)
        leaveRequestSubmitted()
      }
    })
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          ref={sheetContentRef}
          side="right"
          size="content"
          className="overflow-y-auto"
        >
          <div className="bg-background relative rounded-lg h-full">
            <div className="flex flex-col h-full">
              <div className="flex flex-col gap-6 p-6 flex-1 overflow-y-auto">
                <div className="flex flex-col gap-1.5 w-full">
                  <SheetTitle className="text-lg font-semibold mb-6">Nowy wniosek urlopowy</SheetTitle>
                </div>

                {/* Minimal Form */}
                <form onSubmit={handleSubmit} className="space-y-5 flex-1">
              {/* Leave Type Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Jaki urlop chcesz wybrać?</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between h-auto min-h-9 px-3 py-2"
                    >
                      {formData.leave_type_id ? (
                        (() => {
                          const selectedLeaveType = leaveTypes.find(type => type.id === formData.leave_type_id)
                          const balance = leaveBalances.find(lb => lb.leave_type_id === formData.leave_type_id)
                          const availableDays = balance ? calculateAvailableDays(formData.leave_type_id, balance.remaining_days) : 0
                          return selectedLeaveType ? (
                            <div className="flex flex-col items-start">
                              <span className="font-medium text-sm">{selectedLeaveType.name}</span>
                              {!selectedLeaveType.requires_balance ? (
                                <span className="text-xs text-muted-foreground">
                                  Bez limitu
                                </span>
                              ) : balance ? (
                                <span className="text-xs text-muted-foreground">
                                  Dostępne {availableDays} dni
                                </span>
                              ) : null}
                            </div>
                          ) : null
                        })()
                      ) : (
                        <span className="text-muted-foreground">Wybierz typ urlopu</span>
                      )}
                      <ChevronDownIcon className="size-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                    {userProfile && getApplicableLeaveTypes(userProfile, leaveTypes, leaveBalances, userProfile.organization_id).map((type, index, array) => {
                      const balance = leaveBalances.find(lb => lb.leave_type_id === type.id)
                      const availableDays = balance ? calculateAvailableDays(type.id, balance.remaining_days) : 0
                      const disabledState = isLeaveTypeDisabled(type, balance)

                      return (
                        <React.Fragment key={type.id}>
                          <DropdownMenuItem
                            onClick={() => !disabledState.disabled && setFormData({ ...formData, leave_type_id: type.id })}
                            className={`${disabledState.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            disabled={disabledState.disabled}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{type.name}</span>
                              {!type.requires_balance ? (
                                <span className="text-xs text-muted-foreground">
                                  Bez limitu
                                </span>
                              ) : balance ? (
                                <span className="text-xs text-muted-foreground">
                                  Dostępne {availableDays} dni
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  Bez limitu
                                </span>
                              )}
                              {disabledState.reason && (
                                <span className="text-xs text-red-500">
                                  {disabledState.reason}
                                </span>
                              )}
                            </div>
                          </DropdownMenuItem>
                          {index < array.length - 1 && <DropdownMenuSeparator />}
                        </React.Fragment>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Date Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Termin urlopu</Label>
                <DateRangePicker
                  date={dateRange}
                  onDateChange={setDateRange}
                  placeholder="Wybierz typ urlopu"
                  className="h-9 w-full"
                  container={sheetContentRef.current}
                  existingLeaveRequests={disabledDates}
                  holidaysToDisable={holidays}
                  isLoadingHolidays={isLoadingHolidays}
                  workingDays={userProfile?.organizations?.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']}
                />
                {calculatedDays !== null && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Dni roboczych: {calculatedDays}
                  </p>
                )}
              </div>

              {/* Optional Description */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Chcesz coś dodać? (opcjonalnie)</Label>
                <Textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Opisz powód urlopu"
                  className="min-h-[76px] resize-none"
                />
              </div>

                </form>
              </div>
              
              {/* Footer - Fixed at Bottom */}
              <div className="flex flex-row gap-2 items-center justify-between w-full p-6 pt-0 bg-background">
                <Button variant="outline" size="sm" onClick={handleClose}>
                  Anuluj
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!formData.leave_type_id || !dateRange?.from || !dateRange?.to || !calculatedDays || calculatedDays <= 0 || createMutation.isPending}
                  onClick={handleSubmit}
                >
                  {createMutation.isPending ? 'Składanie wniosku...' : 'Złóż wniosek urlopowy'}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
  )
} 