import { useLeaveRequest } from '@/components/providers/LeaveRequestProvider'

/**
 * Custom hook for opening leave request details globally
 * Can be used from any component in the app
 */
export function useLeaveRequestDetails() {
  const { openLeaveRequestDetails, closeLeaveRequestDetails, isSheetOpen, selectedRequestId } = useLeaveRequest()

  return {
    /**
     * Opens the leave request details sheet with the specified request ID
     */
    openDetails: openLeaveRequestDetails,
    
    /**
     * Closes the leave request details sheet
     */
    closeDetails: closeLeaveRequestDetails,
    
    /**
     * Whether the sheet is currently open
     */
    isOpen: isSheetOpen,
    
    /**
     * The ID of the currently selected request (if any)
     */
    currentRequestId: selectedRequestId,
  }
} 