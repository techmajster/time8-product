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
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  
  const router = useRouter()

  if (requestStatus !== 'pending') {
    return null
  }

  const handleAction = async (action: 'approve' | 'reject') => {
    setLoading(action)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/leave-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, comment: comment.trim() || null })
      })

      const result = await response.json()

      if (response.ok) {
        const actionText = action === 'approve' ? 'zatwierdzony' : 'odrzucony'
        setSuccess(`Wniosek został ${actionText}`)
        setIsApproveDialogOpen(false)
        setIsRejectDialogOpen(false)
        setComment('')
        
        // Refresh the page to update the request status
        router.refresh()
      } else {
        setError(result.error || `Nie udało się ${action === 'approve' ? 'zatwierdzić' : 'odrzucić'} wniosku`)
      }
    } catch (err) {
      console.error('Error updating leave request:', err)
      setError('Wystąpił błąd podczas przetwarzania wniosku')
    } finally {
      setLoading(null)
    }
  }

  const resetState = () => {
    setComment('')
    setError(null)
    setSuccess(null)
  }

  const isLoading = loading !== null

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
              disabled={isLoading}
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
                disabled={isLoading}
              >
                Anuluj
              </Button>
              <Button 
                onClick={() => handleAction('approve')}
                disabled={isLoading}
                className="bg-success hover:bg-success/90"
              >
                {loading === 'approve' ? 'Zatwierdzanie...' : 'Zatwierdź'}
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
              disabled={isLoading}
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
                disabled={isLoading}
              >
                Anuluj
              </Button>
              <Button 
                onClick={() => handleAction('reject')}
                disabled={isLoading || !comment.trim()}
                className="bg-destructive hover:bg-destructive/90"
              >
                {loading === 'reject' ? 'Odrzucanie...' : 'Odrzuć'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
} 