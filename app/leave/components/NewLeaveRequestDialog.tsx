'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { NewLeaveRequestForm } from '../new/components/NewLeaveRequestForm'
import { LeaveType, LeaveBalance, UserProfile } from '@/types/leave'
import { useRouter, useSearchParams } from 'next/navigation'

interface NewLeaveRequestDialogProps {
  leaveTypes: LeaveType[]
  leaveBalances: LeaveBalance[]
  userProfile?: UserProfile
}

export function NewLeaveRequestDialog({ leaveTypes, leaveBalances, userProfile }: NewLeaveRequestDialogProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isOpen = searchParams.get('new') === 'true'

  const handleClose = () => {
    router.push('/leave')
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            Nowy wniosek urlopowy
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <NewLeaveRequestForm 
            leaveTypes={leaveTypes}
            leaveBalances={leaveBalances}
            userProfile={userProfile}
            onSuccess={handleClose}
            inDialog={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
} 