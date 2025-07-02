import { AppLayout } from '@/components/app-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Edit,
  User,
  FileText,
  CalendarDays
} from 'lucide-react'
import Link from 'next/link'
import { LeaveRequestActions } from '../components/LeaveRequestActions'
import { CancelLeaveRequestButton } from '../components/CancelLeaveRequestButton'
import { EditLeaveRequestDialog } from '../components/EditLeaveRequestDialog'
import { UserProfile } from '@/types/leave'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function LeaveRequestDetailsPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      *,
      organizations (
        id,
        name
      )
    `)
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    redirect('/onboarding')
  }

  // Get the specific leave request
  const { data: leaveRequest, error } = await supabase
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
    .eq('id', id)
    .eq('organization_id', profile.organization_id)
    .single()

  if (error || !leaveRequest) {
    notFound()
  }

  // Check permissions - user can view their own requests, or managers can view all
  const isManagerOrAdmin = profile.role === 'admin' || profile.role === 'manager'
  const isOwner = leaveRequest.user_id === user.id
  
  if (!isOwner && !isManagerOrAdmin) {
    redirect('/leave')
  }

  // Get leave types and balances for edit dialog
  const { data: leaveTypes } = await supabase
    .from('leave_types')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .order('name')

  const { data: leaveBalances } = await supabase
    .from('leave_balances')
    .select(`
      *,
      leave_types (
        id,
        name,
        color,
        leave_category
      )
    `)
    .eq('user_id', user.id)
    .eq('year', new Date().getFullYear())

  // Create user profile for validation
  const userProfile: UserProfile = {
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email,
    role: profile.role,
    employment_start_date: profile.employment_start_date,
    organization_id: profile.organization_id
  }

  // Check if this request can be edited/cancelled
  const canEditOrCancel = isOwner && leaveRequest.status !== 'cancelled'

  // Helper functions for display
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-5 w-5" />
      case 'approved': return <CheckCircle className="h-5 w-5" />
      case 'rejected': return <XCircle className="h-5 w-5" />
      case 'cancelled': return <AlertCircle className="h-5 w-5" />
      default: return <Clock className="h-5 w-5" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning/10 text-warning-foreground border-warning/20'
      case 'approved': return 'bg-success/10 text-success-foreground border-success/20'
      case 'rejected': return 'bg-destructive/10 text-destructive-foreground border-destructive/20'
      case 'cancelled': return 'bg-muted text-muted-foreground border-border'
      default: return 'bg-warning/10 text-warning-foreground border-warning/20'
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

  // Calculate if leave is in the past, current, or future
  const today = new Date()
  const startDate = new Date(leaveRequest.start_date)
  const endDate = new Date(leaveRequest.end_date)
  
  let periodStatus = ''
  if (endDate < today) {
    periodStatus = 'Zakończony'
  } else if (startDate <= today && endDate >= today) {
    periodStatus = 'Trwający'
  } else {
    periodStatus = 'Przyszły'
  }

  // Find the request being edited
  const editRequestId = resolvedSearchParams?.edit as string
  const requestToEdit = editRequestId && editRequestId === leaveRequest.id ? leaveRequest : null

  return (
    <AppLayout>
      {/* Edit Dialog */}
      <EditLeaveRequestDialog
        leaveTypes={leaveTypes || []}
        leaveBalances={leaveBalances || []}
        request={requestToEdit}
        userProfile={userProfile}
      />
      
      <div className="min-h-screen bg-background">
        <div className="p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Link 
              href="/leave" 
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Powrót do wniosków urlopowych
            </Link>

            <div className="max-w-4xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Szczegóły wniosku urlopowego</h1>
                  <p className="text-muted-foreground mt-1">
                    {leaveRequest.leave_types?.name} • {periodStatus}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(leaveRequest.status)}
                  <Badge className={getStatusColor(leaveRequest.status)}>
                    {getStatusText(leaveRequest.status)}
                  </Badge>
                </div>
              </div>

              {/* Action Buttons for Owner */}
              {canEditOrCancel && (
                <div className="flex gap-3">
                  <Button asChild variant="outline">
                    <Link href={`?edit=${leaveRequest.id}`}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edytuj wniosek
                    </Link>
                  </Button>
                  <CancelLeaveRequestButton
                    requestId={leaveRequest.id}
                    requestStatus={leaveRequest.status}
                    leaveType={leaveRequest.leave_types?.name || 'Nieznany'}
                    dateRange={`${formatDate(leaveRequest.start_date)} - ${formatDate(leaveRequest.end_date)}`}
                    startDate={leaveRequest.start_date}
                  />
                </div>
              )}

              {/* Main Content */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Request Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5" />
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
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
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
              </div>

              {/* Review Information */}
              {(leaveRequest.status === 'approved' || leaveRequest.status === 'rejected') && leaveRequest.reviewed_by_profile && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
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

              {/* Manager Actions */}
              {isManagerOrAdmin && leaveRequest.status === 'pending' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Akcje menedżerskie</CardTitle>
                    <CardDescription>
                      Zatwierdź lub odrzuć ten wniosek urlopowy
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LeaveRequestActions
                      requestId={leaveRequest.id}
                      requestStatus={leaveRequest.status}
                      employeeName={leaveRequest.profiles?.full_name || leaveRequest.profiles?.email || 'Nieznany'}
                      leaveType={leaveRequest.leave_types?.name || 'Nieznany'}
                      dateRange={`${formatDate(leaveRequest.start_date)} - ${formatDate(leaveRequest.end_date)}`}
                    />
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
          </div>
        </div>
      </div>
    </AppLayout>
  )
} 