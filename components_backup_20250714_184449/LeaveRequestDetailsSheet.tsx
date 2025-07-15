'use client'

import { useState, useEffect } from 'react'
import { 
  Sheet, 
  SheetContent,
  SheetTitle
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Info,
  TreePalm
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { EditLeaveRequestSheet } from './EditLeaveRequestSheet'
import { LeaveType, LeaveBalance, UserProfile } from '@/types/leave'

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

interface ConflictingLeave {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  leave_type: string
  end_date: string
}

export function LeaveRequestDetailsSheet({ requestId, isOpen, onClose }: LeaveRequestDetailsSheetProps) {
  const [leaveRequest, setLeaveRequest] = useState<LeaveRequestDetails | null>(null)
  const [conflictingLeaves, setConflictingLeaves] = useState<ConflictingLeave[]>([])
  const [loading, setLoading] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [lastFetchedId, setLastFetchedId] = useState<string | null>(null)

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

      // Fetch overlapping leave requests from team members
      const { data: overlappingLeaves, error: overlappingError } = await supabase
        .from('leave_requests')
        .select(`
          id,
          start_date,
          end_date,
          leave_types (
            name
          ),
          profiles!leave_requests_user_id_fkey (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('organization_id', data.organization_id)
        .neq('user_id', data.user_id)
        .neq('id', data.id)
        .in('status', ['approved', 'pending'])
        .lte('start_date', data.end_date)
        .gte('end_date', data.start_date)

      if (overlappingError) {
        console.error('Error fetching overlapping leaves:', overlappingError)
        setConflictingLeaves([])
      } else {
        const transformedLeaves = overlappingLeaves?.map(leave => ({
          id: leave.id,
          full_name: (leave.profiles as any)?.full_name || null,
          email: (leave.profiles as any)?.email || '',
          avatar_url: (leave.profiles as any)?.avatar_url || null,
          leave_type: (leave.leave_types as any)?.name || 'Urlop',
          end_date: new Date(leave.end_date).toLocaleDateString('pl-PL', { 
            day: '2-digit', 
            month: '2-digit' 
          })
        })) || []
        
        setConflictingLeaves(transformedLeaves)
      }

      // Fetch additional data needed for editing
      if (data.user_id === user.id && data.status !== 'cancelled') {
        // Fetch leave types
        const { data: leaveTypesData } = await supabase
          .from('leave_types')
          .select('*')
          .eq('organization_id', data.organization_id)
          .order('name')

        if (leaveTypesData) {
          setLeaveTypes(leaveTypesData)
        }

        // Fetch leave balances
        const { data: leaveBalancesData } = await supabase
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

        if (leaveBalancesData) {
          setLeaveBalances(leaveBalancesData)
        }

        // Fetch user profile with organization info
        const { data: profileData } = await supabase
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

        if (profileData) {
          setUserProfile(profileData)
        }
      }

      // Cache this request ID
      setLastFetchedId(requestId)

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && requestId) {
      // Only fetch if we don't have data for this request ID
      if (lastFetchedId !== requestId) {
        fetchLeaveRequestDetails()
      }
    }
  }, [isOpen, requestId])

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Oczekujący'
      case 'approved': return 'Zaakceptowany'
      case 'rejected': return 'Odrzucony'
      case 'cancelled': return 'Anulowany'
      default: return 'Nieznany'
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    return `${start.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${end.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
  }

  const isOwner = leaveRequest?.user_id === currentUserId
  const canEdit = isOwner && leaveRequest?.status !== 'cancelled'

  if (loading) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent size="content" className="overflow-y-auto">
          <div className="bg-background relative rounded-lg h-full">
            <div className="flex flex-col h-full">
              <div className="flex flex-col gap-6 p-6 flex-1 overflow-y-auto">
                
                {/* Dialog Header Skeleton */}
                <div className="flex flex-col gap-1.5 w-full">
                  <SheetTitle className="text-xl font-semibold leading-7 text-foreground">
                    <Skeleton className="h-7 w-48" />
                  </SheetTitle>
                </div>

                {/* Separator */}
                <Separator className="w-full" />

                {/* Content Skeleton */}
                <div className="flex flex-col gap-8 w-full">
                  
                  {/* Status Skeleton */}
                  <div className="flex flex-col gap-2 w-full">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-7 w-32" />
                  </div>

                  {/* Leave Type Skeleton */}
                  <div className="flex flex-col gap-2 w-full">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-7 w-40" />
                  </div>

                  {/* Request Date Skeleton */}
                  <div className="flex flex-col gap-2 w-full">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-7 w-56" />
                  </div>

                  {/* Leave Period and Duration Skeleton */}
                  <div className="flex flex-row gap-6 w-full">
                    <div className="flex flex-col gap-2 flex-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-7 w-full" />
                    </div>
                    <div className="flex flex-col gap-2 flex-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-7 w-20" />
                    </div>
                  </div>

                  {/* Description Skeleton */}
                  <div className="flex flex-col gap-2 w-full">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-3/4" />
                  </div>

                </div>

              </div>
              
              {/* Footer Skeleton */}
              <div className="flex flex-row gap-2 items-center justify-between w-full p-6 pt-0 bg-background">
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  if (!leaveRequest) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent size="content">
          <SheetTitle className="text-xl font-semibold leading-7 text-foreground">
            Nie znaleziono wniosku urlopowego
          </SheetTitle>
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-muted-foreground">Nie znaleziono wniosku urlopowego</div>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <>
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent size="content" className="overflow-y-auto">
        <div className="bg-background relative rounded-lg h-full">
          <div className="flex flex-col h-full">
            <div className="flex flex-col gap-6 p-6 flex-1 overflow-y-auto">
              
              {/* Dialog Header */}
              <div className="flex flex-col gap-1.5 w-full">
                <SheetTitle className="text-xl font-semibold leading-7 text-foreground">
                  Wniosek o urlop
                </SheetTitle>
              </div>

              {/* Separator */}
              <Separator className="w-full" />

              {/* Content */}
              <div className="flex flex-col gap-8 w-full">
                
                {/* Status */}
                <div className="flex flex-col gap-2 w-full">
                  <div className="text-sm font-medium leading-none text-foreground">
                    Status
                  </div>
                  <div className="text-xl font-semibold leading-7 text-foreground">
                    {getStatusText(leaveRequest.status)}
                  </div>
                </div>

                {/* Leave Type */}
                <div className="flex flex-col gap-2 w-full">
                  <div className="text-sm font-medium leading-none text-foreground">
                    Rodzaj urlopu
                  </div>
                  <div className="text-xl font-semibold leading-7 text-foreground">
                    {leaveRequest.leave_types?.name || 'Wypoczynkowy'}
                  </div>
                </div>

                {/* Request Date */}
                <div className="flex flex-col gap-2 w-full">
                  <div className="text-sm font-medium leading-none text-foreground">
                    Data złożenia wniosku
                  </div>
                  <div className="text-xl font-semibold leading-7 text-foreground">
                    {formatDateTime(leaveRequest.created_at)}
                  </div>
                </div>

                {/* Leave Period and Duration */}
                <div className="flex flex-row gap-6 w-full">
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="text-sm font-medium leading-none text-foreground">
                      Termin urlopu
                    </div>
                    <div className="text-xl font-semibold leading-7 text-foreground">
                      {formatDateRange(leaveRequest.start_date, leaveRequest.end_date)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="text-sm font-medium leading-none text-foreground">
                      Długość urlopu
                    </div>
                    <div className="text-xl font-semibold leading-7 text-foreground">
                      {leaveRequest.days_requested} {leaveRequest.days_requested === 1 ? 'dzień' : 'dni'}
                    </div>
                  </div>
                </div>

                {/* Conflicting Leaves Alert */}
                {conflictingLeaves.length > 0 && (
                  <div className="bg-card border border-border rounded-lg p-4 w-full">
                    <div className="flex flex-row gap-3 items-start w-full mb-3">
                      <Info className="w-4 h-4 text-foreground mt-0.5 shrink-0" />
                      <div className="text-sm font-medium leading-5 text-foreground">
                        W tym terminie urlop planują
                      </div>
                    </div>
                    <div className="flex flex-col gap-4 w-full">
                      {conflictingLeaves.map((conflictingLeave) => (
                        <div key={conflictingLeave.id} className="flex flex-row gap-4 items-center w-full">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={conflictingLeave.avatar_url || undefined} />
                            <AvatarFallback className="bg-muted">
                              {conflictingLeave.full_name?.split(' ').map(n => n[0]).join('') || conflictingLeave.email[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col flex-1">
                            <div className="text-sm font-medium leading-5 text-foreground">
                              {conflictingLeave.full_name || conflictingLeave.email}
                            </div>
                            <div className="text-sm text-muted-foreground leading-5">
                              {conflictingLeave.email}
                            </div>
                          </div>
                          <div className="flex flex-col items-end text-right">
                            <div className="text-sm font-medium leading-5 text-foreground">
                              {conflictingLeave.leave_type}
                            </div>
                            <div className="text-sm text-muted-foreground leading-5">
                              do {conflictingLeave.end_date}
                            </div>
                          </div>
                          <div className="bg-cyan-200 rounded-lg p-2 shrink-0">
                            <TreePalm className="w-6 h-6 text-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {leaveRequest.reason && (
                  <div className="flex flex-col gap-2 w-full">
                    <div className="text-sm font-medium leading-none text-foreground">
                      Opis
                    </div>
                    <div className="text-base font-normal leading-6 text-foreground">
                      {leaveRequest.reason}
                    </div>
                  </div>
                )}

              </div>

            </div>
            
            {/* Footer - Fixed at Bottom */}
            <div className="flex flex-row gap-2 items-center justify-between w-full p-6 pt-0 bg-background">
              {canEdit && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    onClose() // Close the current details sheet
                    setIsEditOpen(true) // Open the edit sheet
                  }}
                >
                  Edytuj wniosek
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onClose}>
                Zamknij
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
    
    {/* Edit Leave Request Sheet */}
    {leaveRequest && userProfile && (
      <EditLeaveRequestSheet
        leaveRequest={leaveRequest}
        leaveTypes={leaveTypes}
        leaveBalances={leaveBalances}
        userProfile={userProfile}
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false)
          // Refresh the main sheet data after editing
          fetchLeaveRequestDetails()
        }}
      />
    )}
    </>
  )
}