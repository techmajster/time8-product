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
import { Trash2, AlertTriangle } from 'lucide-react'

interface CancelLeaveRequestButtonProps {
  requestId: string
  requestStatus: string
  leaveType: string
  dateRange: string
  startDate: string
  className?: string
}

export function CancelLeaveRequestButton({ 
  requestId, 
  requestStatus, 
  leaveType, 
  dateRange,
  startDate,
  className = ''
}: CancelLeaveRequestButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  const router = useRouter()

  // Only show for requests that can be cancelled
  if (requestStatus === 'cancelled') {
    return null
  }

  // Don't show cancel button if leave has already started
  const today = new Date()
  const leaveStartDate = new Date(startDate)
  const hasStarted = today >= leaveStartDate

  if (hasStarted) {
    return null
  }

  const handleCancel = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/leave-requests/${requestId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: comment.trim() || null })
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess('Wniosek urlopowy został anulowany')
        setIsDialogOpen(false)
        setComment('')
        
        // Refresh the page to update the request status
        router.refresh()
      } else {
        setError(result.error || 'Nie udało się anulować wniosku')
      }
    } catch (err) {
      console.error('Error cancelling leave request:', err)
      setError('Wystąpił błąd podczas anulowania wniosku')
    } finally {
      setLoading(false)
    }
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
        <Alert className="bg-primary/5 border-primary/20 text-primary-foreground">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open)
        if (!open) resetState()
      }}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className={`text-destructive hover:bg-destructive/5 ${className}`}
            disabled={loading}
          >
            Anuluj wniosek
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Anuluj wniosek urlopowy
            </DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz anulować ten wniosek urlopowy? Ta akcja jest nieodwracalna.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <div><strong>Typ urlopu:</strong> {leaveType}</div>
              <div><strong>Okres:</strong> {dateRange}</div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cancel-comment">Powód anulowania (opcjonalny)</Label>
              <Textarea
                id="cancel-comment"
                placeholder="Opcjonalny powód anulowania wniosku..."
                value={comment}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
                rows={3}
              />
            </div>
            
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Uwaga:</strong> Anulowanie wniosku jest nieodwracalne. Po anulowaniu nie będzie można przywrócić tego wniosku.
              </AlertDescription>
            </Alert>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
              disabled={loading}
            >
              Anuluj
            </Button>
            <Button 
              onClick={handleCancel}
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? 'Anulowanie...' : 'Anuluj wniosek'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 