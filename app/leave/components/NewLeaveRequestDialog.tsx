'use client'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { NewLeaveRequestForm } from '../new/components/NewLeaveRequestForm'
import { LeaveType, LeaveBalance, UserProfile } from '@/types/leave'
import { useRouter, useSearchParams } from 'next/navigation'

interface NewLeaveRequestSheetProps {
  leaveTypes: LeaveType[]
  leaveBalances: LeaveBalance[]
  userProfile?: UserProfile
}

export function NewLeaveRequestSheet({ leaveTypes, leaveBalances, userProfile }: NewLeaveRequestSheetProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isOpen = searchParams.get('new') === 'true'

  const handleClose = () => {
    const currentPath = window.location.pathname
    router.push(currentPath)
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold text-foreground">
            Nowy wniosek urlopowy
          </SheetTitle>
        </SheetHeader>
        
        <div className="space-y-6 mt-6">
          <NewLeaveRequestForm 
            leaveTypes={leaveTypes}
            leaveBalances={leaveBalances}
            userProfile={userProfile}
            onSuccess={handleClose}
            inDialog={true}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
} 