'use client'

import { useTranslations } from 'next-intl'

interface BalanceCardsProps {
  available: number
  requested: number
  remaining: number
}

export function BalanceCards({ available, requested, remaining }: BalanceCardsProps) {
  const t = useTranslations('leave.balance')
  const tSheet = useTranslations('leave.requestSheet')

  const formatDays = (count: number) => {
    return `${count} ${tSheet('days')}`
  }

  return (
    <div className="grid grid-cols-3 gap-3 w-full">
      <div className="flex flex-col gap-1 items-start p-3 bg-white border border-border rounded-lg">
        <p className="text-xs font-medium text-muted-foreground">
          {t('available')}
        </p>
        <p className="text-2xl font-semibold text-foreground">
          {formatDays(available)}
        </p>
      </div>

      <div className="flex flex-col gap-1 items-start p-3 bg-white border border-border rounded-lg">
        <p className="text-xs font-medium text-muted-foreground">
          {t('requested')}
        </p>
        <p className="text-2xl font-semibold text-foreground">
          {formatDays(requested)}
        </p>
      </div>

      <div className="flex flex-col gap-1 items-start p-3 bg-white border border-border rounded-lg">
        <p className="text-xs font-medium text-muted-foreground">
          {t('remaining')}
        </p>
        <p className="text-2xl font-semibold text-foreground">
          {formatDays(remaining)}
        </p>
      </div>
    </div>
  )
}
