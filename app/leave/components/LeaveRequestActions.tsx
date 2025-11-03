'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CheckCircle, XCircle } from 'lucide-react'
import { useApproveRejectLeaveRequest } from '@/hooks/use-leave-mutations'

interface LeaveRequestActionsProps {
  requestId: string
  requestStatus: string
  employeeName: string
  leaveType: string
  dateRange: string
}

export function LeaveRequestActions({
  requestId,
  requestStatus,
  employeeName,
  leaveType,
  dateRange
}: LeaveRequestActionsProps) {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)

  const router = useRouter()

  // React Query mutation
  const approveMutation = useApproveRejectLeaveRequest(requestId)

  if (requestStatus !== 'pending') {
    return null
  }

  const handleAction = async (action: 'approve' | 'reject') => {
    setError(null)
    setSuccess(null)

    // Use React Query mutation
    approveMutation.mutate({
      action,
      comment: comment.trim() || null
    }, {
      onSuccess: () => {
        const actionText = action === 'approve' ? 'zatwierdzony' : 'odrzucony'
        setSuccess(`Wniosek został ${actionText}`)
        setIsApproveDialogOpen(false)
        setIsRejectDialogOpen(false)
        setComment('')
      },
      onError: (error) => {
        setError(error.message || `Nie udało się ${action === 'approve' ? 'zatwierdzić' : 'odrzucić'} wniosku`)
      }
    })
  }

  const resetState = () => {
    setComment('')
    setError(null)
    setSuccess(null)
  }

  return (
    <div className="space-y-2">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="bg-success/10 border-success/20 text-success">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      
      <div className="flex gap-2">
        {/* Approve Dialog */}
        <Dialog open={isApproveDialogOpen} onOpenChange={(open) => {
          setIsApproveDialogOpen(open)
          if (!open) resetState()
        }}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="text-success hover:bg-success/5"
              disabled={approveMutation.isPending}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Zatwierdź
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Zatwierdź wniosek urlopowy</DialogTitle>
              <DialogDescription>
                Potwierdź zatwierdzenie wniosku urlopowego dla wybranego pracownika.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <div><strong>Pracownik:</strong> {employeeName}</div>
                <div><strong>Typ urlopu:</strong> {leaveType}</div>
                <div><strong>Okres:</strong> {dateRange}</div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="approve-comment">Komentarz (opcjonalny)</Label>
                <Textarea
                  id="approve-comment"
                  placeholder="Opcjonalny komentarz do zatwierdzenia..."
                  value={comment}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
                  rows={3}
                />
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsApproveDialogOpen(false)}
                disabled={approveMutation.isPending}
              >
                Anuluj
              </Button>
              <Button
                onClick={() => handleAction('approve')}
                disabled={approveMutation.isPending}
                className="bg-success hover:bg-success/90"
              >
                {approveMutation.isPending ? 'Zatwierdzanie...' : 'Zatwierdź'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={isRejectDialogOpen} onOpenChange={(open) => {
          setIsRejectDialogOpen(open)
          if (!open) resetState()
        }}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:bg-destructive/5"
              disabled={approveMutation.isPending}
            >
              <XCircle className="h-3 w-3 mr-1" />
              Odrzuć
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Odrzuć wniosek urlopowy</DialogTitle>
              <DialogDescription>
                Podaj powód odrzucenia wniosku urlopowego.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <div><strong>Pracownik:</strong> {employeeName}</div>
                <div><strong>Typ urlopu:</strong> {leaveType}</div>
                <div><strong>Okres:</strong> {dateRange}</div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reject-comment">Powód odrzucenia (wymagany)</Label>
                <Textarea
                  id="reject-comment"
                  placeholder="Podaj powód odrzucenia wniosku..."
                  value={comment}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
                  rows={3}
                  required
                />
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsRejectDialogOpen(false)}
                disabled={approveMutation.isPending}
              >
                Anuluj
              </Button>
              <Button
                onClick={() => handleAction('reject')}
                disabled={approveMutation.isPending || !comment.trim()}
                className="bg-destructive hover:bg-destructive/90"
              >
                {approveMutation.isPending ? 'Odrzucanie...' : 'Odrzuć'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
} 