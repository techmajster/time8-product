'use client'

import { useLeaveRequest } from './providers/LeaveRequestProvider'
import { LeaveRequestDetailsSheet } from './LeaveRequestDetailsSheet'

export function GlobalLeaveRequestSheet() {
  const { selectedRequestId, isSheetOpen, closeLeaveRequestDetails } = useLeaveRequest()

  return (
    <LeaveRequestDetailsSheet
      requestId={selectedRequestId}
      isOpen={isSheetOpen}
      onClose={closeLeaveRequestDetails}
    />
  )
} 