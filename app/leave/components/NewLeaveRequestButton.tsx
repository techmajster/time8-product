'use client'

import { Button } from '@/components/ui/button'

export function NewLeaveRequestButton() {
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent('openLeaveRequest', {
      detail: { date: undefined }
    }))
  }

  return (
    <Button 
      variant="default"
      size="default"
      onClick={handleClick}
    >
      Złóż wniosek o urlop
    </Button>
  )
} 