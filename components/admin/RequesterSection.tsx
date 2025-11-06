'use client'

import { useTranslations } from 'next-intl'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface RequesterSectionProps {
  requester: {
    id: string
    full_name: string | null
    email: string
    avatar_url?: string
  }
  currentUserId: string
  userRole: 'admin' | 'manager' | 'employee'
}

export function RequesterSection({ requester, currentUserId, userRole }: RequesterSectionProps) {
  const t = useTranslations('leave.sheet')

  // Only show for admin/manager viewing others' requests
  const isOwnRequest = requester.id === currentUserId
  const showRequester = (userRole === 'admin' || userRole === 'manager') && !isOwnRequest

  if (!showRequester) {
    return null
  }

  const initials = requester.full_name
    ? requester.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : requester.email[0].toUpperCase()

  return (
    <div className="flex flex-col gap-2 items-start w-full">
      <p className="text-sm font-medium text-muted-foreground">
        {t('requester')}
      </p>
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={requester.avatar_url} alt={requester.full_name || requester.email} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <p className="text-sm font-medium">
            {requester.full_name || requester.email}
          </p>
          {requester.full_name && (
            <p className="text-xs text-muted-foreground">
              {requester.email}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
