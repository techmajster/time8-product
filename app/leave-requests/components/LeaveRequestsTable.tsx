'use client'

import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LeaveRequestDetailsSheet } from '@/components/leave-requests/LeaveRequestDetailsSheet'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface LeaveRequestWithUser {
  id: string
  user_id: string
  start_date: string
  end_date: string
  leave_type_id: string
  days_requested: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed'
  created_at: string
  user_profile: {
    full_name: string | null
    email: string
    avatar_url: string | null
    organization_id: string
  } | null
  leave_types: {
    name: string
  } | null
}

function formatDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const formatOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }

  return `${start.toLocaleDateString('pl-PL', formatOptions)} - ${end.toLocaleDateString('pl-PL', formatOptions)}`
}

export function LeaveRequestsTable({ requests }: { requests: LeaveRequestWithUser[] }) {
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const t = useTranslations('leaveRequestsPage')

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: t('status.new'), variant: 'default' as const },
      approved: { label: t('status.accepted'), variant: 'default' as const, className: 'bg-green-500 text-white border-transparent' },
      rejected: { label: t('status.rejected'), variant: 'destructive' as const },
      cancelled: { label: t('status.cancelled'), variant: 'secondary' as const },
      completed: { label: t('status.completed'), variant: 'secondary' as const }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending

    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    )
  }

  const handleRowClick = (requestId: string) => {
    setSelectedRequestId(requestId)
    setIsSheetOpen(true)
  }

  const handleCloseSheet = () => {
    setIsSheetOpen(false)
    setSelectedRequestId(null)
  }

  return (
    <>
      <div className="border-0">
        <Table>
          <TableHeader>
            <TableRow className="border-b">
              <TableHead className="text-xs text-muted-foreground font-medium">{t('table.headers.applicant')}</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium">{t('table.headers.date')}</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium">{t('table.headers.description')}</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium">{t('table.headers.type')}</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium text-right">{t('table.headers.days')}</TableHead>
              <TableHead className="text-xs text-muted-foreground font-medium text-right">{t('table.headers.action')}</TableHead>
            </TableRow>
          </TableHeader>
            <TableBody>
              {requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    {t('table.noRequests')}
                  </TableCell>
                </TableRow>
              )}
              {requests.map((request) => {
                const isNew = request.status === 'pending'
                const profile = request.user_profile
                const displayName = profile?.full_name || profile?.email?.split('@')[0] || 'Unknown'
                const displayEmail = profile?.email || 'No email'
                const avatarUrl = profile?.avatar_url || undefined
                const avatarFallback = profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'

                return (
                  <TableRow
                    key={request.id}
                    onClick={() => handleRowClick(request.id)}
                    className={`cursor-pointer h-16 ${
                      isNew ? 'bg-violet-50 hover:bg-violet-100' : 'hover:bg-muted'
                    }`}
                  >
                    {/* Wnioskujący */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={avatarUrl} />
                          <AvatarFallback>
                            {avatarFallback}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <div className="font-semibold text-sm text-foreground truncate">
                            {displayName}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {displayEmail}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Data */}
                    <TableCell className="text-sm">
                      {formatDateRange(request.start_date, request.end_date)}
                    </TableCell>

                    {/* Opis */}
                    <TableCell className="text-sm font-medium max-w-[288px]">
                      <div className="truncate">
                        {request.reason || 'Brak opisu'}
                      </div>
                    </TableCell>

                    {/* Typ */}
                    <TableCell className="text-sm">
                      {request.leave_types?.name || 'Wypoczynkowy'}
                    </TableCell>

                    {/* Liczba dni */}
                    <TableCell className="text-sm text-right">
                      {request.days_requested} {request.days_requested === 1 ? t('table.day') : t('table.days')}
                    </TableCell>

                    {/* Akcje */}
                    <TableCell className="text-right">
                      {getStatusBadge(request.status)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
        </Table>
      </div>

      {/* Leave Request Details Sheet */}
      <LeaveRequestDetailsSheet
        requestId={selectedRequestId}
        isOpen={isSheetOpen}
        onClose={handleCloseSheet}
      />
    </>
  )
}
