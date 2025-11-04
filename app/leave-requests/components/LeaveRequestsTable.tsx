'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LeaveRequestDetailsSheet } from './LeaveRequestDetailsSheet'
import { useState } from 'react'

interface LeaveRequestWithUser {
  id: string
  user_id: string
  start_date: string
  end_date: string
  leave_type_id: string
  days_requested: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  created_at: string
  user_profile: {
    full_name: string | null
    email: string
    avatar_url: string | null
    organization_id: string
  }
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

function getStatusBadge(status: string) {
  const statusConfig = {
    pending: { label: 'Oczekujący', variant: 'outline' as const },
    approved: { label: 'Zaakceptowany', variant: 'default' as const },
    rejected: { label: 'Odrzucony', variant: 'outline' as const },
    cancelled: { label: 'Anulowany', variant: 'outline' as const }
  }
  
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
  
  return (
    <Badge variant={config.variant} className="rounded-lg">
      {config.label}
    </Badge>
  )
}

export function LeaveRequestsTable({ requests }: { requests: LeaveRequestWithUser[] }) {
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const handleRowClick = (requestId: string) => {
    setSelectedRequestId(requestId)
    setIsSheetOpen(true)
  }

  const handleCloseSheet = () => {
    setIsSheetOpen(false)
    setSelectedRequestId(null)
  }

  return (
    <Card className="rounded-lg">
      <div className="overflow-hidden">
        <div className="min-w-full">
          <div className="py-0">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_229px_288px_162px_110px_216px] items-center min-w-[356px] h-10 border-b border">
              <div className="px-2 py-0">
                <div className="font-medium text-sm text-muted-foreground">Wnioskujący</div>
              </div>
              <div className="px-2 py-0">
                <div className="font-medium text-sm text-muted-foreground">Data</div>
              </div>
              <div className="px-2 py-0">
                <div className="font-medium text-sm text-muted-foreground">Opis</div>
              </div>
              <div className="px-2 py-0">
                <div className="font-medium text-sm text-muted-foreground">Typ</div>
              </div>
              <div className="px-2 py-0 text-right">
                <div className="font-medium text-sm text-muted-foreground">Liczba dni</div>
              </div>
              <div className="px-2 py-0 text-right">
                <div className="font-medium text-sm text-muted-foreground">Akcje</div>
              </div>
            </div>

            {/* Table Rows */}
            {requests.map((request, index) => (
              <div 
                key={request.id} 
                onClick={() => handleRowClick(request.id)}
                className={`grid grid-cols-[1fr_229px_288px_162px_110px_216px] items-center min-w-[356px] h-[72px] border-b border cursor-pointer hover:bg-muted transition-colors ${
                  index < 4 ? 'bg-zinc-100' : ''
                }`}
              >
                {/* Wnioskujący */}
                <div className="p-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={request.user_profile.avatar_url || undefined} />
                      <AvatarFallback className="">
                        {request.user_profile.full_name?.charAt(0) || request.user_profile.email.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <div className="font-medium text-sm text-foreground overflow-hidden overflow-ellipsis">
                        {request.user_profile.full_name || request.user_profile.email.split('@')[0]}
                      </div>
                      <div className="font-normal text-sm text-muted-foreground overflow-hidden overflow-ellipsis">
                        {request.user_profile.email}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data */}
                <div className="p-2">
                  <div className="font-normal text-sm text-foreground overflow-hidden overflow-ellipsis">
                    {formatDateRange(request.start_date, request.end_date)}
                  </div>
                </div>

                {/* Opis */}
                <div className="p-2">
                  <div className="font-medium text-sm text-foreground overflow-hidden overflow-ellipsis">
                    {request.reason || 'Brak opisu'}
                  </div>
                </div>

                {/* Typ */}
                <div className="p-2">
                  <div className="font-normal text-sm text-foreground overflow-hidden overflow-ellipsis">
                    {request.leave_types?.name || 'Wypoczynkowy'}
                  </div>
                </div>

                {/* Liczba dni */}
                <div className="p-2 text-right">
                  <div className="font-normal text-sm text-foreground">
                    {request.days_requested} {request.days_requested === 1 ? 'dzień' : 'dni'}
                  </div>
                </div>

                {/* Akcje */}
                <div className="p-2 flex justify-end">
                  {getStatusBadge(request.status)}
                </div>
              </div>
            ))}

            {requests.length === 0 && (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                Brak wniosków urlopowych w tej kategorii
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Leave Request Details Sheet */}
      <LeaveRequestDetailsSheet
        requestId={selectedRequestId}
        isOpen={isSheetOpen}
        onClose={handleCloseSheet}
      />
    </Card>
  )
} 