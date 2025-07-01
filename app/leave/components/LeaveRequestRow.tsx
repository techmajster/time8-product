'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Clock, CheckCircle, XCircle, AlertCircle, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { LeaveRequestActions } from './LeaveRequestActions'
import { CancelLeaveRequestButton } from './CancelLeaveRequestButton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'

interface LeaveRequest {
  id: string
  user_id: string
  start_date: string
  end_date: string
  days_requested: number
  reason: string | null
  status: string
  created_at: string
  leave_types: {
    name: string
    color: string
  } | null
  profiles: {
    full_name: string | null
    email: string
  } | null
  reviewed_by_profile: {
    full_name: string | null
    email: string
  } | null
}

interface LeaveRequestRowProps {
  request: LeaveRequest
  isManagerOrAdmin: boolean
  currentUserId: string
}

// Separate component for delete functionality
function DeleteCancelledRequestButton({ request }: { request: LeaveRequest }) {
  const [showDialog, setShowDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleDelete = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/leave-requests/${request.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Nie udało się usunąć wniosku')
      }

      // Verify the deletion was successful
      if (result.success && result.deletedCount > 0) {
        // Close dialog and refresh page
        setShowDialog(false)
        
        // Add a small delay to ensure the database transaction is committed
        setTimeout(() => {
          window.location.reload()
        }, 500)
      } else {
        throw new Error('Deletion did not affect any records')
      }

    } catch (err) {
      console.error('Error deleting request:', err)
      setError(err instanceof Error ? err.message : 'Wystąpił błąd podczas usuwania wniosku')
    } finally {
      setLoading(false)
    }
  }

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowDialog(true)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleButtonClick}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/5"
        title="Usuń anulowany wniosek"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Usuń anulowany wniosek
            </DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz permanentnie usunąć ten anulowany wniosek urlopowy? Ta akcja jest nieodwracalna.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <div><strong>Typ urlopu:</strong> {request.leave_types?.name || 'Nieznany'}</div>
            <div><strong>Okres:</strong> {new Date(request.start_date).toLocaleDateString('pl-PL')} - {new Date(request.end_date).toLocaleDateString('pl-PL')}</div>
            <div><strong>Dni:</strong> {request.days_requested}</div>
            {request.reason && <div><strong>Powód:</strong> {request.reason}</div>}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDialog(false)}
              disabled={loading}
            >
              Anuluj
            </Button>
            <Button 
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? 'Usuwanie...' : 'Usuń wniosek'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function LeaveRequestRow({ request, isManagerOrAdmin, currentUserId }: LeaveRequestRowProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL')
  }
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />
      case 'approved': return <CheckCircle className="h-4 w-4" />
      case 'rejected': return <XCircle className="h-4 w-4" />
      case 'cancelled': return <AlertCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning/10 text-warning-foreground border-warning/20 dark:bg-warning/10 dark:text-warning-foreground dark:border-warning/20'
      case 'approved': return 'bg-success/10 text-success-foreground border-success/20 dark:bg-success/10 dark:text-success-foreground dark:border-success/20'
      case 'rejected': return 'bg-destructive/10 text-destructive-foreground border-destructive/20 dark:bg-destructive/10 dark:text-destructive-foreground dark:border-destructive/20'
      case 'cancelled': return 'bg-muted text-muted-foreground border-border dark:bg-muted dark:text-muted-foreground dark:border-border'
      default: return 'bg-muted text-muted-foreground border-border dark:bg-muted dark:text-muted-foreground dark:border-border'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Oczekujący'
      case 'approved': return 'Zatwierdzony'
      case 'rejected': return 'Odrzucony'
      case 'cancelled': return 'Anulowany'
      default: return status
    }
  }

  const handleRowClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on buttons or interactive elements
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('[role="button"]') || target.closest('[data-no-navigate]')) {
      e.preventDefault()
      e.stopPropagation()
      return false
    }
  }

  return (
    <Link 
      href={`/leave/${request.id}`}
      className="block hover:bg-muted/50 transition-colors group cursor-pointer"
      onClick={handleRowClick}
    >
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: request.leave_types?.color || '#gray' }}
          />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-foreground">
                {request.leave_types?.name || 'Nieznany typ'}
              </p>
              <Badge className={getStatusColor(request.status)}>
                                    <span className="flex items-center gap-1 text-foreground">
                  {getStatusIcon(request.status)}
                  {getStatusText(request.status)}
                </span>
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDate(request.start_date)} - {formatDate(request.end_date)} • {request.days_requested} {request.days_requested === 1 ? 'dzień' : 'dni'}
            </p>
            {request.reason && (
              <p className="text-sm text-muted-foreground mt-1 italic">
                "{request.reason}"
              </p>
            )}
            {isManagerOrAdmin && request.profiles && (
              <p className="text-xs text-muted-foreground mt-1">
                Pracownik: {request.profiles.full_name || request.profiles.email}
              </p>
            )}
          </div>
        </div>

        <div className="text-right space-y-2">
          <p className="text-sm text-muted-foreground">
            {formatDate(request.created_at)}
          </p>
          {request.reviewed_by_profile && (
            <p className="text-xs text-muted-foreground">
              Przez: {request.reviewed_by_profile.full_name || request.reviewed_by_profile.email}
            </p>
          )}
          
          <div 
            data-no-navigate="true" 
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            className="space-y-2 flex items-center gap-2"
          >
            {/* Manager/Admin actions */}
            {(isManagerOrAdmin && request.status === 'pending') && (
              <LeaveRequestActions
                requestId={request.id}
                requestStatus={request.status}
                employeeName={request.profiles?.full_name || request.profiles?.email || 'Nieznany'}
                leaveType={request.leave_types?.name || 'Nieznany'}
                dateRange={`${formatDate(request.start_date)} - ${formatDate(request.end_date)}`}
              />
            )}
            
            {/* Owner cancel action */}
            {(request.user_id === currentUserId && request.status !== 'cancelled') && (
              <CancelLeaveRequestButton
                requestId={request.id}
                requestStatus={request.status}
                leaveType={request.leave_types?.name || 'Nieznany'}
                dateRange={`${formatDate(request.start_date)} - ${formatDate(request.end_date)}`}
                startDate={request.start_date}
                className="w-full text-xs"
              />
            )}

            {/* Delete button for cancelled requests (owner only) */}
            {(request.user_id === currentUserId && request.status === 'cancelled') && (
              <DeleteCancelledRequestButton request={request} />
            )}
          </div>
        </div>
      </div>
    </Link>
  )
} 