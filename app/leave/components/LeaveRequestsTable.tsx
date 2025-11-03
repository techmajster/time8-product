'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLeaveRequestDetails } from '@/hooks/use-leave-request-details'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

interface LeaveRequest {
  id: string
  user_id: string
  start_date: string
  end_date: string
  days_requested: number
  reason: string | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  created_at: string
  leave_types: {
    id: string
    name: string
    color: string
  } | null
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }
  
  return `${formatDate(start)} - ${formatDate(end)}`
}

function getStatusBadge(status: string, t: any) {
  switch (status) {
    case 'approved':
      return (
        <Badge className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-md font-semibold">
          {t('leave.page.status.approved')}
        </Badge>
      )
    case 'pending':
      return (
        <Badge className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-md font-semibold">
          {t('leave.page.status.pending')}
        </Badge>
      )
    case 'rejected':
      return (
        <Badge className="bg-red-100 text-secondary-foreground text-xs px-2 py-0.5 rounded-md font-semibold">
          {t('leave.page.status.rejected')}
        </Badge>
      )
    case 'cancelled':
      return (
        <Badge className="bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded-md font-semibold">
          {t('leave.page.status.cancelled')}
        </Badge>
      )
    default:
      return (
        <Badge className="bg-neutral-500 text-white text-xs px-2 py-0.5 rounded-md font-semibold">
          {t('leave.page.status.completed')}
        </Badge>
      )
  }
}

interface LeaveRequestsTableProps {
  requests: LeaveRequest[]
}

export function LeaveRequestsTable({ requests }: LeaveRequestsTableProps) {
  const { openDetails } = useLeaveRequestDetails()
  const t = useTranslations()

  if (!requests.length) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">{t('leave.page.table.empty')}</p>
      </div>
    )
  }

  const handleRowClick = (requestId: string) => {
    openDetails(requestId)
  }

  return (
    <div className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-b hover:bg-transparent">
            <TableHead className="h-10 px-2 py-0 text-left font-medium text-sm text-muted-foreground">
              {t('leave.page.table.headers.date')}
            </TableHead>
            <TableHead className="h-10 px-2 py-0 text-left font-medium text-sm text-muted-foreground">
              {t('leave.page.table.headers.description')}
            </TableHead>
            <TableHead className="h-10 px-2 py-0 text-left font-medium text-sm text-muted-foreground">
              {t('leave.page.table.headers.type')}
            </TableHead>
            <TableHead className="h-10 px-2 py-0 text-right font-medium text-sm text-muted-foreground">
              {t('leave.page.table.headers.days')}
            </TableHead>
            <TableHead className="h-10 px-2 py-0 text-right font-medium text-sm text-muted-foreground">
              {t('leave.page.table.headers.status')}
            </TableHead>
            <TableHead className="h-10 px-2 py-0 text-right font-medium text-sm text-muted-foreground">
              {t('leave.page.table.headers.actions')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request, index) => (
            <TableRow
              key={request.id}
              className={cn(
                "border-b cursor-pointer",
                index === 0 && "bg-violet-100"
              )}
              onClick={() => handleRowClick(request.id)}
            >
              <TableCell className="h-[52px] p-2 align-middle font-normal text-sm text-foreground">
                {formatDateRange(request.start_date, request.end_date)}
              </TableCell>
              <TableCell className="h-[52px] p-2 align-middle">
                <div className={cn(
                  "text-sm text-foreground",
                  index === 0 ? "font-medium" : "font-normal"
                )}>
                  {request.reason || t('leave.page.table.noDescription')}
                </div>
              </TableCell>
              <TableCell className="h-[52px] p-2 align-middle font-normal text-sm text-foreground">
                {request.leave_types?.name || t('leave.page.table.unknownType')}
              </TableCell>
              <TableCell className="h-[52px] p-2 align-middle font-normal text-sm text-foreground text-right">
                {request.days_requested} {request.days_requested === 1 ? 'dzień' : 'dni'}
              </TableCell>
              <TableCell className="h-[52px] p-2 align-middle text-right">
                {getStatusBadge(request.status, t)}
              </TableCell>
              <TableCell className="h-[52px] p-2 align-middle text-right">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRowClick(request.id)
                  }}
                >
                  {t('leave.page.button.details')}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
} 