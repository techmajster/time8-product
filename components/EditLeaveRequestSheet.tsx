'use client'

import React, { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LeaveType, LeaveBalance, UserProfile } from '@/types/leave'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { DateRange } from 'react-day-picker'
import { ChevronDownIcon, Trash2Icon, Info, TreePalm } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { getApplicableLeaveTypes, isLeaveTypeDisabled } from '@/lib/leave-validation'
import { useDisabledDates } from '@/hooks/use-disabled-dates'
import { useHolidays } from '@/hooks/useHolidays'
import { useUpdateLeaveRequest, useCancelLeaveRequest } from '@/hooks/use-leave-mutations'

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

interface LeaveRequestDetails {
  id: string
  user_id: string
  start_date: string
  end_date: string
  leave_type_id: string
  days_requested: number
  reason: string | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  created_at: string
  reviewed_at: string | null
  review_comment: string | null
  reviewed_by: string | null
  leave_types: {
    id: string
    name: string
    color: string
    days_per_year: number
  } | null
  profiles: {
    id: string
    full_name: string | null
    email: string
  } | null
  reviewed_by_profile: {
    full_name: string | null
    email: string
  } | null
}

interface EditLeaveRequestSheetProps {
  leaveRequest: LeaveRequestDetails
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
  isOpen: boolean
  onClose: () => void
}

export function EditLeaveRequestSheet({
  leaveRequest,
  leaveTypes,
  leaveBalances,
  userProfile,
  isOpen,
  onClose
}: EditLeaveRequestSheetProps) {
  const supabase = createClient()
  const [calculatedDays, setCalculatedDays] = useState<number | null>(leaveRequest.days_requested)
  const [overlapUsers, setOverlapUsers] = useState<OverlapUser[]>([])
  const sheetContentRef = React.useRef<HTMLDivElement>(null)

  // React Query mutations
  const updateMutation = useUpdateLeaveRequest(leaveRequest.id)
  const cancelMutation = useCancelLeaveRequest(leaveRequest.id)

  const [formData, setFormData] = useState({
    leave_type_id: leaveRequest.leave_type_id,
    reason: leaveRequest.reason || ''
  })

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(leaveRequest.start_date),
    to: new Date(leaveRequest.end_date)
  })

  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  // Fetch disabled dates for the request owner (exclude current request being edited)
  const { disabledDates } = useDisabledDates({
    userId: leaveRequest.user_id,
    organizationId: userProfile?.organization_id || '',
    excludeRequestId: leaveRequest.id // Don't mark current request dates as disabled
  })

  // Fetch holidays for disabled dates using React Query
  const { data: holidays = [], isLoading: isLoadingHolidays } = useHolidays({
    organizationId: userProfile?.organization_id || '',
    countryCode: userProfile?.country_code || 'PL'
  })

  const calculateWorkingDays = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      setCalculatedDays(null)
      return
    }

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
        // Fallback calculation
        const start = new Date(dateRange.from)
        const end = new Date(dateRange.to)
        let workingDays = 0
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dayOfWeek = d.getDay()
          if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
            workingDays++
          }
        }
        
        setCalculatedDays(workingDays)
      }
    } catch (error) {
      console.error('Error calculating working days:', error)
      // Fallback calculation
      const start = new Date(dateRange.from)
      const end = new Date(dateRange.to)
      let workingDays = 0
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
          workingDays++
        }
      }
      
      setCalculatedDays(workingDays)
    }
  }

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      calculateWorkingDays()
    } else {
      setCalculatedDays(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange])

  // Check for overlapping users
  const checkOverlaps = async () => {
    if (!dateRange?.from || !dateRange?.to || !leaveRequest.user_id) return

    try {
      const formatDate = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      const startDate = formatDate(dateRange.from)
      const endDate = formatDate(dateRange.to)

      console.log('[Edit Sheet] Checking overlaps via API:', {
        startDate,
        endDate,
        excludeUserId: leaveRequest.user_id
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

      // Filter out the current request being edited AND all requests from the same user
      const filteredOverlaps = overlaps.filter((req: any) =>
        req.id !== leaveRequest.id && req.user_id !== leaveRequest.user_id
      )

      console.log('[Edit Sheet] Found overlaps:', filteredOverlaps.length)

      // Format for display
      const formattedOverlaps: OverlapUser[] = filteredOverlaps.map((request: any) => ({
        id: request.id,
        full_name: request.full_name,
        email: request.email,
        avatar_url: request.avatar_url,
        leave_type_name: request.leave_type_name,
        end_date: request.end_date,
        color: request.color || '#22d3ee'
      }))

      setOverlapUsers(formattedOverlaps)
    } catch (error) {
      console.error('[Edit Sheet] Error checking overlaps:', error instanceof Error ? error.message : error)
      setOverlapUsers([])
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

    if (!formData.leave_type_id || !dateRange?.from || !dateRange?.to || !userProfile?.organization_id || !userProfile?.id || !calculatedDays) {
      toast.error('Missing required information')
      return
    }

    if (calculatedDays <= 0) {
      toast.error('Invalid date range - no working days selected')
      return
    }

    // Check if any changes were made
    const hasChanges = (
      formData.leave_type_id !== leaveRequest.leave_type_id ||
      dateRange.from.toISOString().split('T')[0] !== leaveRequest.start_date ||
      dateRange.to.toISOString().split('T')[0] !== leaveRequest.end_date ||
      formData.reason !== (leaveRequest.reason || '')
    )

    if (!hasChanges) {
      toast.error('No changes were made')
      return
    }

    // Use React Query mutation
    updateMutation.mutate({
      leave_type_id: formData.leave_type_id,
      start_date: dateRange.from.toISOString().split('T')[0],
      end_date: dateRange.to.toISOString().split('T')[0],
      days_requested: calculatedDays,
      reason: formData.reason || null,
    }, {
      onSuccess: () => {
        setTimeout(() => {
          onClose()
        }, 1500)
      }
    })
  }

  const handleCancelRequest = async () => {
    if (!leaveRequest) return

    // Use React Query mutation
    cancelMutation.mutate({
      comment: cancelReason || 'Anulowane przez pracownika'
    }, {
      onSuccess: () => {
        setShowCancelDialog(false)
        setCancelReason('')
        onClose()
      }
    })
  }

  // Check if user is manager/admin
  const isManager = userProfile?.role === 'admin' || userProfile?.role === 'manager'

  // Managers/admins can cancel at any time, employees only before start date
  const canCancel = leaveRequest &&
    leaveRequest.status !== 'cancelled' &&
    (isManager || new Date() < new Date(leaveRequest.start_date))

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
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
                <SheetTitle className="text-lg font-semibold">Edytuj wniosek urlopowy</SheetTitle>
                <Separator className="mt-4" />
              </div>

              {/* Edit Form */}
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
                        return selectedLeaveType ? (
                                                     <div className="flex flex-col items-start">
                             <span className="font-medium text-sm">{selectedLeaveType.name}</span>
                            {balance && (
                              <span className="text-xs text-muted-foreground">
                                Dostępne {balance.remaining_days} dni
                              </span>
                            )}
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
                            {balance && (
                              <span className="text-xs text-muted-foreground">
                                Dostępne {Math.max(0, balance.remaining_days)} dni
                              </span>
                            )}
                            {!balance && (
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
              const availableDays = balance?.remaining_days || 0
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
            {overlapUsers.length > 0 && (
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
              <div className="flex gap-2">
                {canCancel && (
                  <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2Icon className="w-4 h-4 mr-1" />
                        Anuluj wniosek
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Anulować wniosek urlopowy?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Czy na pewno chcesz anulować ten wniosek urlopowy? Tej akcji nie można cofnąć.
                          {leaveRequest?.status === 'approved' && (
                            <span className="block mt-2 text-green-600 font-medium">
                              Dni urlopowe zostaną przywrócone do Twojego salda.
                            </span>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Powód anulowania (opcjonalnie)</Label>
                        <Textarea
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          placeholder="Opisz powód anulowania..."
                          className="min-h-[76px] resize-none"
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Nie anuluj</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleCancelRequest}
                          disabled={cancelMutation.isPending}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {cancelMutation.isPending ? 'Anulowanie...' : 'Tak, anuluj wniosek'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <Button
                type="submit"
                size="sm"
                className="bg-foreground hover:bg-foreground/90 text-white"
                disabled={!formData.leave_type_id || !dateRange?.from || !dateRange?.to || !calculatedDays || calculatedDays <= 0 || updateMutation.isPending}
                onClick={handleSubmit}
              >
                {updateMutation.isPending ? 'Aktualizowanie...' : 'Zaktualizuj wniosek'}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
} 