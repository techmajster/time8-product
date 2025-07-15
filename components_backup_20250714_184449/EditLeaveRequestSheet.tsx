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
import { toast } from 'sonner'

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
              <Button variant="outline" size="sm" onClick={onClose}>
                Anuluj
              </Button>
              <Button 
                type="submit" 
                size="sm"
                className="bg-neutral-900 hover:bg-neutral-800 text-white"
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