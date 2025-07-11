'use client'

import { useState, useEffect } from 'react'
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription 
} from '@/components/ui/sheet'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Edit,
  User,
  FileText,
  CalendarDays
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface LeaveRequestDetailsSheetProps {
  requestId: string | null
  isOpen: boolean
  onClose: () => void
}

interface LeaveRequestDetails {
  id: string
  user_id: string
  start_date: string
  end_date: string
  leave_type_id: string
  days_requested: number
  reason: string | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  created_at: string
  reviewed_at: string | null
  review_comment: string | null
  reviewed_by: string | null
  leave_types: {
    id: string
    name: string
    color: string
    days_per_year: number
  } | null
  profiles: {
    id: string
    full_name: string | null
    email: string
  } | null
  reviewed_by_profile: {
    full_name: string | null
    email: string
  } | null
}

export function LeaveRequestDetailsSheet({ requestId, isOpen, onClose }: LeaveRequestDetailsSheetProps) {
  const [leaveRequest, setLeaveRequest] = useState<LeaveRequestDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [currentUserId, setCurrentUserId] = useState<string>('')

  const fetchLeaveRequestDetails = async () => {
    if (!requestId) return

    setLoading(true)
    const supabase = createClient()

    try {
      // Get current user and role
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      setUserRole(profile?.role || '')
      setCurrentUserId(user.id)

      // Get leave request details
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          leave_types (
            id,
            name,
            color,
            days_per_year
          ),
          profiles!leave_requests_user_id_fkey (
            id,
            full_name,
            email
          ),
          reviewed_by_profile:profiles!leave_requests_reviewed_by_fkey (
            full_name,
            email
          )
        `)
        .eq('id', requestId)
        .single()

      if (error) {
        console.error('Error fetching leave request:', error)
        return
      }

      setLeaveRequest(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && requestId) {
      fetchLeaveRequestDetails()
    }
  }, [isOpen, requestId])

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
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'approved': return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      case 'cancelled': return 'bg-gray-100 text-gray-600 border-gray-200'
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Oczekujący'
      case 'approved': return 'Zatwierdzony'
      case 'rejected': return 'Odrzucony'
      case 'cancelled': return 'Anulowany'
      default: return 'Nieznany'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getPeriodStatus = (startDate: string, endDate: string) => {
    const today = new Date()
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (end < today) {
      return 'Zakończony'
    } else if (start <= today && end >= today) {
      return 'Trwający'
    } else {
      return 'Przyszły'
    }
  }

  if (loading) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-[600px] sm:w-[600px]">
          <SheetHeader>
            <SheetTitle>Ładowanie wniosku urlopowego</SheetTitle>
            <SheetDescription>
              Pobieranie szczegółów wniosku...
            </SheetDescription>
          </SheetHeader>
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-muted-foreground">Ładowanie...</div>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  if (!leaveRequest) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-[600px] sm:w-[600px]">
          <SheetHeader>
            <SheetTitle>Błąd</SheetTitle>
            <SheetDescription>
              Nie udało się znaleźć wniosku urlopowego
            </SheetDescription>
          </SheetHeader>
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-muted-foreground">Nie znaleziono wniosku urlopowego</div>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  const isManagerOrAdmin = userRole === 'admin' || userRole === 'manager'
  const isOwner = leaveRequest.user_id === currentUserId
  const periodStatus = getPeriodStatus(leaveRequest.start_date, leaveRequest.end_date)

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Szczegóły wniosku urlopowego</SheetTitle>
          <SheetDescription>
            {leaveRequest.leave_types?.name} • {periodStatus}
          </SheetDescription>
        </SheetHeader>

        {/* Status Badge */}
        <div className="flex items-center justify-end gap-2 mt-4">
          {getStatusIcon(leaveRequest.status)}
          <Badge className={`${getStatusColor(leaveRequest.status)} rounded-lg`}>
            {getStatusText(leaveRequest.status)}
          </Badge>
        </div>

        <div className="space-y-6 mt-6">
          {/* Request Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4" />
                Szczegóły wniosku
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Data rozpoczęcia
                  </Label>
                  <p className="mt-1 text-sm font-medium">
                    {formatDate(leaveRequest.start_date)}
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Data zakończenia
                  </Label>
                  <p className="mt-1 text-sm font-medium">
                    {formatDate(leaveRequest.end_date)}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Liczba dni
                  </Label>
                  <p className="mt-1 text-sm font-medium">
                    {leaveRequest.days_requested} dni roboczych
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Typ urlopu
                  </Label>
                  <div className="mt-1 flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: leaveRequest.leave_types?.color }}
                    />
                    <p className="text-sm font-medium">
                      {leaveRequest.leave_types?.name}
                    </p>
                  </div>
                </div>
              </div>

              {leaveRequest.reason && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Powód
                  </Label>
                  <p className="mt-1 text-sm">
                    {leaveRequest.reason}
                  </p>
                </div>
              )}

              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Data złożenia
                </Label>
                <p className="mt-1 text-sm">
                  {formatDate(leaveRequest.created_at)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Employee Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Informacje o pracowniku
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Imię i nazwisko
                </Label>
                <p className="mt-1 text-sm font-medium">
                  {leaveRequest.profiles?.full_name || 'Brak danych'}
                </p>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Email
                </Label>
                <p className="mt-1 text-sm">
                  {leaveRequest.profiles?.email}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Review Information */}
          {(leaveRequest.status === 'approved' || leaveRequest.status === 'rejected') && leaveRequest.reviewed_by_profile && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Informacje o zatwierdzeniu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {leaveRequest.status === 'approved' ? 'Zatwierdził' : 'Odrzucił'}
                    </Label>
                    <p className="mt-1 text-sm font-medium">
                      {leaveRequest.reviewed_by_profile.full_name || leaveRequest.reviewed_by_profile.email}
                    </p>
                  </div>
                  {leaveRequest.reviewed_at && (
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Data decyzji
                      </Label>
                      <p className="mt-1 text-sm">
                        {formatDate(leaveRequest.reviewed_at)}
                      </p>
                    </div>
                  )}
                </div>
                
                {leaveRequest.review_comment && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Komentarz
                    </Label>
                    <p className="mt-1 text-sm">
                      {leaveRequest.review_comment}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Status Info */}
          {leaveRequest.status === 'cancelled' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Ten wniosek urlopowy został anulowany i nie można go już edytować.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
} 