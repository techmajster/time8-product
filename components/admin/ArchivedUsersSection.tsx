'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Archive, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { toast } from 'sonner'

interface ArchivedUser {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: string
}

interface ArchivedUsersSectionProps {
  users: ArchivedUser[]
  onReactivate?: (userId: string) => Promise<void>
  className?: string
}

export function ArchivedUsersSection({
  users,
  onReactivate,
  className
}: ArchivedUsersSectionProps) {
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null)

  const handleReactivate = async (userId: string) => {
    if (!onReactivate) return

    setLoadingUserId(userId)
    try {
      await onReactivate(userId)
      toast.success('User reactivated successfully')
    } catch (error) {
      toast.error('Failed to reactivate user')
      console.error('Error reactivating user:', error)
    } finally {
      setLoadingUserId(null)
    }
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      const parts = name.split(' ')
      return parts.length >= 2
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase()
    }
    return email.substring(0, 2).toUpperCase()
  }

  if (users.length === 0) {
    return (
      <Card className={cn('', className)}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Archived Users</CardTitle>
          </div>
          <CardDescription>
            No archived users
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Archive className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Archived Users</CardTitle>
          <Badge variant="secondary" className="ml-auto">
            {users.length}
          </Badge>
        </div>
        <CardDescription>
          Previously removed users that can be reactivated
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-gray-50/50 dark:bg-gray-900/20"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 opacity-60">
                  <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || user.email} />
                  <AvatarFallback>
                    {getInitials(user.full_name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {user.full_name || user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReactivate(user.id)}
                disabled={loadingUserId === user.id}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                {loadingUserId === user.id ? 'Reactivating...' : 'Reactivate'}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
