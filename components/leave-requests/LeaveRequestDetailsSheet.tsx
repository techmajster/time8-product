'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { X } from 'lucide-react'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { RequesterSection } from '@/components/admin/RequesterSection'
import { BalanceCards } from '@/components/admin/BalanceCards'
import { ConflictingLeavesCard } from '@/components/admin/ConflictingLeavesCard'
import { RejectLeaveRequestSheet } from '@/app/leave-requests/components/RejectLeaveRequestSheet'
import { useSonnerToast } from '@/hooks/use-sonner-toast'
import { EditLeaveRequestSheet } from '@/components/EditLeaveRequestSheet'
import { LeaveType, LeaveBalance, UserProfile } from '@/types/leave'

interface LeaveRequestDetailsSheetProps {
  requestId: string | null
  isOpen: boolean
  onClose: () => void
  view?: 'employee' | 'manager' // Auto-detected if not provided
}

interface LeaveRequestDetails {
  id: string
  user_id: string
  start_date: string
  end_date: string
  leave_type_id: string
  days_requested: number
  reason: string | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed'
  created_at: string
  edited_by?: string | null
  edited_at?: string | null
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

export function LeaveRequestDetailsSheet({
  requestId,
  isOpen,
  onClose,
  view
}: LeaveRequestDetailsSheetProps) {
  const t = useTranslations('leave')
  const tSheet = useTranslations('leave.sheet')
  const tButtons = useTranslations('leave.buttons')
  const tCommon = useTranslations('common')

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

  const { showSuccess, showError } = useSonnerToast()

  // Auto-detect view mode based on role if not explicitly provided
  const effectiveView = view || (userRole === 'admin' || userRole === 'manager' ? 'manager' : 'employee')
  const isManagerView = effectiveView === 'manager'
  const isOwnRequest = leaveRequest?.user_id === currentUserId

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

      // Cache this request ID
      setLastFetchedId(requestId)

    } catch (error) {
      console.error('❌ Fetch error:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId
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

      // Close sheet
      onClose()

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

      // Close sheet
      onClose()

    } catch (error) {
      console.error('Error rejecting leave request:', error)
      showError(error instanceof Error ? error.message : 'Nie udało się odrzucić wniosku')
      throw error // Re-throw to let the dialog handle the error
    } finally {
      setIsProcessing(false)
    }
  }

  // Permission checks
  const canApprove = isManagerView && !isOwnRequest && leaveRequest?.status === 'pending'
  const canEdit = leaveRequest && (
    // Employees can edit their own pending/approved requests
    (isOwnRequest && ['pending', 'approved'].includes(leaveRequest.status)) ||
    // Managers can edit any pending/approved requests
    (isManagerView && ['pending', 'approved'].includes(leaveRequest.status))
  )

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
              {tSheet('leaveDetails')}
            </SheetTitle>
            <SheetDescription className="sr-only">
              {tSheet('details')}
            </SheetDescription>

            {loading ? (
              <div className="flex items-center justify-center h-32 w-full">
                <div className="text-sm text-muted-foreground">{tCommon('loading')}</div>
              </div>
            ) : leaveRequest ? (
              <>
                {/* Header with close button */}
                <div className="flex justify-between items-start w-full">
                  <h2 className="text-xl font-semibold leading-7 text-foreground">
                    {tSheet('leaveRequest')}
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 -mt-1"
                    onClick={onClose}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Separator */}
                <div className="w-full">
                  <Separator className="w-full" />
                </div>

                {/* Content */}
                <div className="flex flex-col gap-6 items-start w-full flex-1">
                  {/* Requester Section - only for manager view when viewing others' requests */}
                  {isManagerView && !isOwnRequest && leaveRequest.profiles && (
                    <RequesterSection
                      requester={{
                        id: leaveRequest.user_id,
                        full_name: leaveRequest.profiles.full_name,
                        email: leaveRequest.profiles.email,
                        avatar_url: leaveRequest.profiles.avatar_url || undefined
                      }}
                      currentUserId={currentUserId}
                      userRole={userRole as 'admin' | 'manager' | 'employee'}
                    />
                  )}

                  {/* Status */}
                  <div className="flex flex-col gap-2 items-start w-full">
                    <p className="text-sm font-medium text-muted-foreground">
                      Status
                    </p>
                    <StatusBadge status={leaveRequest.status} />
                  </div>

                  {/* Rodzaj urlopu */}
                  <div className="flex flex-col gap-2 items-start w-full">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('leaveType')}
                    </p>
                    <p className="text-base font-semibold text-foreground">
                      {leaveRequest.leave_types?.name || 'Wypoczynkowy'}
                    </p>
                  </div>

                  {/* Termin urlopu */}
                  <div className="flex flex-col gap-2 items-start w-full">
                    <p className="text-sm font-medium text-muted-foreground">
                      {tSheet('dateRange')}
                    </p>
                    <p className="text-base font-semibold text-foreground">
                      {formatDateRange(leaveRequest.start_date, leaveRequest.end_date)}
                    </p>
                  </div>

                  {/* Balance Cards */}
                  <BalanceCards
                    available={25}
                    requested={leaveRequest.days_requested}
                    remaining={25 - leaveRequest.days_requested}
                  />

                  {/* Conflicting Leaves Card */}
                  {conflictingLeaves.length > 0 && (
                    <ConflictingLeavesCard
                      conflictingLeaves={conflictingLeaves.map(conflict => ({
                        full_name: conflict.full_name,
                        email: conflict.email,
                        avatar_url: conflict.avatar_url,
                        leave_type: conflict.leave_type,
                        end_date: conflict.end_date
                      }))}
                    />
                  )}

                  {/* Opis */}
                  {leaveRequest.reason && (
                    <div className="flex flex-col gap-2 items-start w-full">
                      <p className="text-sm font-medium text-muted-foreground">
                        {tSheet('description')}
                      </p>
                      <p className="text-base font-normal text-foreground">
                        {leaveRequest.reason}
                      </p>
                    </div>
                  )}

                  {/* Separator before submission date */}
                  <div className="w-full">
                    <Separator className="w-full" />
                  </div>

                  {/* Data złożenia wniosku */}
                  <div className="flex flex-col gap-2 items-start w-full">
                    <p className="text-sm font-medium text-muted-foreground">
                      {tSheet('submissionDate')}
                    </p>
                    <p className="text-base font-semibold text-foreground">
                      {formatDate(leaveRequest.created_at)} 12:00
                    </p>
                  </div>

                  {/* Audit trail - show if edited by admin/manager */}
                  {leaveRequest.edited_by && leaveRequest.edited_at && (
                    <div className="flex flex-col gap-2 items-start w-full">
                      <p className="text-sm font-medium text-muted-foreground">
                        Ostatnia edycja
                      </p>
                      <p className="text-base font-normal text-foreground">
                        {formatDate(leaveRequest.edited_at)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer - show actions based on status and permissions */}
                {canApprove ? (
                  <div className="flex justify-between items-center w-full pt-4">
                    <Button
                      className="h-9 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={handleApprove}
                      disabled={isProcessing}
                    >
                      {isProcessing ? tCommon('loading') : tButtons('approve')}
                    </Button>
                    <Button
                      variant="destructive"
                      className="h-9 px-4 py-2"
                      onClick={() => {
                        onClose() // Close details sheet
                        setIsRejectDialogOpen(true) // Open reject sheet
                      }}
                      disabled={isProcessing}
                    >
                      {isProcessing ? tCommon('loading') : tButtons('reject')}
                    </Button>
                  </div>
                ) : canEdit ? (
                  <div className="flex justify-between items-center w-full pt-4">
                    <Button
                      variant="outline"
                      className="h-9 px-4 py-2"
                      onClick={() => {
                        onClose() // Close details sheet
                        setIsEditOpen(true) // Open edit sheet
                      }}
                    >
                      {tButtons('edit')}
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9 px-4 py-2"
                      onClick={onClose}
                    >
                      {tButtons('close')}
                    </Button>
                  </div>
                ) : (
                  <div className="flex justify-end items-center w-full pt-4">
                    <Button
                      variant="outline"
                      className="h-9 px-4 py-2"
                      onClick={onClose}
                    >
                      {tButtons('close')}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-32 w-full">
                <div className="text-sm text-muted-foreground">
                  {t('notFound') || 'Nie znaleziono wniosku urlopowego'}
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>

      {/* Reject Leave Request Sheet */}
      <RejectLeaveRequestSheet
        isOpen={isRejectDialogOpen}
        onClose={() => setIsRejectDialogOpen(false)}
        onReject={handleReject}
        leaveRequest={leaveRequest}
      />

      {/* Edit Leave Request Sheet */}
      {leaveRequest && userProfile && (
        <EditLeaveRequestSheet
          leaveRequest={leaveRequest as any}
          leaveTypes={leaveTypes}
          leaveBalances={leaveBalances}
          userProfile={userProfile as any}
          currentUserRole={userRole}
          currentUserId={currentUserId}
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
