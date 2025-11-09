'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { FigmaTabs, FigmaTabsList, FigmaTabsTrigger, FigmaTabsContent } from '@/app/admin/team-management/components/FigmaTabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { EditOrganizationSheet } from './EditOrganizationSheet'
import { EditLeaveTypesSheet } from './EditLeaveTypesSheet'
import { EditLeavePoliciesSheet } from './EditLeavePoliciesSheet'
import { EditGoogleWorkspaceSheet } from './EditGoogleWorkspaceSheet'
import { CreateLeaveTypeSheet } from './CreateLeaveTypeSheet'
import { WorkModeSettings } from './WorkModeSettings'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getCountryFlag, getLanguageFlag } from '@/lib/flag-utils'
import { Plus, MoreVertical, X, Lock } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { SubscriptionWidget } from '@/components/admin/SubscriptionWidget'
import { PendingChangesSection } from '@/components/admin/PendingChangesSection'
import { ArchivedUsersSection } from '@/app/admin/team-management/components/ArchivedUsersSection'
import { REFETCH_SETTINGS, REFETCH_TEAM_MANAGEMENT } from '@/lib/refetch-events'

interface LeaveType {
  id: string
  name: string
  days_per_year: number
  color: string
  requires_balance: boolean
  requires_approval: boolean
  is_mandatory?: boolean
}

interface LeavePolicies {
  minimum_notice_days: number
  auto_approve_days: number
  max_consecutive_days: number
  min_advance_for_long_leave: number
  allow_negative_balance: boolean
  allow_carry_over: boolean
  max_carry_over_days: number
  weekend_policy: 'count' | 'exclude'
  holiday_policy: 'count' | 'exclude'
}

interface Team {
  id: string
  name: string
}

interface TeamMember {
  user_id: string
  team_id: string
}

interface Subscription {
  current_seats: number
  pending_seats: number | null
  renews_at: string | null
  status: string
}

interface PendingRemovalUser {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  removal_effective_date: string | null
  role: string
}

interface ArchivedUser {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: string
}

interface AdminSettingsClientProps {
  currentOrganization: any
  users: any[]
  leaveTypes: LeaveType[]
  teams: Team[]
  teamMembers: TeamMember[]
  subscription: Subscription | null
  pendingRemovalUsers: PendingRemovalUser[]
  archivedUsers: ArchivedUser[]
}

export default function AdminSettingsClient({
  currentOrganization: initialOrganization,
  users,
  leaveTypes: initialLeaveTypes,
  teams,
  teamMembers,
  subscription: initialSubscription,
  pendingRemovalUsers: initialPendingUsers,
  archivedUsers: initialArchivedUsers
}: AdminSettingsClientProps) {
  const t = useTranslations('billing')
  const [currentOrganization, setCurrentOrganization] = useState(initialOrganization)
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>(initialLeaveTypes)
  const [pendingRemovalUsers, setPendingRemovalUsers] = useState<PendingRemovalUser[]>(initialPendingUsers)
  const [archivedUsers, setArchivedUsers] = useState<ArchivedUser[]>(initialArchivedUsers)
  const router = useRouter()

  // Tab state management
  const [activeTab, setActiveTab] = useState('general')
  
  // Sheet states
  const [isOrganizationSheetOpen, setIsOrganizationSheetOpen] = useState(false)
  const [isLeaveTypesSheetOpen, setIsLeaveTypesSheetOpen] = useState(false)
  const [isLeavePoliciesSheetOpen, setIsLeavePoliciesSheetOpen] = useState(false)
  const [isGoogleWorkspaceSheetOpen, setIsGoogleWorkspaceSheetOpen] = useState(false)
  const [isCreateLeaveTypeSheetOpen, setIsCreateLeaveTypeSheetOpen] = useState(false)

  // Dialog states for leave types management
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Workspace deletion state
  const [deleteWorkspaceDialogOpen, setDeleteWorkspaceDialogOpen] = useState(false)
  const [workspaceDeleteLoading, setWorkspaceDeleteLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    days_per_year: 0,
    requires_balance: true
  })

  // Billing state
  const [subscriptionData, setSubscriptionData] = useState<any>(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(true)
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  // Mock leave policies data (would come from API)
  const [leavePolicies] = useState<LeavePolicies>({
    minimum_notice_days: 7,
    auto_approve_days: 0,
    max_consecutive_days: 7,
    min_advance_for_long_leave: 14,
    allow_negative_balance: false,
    allow_carry_over: true,
    max_carry_over_days: 5,
    weekend_policy: 'exclude',
    holiday_policy: 'exclude'
  })

  // Sync with prop changes
  useEffect(() => {
    setCurrentOrganization(initialOrganization)
  }, [initialOrganization])

  // Fetch subscription data
  useEffect(() => {
    const fetchSubscriptionData = async () => {
      if (!currentOrganization?.id) {
        // No organization ID - show free tier
        setSubscriptionData(null)
        setSubscriptionLoading(false)
        return
      }

      setSubscriptionLoading(true)
      setSubscriptionError(null)

      try {
        const response = await fetch(`/api/billing/subscription?organization_id=${currentOrganization.id}&_t=${Date.now()}`, {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
        const result = await response.json()

        console.log('🔥 BILLING API RESPONSE:', {
          status: response.status,
          ok: response.ok,
          result: result
        })

        if (!response.ok) {
          // If API fails, assume free tier for now
          console.warn('Billing API failed, showing free tier:', result.error)
          setSubscriptionData(null)
          setSubscriptionError(null) // Don't show error, just show free tier
          return
        }

        console.log('🔥 SETTING SUBSCRIPTION DATA:', result.subscription)
        setSubscriptionData(result.subscription)
      } catch (error: any) {
        console.error('Error fetching subscription:', error)
        // If network/server error, show free tier instead of error
        setSubscriptionData(null)
        setSubscriptionError(null)
      } finally {
        setSubscriptionLoading(false)
      }
    }

    fetchSubscriptionData()
  }, [currentOrganization?.id])

  // Handler for organization updates
  const handleOrganizationSave = (updatedOrganization: any) => {
    setCurrentOrganization(updatedOrganization)
  }

  // Handlers for leave management updates
  const handleLeaveTypesEdit = () => {
    setIsLeaveTypesSheetOpen(true)
  }

  const handleLeavePoliciesEdit = () => {
    setIsLeavePoliciesSheetOpen(true)
  }

  const handleLeaveTypesUpdate = (updatedTypes: LeaveType[]) => {
    console.log('Leave types updated:', updatedTypes)
    window.dispatchEvent(new Event(REFETCH_SETTINGS))
  }

  const handleLeavePoliciesUpdate = (updatedPolicies: LeavePolicies) => {
    console.log('Leave policies updated:', updatedPolicies)
    window.dispatchEvent(new Event(REFETCH_SETTINGS))
  }

  // Handler for calendar restriction toggle
  const handleCalendarRestrictionToggle = async (checked: boolean) => {
    try {
      const response = await fetch('/api/admin/settings/calendar-restriction', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: currentOrganization.id,
          restrictCalendarByGroup: checked
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update calendar restriction setting')
      }

      // Update local state
      setCurrentOrganization({
        ...currentOrganization,
        restrict_calendar_by_group: checked
      })

      toast.success(
        checked
          ? 'Widoczność kalendarza została ograniczona według grup'
          : 'Widoczność kalendarza została odblokowana dla wszystkich'
      )
    } catch (error) {
      console.error('Error updating calendar restriction:', error)
      toast.error(error instanceof Error ? error.message : 'Nie udało się zaktualizować ustawienia')
    }
  }


  // Handlers for leave types edit and delete
  const handleEditLeaveType = (leaveType: LeaveType) => {
    setFormData({
      name: leaveType.name,
      days_per_year: leaveType.days_per_year,
      requires_balance: leaveType.requires_balance
    })
    setSelectedLeaveType(leaveType)
    setEditDialogOpen(true)
  }

  const handleDeleteLeaveType = (leaveType: LeaveType) => {
    setSelectedLeaveType(leaveType)
    // Add small delay to allow dropdown to fully close and clean up body styles
    // This prevents pointer-events: none from persisting on body element
    setTimeout(() => {
      setDeleteDialogOpen(true)
    }, 100)
  }

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedLeaveType?.id) {
      toast.error('Nie wybrano rodzaju urlopu')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from('leave_types')
        .update({
          name: formData.name,
          days_per_year: formData.days_per_year,
          requires_balance: formData.requires_balance
        })
        .eq('id', selectedLeaveType.id)

      if (updateError) {
        throw new Error(updateError.message || 'Nie udało się zaktualizować rodzaju urlopu')
      }

      // Update local state immediately (optimistic update)
      setLeaveTypes(prevLeaveTypes =>
        prevLeaveTypes.map(lt =>
          lt.id === selectedLeaveType.id
            ? {
                ...lt,
                name: formData.name,
                days_per_year: formData.days_per_year,
                requires_balance: formData.requires_balance
              }
            : lt
        )
      )

      // Show success message
      toast.success('Rodzaj urlopu został zaktualizowany!')

    } catch (error) {
      console.error('Error updating leave type:', error)
      toast.error(error instanceof Error ? error.message : 'Wystąpił błąd podczas aktualizacji rodzaju urlopu')
    } finally {
      setLoading(false)
      // Close dialog after loading is complete
      setEditDialogOpen(false)
      setSelectedLeaveType(null)
    }
  }

  const handleSubmitDelete = async () => {
    if (!selectedLeaveType?.id) {
      toast.error('Nie wybrano rodzaju urlopu')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      // Check if leave type is mandatory (cannot be deleted)
      if (selectedLeaveType?.is_mandatory) {
        toast.error('Nie można usunąć obowiązkowego rodzaju urlopu. Ten typ jest wymagany przez polskie prawo pracy.')
        setLoading(false)
        return
      }

      // Delete the leave type (CASCADE will automatically delete related leave_requests and leave_balances)
      const { error: deleteError } = await supabase
        .from('leave_types')
        .delete()
        .eq('id', selectedLeaveType.id)

      if (deleteError) {
        throw new Error(deleteError.message || 'Nie udało się usunąć rodzaju urlopu')
      }

      // Update local state immediately (optimistic update)
      setLeaveTypes(prevLeaveTypes =>
        prevLeaveTypes.filter(lt => lt.id !== selectedLeaveType.id)
      )

      // Show success message
      toast.success('Rodzaj urlopu został usunięty!')

    } catch (error) {
      console.error('Error deleting leave type:', error)
      toast.error(error instanceof Error ? error.message : 'Wystąpił błąd podczas usuwania rodzaju urlopu')
    } finally {
      setLoading(false)
      // Close dialog after loading is complete
      setDeleteDialogOpen(false)
      setSelectedLeaveType(null)
    }
  }

  const handleCreateDefaults = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/admin/create-default-leave-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Nie udało się utworzyć domyślnych rodzajów urlopów')
      }

      // Update local state with newly created leave types
      if (result.data && result.data.length > 0) {
        setLeaveTypes(prevLeaveTypes => [...prevLeaveTypes, ...result.data])
      }

      toast.success(result.message || 'Domyślne rodzaje urlopów zostały utworzone!')

    } catch (error) {
      console.error('Error creating default leave types:', error)
      toast.error(error instanceof Error ? error.message : 'Wystąpił błąd podczas tworzenia domyślnych rodzajów urlopów')
    } finally {
      setLoading(false)
    }
  }

  // Workspace deletion handler
  const handleDeleteWorkspace = () => {
    setDeleteWorkspaceDialogOpen(true)
  }

  const handleConfirmDeleteWorkspace = async () => {
    setWorkspaceDeleteLoading(true)

    try {
      const response = await fetch(`/api/workspaces/${currentOrganization?.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Nie udało się usunąć workspace')
      }

      toast.success('Workspace został pomyślnie usunięty!')
      
      // Redirect to onboarding since current workspace no longer exists
      setTimeout(() => {
        window.location.href = '/onboarding'
      }, 2000)

    } catch (error) {
      console.error('Error deleting workspace:', error)
      toast.error(error instanceof Error ? error.message : 'Wystąpił błąd podczas usuwania workspace')
    } finally {
      setWorkspaceDeleteLoading(false)
      setDeleteWorkspaceDialogOpen(false)
    }
  }

  // Handle seat management - always redirect to seat management page
  const handleManageSeatSubscription = () => {
    if (!currentOrganization?.id) return

    // Always redirect to seat management page (add users/upgrade page)
    const currentSeats = getSeatUsage().total
    window.location.href = `/onboarding/add-users?upgrade=true&current_org=${currentOrganization?.id}&seats=${currentSeats}`
  }

  // Handle customer portal access for billing issues
  const handleOpenCustomerPortal = async () => {
    if (!currentOrganization?.id) return

    setPortalLoading(true)

    try {
      const response = await fetch(`/api/billing/customer-portal?organization_id=${currentOrganization.id}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate customer portal link')
      }

      // Open customer portal in new tab
      window.open(result.portal_url, '_blank')
      toast.success('Opening customer portal...')

    } catch (error: any) {
      console.error('Error opening customer portal:', error)
      toast.error(error.message || 'Unable to open customer portal')
    } finally {
      setPortalLoading(false)
    }
  }

  // Handle cancelling a pending user removal
  const handleCancelRemoval = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/cancel-removal/${userId}`, {
        method: 'POST'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to cancel removal')
      }

      // Remove user from pending removal list
      setPendingRemovalUsers(prev => prev.filter(u => u.id !== userId))

      // Trigger refetch of team management data
      window.dispatchEvent(new Event(REFETCH_TEAM_MANAGEMENT))
    } catch (error: any) {
      console.error('Error cancelling removal:', error)
      throw error // Let the component handle the error
    }
  }

  // Handle reactivating an archived user
  const handleReactivateUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/reactivate-user/${userId}`, {
        method: 'POST'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reactivate user')
      }

      // Remove user from archived list
      setArchivedUsers(prev => prev.filter(u => u.id !== userId))

      // Trigger refetch of team management data
      window.dispatchEvent(new Event(REFETCH_TEAM_MANAGEMENT))
    } catch (error: any) {
      console.error('Error reactivating user:', error)
      throw error // Let the component handle the error
    }
  }

  const getUserInitials = (name: string, email: string) => {
    if (name && name !== email?.split('@')[0]) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email?.slice(0, 2).toUpperCase() || 'DB'
  }

  // Billing helper functions
  const getSubscriptionStatus = () => {
    if (!subscriptionData) return { status: 'free', badge: t('subscriptionStatus.free'), color: 'bg-green-100 text-green-800 border-green-200' }

    switch (subscriptionData.status) {
      case 'active':
        return { status: 'active', badge: t('subscriptionStatus.active'), color: 'bg-green-100 text-green-800 border-green-200' }
      case 'on_trial':
        return { status: 'on_trial', badge: t('subscriptionStatus.on_trial'), color: 'bg-blue-100 text-blue-800 border-blue-200' }
      case 'paused':
        return { status: 'paused', badge: t('subscriptionStatus.paused'), color: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
      case 'cancelled':
        return { status: 'cancelled', badge: t('subscriptionStatus.cancelled'), color: 'bg-red-100 text-red-800 border-red-200' }
      case 'expired':
        return { status: 'expired', badge: t('subscriptionStatus.expired'), color: 'bg-red-100 text-red-800 border-red-200' }
      case 'past_due':
        return { status: 'past_due', badge: t('subscriptionStatus.pastDue'), color: 'bg-red-100 text-red-800 border-red-200' }
      default:
        return { status: 'unknown', badge: 'Unknown', color: 'bg-muted text-foreground border' }
    }
  }

  // Calculate trial days remaining
  const getTrialDaysRemaining = () => {
    if (!subscriptionData?.trial_ends_at) return null

    const now = new Date()
    const trialEnd = new Date(subscriptionData.trial_ends_at)
    const diffTime = trialEnd.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return diffDays > 0 ? diffDays : 0
  }

  const trialDaysRemaining = getTrialDaysRemaining()

  const formatCurrency = (amount: number, currency: string = 'PLN') => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount / 100) // Convert from cents/grosze
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getSeatUsage = () => {
    if (!subscriptionData?.seat_info) {
      // Free tier calculation
      const currentEmployees = users.length || 0
      const freeSeats = 3
      return {
        used: currentEmployees,
        total: freeSeats,
        remaining: Math.max(0, freeSeats - currentEmployees),
        percentage: Math.min(100, (currentEmployees / freeSeats) * 100),
        freeSeats,
        paidSeats: 0,
        pendingInvitations: 0,
        activeMembers: currentEmployees
      }
    }

    const {
      total_seats,
      current_employees,
      seats_remaining,
      free_seats,
      paid_seats,
      pending_invitations = 0
    } = subscriptionData.seat_info

    // Calculate total used including pending invitations
    const totalUsed = current_employees + pending_invitations

    return {
      used: totalUsed,
      total: total_seats,
      remaining: seats_remaining,
      percentage: Math.min(100, (totalUsed / total_seats) * 100),
      freeSeats: free_seats,
      paidSeats: paid_seats,
      pendingInvitations: pending_invitations,
      activeMembers: current_employees
    }
  }

  return (
    <div className="py-11 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Ustawienia administracyjne</h1>
      </div>

      {/* Tabs */}
      <FigmaTabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="relative -mx-12 px-12">
          <FigmaTabsList className="border-b-0">
            <FigmaTabsTrigger value="general">Ogólne</FigmaTabsTrigger>
            <FigmaTabsTrigger value="leave-types">Urlopy</FigmaTabsTrigger>
            <FigmaTabsTrigger value="calendar-visibility">Widoczność kalendarza</FigmaTabsTrigger>
            <FigmaTabsTrigger value="billing">Billing</FigmaTabsTrigger>
            <FigmaTabsTrigger value="workspace">Workspace</FigmaTabsTrigger>
            <FigmaTabsTrigger value="notifications">Powiadomienia</FigmaTabsTrigger>
            <FigmaTabsTrigger value="work-modes">Tryby pracy</FigmaTabsTrigger>
            <FigmaTabsTrigger value="additional-rules">Dodatkowe reguły</FigmaTabsTrigger>
          </FigmaTabsList>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
        </div>

        {/* Tab Content */}
        <FigmaTabsContent value="general" className="mt-6 space-y-6">
          {/* Organization Settings Card */}
          <Card className="border border-border">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-semibold">Ustawienia organizacji</CardTitle>
                  </div>
                  <CardDescription>
                    Podstawowe informacje o organizacji
                  </CardDescription>
                </div>
                <Button variant="secondary" size="sm" className="h-9" onClick={() => setIsOrganizationSheetOpen(true)}>
                  Edytuj dane
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-6 space-y-6">
              <div className="space-y-6">
                <div className="w-[400px] space-y-2">
                  <Label htmlFor="org-name">Nazwa organizacji</Label>
                  <Input 
                    id="org-name"
                    value={currentOrganization?.name || 'BB8'} 
                    disabled 
                    className="opacity-50"
                  />
                </div>
                
                <div className="w-[400px] space-y-2">
                  <Label htmlFor="org-logo">Logo organizacji</Label>
                  <div className="relative">
                    <Input 
                      id="org-logo"
                      value="Nie wybrano pliku" 
                      disabled 
                      className="opacity-50 pl-[100px]"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <Button variant="ghost" size="sm" className="h-auto p-1.5 text-sm font-medium">
                        Wybierz plik
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="w-[400px] space-y-2">
                  <Label htmlFor="org-slug">Slug organizacji</Label>
                  <Input 
                    id="org-slug"
                    value={currentOrganization?.slug || 'bb8'} 
                    disabled 
                    className="opacity-50"
                  />
                  <p className="text-sm text-muted-foreground">
                    Unikalny identyfikator (tylko małe litery, cyfry i myślniki)
                  </p>
                </div>

                <div className="w-[400px] space-y-2">
                  <Label>Administrator</Label>
                  <div className="flex items-center gap-4 w-full">
                    {(() => {
                      const adminUser = users.find(u => u.role === 'admin')
                      return adminUser ? (
                        <>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={adminUser.avatar_url || undefined} />
                            <AvatarFallback className="">
                              {getUserInitials(adminUser.full_name || '', adminUser.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{adminUser.full_name || adminUser.email}</p>
                            <p className="text-sm text-muted-foreground">{adminUser.email}</p>
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Brak administratora</span>
                      )
                    })()}
                  </div>
                </div>

                <Separator />

                <div className="w-[400px] space-y-2">
                  <Label htmlFor="holiday-calendar">Kalendarz świąt</Label>
                  <Select value={currentOrganization?.country_code || 'PL'} disabled>
                    <SelectTrigger>
                      <div className="flex items-center gap-2">
                        {currentOrganization?.country_code === 'PL' && (
                          <span className="text-lg">🇵🇱</span>
                        )}
                        {currentOrganization?.country_code === 'IE' && (
                          <span className="text-lg">🇮🇪</span>
                        )}
                        {currentOrganization?.country_code === 'US' && (
                          <span className="text-lg">🇺🇸</span>
                        )}
                        <span className="font-medium text-sm">
                          {currentOrganization?.country_code === 'PL' ? 'Polska' :
                           currentOrganization?.country_code === 'IE' ? 'Irlandia' :
                           currentOrganization?.country_code === 'US' ? 'Stany Zjednoczone' :
                           'Polska'}
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pl">Polska</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-[400px] space-y-2">
                  <Label htmlFor="primary-language">Język podstawowy organizacji</Label>
                  <Select value={currentOrganization?.locale || 'pl'} disabled>
                    <SelectTrigger>
                      <div className="flex items-center gap-2">
                        {(currentOrganization?.locale === 'pl' || !currentOrganization?.locale) && (
                          <span className="text-lg">🇵🇱</span>
                        )}
                        {currentOrganization?.locale === 'en' && (
                          <span className="text-lg">🇺🇸</span>
                        )}
                        <span className="font-medium text-sm">
                          {(currentOrganization?.locale === 'pl' || !currentOrganization?.locale) ? 'Polski' :
                           currentOrganization?.locale === 'en' ? 'English' :
                           'Polski'}
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pl">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🇵🇱</span>
                          <span>Polski</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="en">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🇺🇸</span>
                          <span>English</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Domyślny język dla nowych użytkowników. Użytkownicy mogą zmienić język w swoim profilu.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Google Workspace Integration Card */}
          <Card className="border border-border">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-semibold">Integracja z Google Workspace</CardTitle>
                  </div>
                  <CardDescription>
                    Konfiguracja domeny Google
                  </CardDescription>
                </div>
                <Button variant="secondary" size="sm" className="h-9" onClick={() => setIsGoogleWorkspaceSheetOpen(true)}>
                  Edytuj dane
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-6">
              <div className="space-y-6">
                <div className="w-[400px] space-y-2">
                  <Label htmlFor="google-domain">Domena Google Workspace</Label>
                  <Input 
                    id="google-domain"
                    value={currentOrganization?.google_domain || 'bb8.pl'} 
                    disabled 
                    className="opacity-50"
                  />
                  <p className="text-sm text-muted-foreground">
                    Jeśli ustawione, tylko użytkownicy z tej domeny będą mogli się logować przez Google
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <Switch 
                    id="require-google-domain" 
                    checked={currentOrganization?.require_google_domain || false}
                    disabled
                    className="opacity-50"
                  />
                  <div className="space-y-2">
                    <Label htmlFor="require-google-domain" className="text-sm font-medium">
                      Wymagaj domeny Google dla wszystkich nowych użytkowników
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </FigmaTabsContent>

        <FigmaTabsContent value="leave-types" className="mt-6 space-y-6">
          {/* Nested Tabs for Urlopy */}
          <Tabs defaultValue="rodzaje-urlopow" className="w-full">
            <TabsList className="bg-muted p-[3px] h-9 rounded-lg">
              <TabsTrigger value="rodzaje-urlopow" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
                Rodzaje urlopów
              </TabsTrigger>
              <TabsTrigger value="polityki-urlopowe" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
                Polityki urlopowe
              </TabsTrigger>
            </TabsList>

            {/* Leave Types Tab */}
            <TabsContent value="rodzaje-urlopow" className="mt-6">
              <Card className="border border-border">
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl font-semibold">Rodzaje urlopów</CardTitle>
                      </div>
                      <CardDescription>
                        Zarządzaj dostępnymi rodzajami urlopów w organizacji
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="outline" 
                        onClick={handleCreateDefaults}
                        disabled={loading}
                        className="h-9 px-4 rounded-lg border bg-card text-foreground"
                      >
                        {loading ? 'Tworzenie...' : 'Utwórz domyślne rodzaje urlopów'}
                      </Button>
                      <Button
                        onClick={() => setIsCreateLeaveTypeSheetOpen(true)}
                        className="bg-foreground text-primary-foreground h-9 px-4 rounded-lg shadow-sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Dodaj rodzaj urlopu
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-6">
                  <div className="overflow-hidden">
                    <table className="w-full">
                      {/* Table Header */}
                      <thead>
                        <tr className="border-b border">
                          <th className="text-left py-2.5 px-2 text-sm font-medium text-muted-foreground">
                            Rodzaj urlopu
                          </th>
                          <th className="text-left py-2.5 px-2 text-sm font-medium text-muted-foreground">
                            Dni rocznie
                          </th>
                          <th className="py-2.5 px-2"></th>
                          <th className="py-2.5 px-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaveTypes.map((leaveType) => (
                          <tr key={leaveType.id} className="border-b border last:border-b-0">
                            <td className="py-2 px-2">
                              <div className="flex flex-col gap-0">
                                <div className="flex items-center gap-2">
                                  {leaveType.is_mandatory && (
                                    <div title="Obowiązkowy typ urlopu - nie można usunąć">
                                      <Lock className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  )}
                                  <span className="text-sm font-medium text-foreground">
                                    {leaveType.name}
                                  </span>
                                  {leaveType.is_mandatory && (
                                    <Badge className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-lg border border-blue-200">
                                      Obowiązkowy
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-2 px-2">
                              <span className="text-sm font-medium text-foreground">
                                {leaveType.days_per_year === 0
                                  ? "Nielimitowany"
                                  : `${leaveType.days_per_year} dni rocznie`}
                              </span>
                            </td>
                            <td className="py-2 px-2">
                              {leaveType.requires_balance && (
                                <Badge className="bg-foreground text-primary-foreground text-xs px-2 py-0.5 rounded-lg">
                                  Saldo
                                </Badge>
                              )}
                            </td>
                            <td className="py-2 px-2 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-muted">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-32">
                                  <DropdownMenuItem onClick={() => handleEditLeaveType(leaveType)}>
                                    Edytuj
                                  </DropdownMenuItem>
                                  {leaveType.is_mandatory ? (
                                    <DropdownMenuItem
                                      disabled
                                      className="text-muted-foreground cursor-not-allowed"
                                      title="Nie można usunąć obowiązkowego typu urlopu"
                                    >
                                      <Lock className="h-3 w-3 mr-2" />
                                      Usuń
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => handleDeleteLeaveType(leaveType)} className="text-red-600 focus:text-red-600">
                                      Usuń
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem>
                                    Anuluj
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Leave Policies Tab */}
            <TabsContent value="polityki-urlopowe" className="mt-6 space-y-6">
              {/* Zasady zatwierdzania */}
              <Card className="border border-border">
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                      <CardTitle className="text-xl font-semibold">Zasady zatwierdzania</CardTitle>
                      <CardDescription>
                        Skonfiguruj zasady zatwierdzania i ograniczenia urlopów
                      </CardDescription>
                    </div>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="h-9"
                      onClick={handleLeavePoliciesEdit}
                    >
                      Edytuj
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-0 space-y-6">
                  <div className="flex gap-6">
                    <div className="w-[400px] space-y-2">
                      <Label className="text-sm font-medium text-foreground">
                        Minimalne wyprzedzenie (dni)
                      </Label>
                      <Input 
                        value="7" 
                        disabled 
                        className="bg-card opacity-50 border h-9"
                      />
                      <p className="text-sm text-muted-foreground">
                        Ile dni wcześniej należy złożyć wniosek urlopowy
                      </p>
                    </div>
                    <div className="w-[400px] space-y-2">
                      <Label className="text-sm font-medium text-foreground">
                        Zatwierdzenie przez admina wymagane powyżej (dni)
                      </Label>
                      <Input 
                        value="30" 
                        disabled 
                        className="bg-card opacity-50 border h-9"
                      />
                      <p className="text-sm text-muted-foreground">
                        Urlopy dłuższe niż x dni wymagają zatwierdzenia przez administratora
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Switch disabled className="data-[state=unchecked]:bg-muted" />
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">
                        Wymagaj zatwierdzenia przez menedżera/administratora
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Limity urlopowe */}
              <Card className="border border-border">
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                      <CardTitle className="text-xl font-semibold">Limity urlopowe</CardTitle>
                      <CardDescription>
                        Skonfiguruj zasady zatwierdzania i ograniczenia urlopów
                      </CardDescription>
                    </div>
                    <Button variant="secondary" size="sm" className="h-9">
                      Edytuj
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-0 space-y-6">
                  <div className="flex gap-6">
                    <div className="w-[400px] space-y-2">
                      <Label className="text-sm font-medium text-foreground">
                        Maksymalne kolejne dni
                      </Label>
                      <Input 
                        value="7" 
                        disabled 
                        className="bg-card opacity-50 border h-9"
                      />
                      <p className="text-sm text-muted-foreground">
                        Maksymalna liczba kolejnych dni urlopu w jednym wniosku
                      </p>
                    </div>
                    <div className="w-[400px] space-y-2">
                      <Label className="text-sm font-medium text-foreground">
                        Minimalne wyprzedzenie dla długich urlopów (dni)
                      </Label>
                      <Input 
                        value="14" 
                        disabled 
                        className="bg-card opacity-50 border h-9"
                      />
                      <p className="text-sm text-muted-foreground">
                        Urlopy dłuższe niż x dni wymagają zatwierdzenia przez administratora
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Przenoszenie urlopów */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Przenoszenie urlopów</CardTitle>
                      <CardDescription className="text-sm text-muted-foreground">
                        Ustawienia dotyczące przenoszenia niewykorzystanych urlopów
                      </CardDescription>
                    </div>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="h-9"
                      onClick={handleLeavePoliciesEdit}
                    >
                      Edytuj
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-0 space-y-6">
                  <div className="flex items-start gap-3">
                    <Switch disabled checked className="data-[state=checked]:bg-foreground" />
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">
                        Zezwalaj na przenoszenie niewykorzystanych urlopów na kolejny rok
                      </Label>
                    </div>
                  </div>
                  <div className="w-[400px] space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                      Maksymalna liczba dni do przeniesienia
                    </Label>
                    <Input 
                      value="5" 
                      disabled 
                      className="bg-card opacity-50 border h-9"
                    />
                    <p className="text-sm text-muted-foreground">
                      Ile dni urlopu można przenieść na kolejny rok
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Zasady liczenia dni roboczych */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Zasady liczenia dni roboczych</CardTitle>
                      <CardDescription className="text-sm text-muted-foreground">
                        Zasady dotyczące liczenia weekendów i dni świątecznych
                      </CardDescription>
                    </div>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="h-9"
                      onClick={handleLeavePoliciesEdit}
                    >
                      Edytuj
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-0 space-y-6">
                  <div className="w-[400px] space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                      Polityka liczenia weekendów
                    </Label>
                    <Select disabled>
                      <SelectTrigger className="bg-card border h-9">
                        <SelectValue placeholder="Nie licz weekendów" />
                      </SelectTrigger>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Jak traktować weekendy przy liczeniu dni urlopu
                    </p>
                  </div>
                  <div className="w-[400px] space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                      Polityka świąt
                    </Label>
                    <Input 
                      value="Nie licz świąt państwowych" 
                      disabled 
                      className="bg-card opacity-50 border h-9"
                    />
                    <p className="text-sm text-muted-foreground">
                      Jak traktować święta państwowe przy liczeniu dni urlopu
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </FigmaTabsContent>

        <FigmaTabsContent value="calendar-visibility" className="mt-6 space-y-6">
          {/* Calendar Visibility Settings Card */}
          <Card className="border border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold">Widoczność kalendarza</CardTitle>
              <CardDescription>
                Kontroluj, którzy użytkownicy mogą widzieć kalendarze innych osób w organizacji.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Calendar Restriction Toggle */}
              <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30">
                <div className="space-y-1">
                  <div className="font-medium text-foreground">
                    Ogranicz widoczność kalendarza według grup
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Gdy włączone, użytkownicy w grupach widzą tylko kalendarze członków swojej grupy. Użytkownicy bez grupy widzą wszystkich.
                  </div>
                </div>
                <Switch
                  checked={currentOrganization?.restrict_calendar_by_group || false}
                  onCheckedChange={handleCalendarRestrictionToggle}
                />
              </div>

              {/* Current Status Explanation */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Obecny status:</strong>{' '}
                  {currentOrganization?.restrict_calendar_by_group
                    ? 'Użytkownicy w grupach widzą tylko kalendarze członków swojej grupy. Użytkownicy bez grupy widzą wszystkich w organizacji.'
                    : 'Wszyscy użytkownicy w organizacji widzą nawzajem swoje kalendarze, niezależnie od przynależności do grup.'}
                </p>
              </div>

              <Separator />

              {/* User Group Assignments */}
              <div className="space-y-2">
                <h3 className="text-base font-medium text-foreground">Przypisania użytkowników do grup</h3>
                <p className="text-sm text-muted-foreground">
                  Zarządzaj grupami użytkowników na stronie Zarządzania Zespołem
                </p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium text-muted-foreground">Użytkownik</TableHead>
                    <TableHead className="font-medium text-muted-foreground">Email</TableHead>
                    <TableHead className="font-medium text-muted-foreground">Grupa</TableHead>
                    <TableHead className="font-medium text-muted-foreground">Widoczność kalendarza</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-16 text-center">
                        <div className="text-muted-foreground">
                          Brak użytkowników w organizacji
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => {
                      const userTeam = teamMembers.find(tm => tm.user_id === user.id)
                      const team = userTeam ? teams.find(t => t.id === userTeam.team_id) : null

                      // Calculate visibility based on restriction setting
                      let visibilityText: string
                      if (currentOrganization?.restrict_calendar_by_group) {
                        // Restriction is ON
                        visibilityText = team
                          ? `Tylko grupa: ${team.name}`
                          : 'Wszyscy w organizacji'
                      } else {
                        // Restriction is OFF - everyone sees everyone
                        visibilityText = 'Wszyscy w organizacji'
                      }

                      return (
                        <TableRow key={user.id} className="h-[72px]">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="size-10">
                                <AvatarImage src={user.avatar_url || undefined} />
                                <AvatarFallback className="text-sm font-medium">
                                  {user.full_name
                                    ? user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                                    : user.email.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-foreground">
                                  {user.full_name || 'Bez nazwiska'}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {user.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            {team ? (
                              <Badge variant="secondary">
                                {team.name}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">Brak grupy</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {visibilityText}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </FigmaTabsContent>

        <FigmaTabsContent value="billing" className="mt-6 space-y-6">
          {/* Trial Countdown Banner */}
          {subscriptionData?.status === 'on_trial' && trialDaysRemaining !== null && (
            <div className={`rounded-lg border p-4 ${
              trialDaysRemaining <= 3
                ? 'bg-red-50 border-red-200'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className={`font-semibold ${
                    trialDaysRemaining <= 3 ? 'text-red-900' : 'text-blue-900'
                  }`}>
                    {t('trial.bannerTitle')}
                  </h3>
                  <p className={`text-sm ${
                    trialDaysRemaining <= 3 ? 'text-red-700' : 'text-blue-700'
                  }`}>
                    {trialDaysRemaining === 0
                      ? t('trial.hoursRemaining')
                      : trialDaysRemaining === 1
                        ? t('trial.dayRemaining')
                        : t('trial.daysRemaining', { days: trialDaysRemaining })
                    }
                  </p>
                </div>
                <Button
                  className={`${
                    trialDaysRemaining <= 3
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white h-9 px-4 rounded-lg shadow-sm whitespace-nowrap`}
                  onClick={() => router.push('/onboarding/add-users?upgrade=true')}
                >
                  {t('trial.upgradeCta')}
                </Button>
              </div>
            </div>
          )}

          {/* Current Subscription Card */}
          <Card className="border border-border">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-semibold">{t('currentSubscription')}</CardTitle>
                  </div>
                  <CardDescription>
                    {t('subscriptionDescription')}
                  </CardDescription>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="h-9"
                  onClick={handleManageSeatSubscription}
                >
                  {t('manageSeatSubscription')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-6 space-y-6">
              {subscriptionLoading ? (
                <div className="space-y-4">
                  <div className="h-8 bg-muted rounded animate-pulse"></div>
                  <div className="h-20 bg-muted rounded animate-pulse"></div>
                  <div className="h-16 bg-muted rounded animate-pulse"></div>
                </div>
              ) : subscriptionError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-red-800 font-medium">Failed to load subscription data</div>
                  <div className="text-red-600 text-sm mt-1">{subscriptionError}</div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Badge className={getSubscriptionStatus().color}>
                        {getSubscriptionStatus().badge}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {subscriptionData 
                        ? `${getSeatUsage().total} seats total` 
                        : '3 seats included'}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="w-[400px] space-y-2">
                      <Label className="text-sm font-medium text-foreground">
                        {t('seatUsage')}
                      </Label>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t('currentUsage')}</span>
                          <span className="font-medium">{t('seatsUsed', {used: getSeatUsage().used, total: getSeatUsage().total})}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${getSeatUsage().percentage}%` }}
                          ></div>
                        </div>
                        {getSeatUsage().pendingInvitations > 0 && (
                          <div className="text-xs text-muted-foreground pt-1">
                            {getSeatUsage().activeMembers} aktywnych + {getSeatUsage().pendingInvitations} oczekujących zaproszeń
                          </div>
                        )}
                        {getSeatUsage().remaining === 0 && (
                          <div className="text-amber-600 text-sm font-medium">
                            {t('allSeatsInUse')}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {subscriptionData ? (
                      <div className="space-y-4">
                        <div className="w-[400px] space-y-2">
                          <Label className="text-sm font-medium text-foreground">
                            {t('planDetails')}
                          </Label>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div>• {t('plan')}: {subscriptionData.variant?.name || 'Subscription Plan'}</div>
                            <div>• {t('price')}: {formatCurrency(subscriptionData.variant?.price || 0)} {t('perSeat')}</div>
                            {subscriptionData.current_period_end && (
                              <div>• {t('nextBilling')}: {formatDate(subscriptionData.current_period_end)}</div>
                            )}
                            <div className="text-xs text-muted-foreground pt-1">
                              {t('pricesInPLN')}
                            </div>
                          </div>
                        </div>

                        {subscriptionData.billing_info?.card_brand && (
                          <div className="w-[400px] space-y-2">
                            <Label className="text-sm font-medium text-foreground">
                              {t('paymentMethod')}
                            </Label>
                            <div className="text-sm text-muted-foreground">
                              {subscriptionData.billing_info.card_brand.charAt(0).toUpperCase() + subscriptionData.billing_info.card_brand.slice(1)} {t('endingIn')} {subscriptionData.billing_info.card_last_four}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-[400px] space-y-2">
                        <Label className="text-sm font-medium text-foreground">
                          {t('planDetails')}
                        </Label>
                        <div className="text-sm text-muted-foreground">
                          • {t('freeSeats')}<br />
                          • {t('basicFeatures')}<br />
                          • {t('emailSupport')}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    {!subscriptionData ? (
                      <>
                        <Button 
                          className=" text-primary-foreground h-9 px-4 rounded-lg shadow-sm"
                          onClick={() => {
                            // Redirect to upgrade flow - start with current team size + 1 buffer
                            const currentTeamSize = users.length || 1
                            const recommendedSeats = Math.max(currentTeamSize + 1, 4) // At least 4 total
                            router.push(`/onboarding/add-users?upgrade=true&current_org=${currentOrganization?.id}&seats=${recommendedSeats}`)
                          }}
                        >
                          {t('upgradeToPaid')}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          {t('upgradeDescription')}
                        </p>
                      </>
                    ) : subscriptionData.status === 'past_due' ? (
                      <>
                        <Button 
                          className="bg-red-600 hover:bg-red-700 text-white h-9 px-4 rounded-lg shadow-sm"
                          onClick={handleOpenCustomerPortal}
                          disabled={portalLoading}
                        >
                          {t('updatePaymentMethod')}
                        </Button>
                        <p className="text-xs text-red-600">
                          {t('paymentFailed')}
                        </p>
                      </>
                    ) : subscriptionData.status === 'on_trial' ? (
                      <>
                        <Button
                          className={`${
                            trialDaysRemaining !== null && trialDaysRemaining <= 3
                              ? 'bg-red-600 hover:bg-red-700'
                              : 'bg-blue-600 hover:bg-blue-700'
                          } text-white h-9 px-4 rounded-lg shadow-sm`}
                          onClick={() => router.push('/onboarding/add-users?upgrade=true')}
                        >
                          {t('trial.upgradeCta')}
                        </Button>
                        <p className={`text-xs ${
                          trialDaysRemaining !== null && trialDaysRemaining <= 3
                            ? 'text-red-600'
                            : 'text-blue-600'
                        }`}>
                          {trialDaysRemaining !== null && (
                            trialDaysRemaining === 0
                              ? t('trial.hoursRemaining')
                              : trialDaysRemaining === 1
                                ? t('trial.dayRemaining')
                                : t('trial.daysRemaining', { days: trialDaysRemaining })
                          )}
                        </p>
                      </>
                    ) : subscriptionData.status === 'paused' ? (
                      <>
                        <Button
                          className="bg-orange-600 hover:bg-orange-700 text-white h-9 px-4 rounded-lg shadow-sm"
                          onClick={handleOpenCustomerPortal}
                          disabled={portalLoading}
                        >
                          {t('paused.resumeCta')}
                        </Button>
                        <p className="text-xs text-orange-600">
                          {t('paused.message')}
                        </p>
                      </>
                    ) : subscriptionData.status === 'expired' ? (
                      <>
                        <Button
                          className="bg-red-600 hover:bg-red-700 text-white h-9 px-4 rounded-lg shadow-sm"
                          onClick={() => router.push('/onboarding/add-users')}
                        >
                          {t('reactivateSubscription')}
                        </Button>
                        <p className="text-xs text-red-600">
                          {t('trial.expiredMessage')}
                        </p>
                      </>
                    ) : subscriptionData.status === 'cancelled' ? (
                      <>
                        <Button
                          className=" text-primary-foreground h-9 px-4 rounded-lg shadow-sm"
                          onClick={() => router.push('/onboarding/add-users')}
                        >
                          {t('reactivateSubscription')}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          {t('subscriptionCancelled')}
                        </p>
                      </>
                    ) : null}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Billing Override Banner */}
          {currentOrganization?.billing_override_reason && (
            <Card className="border border-blue-200 bg-blue-50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-3 h-3 bg-card rounded-full"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="font-medium text-blue-900">
                      {t('specialBilling')}
                    </div>
                    <div className="text-blue-700 text-sm">
                      {currentOrganization.billing_override_reason}
                      {currentOrganization.billing_override_seats && (
                        <span className="ml-2">
                          {t('seatsIncluded', {seats: currentOrganization.billing_override_seats})}
                        </span>
                      )}
                      {currentOrganization.billing_override_expires_at && (
                        <div className="mt-1">
                          {t('validUntil', {date: formatDate(currentOrganization.billing_override_expires_at)})}
                        </div>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="mt-2 border-blue-300 text-blue-700 hover:bg-blue-100"
                      onClick={() => window.open('mailto:support@time8.io?subject=Billing Override Inquiry', '_blank')}
                    >
                      {t('contactSupport')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Subscription Widget */}
          {initialSubscription && (
            <SubscriptionWidget
              currentSeats={initialSubscription.current_seats}
              pendingSeats={initialSubscription.pending_seats}
              renewsAt={initialSubscription.renews_at}
              status={initialSubscription.status as 'active' | 'on_trial' | 'past_due' | 'cancelled'}
              className="mt-6"
            />
          )}

          {/* Pending Removals Section */}
          <PendingChangesSection
            users={pendingRemovalUsers}
            onCancelRemoval={handleCancelRemoval}
            className="mt-6"
          />

          {/* Archived Users Section */}
          <ArchivedUsersSection
            users={archivedUsers}
            onReactivate={handleReactivateUser}
            className="mt-6"
          />

        </FigmaTabsContent>

        <FigmaTabsContent value="workspace" className="mt-6 space-y-6">
          {/* Workspace Management Card */}
          <Card className="border border-border">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-semibold">Zarządzanie workspace</CardTitle>
                  </div>
                  <CardDescription>
                    Zarządzaj ustawieniami i danymi workspace
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-6 space-y-6">
              <div className="space-y-6">
                <div className="w-[400px] space-y-2">
                  <Label htmlFor="workspace-name">Nazwa workspace</Label>
                  <Input 
                    id="workspace-name"
                    value={currentOrganization?.name || ''} 
                    disabled 
                    className="opacity-50"
                  />
                  <p className="text-sm text-muted-foreground">
                    Obecna nazwa Twojego workspace
                  </p>
                </div>
                
                <div className="w-[400px] space-y-2">
                  <Label htmlFor="workspace-slug">Identyfikator workspace</Label>
                  <Input 
                    id="workspace-slug"
                    value={currentOrganization?.slug || ''} 
                    disabled 
                    className="opacity-50"
                  />
                  <p className="text-sm text-muted-foreground">
                    Unikalny identyfikator używany w URL
                  </p>
                </div>

                <div className="w-[400px] space-y-2">
                  <Label htmlFor="workspace-created">Data utworzenia</Label>
                  <Input 
                    id="workspace-created"
                    value={currentOrganization?.created_at ? new Date(currentOrganization.created_at).toLocaleDateString('pl-PL') : 'Nieznana'} 
                    disabled 
                    className="opacity-50"
                  />
                  <p className="text-sm text-muted-foreground">
                    Kiedy workspace został utworzony
                  </p>
                </div>

                <Separator />
                
                {/* Danger Zone */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-base font-semibold text-red-600">Strefa niebezpieczna</Label>
                    <p className="text-sm text-muted-foreground">
                      Nieodwracalne operacje dotyczące workspace. Użyj ostrożnie.
                    </p>
                  </div>
                  
                  <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold text-red-800">Usuń workspace</h4>
                        <p className="text-sm text-red-600 mt-1">
                          Trwale usuwa workspace wraz z wszystkimi danymi: użytkownikami, urlopami, żądaniami, zespołami i ustawieniami. 
                          <strong> Ta operacja jest nieodwracalna!</strong>
                        </p>
                      </div>
                      <Button
                        onClick={handleDeleteWorkspace}
                        disabled={workspaceDeleteLoading}
                        className="bg-red-600 text-red-50 hover:bg-red-700 h-9 px-4 rounded-lg"
                      >
                        {workspaceDeleteLoading ? 'Usuwanie...' : 'Usuń workspace'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </FigmaTabsContent>

        <FigmaTabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Powiadomienia</CardTitle>
              <CardDescription>
                Konfiguracja powiadomień email i w aplikacji
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Ta sekcja będzie wkrótce dostępna.</p>
            </CardContent>
          </Card>
        </FigmaTabsContent>

        <FigmaTabsContent value="work-modes" className="mt-6">
          <WorkModeSettings currentOrganization={currentOrganization} />
        </FigmaTabsContent>

        <FigmaTabsContent value="additional-rules" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Dodatkowe reguły</CardTitle>
              <CardDescription>
                Dodatkowe reguły biznesowe i konfiguracja zaawansowana
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Ta sekcja będzie wkrótce dostępna.</p>
            </CardContent>
          </Card>
                  </FigmaTabsContent>
      </FigmaTabs>

      {/* Edit Leave Type Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <div className="absolute right-4 top-4 z-10">
            <Button
              variant="ghost" 
              size="sm" 
              className="h-9 w-9 p-0 border border bg-card shadow-sm"
              onClick={() => setEditDialogOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-lg font-semibold text-foreground">
              Edytuj rodzaj urlopu
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Zaktualizuj informacje o rodzaju urlopu
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-sm font-medium text-foreground">
                Nazwa urlopu
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="h-9 border bg-card"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-days" className="text-sm font-medium text-foreground">
                Liczba dni w roku
              </Label>
              <Input
                id="edit-days"
                type="number"
                value={formData.days_per_year}
                onChange={(e) => setFormData(prev => ({ ...prev, days_per_year: parseInt(e.target.value) || 0 }))}
                className="h-9 border bg-card"
                required
                min="0"
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                Pamiętaj aby nie zmieniać podstawowych dni ustawowych.
              </p>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="edit-requires-balance"
                checked={formData.requires_balance}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_balance: !!checked }))}
                disabled={loading}
                className="mt-0.5 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="edit-requires-balance" className="text-sm font-medium text-foreground">
                  Wymagaj zarządzania saldem urlopowym
                </Label>
                <p className="text-sm text-muted-foreground">
                  Zaznacz jeśli ten typ urlopu wymaga śledzenia i zarządzaniem dni urlopowych
                </p>
              </div>
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={loading}
                className="h-9 px-4 border bg-card"
              >
                Anuluj
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="h-9 px-4 bg-foreground text-primary-foreground"
              >
                {loading ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Leave Type Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <DialogContent className="max-w-md">
          <div className="absolute right-4 top-4 z-10">
            <Button
              variant="ghost" 
              size="sm" 
              className="h-9 w-9 p-0 border border bg-card shadow-sm"
              onClick={() => setDeleteDialogOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-lg font-semibold text-foreground">
              Usuń rodzaj urlopu
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Czy na pewno chcesz usunąć rodzaj urlopu<br />
              "{selectedLeaveType?.name}"? Ta operacja jest nieodwracalna.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={loading}
              className="h-9 px-4 border bg-card"
            >
              Anuluj
            </Button>
            <Button
              type="button"
              onClick={handleSubmitDelete}
              disabled={loading}
              className="h-9 px-4 bg-red-600 text-red-50 hover:bg-red-700"
            >
              {loading ? 'Usuwanie...' : 'Usuń rodzaj urlopu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Workspace Confirmation Dialog */}
      <Dialog open={deleteWorkspaceDialogOpen} onOpenChange={setDeleteWorkspaceDialogOpen}>
        <DialogContent className="max-w-md">
          <div className="absolute right-4 top-4 z-10">
            <Button
              variant="ghost" 
              size="sm" 
              className="h-9 w-9 p-0 border border bg-card shadow-sm"
              onClick={() => setDeleteWorkspaceDialogOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-lg font-semibold text-red-950">
              Usuń workspace
            </DialogTitle>
            <div className="space-y-3">
              <DialogDescription className="text-sm text-red-500">
                Czy na pewno chcesz usunąć workspace <strong>"{currentOrganization?.name}"</strong>?
              </DialogDescription>
              
              <div className="text-sm text-red-500">
                <p>Ta operacja usunie <strong>WSZYSTKIE DANE</strong> z workspace:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Wszystkich użytkowników i ich uprawnienia</li>
                  <li>Wszystkie urlopy i wnioski urlopowe</li>
                  <li>Wszystkie zespoły i struktura organizacyjna</li>
                  <li>Wszystkie ustawienia i konfiguracje</li>
                </ul>
                <p className="mt-3">
                  <strong className="text-red-600">Ta operacja jest nieodwracalna!</strong>
                </p>
              </div>
            </div>
          </DialogHeader>

          <DialogFooter className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteWorkspaceDialogOpen(false)}
              disabled={workspaceDeleteLoading}
              className="h-9 px-4 border bg-card"
            >
              Anuluj
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDeleteWorkspace}
              disabled={workspaceDeleteLoading}
              className="h-9 px-4 bg-red-600 text-red-50 hover:bg-red-700"
            >
              {workspaceDeleteLoading ? 'Usuwanie workspace...' : 'Tak, usuń workspace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Sheets */}
        <EditOrganizationSheet
          open={isOrganizationSheetOpen}
          onOpenChange={setIsOrganizationSheetOpen}
          organization={currentOrganization}
          users={users}
          onSave={handleOrganizationSave}
        />

        <EditGoogleWorkspaceSheet
          open={isGoogleWorkspaceSheetOpen}
          onOpenChange={setIsGoogleWorkspaceSheetOpen}
          organization={currentOrganization}
          onSave={handleOrganizationSave}
        />

        <EditLeaveTypesSheet
          open={isLeaveTypesSheetOpen}
          onOpenChange={setIsLeaveTypesSheetOpen}
          leaveTypes={leaveTypes}
          onSave={handleLeaveTypesUpdate}
        />

        <EditLeavePoliciesSheet
          open={isLeavePoliciesSheetOpen}
          onOpenChange={setIsLeavePoliciesSheetOpen}
          policies={leavePolicies}
          onSave={handleLeavePoliciesUpdate}
        />

        <CreateLeaveTypeSheet
          open={isCreateLeaveTypeSheetOpen}
          onOpenChange={setIsCreateLeaveTypeSheetOpen}
          organizationId={currentOrganization?.id}
          onSuccess={(newLeaveType) => {
            // Add new leave type to local state
            setLeaveTypes(prevLeaveTypes => [...prevLeaveTypes, newLeaveType])
          }}
        />
    </div>
  )
} 