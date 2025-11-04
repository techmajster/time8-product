'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LeaveType, LeaveBalance, UserProfile } from '@/types/leave'
import { useRouter } from 'next/navigation'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { useLeaveSystemToasts } from '@/hooks/use-sonner-toast'
import { DateRange } from 'react-day-picker'
import { ChevronDownIcon, Info, TreePalm } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
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

interface OverlapUser {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  leave_type_name: string
  end_date: string
  color: string
}

// Vacation icon component
function VacationIcon() {
  return (
    <div className="bg-cyan-200 relative rounded-lg size-10 flex items-center justify-center">
      <TreePalm className="h-6 w-6 text-foreground" />
    </div>
  )
}

// Overlap warning user item component
function OverlapUserItem({ user }: { user: OverlapUser }) {
  return (
    <div className="flex flex-row gap-4 items-center justify-start w-full min-w-[85px]">
      <Avatar className="size-10">
        <AvatarImage src={user.avatar_url || undefined} />
        <AvatarFallback>
          {(user.full_name || user.email)?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 flex flex-col items-start justify-start">
        <div className="font-medium text-sm text-foreground leading-5 truncate w-full">
          {user.full_name || user.email}
        </div>
        <div className="font-normal text-sm text-muted-foreground leading-5 truncate w-full">
          {user.email}
        </div>
      </div>
      <div className="flex flex-col items-end justify-center text-sm">
        <div className="font-medium text-foreground leading-5">
          {user.leave_type_name}
        </div>
        <div className="font-normal text-muted-foreground leading-5">
          do {format(parseISO(user.end_date), 'dd.MM', { locale: pl })}
        </div>
      </div>
    </div>
  )
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
  const supabase = createClient()
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
  const [overlapUsers, setOverlapUsers] = useState<OverlapUser[]>([])
  const [isCheckingOverlaps, setIsCheckingOverlaps] = useState(false)
  const [overlapCheckError, setOverlapCheckError] = useState<string | null>(null)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Check for overlapping users
  const checkOverlaps = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      console.log('[Overlap Check] Missing date range')
      return
    }

    if (!userProfile?.id) {
      console.log('[Overlap Check] Missing user profile ID')
      return
    }

    setIsCheckingOverlaps(true)
    setOverlapCheckError(null)

    try {
      const formatDate = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      const startDate = formatDate(dateRange.from)
      const endDate = formatDate(dateRange.to)

      console.log('[Overlap Check] Checking overlaps via API:', {
        startDate,
        endDate,
        currentUserId: userProfile.id,
        organizationId: userProfile.organization_id
      })

      // Use API endpoint with admin client to fetch overlaps
      const response = await fetch('/api/leave-requests/overlapping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
        }),
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      const overlaps = data.overlappingRequests || []

      console.log('[Overlap Check] Found overlaps:', overlaps.length)
      console.log('[Overlap Check] Overlap data:', overlaps)

      // Format for display (add color field if missing)
      const formattedOverlaps: OverlapUser[] = overlaps.map((request: any) => ({
        id: request.id,
        full_name: request.full_name,
        email: request.email,
        avatar_url: request.avatar_url,
        leave_type_name: request.leave_type_name,
        end_date: request.end_date,
        color: request.color || '#22d3ee'
      }))

      setOverlapUsers(formattedOverlaps)
      setIsCheckingOverlaps(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('[Overlap Check] Error:', errorMessage, error)

      setOverlapCheckError(errorMessage)
      setOverlapUsers([])
      setIsCheckingOverlaps(false)

      // Show user-visible error toast
      toast.error('Nie udało się sprawdzić konfliktów urlopowych', {
        description: 'Spróbuj ponownie lub skontaktuj się z administratorem.'
      })
    }
  }

  // Check overlaps when dates change
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      checkOverlaps()
    } else {
      setOverlapUsers([])
    }
  }, [dateRange?.from, dateRange?.to])

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
                  <SheetTitle className="text-lg font-semibold">Nowy wniosek urlopowy</SheetTitle>
                  <Separator className="mt-4" />
                </div>

                {/* Minimal Form */}
                <form onSubmit={handleSubmit} className="space-y-5 flex-1">
              {/* Leave Type Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Jaki urlop chcesz wykorzystać</Label>
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
                  placeholder="Wybierz datę urlopu"
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

              {/* Balance Summary Cards */}
              {(() => {
                const selectedLeaveType = leaveTypes.find(type => type.id === formData.leave_type_id)
                const balance = leaveBalances.find(lb => lb.leave_type_id === formData.leave_type_id)
                const availableDays = balance ? calculateAvailableDays(formData.leave_type_id, balance.remaining_days) : 0
                const requestedDays = calculatedDays || 0
                const remainingDays = Math.max(0, availableDays - requestedDays)

                // Only show for leave types that require balance
                if (!formData.leave_type_id || !selectedLeaveType?.requires_balance) return null

                return (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col items-center justify-center p-4 border rounded-lg bg-background">
                      <span className="text-xs text-muted-foreground mb-1">Dostępny</span>
                      <span className="text-lg font-semibold">{availableDays} dni</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 border rounded-lg bg-background">
                      <span className="text-xs text-muted-foreground mb-1">Wnioskowany</span>
                      <span className="text-lg font-semibold">{requestedDays} dni</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 border rounded-lg bg-background">
                      <span className="text-xs text-muted-foreground mb-1">Pozostanie</span>
                      <span className="text-lg font-semibold">{remainingDays} dni</span>
                    </div>
                  </div>
                )
              })()}

              {/* Overlap Warning */}
              {isCheckingOverlaps && (
                <div className="border border-border rounded-lg p-4 bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                    <p className="font-medium text-sm text-muted-foreground">
                      Sprawdzanie konfliktów urlopowych...
                    </p>
                  </div>
                </div>
              )}

              {!isCheckingOverlaps && overlapUsers.length > 0 && (
                <div className="border border-border rounded-lg p-4 bg-amber-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium text-sm text-card-foreground leading-5">
                      W tym terminie również planują urlop:
                    </p>
                  </div>
                  <div className="space-y-2">
                    {overlapUsers.map((user, index) => (
                      <OverlapUserItem key={`${user.id}-${index}`} user={user} />
                    ))}
                  </div>
                </div>
              )}

              {!isCheckingOverlaps && overlapCheckError && (
                <div className="border border-destructive/50 rounded-lg p-4 bg-destructive/10">
                  <div className="flex items-start gap-3">
                    <Info className="h-4 w-4 mt-0.5 text-destructive" />
                    <div>
                      <p className="font-medium text-sm text-destructive mb-1">
                        Nie można sprawdzić konfliktów urlopowych
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Możesz kontynuować tworzenie wniosku, ale niektóre informacje mogą być niedostępne.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Optional Description */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Chcesz coś dodać?</Label>
                <Textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Dodatkowe informacje"
                  className="min-h-[126px] resize-none"
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
                  {createMutation.isPending ? 'Wysyłanie...' : 'Wyślij wniosek'}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
  )
} 