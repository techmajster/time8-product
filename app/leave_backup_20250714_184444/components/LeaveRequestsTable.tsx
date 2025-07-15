'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useLeaveRequestDetails } from '@/hooks/use-leave-request-details'

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

function getStatusBadge(status: string) {
  switch (status) {
    case 'approved':
      return (
        <Badge className="bg-neutral-900 text-neutral-50 text-xs px-2 py-0.5 rounded-lg font-semibold">
          Zaakceptowany
        </Badge>
      )
    case 'pending':
      return (
        <Badge className="bg-neutral-100 text-neutral-900 text-xs px-2 py-0.5 rounded-lg font-semibold border-transparent">
          Oczekujący
        </Badge>
      )
    case 'rejected':
      return (
        <Badge className="bg-red-50 text-red-700 text-xs px-2 py-0.5 rounded-lg font-semibold border-red-200">
          Odrzucony
        </Badge>
      )
    case 'cancelled':
      return (
        <Badge className="bg-white text-neutral-950 text-xs px-2 py-0.5 rounded-lg font-semibold border border-neutral-200">
          Anulowany
        </Badge>
      )
    default:
      return (
        <Badge className="bg-neutral-100 text-neutral-900 text-xs px-2 py-0.5 rounded-lg font-semibold border-transparent">
          Zrealizowany
        </Badge>
      )
  }
}

interface LeaveRequestsTableProps {
  requests: LeaveRequest[]
}

export function LeaveRequestsTable({ requests }: LeaveRequestsTableProps) {
  const { openDetails } = useLeaveRequestDetails()

  if (!requests.length) {
    return (
      <div className="bg-white border border-neutral-200 rounded-[10px]">
        <div className="p-8 text-center">
          <p className="text-neutral-500">Nie masz jeszcze żadnych wniosków urlopowych.</p>
        </div>
      </div>
    )
  }

  const handleRowClick = (requestId: string) => {
    openDetails(requestId)
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-[10px] overflow-hidden px-4 py-2">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-neutral-200 hover:bg-transparent">
            <TableHead className="h-10 px-2 py-0 text-left font-medium text-sm text-neutral-500 w-[269px]">
              Data
            </TableHead>
            <TableHead className="h-10 px-2 py-0 text-left font-medium text-sm text-neutral-500 w-[419px]">
              Opis
            </TableHead>
            <TableHead className="h-10 px-2 py-0 text-left font-medium text-sm text-neutral-500 w-[180px]">
              Typ
            </TableHead>
            <TableHead className="h-10 px-2 py-0 text-right font-medium text-sm text-neutral-500 w-[110px]">
              Liczba dni
            </TableHead>
            <TableHead className="h-10 px-2 py-0 text-right font-medium text-sm text-neutral-500">
              Status
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow 
              key={request.id} 
              className="border-b border-neutral-200 cursor-pointer"
              onClick={() => handleRowClick(request.id)}
            >
              <TableCell className="h-[52px] p-2 align-middle font-normal text-sm text-neutral-950">
                {formatDateRange(request.start_date, request.end_date)}
              </TableCell>
              <TableCell className="h-[52px] p-2 align-middle">
                <div className="font-medium text-sm text-neutral-950">
                  {request.reason || 'Brak opisu'}
                </div>
              </TableCell>
              <TableCell className="h-[52px] p-2 align-middle font-normal text-sm text-neutral-950">
                {request.leave_types?.name || 'Nieznany typ'}
              </TableCell>
              <TableCell className="h-[52px] p-2 align-middle font-normal text-sm text-neutral-950 text-right">
                {request.days_requested} {request.days_requested === 1 ? 'dzień' : 'dni'}
              </TableCell>
              <TableCell className="h-[52px] p-2 align-middle text-right">
                {getStatusBadge(request.status)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
} 