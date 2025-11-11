'use client'

import * as React from 'react'
import { X, Loader2, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { pl } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Invitation {
  id: string
  email: string
  role: 'admin' | 'manager' | 'employee'
  status: string
  created_at: string
  expires_at: string
  full_name?: string | null
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface PendingInvitationsTableProps {
  organizationId: string
  onInvitationCancelled?: () => void
  className?: string
}

const roleLabels: Record<string, string> = {
  admin: 'Administrator',
  manager: 'Menadżer',
  employee: 'Pracownik'
}

const statusLabels: Record<string, string> = {
  pending: 'Oczekujące',
  expired: 'Wygasłe',
  cancelled: 'Anulowane',
  accepted: 'Zaakceptowane'
}

export function PendingInvitationsTable({
  organizationId,
  onInvitationCancelled,
  className
}: PendingInvitationsTableProps) {
  const [invitations, setInvitations] = React.useState<Invitation[]>([])
  const [pagination, setPagination] = React.useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [cancellingId, setCancellingId] = React.useState<string | null>(null)
  const [confirmCancelId, setConfirmCancelId] = React.useState<string | null>(null)

  // Fetch invitations
  const fetchInvitations = React.useCallback(async (page: number = 1) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/pending-invitations?page=${page}&limit=${pagination.limit}`
      )

      if (!response.ok) {
        throw new Error('Nie udało się pobrać zaproszeń')
      }

      const data = await response.json()
      setInvitations(data.invitations)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystąpił błąd')
    } finally {
      setLoading(false)
    }
  }, [organizationId, pagination.limit])

  // Initial fetch
  React.useEffect(() => {
    fetchInvitations()
  }, [fetchInvitations])

  // Handle cancel invitation
  const handleCancelInvitation = async (invitationId: string) => {
    setCancellingId(invitationId)
    setError(null)

    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Nie udało się anulować zaproszenia')
      }

      // Optimistic update: remove invitation from list
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId))
      setPagination(prev => ({ ...prev, total: prev.total - 1 }))

      // Notify parent component
      onInvitationCancelled?.()

      // Refresh list to ensure consistency
      await fetchInvitations(pagination.page)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystąpił błąd')
      // Revert optimistic update on error
      await fetchInvitations(pagination.page)
    } finally {
      setCancellingId(null)
      setConfirmCancelId(null)
    }
  }

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchInvitations(newPage)
    }
  }

  // Get invitation to cancel
  const invitationToCancel = invitations.find(inv => inv.id === confirmCancelId)

  if (loading && invitations.length === 0) {
    return (
      <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-600">Ładowanie zaproszeń...</span>
      </div>
    )
  }

  if (error && invitations.length === 0) {
    return (
      <div
        className="rounded-lg border border-red-200 bg-red-50 p-4"
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">Błąd</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-600">Brak oczekujących zaproszeń</p>
      </div>
    )
  }

  return (
    <>
      <div className={cn('space-y-4', className)}>
        {/* Error banner */}
        {error && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-3"
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Imię i nazwisko</TableHead>
                <TableHead>Rola</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Wysłano</TableHead>
                <TableHead>Wygasa</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => {
                const isExpired = new Date(invitation.expires_at) < new Date()
                const isCancelling = cancellingId === invitation.id

                return (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">
                      {invitation.email}
                    </TableCell>
                    <TableCell>
                      {invitation.full_name || (
                        <span className="text-gray-400 italic">Nie podano</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {roleLabels[invitation.role] || invitation.role}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isExpired ? 'destructive' : 'secondary'}
                        className={cn(
                          !isExpired && 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        )}
                      >
                        {isExpired ? 'Wygasłe' : statusLabels[invitation.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatDistanceToNow(new Date(invitation.created_at), {
                        addSuffix: true,
                        locale: pl
                      })}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatDistanceToNow(new Date(invitation.expires_at), {
                        addSuffix: true,
                        locale: pl
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmCancelId(invitation.id)}
                        disabled={isCancelling || isExpired}
                        aria-label={`Anuluj zaproszenie dla ${invitation.email}`}
                      >
                        {isCancelling ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Strona {pagination.page} z {pagination.totalPages} ({pagination.total} zaproszeń)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1 || loading}
              >
                Poprzednia
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages || loading}
              >
                Następna
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Cancel confirmation dialog */}
      <AlertDialog
        open={!!confirmCancelId}
        onOpenChange={(open) => !open && setConfirmCancelId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anulować zaproszenie?</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz anulować zaproszenie dla{' '}
              <strong>{invitationToCancel?.email}</strong>?
              <br />
              <br />
              Ta akcja nie może być cofnięta. Użytkownik nie będzie mógł dołączyć do organizacji
              za pomocą tego zaproszenia.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Nie, zachowaj zaproszenie</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmCancelId && handleCancelInvitation(confirmCancelId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Tak, anuluj zaproszenie
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
