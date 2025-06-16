'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EditLeaveRequestForm } from '../[id]/edit/components/EditLeaveRequestForm'
import { LeaveType, LeaveBalance, LeaveRequest, UserProfile } from '@/types/leave'

interface EditLeaveRequestDialogProps {
  leaveTypes: LeaveType[]
  leaveBalances: LeaveBalance[]
  request: LeaveRequest | null
  userProfile?: UserProfile
}

export function EditLeaveRequestDialog({ leaveTypes, leaveBalances, request, userProfile }: EditLeaveRequestDialogProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  const isOpen = !!editId && !!request

  const handleClose = () => {
    router.push('/leave')
  }

  if (!request) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Edytuj wniosek urlopowy
          </DialogTitle>
        </DialogHeader>
        
        <EditLeaveRequestForm 
          leaveRequest={request}
          leaveTypes={leaveTypes}
          leaveBalances={leaveBalances}
          userProfile={userProfile}
          onSuccess={handleClose}
          inDialog={true}
        />
      </DialogContent>
    </Dialog>
  )
} 