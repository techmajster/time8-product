import { Badge } from '@/components/ui/badge'
import { UserX, Archive, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export type UserStatus = 'active' | 'pending_removal' | 'archived' | 'invited'

interface UserStatusBadgeProps {
  status: UserStatus
  removalDate?: string | null
  className?: string
}

export function UserStatusBadge({ status, removalDate, className }: UserStatusBadgeProps) {
  switch (status) {
    case 'pending_removal':
      return (
        <Badge
          variant="outline"
          className={cn(
            'border-orange-500/50 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
            className
          )}
        >
          <Clock className="h-3 w-3" />
          Pending Removal
          {removalDate && (
            <span className="ml-1 text-[10px] opacity-70">
              ({new Date(removalDate).toLocaleDateString()})
            </span>
          )}
        </Badge>
      )

    case 'archived':
      return (
        <Badge
          variant="secondary"
          className={cn(
            'border-gray-300 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
            className
          )}
        >
          <Archive className="h-3 w-3" />
          Archived
        </Badge>
      )

    case 'invited':
      return (
        <Badge
          variant="outline"
          className={cn(
            'border-blue-500/50 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
            className
          )}
        >
          <Clock className="h-3 w-3" />
          Invited
        </Badge>
      )

    case 'active':
    default:
      return (
        <Badge
          variant="outline"
          className={cn(
            'border-green-500/50 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
            className
          )}
        >
          <CheckCircle2 className="h-3 w-3" />
          Active
        </Badge>
      )
  }
}
