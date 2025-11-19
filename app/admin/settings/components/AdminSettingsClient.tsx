'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { FigmaTabs, FigmaTabsList, FigmaTabsTrigger, FigmaTabsContent } from '@/app/admin/team-management/components/FigmaTabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { EditOrganizationSheet } from './EditOrganizationSheet'
import { EditLeaveTypesSheet } from './EditLeaveTypesSheet'
import { EditLeavePoliciesSheet } from './EditLeavePoliciesSheet'
import { CreateLeaveTypeSheet } from './CreateLeaveTypeSheet'
import { EditLeaveTypeSheet } from './EditLeaveTypeSheet'
import { WorkModeSettings } from './WorkModeSettings'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Plus, MoreVertical, X, LockKeyhole } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { PolandFlag } from '@/components/icons/PolandFlag'
import { UKFlag } from '@/components/icons/UKFlag'
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

interface Subscription {
  current_seats: number // Actual user count from organization_members
  seat_limit: number // Maximum allowed seats from subscription
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

interface AdminUser {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: string
  isOwner?: boolean
}

interface AdminSettingsClientProps {
  currentOrganization: any
  users: AdminUser[]
  leaveTypes: LeaveType[]
  teams: Team[]
  subscription: Subscription | null
  pendingRemovalUsers: PendingRemovalUser[]
  archivedUsers: ArchivedUser[]
  canManageOwnership: boolean
}

export default function AdminSettingsClient({
  currentOrganization: initialOrganization,
  users,
  leaveTypes: initialLeaveTypes,
  teams,
  subscription: initialSubscription,
  pendingRemovalUsers: initialPendingUsers,
  archivedUsers: initialArchivedUsers,
  canManageOwnership
}: AdminSettingsClientProps) {
  const t = useTranslations('billing')
  const tAdmin = useTranslations('adminSettings')
  const [currentOrganization, setCurrentOrganization] = useState(initialOrganization)
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>(initialLeaveTypes)
  const [pendingRemovalUsers, setPendingRemovalUsers] = useState<PendingRemovalUser[]>(initialPendingUsers)
  const [archivedUsers, setArchivedUsers] = useState<ArchivedUser[]>(initialArchivedUsers)
  const router = useRouter()

  // Sort leave types to always show mandatory ones first
  const sortedLeaveTypes = useMemo(() => {
    return [...leaveTypes].sort((a, b) => {
      // Mandatory leave types come first
      if (a.is_mandatory && !b.is_mandatory) return -1
      if (!a.is_mandatory && b.is_mandatory) return 1
      // Keep original order for same type
      return 0
    })
  }, [leaveTypes])

  // Tab state management - Only 4 tabs: Ogólne, Tryb pracy, Urlopy, Rozliczenia
  const [activeTab, setActiveTab] = useState('general')
  
  // Sheet states
  const [isOrganizationSheetOpen, setIsOrganizationSheetOpen] = useState(false)
  const [isLeaveTypesSheetOpen, setIsLeaveTypesSheetOpen] = useState(false)
  const [isLeavePoliciesSheetOpen, setIsLeavePoliciesSheetOpen] = useState(false)
  const [isCreateLeaveTypeSheetOpen, setIsCreateLeaveTypeSheetOpen] = useState(false)

  // Dialog states for leave types management
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(null)
  const [loading, setLoading] = useState(false)
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
    // Refresh the page to get updated user roles after admin change
    router.refresh()
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

  // Handlers for leave types edit and delete
  const handleEditLeaveType = (leaveType: LeaveType) => {
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

  // Handle subscription management - redirect to unified subscription management page
  const handleManageSubscription = async () => {
    // SECURITY FIX: Always fetch current active organization from server
    // to prevent stale state from causing checkout with wrong org
    try {
      const response = await fetch('/api/user/current-organization')

      if (!response.ok) {
        toast.error('Failed to determine current organization')
        return
      }

      const data = await response.json()

      if (!data.organizationId) {
        toast.error('No active organization found')
        return
      }

      // Redirect to unified subscription management page with fresh org ID
      const currentSeats = getSeatUsage().total
      window.location.href = `/onboarding/update-subscription?current_org=${data.organizationId}&seats=${currentSeats}`
    } catch (error) {
      console.error('Error getting current organization:', error)
      toast.error('Failed to start subscription update')
    }
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
      const FREE_TIER_LIMIT = 3  // Maximum users for free tier
      return {
        used: currentEmployees,
        total: FREE_TIER_LIMIT,  // Free tier allows up to 3 users
        remaining: Math.max(0, FREE_TIER_LIMIT - currentEmployees),
        percentage: Math.min(100, (currentEmployees / FREE_TIER_LIMIT) * 100),
        freeTierSeats: FREE_TIER_LIMIT,  // Tier threshold
        paidSeats: 0,
        pendingInvitations: 0,
        activeMembers: currentEmployees,
        isFreeTier: true  // Flag to help with conditional rendering
      }
    }

    const {
      total_seats,
      current_employees,
      seats_remaining,
      free_tier_seats = 3,  // New field from API
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
      freeTierSeats: free_tier_seats,  // Tier threshold (always 3)
      paidSeats: paid_seats,
      pendingInvitations: pending_invitations,
      activeMembers: current_employees,
      isFreeTier: false
    }
  }

  return (
    <div className="py-11 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Ustawienia administracyjne</h1>
      </div>

      {/* Tabs - 4 tabs only: Ogólne, Tryb pracy, Urlopy, Rozliczenia */}
      <FigmaTabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="relative -mx-12 px-12">
          <FigmaTabsList className="border-b-0">
            <FigmaTabsTrigger value="general">{tAdmin('tabs.general')}</FigmaTabsTrigger>
            <FigmaTabsTrigger value="work-modes">{tAdmin('tabs.workMode')}</FigmaTabsTrigger>
            <FigmaTabsTrigger value="leave-types">{tAdmin('tabs.leave')}</FigmaTabsTrigger>
            <FigmaTabsTrigger value="billing">{tAdmin('tabs.billing')}</FigmaTabsTrigger>
          </FigmaTabsList>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
        </div>

        {/* Tab Content */}
        <FigmaTabsContent value="general" className="mt-6 space-y-6">
          {/* Organization Settings Card */}
          <Card className="border-0 p-0">
            <CardHeader className="pb-0 p-0">
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-semibold">Ustawienia workspace</CardTitle>
                  </div>
                  <CardDescription>
                    Podstawowe informacje o przestrzeni roboczej
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" className="h-9" onClick={() => setIsOrganizationSheetOpen(true)}>
                  Edytuj dane
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-0 p-0 space-y-6">
              <div className="space-y-6">
                <div className="w-[400px] space-y-2">
                  <Label htmlFor="org-name">Nazwa workspace</Label>
                  <Input
                    id="org-name"
                    value={currentOrganization?.name || 'BB8'}
                    disabled
                    className="opacity-50"
                  />
                </div>

                <div className="w-[400px] space-y-2">
                  <Label>Właściciel workspace</Label>
                  <div className="flex items-center gap-4 w-full">
                    {(() => {
                      const ownerUser = users.find(u => u.isOwner)
                      const fallbackAdmin = users.find(u => u.role === 'admin')
                      const displayUser = ownerUser || fallbackAdmin
                      return displayUser ? (
                        <>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={displayUser.avatar_url || undefined} />
                            <AvatarFallback className="">
                              {getUserInitials(displayUser.full_name || '', displayUser.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{displayUser.full_name || displayUser.email}</p>
                            <p className="text-sm text-muted-foreground">{displayUser.email}</p>
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Brak właściciela</span>
                      )
                    })()}
                  </div>
                </div>

                <div className="w-[400px] space-y-2">
                  <Label htmlFor="holiday-calendar">{tAdmin('general.holidayCalendar')}</Label>
                  <Select value={currentOrganization?.country_code || 'PL'} disabled>
                    <SelectTrigger className="w-[400px]">
                      <div className="flex items-center gap-2">
                        {(currentOrganization?.country_code === 'PL' || !currentOrganization?.country_code) && (
                          <PolandFlag size={16} />
                        )}
                        {currentOrganization?.country_code === 'IE' && (
                          <UKFlag size={16} />
                        )}
                        {currentOrganization?.country_code === 'US' && (
                          <UKFlag size={16} />
                        )}
                        <span className="font-medium text-sm">
                          {currentOrganization?.country_code === 'PL' || !currentOrganization?.country_code ? 'Polska' :
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
                    <SelectTrigger className="w-[400px]">
                      <div className="flex items-center gap-2">
                        {(currentOrganization?.locale === 'pl' || !currentOrganization?.locale) && (
                          <PolandFlag size={16} />
                        )}
                        {currentOrganization?.locale === 'en' && (
                          <UKFlag size={16} />
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
                          <PolandFlag size={16} />
                          <span>Polski</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="en">
                        <div className="flex items-center gap-2">
                          <UKFlag size={16} />
                          <span>English</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {tAdmin('general.languageHelper')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </FigmaTabsContent>

        <FigmaTabsContent value="leave-types" className="mt-6 space-y-6">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <h2 className="text-xl font-semibold text-foreground">Rodzaje urlopów</h2>
              <p className="text-sm text-muted-foreground">
                Zarządzaj dostępnymi rodzajami urlopów w organizacji
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleCreateDefaults}
                disabled={loading}
                className="h-9"
              >
                {loading ? tAdmin('leave.creating') : tAdmin('leave.createDefault')}
              </Button>
              <Button
                onClick={() => setIsCreateLeaveTypeSheetOpen(true)}
                className="bg-primary text-primary-foreground h-9 shadow-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                {tAdmin('leave.addLeaveType')}
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="mt-6">
                    <table className="w-full">
                      {/* Table Header */}
                      <thead>
                        <tr className="border-b h-[40px]">
                          <th className="text-left px-2 text-sm font-medium text-muted-foreground">
                            Rodzaj urlopu
                          </th>
                          <th className="text-left px-2 text-sm font-medium text-muted-foreground">
                            Dni rocznie
                          </th>
                          <th className="px-2"></th>
                          <th className="px-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedLeaveTypes.map((leaveType, index) => (
                          <tr key={leaveType.id} className={`border-b h-[52px] ${index === sortedLeaveTypes.length - 1 ? '' : ''}`}>
                            <td className="px-2">
                              <div className="flex items-center gap-2">
                                {leaveType.is_mandatory && (
                                  <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="text-sm font-medium text-foreground">
                                  {leaveType.name}
                                </span>
                                {leaveType.is_mandatory && (
                                  <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-md">
                                    Obowiązkowy
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-2">
                              <span className="text-sm font-medium text-foreground">
                                {leaveType.days_per_year === 0
                                  ? "Nielimitowany"
                                  : `${leaveType.days_per_year} dni rocznie`}
                              </span>
                            </td>
                            <td className="px-2">
                              {leaveType.requires_balance && (
                                <Badge className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-md">
                                  Saldo
                                </Badge>
                              )}
                            </td>
                            <td className="px-2 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-9 w-9 p-0">
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
                                      <LockKeyhole className="h-3 w-3 mr-2" />
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
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-9"
                    onClick={handleManageSubscription}
                  >
                    {t('manageSubscription')}
                  </Button>
                </div>
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
                            // CRITICAL BUG FIX: Redirect to update-subscription, not add-users
                            // add-users is for creating NEW workspaces, update-subscription is for upgrading existing
                            const currentTeamSize = users.length || 1
                            const recommendedSeats = Math.max(currentTeamSize + 1, 4) // At least 4 total
                            router.push(`/onboarding/update-subscription?current_org=${currentOrganization?.id}&seats=${recommendedSeats}`)
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
              seatLimit={initialSubscription.seat_limit}
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
          <div className="mt-6">
            <ArchivedUsersSection
              users={archivedUsers}
              teams={teams}
              onReactivate={handleReactivateUser}
            />
          </div>

        </FigmaTabsContent>

        <FigmaTabsContent value="work-modes" className="mt-6">
          <WorkModeSettings currentOrganization={currentOrganization} />
        </FigmaTabsContent>
      </FigmaTabs>

      {/* Edit Leave Type Dialog */}
      <EditLeaveTypeSheet
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        leaveType={selectedLeaveType}
        onSuccess={(updatedLeaveType) => {
          // Update local state
          setLeaveTypes(prevLeaveTypes =>
            prevLeaveTypes.map(lt =>
              lt.id === updatedLeaveType.id ? updatedLeaveType : lt
            )
          )
        }}
      />

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

      {/* Edit Sheets */}
        <EditOrganizationSheet
          open={isOrganizationSheetOpen}
          onOpenChange={setIsOrganizationSheetOpen}
          organization={currentOrganization}
          users={users}
          currentOwnerId={users.find(u => u.isOwner)?.id || null}
          canManageOwnership={canManageOwnership}
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