'use client'

import { Button } from '@/components/ui/button'
import { Eye } from 'lucide-react'
import { useLeaveRequestDetails } from '@/hooks/use-leave-request-details'

interface LeaveRequestDetailsButtonProps {
  requestId: string
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  children?: React.ReactNode
}

/**
 * Reusable button component that opens leave request details in a global sheet
 * Can be used anywhere in the application
 */
export function LeaveRequestDetailsButton({ 
  requestId, 
  variant = 'outline', 
  size = 'sm',
  children 
}: LeaveRequestDetailsButtonProps) {
  const { openDetails } = useLeaveRequestDetails()

  return (
    <Button 
      variant={variant} 
      size={size}
      onClick={() => openDetails(requestId)}
    >
      {children || (
        <>
          <Eye className="h-4 w-4 mr-2" />
          Zobacz szczegóły
        </>
      )}
    </Button>
  )
} 