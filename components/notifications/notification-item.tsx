'use client'

import { memo } from 'react'
import { Check, X, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Notification, NotificationType } from '@/types/notification'
import { cn } from '@/lib/utils'
import { useLeaveRequest } from '@/components/providers/LeaveRequestProvider'

interface NotificationItemProps {
  notification: Notification
  onRead: () => void
  onCloseSheet?: () => void
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'leave_request_approved':
      return <Check className="w-5 h-5" />
    case 'leave_request_rejected':
      return <X className="w-5 h-5" />
    case 'leave_request_pending':
      return <Info className="w-5 h-5" />
  }
}

export const NotificationItem = memo(({ notification, onRead, onCloseSheet }: NotificationItemProps) => {
  const { openLeaveRequestDetails } = useLeaveRequest()

  const handleDetailsClick = async () => {
    // Mark as read if not already read
    if (!notification.is_read) {
      try {
        await fetch(`/api/notifications/${notification.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_read: true })
        })
        onRead()
      } catch (error) {
        console.error('Failed to mark notification as read:', error)
      }
    }

    // Close notification sheet first
    if (onCloseSheet) {
      onCloseSheet()
    }

    // Then open leave request details sheet
    if (notification.related_leave_request_id) {
      // Small delay to allow notification sheet to close first
      setTimeout(() => {
        openLeaveRequestDetails(notification.related_leave_request_id!)
      }, 100)
    }
  }

  return (
    <div
      className={cn(
        "flex gap-2 items-start p-4 rounded-md border",
        notification.is_read
          ? "bg-card border-border"  // Read: white background
          : "bg-blue-50 border-border" // Unread: blue-50 background
      )}
    >
      {/* Icon */}
      <div className="shrink-0 w-5 h-5">
        {getNotificationIcon(notification.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-popover-foreground">
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-sm text-muted-foreground mt-0.5">
            {notification.message}
          </p>
        )}
      </div>

      {/* Action Button */}
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 h-8 px-3 text-xs font-medium"
        onClick={handleDetailsClick}
      >
        Szczegóły
      </Button>
    </div>
  )
})

NotificationItem.displayName = 'NotificationItem'
