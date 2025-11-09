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
    // Only fetch in browser environment
    if (typeof window === 'undefined') {
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch('/api/notifications?unread_only=true&limit=1', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        // Don't throw for 401/403 - user might not be authenticated yet
        if (response.status === 401 || response.status === 403) {
          setUnreadCount(0)
          return
        }
        throw new Error(`Failed to fetch unread count: ${response.status}`)
      }

      const data = await response.json()
      setUnreadCount(data.unread_count || 0)
    } catch (error) {
      // Silently handle network errors - don't spam console
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        // Network error - likely temporary, will retry on next interval
        return
      }
      console.error('Error fetching unread count:', error)
      // Reset to 0 on error to avoid showing stale data
      setUnreadCount(0)
    } finally {
      setIsLoading(false)
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
