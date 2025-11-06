'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Undo2, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { toast } from 'sonner'

interface PendingRemovalUser {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  removal_effective_date: string | null
  role: string
}

interface PendingChangesSectionProps {
  users: PendingRemovalUser[]
  onCancelRemoval?: (userId: string) => Promise<void>
  className?: string
}

export function PendingChangesSection({
  users,
  onCancelRemoval,
  className
}: PendingChangesSectionProps) {
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null)

  const handleCancelRemoval = async (userId: string) => {
    if (!onCancelRemoval) return

    setLoadingUserId(userId)
    try {
      await onCancelRemoval(userId)
      toast.success('User removal cancelled successfully')
    } catch (error) {
      toast.error('Failed to cancel removal')
      console.error('Error cancelling removal:', error)
    } finally {
      setLoadingUserId(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
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
    return null
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          <CardTitle className="text-lg">Pending Removals</CardTitle>
          <Badge variant="outline" className="ml-auto">
            {users.length}
          </Badge>
        </div>
        <CardDescription>
          Users scheduled for removal at next subscription renewal
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-orange-50/50 dark:bg-orange-950/20"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || user.email} />
                  <AvatarFallback>
                    {getInitials(user.full_name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {user.full_name || user.email}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {user.removal_effective_date && (
                      <span>Removed on {formatDate(user.removal_effective_date)}</span>
                    )}
                    {!user.removal_effective_date && (
                      <span>Removal date pending</span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCancelRemoval(user.id)}
                disabled={loadingUserId === user.id}
              >
                <Undo2 className="h-3 w-3 mr-1" />
                {loadingUserId === user.id ? 'Cancelling...' : 'Cancel'}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
