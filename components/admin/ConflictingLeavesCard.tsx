'use client'

import { useTranslations } from 'next-intl'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface ConflictingUser {
  full_name: string | null
  email: string
  avatar_url: string | null
  leave_type: string
  end_date: string
}

interface ConflictingLeavesCardProps {
  conflictingLeaves: ConflictingUser[]
}

export function ConflictingLeavesCard({ conflictingLeaves }: ConflictingLeavesCardProps) {
  const t = useTranslations('leave.sheet')

  if (!conflictingLeaves || conflictingLeaves.length === 0) {
    return null
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `do ${date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}`
  }

  return (
    <div className="flex flex-col gap-3 items-start p-4 w-full bg-amber-100 border border-border rounded-lg">
      <p className="text-sm font-medium text-foreground">
        {t('conflictingLeaves')}
      </p>

      <div className="flex flex-col gap-2 w-full">
        {conflictingLeaves.map((user, index) => {
          const initials = user.full_name
            ? user.full_name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)
            : user.email[0].toUpperCase()

          return (
            <div key={index} className="flex items-center gap-4 w-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || user.email} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {user.full_name || user.email}
                </p>
                {user.full_name && (
                  <p className="text-sm text-muted-foreground">
                    {user.email}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end text-right">
                <p className="text-sm font-medium text-foreground">
                  {user.leave_type}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(user.end_date)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
