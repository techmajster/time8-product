'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { X } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useSonnerToast } from '@/hooks/use-sonner-toast'

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

interface RejectLeaveRequestSheetProps {
  isOpen: boolean
  onClose: () => void
  onReject: (reason: string) => Promise<void>
  leaveRequest: LeaveRequestDetails | null
}

export function RejectLeaveRequestSheet({
  isOpen,
  onClose,
  onReject,
  leaveRequest
}: RejectLeaveRequestSheetProps) {
  const t = useTranslations('leave')
  const tSheet = useTranslations('leave.sheet')
  const tButtons = useTranslations('leave.buttons')
  const tCommon = useTranslations('common')

  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { showError } = useSonnerToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!reason.trim()) {
      showError(tSheet('rejectReasonPlaceholder'))
      return
    }

    setIsLoading(true)
    try {
      await onReject(reason.trim())
      setReason('')
      onClose()
    } catch (error) {
      console.error('Error rejecting leave request:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setReason('')
      onClose()
    }
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return `${start.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${end.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
  }

  if (!leaveRequest) {
    return null
  }

  const initials = leaveRequest.profiles?.full_name
    ? leaveRequest.profiles.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : leaveRequest.profiles?.email[0].toUpperCase()

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent size="content" className="overflow-y-auto">
        <div className="flex flex-col h-full">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 items-end p-6 h-full">
            {/* Accessibility title */}
            <SheetTitle className="sr-only">
              Odrzuć wniosek o urlop
            </SheetTitle>
            <SheetDescription className="sr-only">
              {tSheet('rejectReason')}
            </SheetDescription>

            {/* Header with close button */}
            <div className="flex justify-between items-start w-full">
              <h2 className="text-xl font-semibold leading-7 text-foreground">
                Odrzuć wniosek o urlop
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mt-1"
                onClick={handleClose}
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Separator */}
            <div className="w-full">
              <Separator className="w-full" />
            </div>

            {/* Content - Simplified read-only info */}
            <div className="flex flex-col gap-6 items-start w-full flex-1">
              {/* Wnioskujący */}
              {leaveRequest.profiles && (
                <div className="flex flex-col gap-2 items-start w-full">
                  <p className="text-sm font-medium text-muted-foreground">
                    {tSheet('requester')}
                  </p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={leaveRequest.profiles.avatar_url || undefined}
                        alt={leaveRequest.profiles.full_name || leaveRequest.profiles.email}
                      />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <p className="text-sm font-medium">
                        {leaveRequest.profiles.full_name || leaveRequest.profiles.email}
                      </p>
                      {leaveRequest.profiles.full_name && (
                        <p className="text-xs text-muted-foreground">
                          {leaveRequest.profiles.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Rodzaj urlopu */}
              <div className="flex flex-col gap-2 items-start w-full">
                <p className="text-sm font-medium text-muted-foreground">
                  Rodzaj urlopu
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

              {/* Separator */}
              <div className="w-full">
                <Separator className="w-full" />
              </div>

              {/* Rejection Reason */}
              <div className="flex flex-col gap-2 w-full">
                <Label htmlFor="reason" className="text-sm font-medium text-foreground">
                  Uzasadnienie odrzucenia wniosku
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Wpisz uzasadnienie"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-[200px]"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between gap-2 w-full pt-4">
              <Button
                type="button"
                variant="outline"
                className="h-9 px-4 py-2"
                onClick={handleClose}
                disabled={isLoading}
              >
                Anuluj
              </Button>
              <Button
                type="submit"
                variant="destructive"
                className="h-9 px-4 py-2"
                disabled={isLoading || !reason.trim()}
              >
                {isLoading ? tCommon('loading') : 'Odrzuć wniosek'}
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
