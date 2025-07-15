'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface LeaveRequestContextType {
  selectedRequestId: string | null
  isSheetOpen: boolean
  openLeaveRequestDetails: (requestId: string) => void
  closeLeaveRequestDetails: () => void
}

const LeaveRequestContext = createContext<LeaveRequestContextType | undefined>(undefined)

export function LeaveRequestProvider({ children }: { children: ReactNode }) {
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const openLeaveRequestDetails = (requestId: string) => {
    setSelectedRequestId(requestId)
    setIsSheetOpen(true)
  }

  const closeLeaveRequestDetails = () => {
    setIsSheetOpen(false)
    setSelectedRequestId(null)
  }

  return (
    <LeaveRequestContext.Provider
      value={{
        selectedRequestId,
        isSheetOpen,
        openLeaveRequestDetails,
        closeLeaveRequestDetails,
      }}
    >
      {children}
    </LeaveRequestContext.Provider>
  )
}

export function useLeaveRequest() {
  const context = useContext(LeaveRequestContext)
  if (context === undefined) {
    throw new Error('useLeaveRequest must be used within a LeaveRequestProvider')
  }
  return context
} 