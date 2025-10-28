'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NotificationSheet } from './notification-sheet'

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?unread_only=true&limit=1')
      if (!response.ok) {
        throw new Error('Failed to fetch unread count')
      }
      const data = await response.json()
      setUnreadCount(data.unread_count || 0)
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }, [])

  // Initial fetch on mount
  useEffect(() => {
    fetchUnreadCount()
  }, [fetchUnreadCount])

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isOpen) {
        // Only poll when sheet is closed to avoid conflicts
        fetchUnreadCount()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [isOpen, fetchUnreadCount])

  // Refresh count when sheet closes
  const handleSheetClose = useCallback(() => {
    setIsOpen(false)
    fetchUnreadCount()
  }, [fetchUnreadCount])

  // Handle notification read
  const handleNotificationRead = useCallback(() => {
    // Optimistic update
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="relative"
        aria-label={`Powiadomienia${unreadCount > 0 ? `, ${unreadCount} nieprzeczytanych` : ''}`}
        aria-haspopup="dialog"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs font-semibold"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      <NotificationSheet
        isOpen={isOpen}
        onClose={handleSheetClose}
        onNotificationRead={handleNotificationRead}
      />
    </>
  )
}
