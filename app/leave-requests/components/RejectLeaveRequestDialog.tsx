'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useSonnerToast } from '@/hooks/use-sonner-toast'

interface RejectLeaveRequestDialogProps {
  isOpen: boolean
  onClose: () => void
  onReject: (reason: string) => Promise<void>
  requestId: string
  applicantName: string
}

export function RejectLeaveRequestDialog({
  isOpen,
  onClose,
  onReject,
  requestId,
  applicantName
}: RejectLeaveRequestDialogProps) {
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { showSuccess, showError } = useSonnerToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!reason.trim()) {
      showError('Uzasadnienie odrzucenia jest wymagane')
      return
    }

    setIsLoading(true)
    try {
      await onReject(reason.trim())
      setReason('')
      onClose()
    } catch (error) {
      console.error('Error rejecting leave request:', error)
      showError('Nie udało się odrzucić wniosku')
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Odrzuć wniosek urlopowy</DialogTitle>
          <DialogDescription>
            Odrzucasz wniosek urlopowy użytkownika <strong>{applicantName}</strong>. 
            Podaj uzasadnienie odrzucenia wniosku.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason">
                Uzasadnienie odrzucenia wniosku *
              </Label>
              <Textarea
                id="reason"
                placeholder="Wpisz powód odrzucenia wniosku..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[100px]"
                disabled={isLoading}
                required
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isLoading || !reason.trim()}
            >
              {isLoading ? 'Odrzucanie...' : 'Odrzuć wniosek'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 