'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Notification } from '@/types/notification'
import { NotificationItem } from './notification-item'

interface NotificationSheetProps {
  isOpen: boolean
  onClose: () => void
  onNotificationRead: (notificationId: string) => void
}

export function NotificationSheet({
  isOpen,
  onClose,
  onNotificationRead
}: NotificationSheetProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  // Fetch notifications when sheet opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen])

  const fetchNotifications = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/notifications?limit=20')
      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }
      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unread_count || 0)
      setHasMore(data.has_more || false)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNotificationRead = (notificationId: string) => {
    // Update local state optimistically
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId
          ? { ...notif, is_read: true, read_at: new Date().toISOString() }
          : notif
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
    onNotificationRead(notificationId)
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-[560px] flex flex-col">
        {/* Header */}
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle className="text-xl font-semibold">
              Powiadomienia
            </SheetTitle>
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="h-4 min-w-5 px-1 text-xs font-semibold"
              >
                {unreadCount}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto mt-6 space-y-2">
          {isLoading ? (
            // Loading skeleton
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Brak powiadomień</p>
            </div>
          ) : (
            // Notification list
            <>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={() => handleNotificationRead(notification.id)}
                  onCloseSheet={onClose}
                />
              ))}
              {hasMore && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Więcej powiadomień dostępnych...
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Zamknij
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
