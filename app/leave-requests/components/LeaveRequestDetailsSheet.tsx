'use client'

import { useState, useEffect } from 'react'
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, ChevronDown, TreePalm } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { RejectLeaveRequestDialog } from './RejectLeaveRequestDialog'
import { useSonnerToast } from '@/hooks/use-sonner-toast'
import { useRouter } from 'next/navigation'

interface LeaveRequestDetailsSheetProps {
  requestId: string | null
  isOpen: boolean
  onClose: () => void
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
  leave_types: {
    name: string
    requires_balance: boolean
  } | null
  profiles: {
    full_name: string | null
    email: string
    avatar_url: string | null
  } | null
}

interface ConflictingLeave {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  leave_type: string
  end_date: string
}

export function LeaveRequestDetailsSheet({ requestId, isOpen, onClose }: LeaveRequestDetailsSheetProps) {
  const [leaveRequest, setLeaveRequest] = useState<LeaveRequestDetails | null>(null)
  const [conflictingLeaves, setConflictingLeaves] = useState<ConflictingLeave[]>([])
  const [loading, setLoading] = useState(false)
  const [remainingDays, setRemainingDays] = useState<number>(0)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const { showSuccess, showError } = useSonnerToast()
  const router = useRouter()

  const fetchLeaveRequestDetails = async () => {
    if (!requestId) return

    setLoading(true)
    const supabase = createClient()

    try {
      // Get leave request details
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          leave_types (
            name,
            requires_balance
          ),
          profiles!leave_requests_user_id_fkey (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('id', requestId)
        .single()

      if (error) {
        console.error('Error fetching leave request:', error)
        return
      }

      setLeaveRequest(data)

      // Always try to fetch balance data first, regardless of requires_balance flag
      const currentYear = new Date().getFullYear()
      const { data: balanceData, error: balanceError } = await supabase
        .from('leave_balances')
        .select('remaining_days, entitled_days')
        .eq('user_id', data.user_id)
        .eq('leave_type_id', data.leave_type_id)
        .eq('year', currentYear)
        .single()

      if (balanceError || !balanceData) {
        // No balance found - this means it's an unlimited leave type (like sick leave, unpaid leave)
        if (balanceError && balanceError.code !== 'PGRST116') {
          // Log actual errors (but not "no rows returned" which is expected for unlimited leave)
          console.error('Error fetching leave balance:', balanceError)
        }
        setRemainingDays(999) // Large number to indicate unlimited
      } else {
        // Balance exists - calculate remaining days after approval
        const currentRemaining = balanceData.remaining_days || 0
        const wouldRemainAfterApproval = currentRemaining - data.days_requested
        const finalRemaining = Math.max(0, wouldRemainAfterApproval)
        setRemainingDays(finalRemaining)
      }

      // Fetch overlapping leave requests from team members
      const { data: overlappingLeaves, error: overlappingError } = await supabase
        .from('leave_requests')
        .select(`
          id,
          start_date,
          end_date,
          leave_types (
            name
          ),
          profiles!leave_requests_user_id_fkey (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('organization_id', data.organization_id)
        .neq('user_id', data.user_id) // Exclude the current request's user
        .neq('id', data.id) // Exclude the current request itself
        .in('status', ['approved', 'pending']) // Include both approved and pending requests
        .lte('start_date', data.end_date) // Leave starts before or on current request's end date
        .gte('end_date', data.start_date) // Leave ends after or on current request's start date

      if (overlappingError) {
        console.error('Error fetching overlapping leaves:', overlappingError)
        setConflictingLeaves([])
      } else {
        // Transform the data to match our interface
        const transformedLeaves = overlappingLeaves?.map(leave => ({
          id: leave.id,
          full_name: (leave.profiles as any)?.full_name || null,
          email: (leave.profiles as any)?.email || '',
          avatar_url: (leave.profiles as any)?.avatar_url || null,
          leave_type: (leave.leave_types as any)?.name || 'Urlop',
          end_date: new Date(leave.end_date).toLocaleDateString('pl-PL', { 
            day: '2-digit', 
            month: '2-digit' 
          })
        })) || []
        
        setConflictingLeaves(transformedLeaves)
      }

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && requestId) {
      fetchLeaveRequestDetails()
    }
  }, [isOpen, requestId])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    return `${start.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })} - ${end.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}`
  }

  const handleApprove = async () => {
    if (!requestId || !leaveRequest) return

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/leave-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'approve'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to approve leave request')
      }

      const data = await response.json()
      showSuccess(data.message || 'Wniosek urlopowy został zatwierdzony')
      
      // Close sheet and refresh data
      onClose()
      router.refresh()

    } catch (error) {
      console.error('Error approving leave request:', error)
      showError(error instanceof Error ? error.message : 'Nie udało się zatwierdzić wniosku')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async (reason: string) => {
    if (!requestId || !leaveRequest) return

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/leave-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reject',
          comment: reason
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to reject leave request')
      }

      const data = await response.json()
      showSuccess(data.message || 'Wniosek urlopowy został odrzucony')
      
      // Close sheet and refresh data
      onClose()
      router.refresh()

    } catch (error) {
      console.error('Error rejecting leave request:', error)
      showError(error instanceof Error ? error.message : 'Nie udało się odrzucić wniosku')
      throw error // Re-throw to let the dialog handle the error
    } finally {
      setIsProcessing(false)
    }
  }

  if (!leaveRequest && !loading) {
    return null
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent size="content" className="p-6 overflow-y-auto">
        {/* Accessibility title - visually hidden */}
        <SheetTitle className="sr-only">
          Szczegóły wniosku o urlop
        </SheetTitle>
        <SheetDescription className="sr-only">
          Szczegółowy widok wniosku urlopowego dla administratorów i menedżerów
        </SheetDescription>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-muted-foreground">Ładowanie...</div>
          </div>
        ) : leaveRequest ? (
          <div className="flex flex-col gap-6 h-full">
            {/* Header */}
            <div className="p-0">
              <h2 className="text-xl font-semibold text-neutral-950 leading-7">
                Szczegóły wniosku o urlop
              </h2>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-4 flex-1">
              {/* Wnioskujący */}
              <div className="bg-white border border-neutral-200 rounded-[10px] p-4">
                <div className="flex flex-col gap-3">
                  <div className="font-medium text-sm text-neutral-950">
                    Wnioskujący
                  </div>
                  <div className="flex items-center gap-4">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={leaveRequest.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="bg-neutral-100 text-neutral-950">
                        {leaveRequest.profiles?.full_name?.charAt(0) || leaveRequest.profiles?.email.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <div className="font-medium text-sm text-neutral-950">
                        {leaveRequest.profiles?.full_name || leaveRequest.profiles?.email.split('@')[0]}
                      </div>
                      <div className="font-normal text-sm text-neutral-500">
                        {leaveRequest.profiles?.email}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rodzaj urlopu */}
              <div className="bg-white border border-neutral-200 rounded-[10px] p-4">
                <div className="flex flex-col gap-3">
                  <div className="font-medium text-sm text-neutral-950">
                    Rodzaj urlopu
                  </div>
                  <div className="bg-white border border-neutral-200 rounded-lg px-3 py-2 h-9 flex items-center justify-between opacity-50 cursor-not-allowed">
                    <div className="font-normal text-sm text-neutral-500">
                      {leaveRequest.leave_types?.name || 'Wypoczynkowy'}
                    </div>
                    <ChevronDown className="w-4 h-4 text-neutral-500 opacity-50" />
                  </div>
                </div>
              </div>

              {/* Data złożenia wniosku */}
              <div className="bg-white border border-neutral-200 rounded-[10px] p-4">
                <div className="flex flex-col gap-3">
                  <div className="font-medium text-sm text-neutral-950">
                    Data złożenia wniosku
                  </div>
                  <div className="bg-white border border-neutral-200 rounded-lg px-4 py-2 h-9 flex items-center gap-2 opacity-50 cursor-not-allowed">
                    <Calendar className="w-4 h-4 text-neutral-500" />
                    <div className="font-normal text-sm text-neutral-500">
                      {formatDate(leaveRequest.created_at)} 12:00
                    </div>
                  </div>
                </div>
              </div>

              {/* Termin urlopu */}
              <div className="bg-white border border-neutral-200 rounded-[10px] p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex gap-4">
                    {/* Date range */}
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="font-medium text-sm text-neutral-950">
                        Termin urlopu
                      </div>
                      <div className="bg-white border border-neutral-200 rounded-lg px-4 py-2 h-9 flex items-center gap-2 opacity-50 cursor-not-allowed">
                        <Calendar className="w-4 h-4 text-neutral-500" />
                        <div className="font-normal text-sm text-neutral-500">
                          {formatDateRange(leaveRequest.start_date, leaveRequest.end_date)}
                        </div>
                      </div>
                    </div>

                    {/* Urlop */}
                    <div className="flex flex-col gap-2 w-[73px]">
                      <div className="font-medium text-sm text-neutral-950">
                        Urlop
                      </div>
                      <div className="bg-white border border-neutral-200 rounded-lg px-3 py-1 h-9 flex items-center opacity-50 cursor-not-allowed">
                        <div className="font-normal text-sm text-neutral-500">
                          {leaveRequest.days_requested} dni
                        </div>
                      </div>
                    </div>

                    {/* Zostanie - only show for leave types with balance tracking */}
                    {remainingDays < 999 && (
                      <div className="flex flex-col gap-2 w-[71px]">
                        <div className="font-medium text-sm text-neutral-950">
                          Zostanie
                        </div>
                        <div className="bg-white border border-neutral-200 rounded-lg px-3 py-1 h-9 flex items-center opacity-50 cursor-not-allowed">
                          <div className="font-normal text-sm text-neutral-500">
                            {remainingDays} dni
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* W tym terminie urlop planują - only show if there are conflicts */}
              {conflictingLeaves.length > 0 && (
                <div className="bg-white border border-neutral-200 rounded-[10px] p-4">
                  <div className="flex flex-col gap-3">
                    <div className="font-medium text-sm text-neutral-950">
                      W tym terminie urlop planują
                    </div>
                    <div className="space-y-4">
                      {conflictingLeaves.map((conflict) => (
                        <div key={conflict.id} className="flex items-center gap-4">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={conflict.avatar_url || undefined} />
                            <AvatarFallback className="bg-neutral-100 text-neutral-950">
                              {conflict.full_name?.charAt(0) || conflict.email.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col flex-1">
                            <div className="font-medium text-sm text-neutral-950">
                              {conflict.full_name || conflict.email.split('@')[0]}
                            </div>
                            <div className="font-normal text-sm text-neutral-500">
                              {conflict.email}
                            </div>
                          </div>
                          <div className="flex flex-col text-right">
                            <div className="font-medium text-sm text-neutral-950">
                              {conflict.leave_type}
                            </div>
                            <div className="font-normal text-sm text-neutral-500">
                              do {conflict.end_date}
                            </div>
                          </div>
                          <div className="w-10 h-10 bg-cyan-200 rounded-lg flex items-center justify-center">
                            <TreePalm className="w-6 h-6 text-neutral-950" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Opis */}
              <div className="bg-white border border-neutral-200 rounded-[10px] p-4">
                <div className="flex flex-col gap-3">
                  <div className="font-medium text-sm text-neutral-950">
                    Opis
                  </div>
                  <div className="bg-white border border-neutral-200 rounded-lg px-3 py-2 min-h-[60px] opacity-50 cursor-not-allowed">
                    <div className="font-normal text-sm text-neutral-500">
                      {leaveRequest.reason || 'Brak opisu'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                className="h-9 px-4 py-2"
                onClick={() => setIsRejectDialogOpen(true)}
                disabled={isProcessing || leaveRequest.status !== 'pending'}
              >
                {isProcessing ? 'Przetwarzanie...' : 'Odrzuć wniosek'}
              </Button>
              <Button 
                className="h-9 px-4 py-2 bg-neutral-900 text-white hover:bg-neutral-800"
                onClick={handleApprove}
                disabled={isProcessing || leaveRequest.status !== 'pending'}
              >
                {isProcessing ? 'Przetwarzanie...' : 'Zaakceptuj wniosek'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-muted-foreground">Nie znaleziono wniosku urlopowego</div>
          </div>
        )}
      </SheetContent>

      {/* Reject Leave Request Dialog */}
      <RejectLeaveRequestDialog
        isOpen={isRejectDialogOpen}
        onClose={() => setIsRejectDialogOpen(false)}
        onReject={handleReject}
        requestId={requestId || ''}
        applicantName={leaveRequest?.profiles?.full_name || leaveRequest?.profiles?.email.split('@')[0] || 'Użytkownik'}
      />
    </Sheet>
  )
} 