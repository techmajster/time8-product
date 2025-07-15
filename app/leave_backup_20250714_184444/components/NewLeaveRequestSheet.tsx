'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { LeaveType, LeaveBalance, UserProfile } from '@/types/leave'
import { useRouter } from 'next/navigation'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { useLeaveSystemToasts } from '@/hooks/use-sonner-toast'
import { createClient } from '@/lib/supabase/client'
import { DateRange } from 'react-day-picker'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

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
    
    if (!formData.leave_type_id || !dateRange?.from || !dateRange?.to || !userProfile?.organization_id || !userProfile?.id || !calculatedDays) {
      toast.error('Missing required information')
      return
    }

    if (calculatedDays <= 0) {
      toast.error('Invalid date range - no working days selected')
      return
    }

    setIsSubmitting(true)

    try {
      // Use the API route instead of direct Supabase call to ensure proper validation and RLS
      const response = await fetch('/api/leave-requests', {
        method: 'POST',
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
                <Select 
                  value={formData.leave_type_id} 
                  onValueChange={(value) => setFormData({ ...formData, leave_type_id: value })}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Wybierz typ urlopu" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: type.color }}
                          />
                          <span>{type.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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