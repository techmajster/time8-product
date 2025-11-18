/**
 * @fileoverview Edit Leave Request Sheet Component
 *
 * A comprehensive component for editing existing leave requests with support for:
 * - Role-based permissions (employee, manager, admin)
 * - Admin edit mode with visual indicators
 * - Audit trail tracking (edited_by, edited_at)
 * - Real-time overlap detection
 * - Timezone-safe date handling
 * - Leave type validation and balance checking
 *
 * @module components/EditLeaveRequestSheet
 */

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
import { toast } from 'sonner'
import { DeleteLeaveRequestSheet } from '@/app/leave-requests/components/DeleteLeaveRequestSheet'
import { getApplicableLeaveTypes, isLeaveTypeDisabled } from '@/lib/leave-validation'
import { useDisabledDates } from '@/hooks/use-disabled-dates'
import { useHolidays } from '@/hooks/useHolidays'
import { useUpdateLeaveRequest, useCancelLeaveRequest } from '@/hooks/use-leave-mutations'
import { useQueryClient } from '@tanstack/react-query'

/**
 * Parses a date string in local timezone without UTC conversion.
 * Prevents timezone shift bugs where dates like "2024-11-19" become "2024-11-18".
 *
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object in local timezone
 *
 * @example
 * ```ts
 * const date = parseDateLocal('2024-11-19') // Returns Nov 19, 2024 in local timezone
 * ```
 */
const parseDateLocal = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Formats a Date object to YYYY-MM-DD string in local timezone.
 * Prevents timezone conversion issues when submitting dates to API.
 *
 * @param date - Date object to format
 * @returns Date string in YYYY-MM-DD format
 *
 * @example
 * ```ts
 * const dateStr = formatDateLocal(new Date(2024, 10, 19)) // Returns "2024-11-19"
 * ```
 */
const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * User data for overlapping leave requests warning
 */
interface OverlapUser {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  leave_type_name: string
  end_date: string
  color: string
}

/**
 * Vacation icon component for visual decoration
 */
function VacationIcon() {
  return (
    <div className="bg-cyan-200 relative rounded-lg size-10 flex items-center justify-center">
      <TreePalm className="h-6 w-6 text-foreground" />
    </div>
  )
}

/**
 * Displays a user card in the overlapping leave requests warning section
 *
 * @param user - User data for the overlap warning
 */
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

/**
 * Leave request details with related data
 */
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

/**
 * Props for EditLeaveRequestSheet component
 *
 * @property leaveRequest - The leave request being edited (contains OWNER's data)
 * @property leaveTypes - Available leave types for the organization
 * @property leaveBalances - Current leave balances for the request owner
 * @property userProfile - Profile of the LEAVE REQUEST OWNER (not logged-in user)
 * @property currentUserRole - Role of the CURRENTLY LOGGED-IN user (employee/manager/admin)
 * @property currentUserId - ID of the CURRENTLY LOGGED-IN user
 * @property isOpen - Sheet visibility state
 * @property onClose - Callback when sheet is closed
 *
 * @important
 * - userProfile represents the LEAVE REQUEST OWNER, not the logged-in user
 * - currentUserRole represents the LOGGED-IN user's role
 * - This distinction enables admin/manager edit mode with proper permissions
 */
interface EditLeaveRequestSheetProps {
  leaveRequest: LeaveRequestDetails
  leaveTypes: LeaveType[]
  leaveBalances: LeaveBalance[]
  userProfile?: UserProfile & {
    organizations?: {
      id: string
      name: string
      working_days?: string[]
      country_code?: string
    }
  }
  currentUserRole?: string  // Role of the currently logged-in user
  currentUserId?: string    // ID of the currently logged-in user
  isOpen: boolean
  onClose: () => void
}

/**
 * Edit Leave Request Sheet Component
 *
 * Provides a comprehensive interface for editing leave requests with role-based permissions:
 *
 * **Employee Mode:**
 * - Edit own leave requests only
 * - Cannot edit after leave period has started
 * - No audit trail created
 *
 * **Manager Mode:**
 * - Edit team member leave requests
 * - Can cancel anytime (not restricted to before-start-date)
 * - Audit trail created (edited_by, edited_at)
 * - Visual indicator: "Edytujesz jako kierownik"
 *
 * **Admin Mode:**
 * - Edit ANY leave request in organization
 * - Can cancel anytime
 * - Audit trail created (edited_by, edited_at)
 * - Visual indicator: "Edytujesz jako administrator"
 *
 * **Features:**
 * - Real-time overlap detection with team members
 * - Timezone-safe date handling (prevents date shift bugs)
 * - Leave type validation and balance checking
 * - Working days calculation based on organization settings
 * - Change detection (prevents empty updates)
 * - Role-based success messages
 *
 * **Audit Trail:**
 * - When admin/manager edits another user's request:
 *   - `edited_by` field set to logged-in user's ID
 *   - `edited_at` field set to current timestamp
 * - When user edits own request:
 *   - No audit trail fields set
 *
 * @see {@link /app/api/leave-requests/[id]/route.ts} for API implementation
 * @see {@link /app/api/leave-requests/[id]/details/route.ts} for data fetching
 *
 * @example
 * ```tsx
 * <EditLeaveRequestSheet
 *   leaveRequest={request}
 *   leaveTypes={types}
 *   leaveBalances={balances}
 *   userProfile={ownerProfile}
 *   currentUserRole="admin"
 *   currentUserId={loggedInUserId}
 *   isOpen={true}
 *   onClose={() => setOpen(false)}
 * />
 * ```
 */
export function EditLeaveRequestSheet({
  leaveRequest,
  leaveTypes,
  leaveBalances,
  userProfile,
  currentUserRole,
  currentUserId,
  isOpen,
  onClose
}: EditLeaveRequestSheetProps) {
  const supabase = createClient()
  const queryClient = useQueryClient()
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
    from: parseDateLocal(leaveRequest.start_date),
    to: parseDateLocal(leaveRequest.end_date)
  })

  const [showDeleteSheet, setShowDeleteSheet] = useState(false)

  // Check if the CURRENTLY LOGGED-IN user is manager/admin (needed for role-specific messaging)
  // Note: userProfile contains the LEAVE REQUEST OWNER's data, not the logged-in user
  const isManager = currentUserRole === 'admin' || currentUserRole === 'manager'

  // Handle sheet close with form reset
  const handleClose = () => {
    // Reset form state to original values
    setFormData({
      leave_type_id: leaveRequest.leave_type_id,
      reason: leaveRequest.reason || ''
    })
    setDateRange({
      from: parseDateLocal(leaveRequest.start_date),
      to: parseDateLocal(leaveRequest.end_date)
    })
    setCalculatedDays(leaveRequest.days_requested)
    setOverlapUsers([])
    setShowDeleteSheet(false)
    // Call parent onClose
    onClose()
  }

  // Fetch disabled dates for the request owner (exclude current request being edited)
  const { disabledDates } = useDisabledDates({
    userId: leaveRequest.user_id,
    organizationId: userProfile?.organization_id || '',
    excludeRequestId: leaveRequest.id // Don't mark current request dates as disabled
  })

  // Fetch holidays for disabled dates using React Query
  const { data: holidays = [], isLoading: isLoadingHolidays } = useHolidays({
    organizationId: userProfile?.organization_id || '',
    countryCode: userProfile?.organizations?.country_code || 'PL'
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
      formatDateLocal(dateRange.from) !== leaveRequest.start_date ||
      formatDateLocal(dateRange.to) !== leaveRequest.end_date ||
      formData.reason !== (leaveRequest.reason || '')
    )

    if (!hasChanges) {
      toast.error('No changes were made')
      return
    }

    // Use React Query mutation
    updateMutation.mutate({
      leave_type_id: formData.leave_type_id,
      start_date: formatDateLocal(dateRange.from),
      end_date: formatDateLocal(dateRange.to),
      days_requested: calculatedDays,
      reason: formData.reason || null,
    }, {
      onSuccess: async () => {
        // Show role-specific success message
        // Admin/manager editing another employee's request vs employee editing their own
        if (isManager && leaveRequest.user_id !== currentUserId) {
          toast.success('Wniosek urlopowy został zaktualizowany jako administrator')
        } else {
          toast.success('Wniosek urlopowy został zaktualizowany')
        }

        // Invalidate all queries - this will trigger refetch for active queries
        await queryClient.invalidateQueries({
          queryKey: ['leaveRequests'],
          refetchType: 'active'
        })

        // Also trigger a router refresh to update server components
        window.dispatchEvent(new CustomEvent('refetch-leave-requests'))

        // Small delay to allow UI to update
        await new Promise(resolve => setTimeout(resolve, 300))
        handleClose()
      }
    })
  }

  const handleDeleteRequest = async (reason: string) => {
    if (!leaveRequest) return

    // Use React Query mutation
    cancelMutation.mutate({
      comment: reason
    }, {
      onSuccess: async () => {
        // Show role-specific success message
        // Admin/manager canceling another employee's request vs employee canceling their own
        if (isManager && leaveRequest.user_id !== currentUserId) {
          toast.success('Wniosek urlopowy został anulowany jako administrator')
        } else {
          toast.success('Wniosek urlopowy został anulowany')
        }

        // Invalidate all queries - this will trigger refetch for active queries
        await queryClient.invalidateQueries({
          queryKey: ['leaveRequests'],
          refetchType: 'active'
        })

        // Also trigger a router refresh to update server components
        window.dispatchEvent(new CustomEvent('refetch-leave-requests'))

        setShowDeleteSheet(false)
        // Small delay to allow UI to update
        await new Promise(resolve => setTimeout(resolve, 300))
        handleClose()
      }
    })
  }

  // Managers/admins can cancel at any time, employees only before start date
  const canCancel = leaveRequest &&
    leaveRequest.status !== 'cancelled' &&
    (isManager || new Date() < new Date(leaveRequest.start_date))

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
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

              {/* Admin Context Banner - shown when admin/manager edits another user's request */}
              {isManager && leaveRequest.user_id !== userProfile?.id && leaveRequest.profiles && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-amber-900 mb-1">
                        Edytujesz wniosek urlopowy innego użytkownika
                      </h4>
                      <p className="text-sm text-amber-800">
                        Wprowadzane zmiany zostaną zapisane w dzienniku zmian dla pracownika:{' '}
                        <span className="font-medium">
                          {leaveRequest.profiles.full_name || leaveRequest.profiles.email}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
            <div className="flex items-center gap-2 w-full p-6 pt-0 bg-background">
              {/* Left side - Anuluj button */}
              <div className="flex-1 flex gap-2">
                <Button
                  variant="outline"
                  className="h-9 px-4 py-2"
                  onClick={handleClose}
                >
                  Anuluj
                </Button>
              </div>

              {/* Right side - Delete and Save buttons */}
              <div className="flex justify-end gap-2 flex-1">
                {canCancel && (
                  <Button
                    variant="destructive"
                    className="h-9 px-4 py-2"
                    onClick={() => {
                      handleClose() // Close edit sheet
                      setShowDeleteSheet(true) // Open delete sheet
                    }}
                  >
                    Usuń wniosek
                  </Button>
                )}
                <Button
                  type="submit"
                  className="h-9 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={!formData.leave_type_id || !dateRange?.from || !dateRange?.to || !calculatedDays || calculatedDays <= 0 || updateMutation.isPending}
                  onClick={handleSubmit}
                >
                  {updateMutation.isPending ? 'Aktualizowanie...' : 'Zapisz zmiany'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>

      {/* Delete Leave Request Sheet */}
      <DeleteLeaveRequestSheet
        isOpen={showDeleteSheet}
        onClose={() => setShowDeleteSheet(false)}
        onDelete={handleDeleteRequest}
        leaveRequest={leaveRequest}
      />
    </Sheet>
  )
} 