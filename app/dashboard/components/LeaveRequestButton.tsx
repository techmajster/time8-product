'use client'

import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function LeaveRequestButton() {
  const t = useTranslations()
  
  const handleClick = () => {
    // Trigger the existing NewLeaveRequestSheet in the header
    // We'll dispatch a custom event that the header component can listen to
    const event = new CustomEvent('openLeaveRequest')
    window.dispatchEvent(event)
  }

  return (
    <Button 
      variant="default"
      size="default"
      onClick={handleClick}
    >
      <Plus className="w-4 h-4" />
      {t('leave.page.button.requestLeave')}
    </Button>
  )
} 