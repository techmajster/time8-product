'use client'

import React, { useState, useEffect } from 'react'
import { format, differenceInDays, parseISO } from 'date-fns'
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
import { Plus, ChevronDownIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { getApplicableLeaveTypes, isLeaveTypeDisabled } from '@/lib/leave-validation'

interface NewLeaveRequestSheetProps {
  leaveTypes: LeaveType[]
  leaveBalances: LeaveBalance[]
  userProfile?: UserProfile
  initialDate?: Date // Add optional initial date prop
}

export function NewLeaveRequestSheet({ leaveTypes, leaveBalances, userProfile, initialDate }: NewLeaveRequestSheetProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const { leaveRequestSubmitted } = useLeaveSystemToasts()
  const [calculatedDays, setCalculatedDays] = useState<number | null>(null)

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
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClose = () => {
    setIsOpen(false)
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

    setIsSubmitting(true)

    try {
      // Format dates in local timezone to avoid off-by-one errors
      const formatDateLocal = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      const requestPayload = {
        leave_type_id: formData.leave_type_id,
        start_date: formatDateLocal(dateRange.from),
        end_date: formatDateLocal(dateRange.to),
        days_requested: calculatedDays,
        reason: formData.reason || null,
      }
      
      console.log('Submitting leave request:', requestPayload)
      
      // Use the API route instead of direct Supabase call to ensure proper validation and RLS
      const response = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Leave request API error:', {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData
        })
        throw new Error(errorData.error || 'Failed to submit leave request')
      }

      // Close sheet first, then show toast
      setTimeout(() => {
        handleClose()
      }, 1500)
      
      leaveRequestSubmitted()
      router.refresh()

    } catch (error) {
      console.error('Error submitting leave request:', error)
      console.error('Form data at time of error:', {
        formData,
        dateRange,
        calculatedDays,
        userProfile: userProfile ? { id: userProfile.id, organization_id: userProfile.organization_id } : null
      })
      
      // Handle different types of errors
      let errorMessage = 'An unexpected error occurred while submitting your leave request'
      
      if (error instanceof Error) {
        errorMessage = `Error submitting leave request: ${error.message}`
      } else if (error && typeof error === 'object') {
        // Handle Supabase error objects
        const supabaseError = error as any
        if (supabaseError.message) {
          errorMessage = `Error submitting leave request: ${supabaseError.message}`
        } else if (supabaseError.code) {
          errorMessage = `Database error (${supabaseError.code}): Please check your input and try again`
        } else if (supabaseError.details) {
          errorMessage = `Error submitting leave request: ${supabaseError.details}`
        }
      }
      
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
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
                <Button variant="outline" size="sm" onClick={handleClose}>
                  Anuluj
                </Button>
                <Button 
                  type="submit" 
                  size="sm"
                  className="bg-neutral-900 hover:bg-neutral-800 text-white"
                  disabled={!formData.leave_type_id || !dateRange?.from || !dateRange?.to || !calculatedDays || calculatedDays <= 0 || isSubmitting}
                  onClick={handleSubmit}
                >
                  {isSubmitting ? 'Składanie wniosku...' : 'Złóż wniosek urlopowy'}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
  )
} 