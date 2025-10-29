'use client'

import React, { useState, useEffect } from 'react'
import { format, differenceInDays, parseISO, startOfDay } from 'date-fns'
import { pl } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { LeaveType, LeaveBalance, UserProfile } from '@/types/leave'
import { useRouter } from 'next/navigation'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { useLeaveSystemToasts } from '@/hooks/use-sonner-toast'
import { createClient } from '@/lib/supabase/client'
import { DateRange } from 'react-day-picker'
import { ChevronDownIcon, Trash2Icon } from 'lucide-react'
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
  userProfile?: UserProfile
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
  const router = useRouter()
  const { leaveRequestSubmitted } = useLeaveSystemToasts()
  const [calculatedDays, setCalculatedDays] = useState<number | null>(leaveRequest.days_requested)

  const [formData, setFormData] = useState({
    leave_type_id: leaveRequest.leave_type_id,
    reason: leaveRequest.reason || ''
  })
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(leaveRequest.start_date),
    to: new Date(leaveRequest.end_date)
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

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
  }, [dateRange])

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

    setIsSubmitting(true)

    try {
      // Use the API route to update the leave request
      const response = await fetch(`/api/leave-requests/${leaveRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leave_type_id: formData.leave_type_id,
          start_date: dateRange.from.toISOString().split('T')[0],
          end_date: dateRange.to.toISOString().split('T')[0],
          days_requested: calculatedDays,
          reason: formData.reason || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update leave request')
      }

      // Close sheet first, then show toast
      setTimeout(() => {
        onClose()
      }, 1500)
      
      toast.success('Wniosek urlopowy został zaktualizowany!')
      router.refresh()

    } catch (error) {
      console.error('Error updating leave request:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update leave request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelRequest = async () => {
    if (!leaveRequest) return
    
    setIsCancelling(true)
    
    try {
      const response = await fetch(`/api/leave-requests/${leaveRequest.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comment: cancelReason || 'Anulowane przez pracownika'
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Nie udało się anulować wniosku')
      }
      
      toast.success(result.message || 'Wniosek urlopowy został anulowany')
      
      // Close dialogs and refresh
      setShowCancelDialog(false)
      setCancelReason('')
      onClose()
      router.refresh()
      
    } catch (error) {
      console.error('Error cancelling request:', error)
      toast.error(error instanceof Error ? error.message : 'Nie udało się anulować wniosku')
    } finally {
      setIsCancelling(false)
    }
  }

  // Check if request can be cancelled
  const canCancel = leaveRequest && 
    leaveRequest.status !== 'cancelled' && 
    new Date() < new Date(leaveRequest.start_date)

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        size="content"
        className="overflow-y-auto"
      >
        <div className="bg-background relative rounded-lg h-full">
          <div className="flex flex-col h-full">
            <div className="flex flex-col gap-6 p-6 flex-1 overflow-y-auto">
              <div className="flex flex-col gap-1.5 w-full">
                <SheetTitle className="text-lg font-semibold mb-6">Edytuj wniosek urlopowy</SheetTitle>
              </div>

              {/* Edit Form */}
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
                placeholder="Wybierz typ urlopu"
                className="h-9 w-full"
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
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Zamknij
                </Button>
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
                          disabled={isCancelling}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {isCancelling ? 'Anulowanie...' : 'Tak, anuluj wniosek'}
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
                disabled={!formData.leave_type_id || !dateRange?.from || !dateRange?.to || !calculatedDays || calculatedDays <= 0 || isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? 'Aktualizowanie...' : 'Zaktualizuj wniosek'}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
} 