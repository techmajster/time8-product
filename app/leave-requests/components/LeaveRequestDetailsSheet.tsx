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
import { Separator } from '@/components/ui/separator'
import { Calendar, ChevronDown } from 'lucide-react'
import { RejectLeaveRequestDialog } from './RejectLeaveRequestDialog'
import { useSonnerToast } from '@/hooks/use-sonner-toast'
import { useRouter } from 'next/navigation'
import { useOrganization } from '@/components/app-layout-client'
import { EditLeaveRequestSheet } from '@/components/EditLeaveRequestSheet'
import { LeaveType, LeaveBalance, UserProfile } from '@/types/leave'

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
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastFetchedId, setLastFetchedId] = useState<string | null>(null)

  // Data for edit sheet (from API)
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userRole, setUserRole] = useState<string>('')
  const [currentUserId, setCurrentUserId] = useState<string>('')

  const { showSuccess, showError} = useSonnerToast()
  const router = useRouter()
  const { organization } = useOrganization()

  const fetchLeaveRequestDetails = async () => {
    if (!requestId) return

    setLoading(true)

    try {
      console.log('🔍 Fetching leave request details via API:', { requestId })

      const response = await fetch(`/api/leave-requests/${requestId}/details`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          requestId,
          url: response.url
        })
        return
      }

      const data = await response.json()
      console.log('✅ Leave request API response:', {
        id: data.leaveRequest.id,
        status: data.leaveRequest.status,
        userId: data.leaveRequest.user_id,
        organizationId: data.leaveRequest.organization_id
      })

      // Set all the state from API response
      setLeaveRequest(data.leaveRequest)
      setConflictingLeaves(data.conflictingLeaves)
      setUserRole(data.userRole)
      setCurrentUserId(data.currentUserId)
      setLeaveTypes(data.leaveTypes)
      setLeaveBalances(data.leaveBalances)
      setUserProfile(data.userProfile)

      console.log('🔍 Manager sheet debug:', {
        hasLeaveRequest: !!data.leaveRequest,
        hasUserProfile: !!data.userProfile,
        hasLeaveTypes: !!data.leaveTypes,
        hasLeaveBalances: !!data.leaveBalances,
        leaveRequestStatus: data.leaveRequest?.status,
        userRole: data.userRole,
        canEdit: ['pending', 'approved'].includes(data.leaveRequest?.status),
        canDelete: ['pending', 'approved'].includes(data.leaveRequest?.status)
      })

      // Cache this request ID
      setLastFetchedId(requestId)

    } catch (error) {
      console.error('❌ Fetch error:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        requestId,
        name: error instanceof Error ? error.name : typeof error
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && requestId) {
      // Only fetch if we don't have data for this request ID
      if (lastFetchedId !== requestId) {
        fetchLeaveRequestDetails()
      }
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
    
    return `${start.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${end.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Oczekujący'
      case 'approved': return 'Zaakceptowany'
      case 'rejected': return 'Odrzucony'
      case 'cancelled': return 'Anulowany'
      default: return status
    }
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

  // Check if request can be edited (admins can edit pending/approved)
  const canEdit = leaveRequest &&
    ['pending', 'approved'].includes(leaveRequest.status)

  if (!leaveRequest && !loading) {
    return null
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent size="content" className="overflow-y-auto">
        <div className="flex flex-col h-full">
          <div className="flex flex-col gap-6 items-end p-6 h-full">
            {/* Accessibility title - visually hidden */}
            <SheetTitle className="sr-only">
              Szczegóły wniosku o urlop
            </SheetTitle>
            <SheetDescription className="sr-only">
              Szczegółowy widok wniosku urlopowego dla administratorów i menedżerów
            </SheetDescription>

            {loading ? (
              <div className="flex items-center justify-center h-32 w-full">
                <div className="text-sm text-muted-foreground">Ładowanie...</div>
              </div>
            ) : leaveRequest ? (
              <>
                {/* Header */}
                <div className="flex flex-col gap-1.5 items-start w-full">
                  <h2 className="text-xl font-semibold leading-7 text-foreground">
                    Szczegóły wniosku o urlop
                  </h2>
                </div>

                {/* Separator */}
                <div className="w-full">
                  <Separator className="w-full" />
                </div>

                {/* Content */}
                <div className="flex flex-col gap-8 items-start w-full flex-1">
                  {/* Wnioskujący */}
                  <div className="flex flex-col gap-2 items-start w-full">
                    <div className="text-sm font-medium leading-none text-foreground">
                      Wnioskujący
                    </div>
                    <div className="flex flex-col gap-8 items-start w-full">
                      <div className="flex flex-row gap-4 items-center w-full min-w-[85px]">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={leaveRequest.profiles?.avatar_url || undefined} />
                          <AvatarFallback className="text-foreground">
                            {leaveRequest.profiles?.full_name?.split(' ').map(n => n[0]).join('') || leaveRequest.profiles?.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col flex-1 items-start text-sm leading-none">
                          <div className="flex flex-col justify-center font-medium text-foreground w-full overflow-hidden overflow-ellipsis">
                            <p className="block leading-5 overflow-inherit">
                              {leaveRequest.profiles?.full_name || leaveRequest.profiles?.email.split('@')[0]}
                            </p>
                          </div>
                          <div className="flex flex-col justify-center font-normal text-muted-foreground w-full overflow-hidden overflow-ellipsis">
                            <p className="block leading-5 overflow-inherit text-sm">
                              {leaveRequest.profiles?.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex flex-col gap-2 items-start w-full text-left text-foreground leading-none">
                    <div className="text-sm font-medium">
                      <p className="block leading-none">Status</p>
                    </div>
                    <div className="text-xl font-semibold">
                      <p className="block leading-7">{getStatusText(leaveRequest.status)}</p>
                    </div>
                  </div>

                  {/* Rodzaj urlopu */}
                  <div className="flex flex-col gap-2 items-start w-full text-left text-foreground leading-none">
                    <div className="text-sm font-medium">
                      <p className="block leading-none">Rodzaj urlopu</p>
                    </div>
                    <div className="text-xl font-semibold">
                      <p className="block leading-7">{leaveRequest.leave_types?.name || 'Wypoczynkowy'}</p>
                    </div>
                  </div>

                  {/* Data złożenia wniosku */}
                  <div className="flex flex-col gap-2 items-start w-full">
                    <div className="text-sm font-medium leading-none text-foreground">
                      <p className="block leading-none">Data złożenia wniosku</p>
                    </div>
                    <div className="flex flex-row gap-2.5 items-center w-full">
                      <div className="text-xl font-semibold leading-none text-foreground flex-1">
                        <p className="block leading-7">{formatDate(leaveRequest.created_at)} 12:00</p>
                      </div>
                    </div>
                  </div>

                  {/* Termin urlopu i Długość urlopu */}
                  <div className="flex flex-row gap-6 items-start w-full">
                    <div className="flex flex-col gap-2 items-start text-left text-foreground leading-none w-[314px]">
                      <div className="text-sm font-medium">
                        <p className="block leading-none">Termin urlopu</p>
                      </div>
                      <div className="text-xl font-semibold flex-1 w-full">
                        <p className="block leading-7">
                          {formatDateRange(leaveRequest.start_date, leaveRequest.end_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-1 items-start text-left text-foreground leading-none">
                      <div className="text-sm font-medium">
                        <p className="block leading-none">Długość urlopu</p>
                      </div>
                      <div className="text-xl font-semibold flex-1 w-full">
                        <p className="block leading-7">{leaveRequest.days_requested} {leaveRequest.days_requested === 1 ? 'dzień' : 'dni'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Zaplanowane urlopy - matching Figma design */}
                  {conflictingLeaves.length > 0 && (
                    <div className="bg-card border border-border rounded-lg p-6 w-full">
                      <div className="flex items-center justify-between w-full mb-3">
                        <p className="text-sm font-medium leading-5 text-foreground">
                          Zaplanowane urlopy
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 w-full">
                        {conflictingLeaves.map((conflict) => (
                          <div key={conflict.id} className="flex gap-4 items-center min-w-[85px] w-full">
                            <Avatar className="w-10 h-10 rounded-full">
                              <AvatarImage src={conflict.avatar_url || undefined} />
                              <AvatarFallback className="bg-muted">
                                {conflict.full_name?.split(' ').map(n => n[0]).join('') || conflict.email?.[0]?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="basis-0 flex flex-col grow items-start leading-none min-h-px min-w-px text-nowrap">
                              <div className="flex flex-col font-medium justify-center overflow-ellipsis overflow-hidden text-foreground w-full">
                                <p className="leading-5 overflow-ellipsis overflow-hidden text-sm text-nowrap">
                                  {conflict.full_name || conflict.email?.split('@')[0] || 'Unknown'}
                                </p>
                              </div>
                              <div className="flex flex-col font-normal justify-center overflow-ellipsis overflow-hidden text-muted-foreground w-full">
                                <p className="leading-5 overflow-ellipsis overflow-hidden text-sm text-nowrap">
                                  {conflict.email || 'No email'}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end justify-center leading-none text-nowrap text-right text-sm">
                              <div className="flex flex-col font-medium justify-center overflow-ellipsis overflow-hidden text-foreground w-full">
                                <p className="leading-5 overflow-ellipsis overflow-hidden text-sm text-nowrap">
                                  {conflict.leave_type}
                                </p>
                              </div>
                              <div className="flex flex-col font-normal justify-center overflow-ellipsis overflow-hidden text-muted-foreground w-full">
                                <p className="leading-5 overflow-ellipsis overflow-hidden text-sm text-nowrap">
                                  do {conflict.end_date}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Opis */}
                  <div className="flex flex-col gap-2 items-start w-full">
                    <div className="text-sm font-medium leading-none text-foreground">
                      <p className="block leading-none">Opis</p>
                    </div>
                    <div className="flex flex-row gap-2.5 items-center w-full">
                      <div className="text-base font-normal leading-none text-foreground flex-1">
                        <p className="block leading-6">{leaveRequest.reason || 'Brak opisu'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer - show actions based on status */}
                {(leaveRequest.status === 'pending' || canEdit) && (
                  <div className="flex justify-between gap-2 pt-4 w-full">
                    {/* Left side button - Edit */}
                    <div className="flex gap-2">
                      {canEdit && (
                        <Button
                          variant="outline"
                          className="h-9 px-4 py-2"
                          onClick={() => {
                            onClose()
                            setIsEditOpen(true)
                          }}
                          disabled={isProcessing}
                        >
                          Edytuj wniosek
                        </Button>
                      )}
                    </div>

                    {/* Right side buttons - Approve/Reject (only for pending) */}
                    {leaveRequest.status === 'pending' && (
                      <div className="flex gap-2 ml-auto">
                        <Button
                          variant="outline"
                          className="h-9 px-4 py-2"
                          onClick={() => setIsRejectDialogOpen(true)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? 'Przetwarzanie...' : 'Odrzuć wniosek'}
                        </Button>
                        <Button
                          className="h-9 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
                          onClick={handleApprove}
                          disabled={isProcessing}
                        >
                          {isProcessing ? 'Przetwarzanie...' : 'Zaakceptuj wniosek'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-32 w-full">
                <div className="text-sm text-muted-foreground">Nie znaleziono wniosku urlopowego</div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>

      {/* Reject Leave Request Dialog */}
      <RejectLeaveRequestDialog
        isOpen={isRejectDialogOpen}
        onClose={() => setIsRejectDialogOpen(false)}
        onReject={handleReject}
        requestId={requestId || ''}
        applicantName={leaveRequest?.profiles?.full_name || leaveRequest?.profiles?.email.split('@')[0] || 'Użytkownik'}
      />

      {/* Edit Leave Request Sheet */}
      {leaveRequest && userProfile && (
        <EditLeaveRequestSheet
          leaveRequest={leaveRequest as any}
          leaveTypes={leaveTypes}
          leaveBalances={leaveBalances}
          userProfile={userProfile as any}
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false)
            fetchLeaveRequestDetails()
          }}
        />
      )}
    </Sheet>
  )
} 