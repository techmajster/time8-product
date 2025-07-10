'use client'

import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export function LeaveRequestButton() {
  const handleClick = () => {
    // Trigger the existing NewLeaveRequestSheet in the header
    // We'll dispatch a custom event that the header component can listen to
    const event = new CustomEvent('openLeaveRequest')
    window.dispatchEvent(event)
  }

  return (
    <Button 
      className="bg-neutral-900 text-neutral-50 h-9 px-4 gap-2 shadow-sm"
      onClick={handleClick}
    >
      <Plus className="w-4 h-4" />
      <span className="text-sm font-medium">Złóż wniosek o urlop</span>
    </Button>
  )
} 