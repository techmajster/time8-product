'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { type LeaveRequest } from '@/types/leave'

interface StatusBadgeProps {
  status: LeaveRequest['status']
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const t = useTranslations('leave.status')

  // Unified status badge styling matching reference implementation
  const statusConfig = {
    pending: {
      label: t('pending'),
      variant: 'default' as const
    },
    approved: {
      label: t('approved'),
      variant: 'default' as const,
      className: 'bg-green-500 text-white border-transparent'
    },
    rejected: {
      label: t('rejected'),
      variant: 'destructive' as const
    },
    cancelled: {
      label: t('cancelled'),
      variant: 'secondary' as const
    },
    completed: {
      label: t('completed'),
      variant: 'secondary' as const
    }
  }

  const config = statusConfig[status]

  return (
    <Badge
      variant={config.variant}
      className={`${config.className || ''} ${className || ''}`}
    >
      {config.label}
    </Badge>
  )
}
