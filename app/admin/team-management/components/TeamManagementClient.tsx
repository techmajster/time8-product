'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { FigmaTabs, FigmaTabsList, FigmaTabsTrigger, FigmaTabsContent } from '@/app/admin/team-management/components/FigmaTabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, MoreHorizontal, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react'
import { toast } from 'sonner'
import { PendingInvitationsSection } from './PendingInvitationsSection'
import { PendingChangesSection } from '@/components/admin/PendingChangesSection'
import { ArchivedUsersSection } from './ArchivedUsersSection'
import { UserDetailSheet } from './UserDetailSheet'
import { EditEmployeeSheet } from './EditEmployeeSheet'
import { InviteUsersDialog, SeatInfo } from '@/components/invitations/invite-users-dialog'
import { useDeleteAccount, useCancelRemoval, useReactivateUser } from '@/hooks/use-team-mutations'
import { REFETCH_TEAM_MANAGEMENT } from '@/lib/refetch-events'
import { getInitials } from '@/lib/utils/initials'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface TeamMember {
  id: string
  email: string
  full_name: string | null
  role: string
  avatar_url: string | null
  birth_date: string | null
  team_id: string | null
  approver_id: string | null
  teams?: {
    id: string
    name: string
    color: string
  } | null
}

interface LeaveBalance {
  id: string
  user_id: string
  leave_type_id: string
  entitled_days: number
  remaining_days: number
  leave_types: {
    id: string
    name: string
    color: string
    requires_balance: boolean
  }
}

interface Invitation {
  id: string
  email: string
  full_name?: string | null
  birth_date?: string | null
  role: string
  status: string
  created_at: string
  expires_at: string
  invitation_code?: string
  invited_by: string
  team_id?: string | null
  inviter_name: string
  inviter_email: string
  team_name: string
}

interface ArchivedUser {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: string
}

interface PendingRemovalUser {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  removal_effective_date: string
  role: string
}

interface LeaveType {
  id: string
  name: string
  requires_balance: boolean
  days_per_year?: number
}

interface Approver {
  id: string
  full_name: string | null
  email: string
}

interface TeamManagementClientProps {
  organizationId: string
  organizationName: string
  teamMembers?: TeamMember[]
  teams?: any[]
  leaveBalances?: LeaveBalance[]
  invitations?: Invitation[]
  pendingRemovalUsers?: PendingRemovalUser[]
  archivedUsers?: ArchivedUser[]
  leaveTypes?: LeaveType[]
  approvers?: Approver[]
  activeUserCount?: number
}

export function TeamManagementClient({
  organizationId,
  organizationName,
  teamMembers: initialTeamMembers = [],
  teams: initialTeams = [],
  leaveBalances: initialLeaveBalances = [],
  invitations: initialInvitations = [],
  pendingRemovalUsers: initialPendingUsers = [],
  archivedUsers: initialArchivedUsers = [],
  leaveTypes: initialLeaveTypes = [],
  approvers: initialApprovers = [],
  activeUserCount: initialActiveUserCount = 0
}: TeamManagementClientProps) {
  const router = useRouter()

  // State for data
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers)
  const [teams, setTeams] = useState<any[]>(initialTeams)
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>(initialLeaveBalances)
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations)
  const [pendingRemovalUsers, setPendingRemovalUsers] = useState<PendingRemovalUser[]>(initialPendingUsers)
  const [archivedUsers, setArchivedUsers] = useState<ArchivedUser[]>(initialArchivedUsers)
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>(initialLeaveTypes)
  const [approvers, setApprovers] = useState<Approver[]>(initialApprovers)
  const [activeUserCount, setActiveUserCount] = useState<number>(initialActiveUserCount)

  // State for active tab (aktywni, zaproszeni, zarchiwizowani)
  const [activeTab, setActiveTab] = useState('aktywni')

  // State for active team filter
  const [activeTeamFilter, setActiveTeamFilter] = useState('Wszyscy')
  const [loading, setLoading] = useState(false)
  const [isRefetching, setIsRefetching] = useState(false)

  // Pagination state for Aktywni tab
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // State for user detail and edit sheets
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<TeamMember | null>(null)

  // State for invite users sheet
  const [isInviteSheetOpen, setIsInviteSheetOpen] = useState(false)
  const [seatInfo, setSeatInfo] = useState<SeatInfo | null>(null)
  const [isFetchingSeatInfo, setIsFetchingSeatInfo] = useState(false)

  // Filter invitations by team
  const filteredInvitations = activeTeamFilter === 'Wszyscy'
    ? invitations
    : invitations.filter(inv => inv.team_name === activeTeamFilter)


  // Hooks for mutations
  const deleteAccountMutation = useDeleteAccount()
  const cancelRemovalMutation = useCancelRemoval()
  const reactivateUserMutation = useReactivateUser()

  // Fetch data function
  const fetchData = async () => {
    setIsRefetching(true)
    try {
      const response = await fetch('/api/team-management')
      if (!response.ok) throw new Error('Failed to fetch team management data')

      const data = await response.json()
      setTeamMembers(data.teamMembers || [])
      setTeams(data.teams || [])
      setLeaveBalances(data.leaveBalances || [])
      setInvitations(data.invitations || [])
      setPendingRemovalUsers(data.pendingRemovalUsers || [])
      setActiveUserCount(data.activeUserCount || 0)
      setArchivedUsers(data.archivedUsers || [])
      setLeaveTypes(data.leaveTypes || [])
      setApprovers(data.approvers || [])
    } catch (error) {
      console.error('Error fetching team management data:', error)
      toast.error('Nie udało się załadować danych zespołu')
    } finally {
      setIsRefetching(false)
    }
  }

  // Fetch seat info function
  const fetchSeatInfo = async () => {
    if (isFetchingSeatInfo) return
    setIsFetchingSeatInfo(true)
    try {
      const response = await fetch(`/api/organizations/${organizationId}/seat-info`)
      if (response.ok) {
        const data = await response.json()
        setSeatInfo(data)
      } else {
        console.error('Failed to fetch seat info')
      }
    } catch (error) {
      console.error('Error fetching seat info:', error)
    } finally {
      setIsFetchingSeatInfo(false)
    }
  }

  // Listen for refetch events
  useEffect(() => {
    const handleRefetch = () => {
      fetchData()
    }

    window.addEventListener(REFETCH_TEAM_MANAGEMENT, handleRefetch)
    return () => window.removeEventListener(REFETCH_TEAM_MANAGEMENT, handleRefetch)
  }, [])

  // State for employee removal confirmation
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null)

  // Create team filter tabs - "Wszyscy" + actual teams
  const teamTabs = ['Wszyscy', ...teams.map(team => team.name)]

  // Filter team members based on active tab
  const filteredTeamMembers = activeTeamFilter === 'Wszyscy'
    ? teamMembers
    : teamMembers.filter(member => member.teams?.name === activeTeamFilter)

  // Pagination calculations for Aktywni tab (use filtered team members)
  const totalItems = filteredTeamMembers.length
  const totalPages = Math.ceil(totalItems / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedTeamMembers = filteredTeamMembers.slice(startIndex, endIndex)
  const displayStart = totalItems === 0 ? 0 : startIndex + 1
  const displayEnd = Math.min(endIndex, totalItems)

  // Reset to page 1 if current page exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [currentPage, totalPages])

  const getLeaveBalance = (userId: string, leaveTypeName: string): number => {
    const balance = leaveBalances.find(b => 
      b.user_id === userId && 
      b.leave_types?.name === leaveTypeName
    )
    
    // Debug logging
    if (userId && leaveTypeName === 'Urlop wypoczynkowy') {
      console.log(`🔍 Leave balance for ${userId}:`, {
        leaveTypeName,
        balance,
        allBalances: leaveBalances.filter(b => b.user_id === userId),
        remaining_days: balance?.remaining_days
      })
    }
    
    return balance?.remaining_days || 0
  }

  const getUserInitials = (member: TeamMember): string => {
    return getInitials(member.full_name, member.email.charAt(0).toUpperCase())
  }

  const getTeamDisplayName = (member: TeamMember): string => {
    return member.teams?.name || 'Brak grupy'
  }

  const getApproverName = (member: TeamMember): string => {
    // Get the approver from the approvers list
    if (member.approver_id) {
      const approver = approvers.find(a => a.id === member.approver_id)
      return approver?.full_name || 'Brak akceptującego'
    }
    return 'Brak akceptującego'
  }

  // Employee management functions
  const handleViewDetails = (member: TeamMember) => {
    setSelectedEmployee(member)
    setIsDetailSheetOpen(true)
  }

  const handleEditEmployee = (member: TeamMember) => {
    setSelectedEmployee(member)
    setIsEditSheetOpen(true)
  }

  const handleEditFromDetail = () => {
    // Transition from detail sheet to edit sheet
    // Don't clear selectedEmployee - keep it for the edit sheet
    setIsDetailSheetOpen(false)
    setIsEditSheetOpen(true)
  }

  const handleRemoveEmployee = (member: TeamMember) => {
    setMemberToRemove(member)
    setIsRemoveDialogOpen(true)
  }

  const handleArchiveFromDetail = () => {
    // Close detail sheet and open archive dialog
    if (selectedEmployee) {
      setIsDetailSheetOpen(false)
      setTimeout(() => {
        setMemberToRemove(selectedEmployee)
        setIsRemoveDialogOpen(true)
      }, 100)
    }
  }

  const confirmRemoveEmployee = async () => {
    if (!memberToRemove) return

    setLoading(true)
    try {
      await deleteAccountMutation.mutateAsync(memberToRemove.id)
      setIsRemoveDialogOpen(false)
      setMemberToRemove(null)
    } catch (error) {
      // Error is handled by the mutation
    } finally {
      setLoading(false)
    }
  }

  // Handle canceling pending removal
  const handleCancelRemoval = async (userId: string) => {
    try {
      await cancelRemovalMutation.mutateAsync(userId)
    } catch (error: any) {
      console.error('Error canceling removal:', error)
      throw error // Let the component handle the error
    }
  }

  // Handle reactivating an archived user
  const handleReactivateUser = async (userId: string) => {
    try {
      await reactivateUserMutation.mutateAsync(userId)
    } catch (error: any) {
      console.error('Error reactivating user:', error)
      throw error // Let the component handle the error
    }
  }

  return (
    <div className="py-11 space-y-6">
      {/* Header - Inline with action buttons */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-foreground">Użytkownicy</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Export</Button>
          <Button
            size="sm"
            onClick={() => {
              fetchSeatInfo()
              setIsInviteSheetOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Zaproś nowych użytkowników
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <FigmaTabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
        <div className="relative -mx-12 px-12">
          <FigmaTabsList className="border-b-0">
            <FigmaTabsTrigger value="aktywni">
              Aktywni
              {seatInfo && seatInfo.maxSeats > 0 && (
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  ({activeUserCount}/{seatInfo.maxSeats})
                </span>
              )}
            </FigmaTabsTrigger>
            <FigmaTabsTrigger value="zaproszeni">
              Zaproszeni
              {invitations && invitations.length > 0 && (
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  ({invitations.length})
                </span>
              )}
            </FigmaTabsTrigger>
            <FigmaTabsTrigger value="zarchiwizowani">
              Zarchiwizowani
              {archivedUsers && archivedUsers.length > 0 && (
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  ({archivedUsers.length})
                </span>
              )}
            </FigmaTabsTrigger>
          </FigmaTabsList>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
        </div>

        {/* Aktywni Tab */}
        <FigmaTabsContent value="aktywni" className="mt-0">

          {teams.length > 0 && (
            <div className="mb-6 mt-6">
              {/* Custom Figma-style tabs for team filtering */}
              <div className="bg-muted relative rounded-lg p-[3px] flex w-fit">
                {teamTabs.map((teamName: string) => (
                  <button
                    key={teamName}
                    onClick={() => {
                      setActiveTeamFilter(teamName)
                      setCurrentPage(1) // Reset to first page when changing filter
                    }}
                    className={`
                      flex items-center justify-center px-2.5 py-2 rounded-lg text-sm font-normal leading-5 transition-all
                      ${activeTeamFilter === teamName
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-background/50'
                      }
                    `}
                  >
                    {teamName}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium text-muted-foreground w-full min-w-0">Imię i nazwisko</TableHead>
                    <TableHead className="font-medium text-muted-foreground min-w-64">Grupa</TableHead>
                    <TableHead className="font-medium text-muted-foreground min-w-64">Akceptujący</TableHead>
                    <TableHead className="font-medium text-muted-foreground text-center min-w-32">Status</TableHead>
                    <TableHead className="font-medium text-muted-foreground text-right min-w-24">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTeamMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-16 text-center">
                        <div className="text-muted-foreground">
                          {activeTeamFilter === 'Wszyscy'
                            ? 'Brak pracowników w organizacji'
                            : `Brak pracowników w zespole ${activeTeamFilter}`
                          }
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTeamMembers.map((member) => {
                      return (
                        <TableRow
                          key={member.id}
                          className="h-[72px] cursor-pointer hover:bg-accent/50"
                          onClick={() => handleViewDetails(member)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="size-10">
                                <AvatarImage src={member.avatar_url || undefined} />
                                <AvatarFallback className="text-sm font-medium">
                                  {getUserInitials(member)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-foreground">
                                  {member.full_name || 'Bez nazwiska'}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {member.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-foreground">
                              {getTeamDisplayName(member)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-foreground">
                              {getApproverName(member)}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="default"
                              className="bg-green-600 text-white border-transparent"
                            >
                              Aktywny
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  disabled={loading}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={() => handleEditEmployee(member)}
                                  disabled={loading}
                                  className="cursor-pointer"
                                >
                                  Edytuj
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleRemoveEmployee(member)}
                                  disabled={loading}
                                  className="cursor-pointer text-destructive focus:text-destructive"
                                >
                                  Dezaktywować użytkownika
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between py-4">
              {/* Left: X z Y wierszy */}
              <div className="text-sm text-muted-foreground">
                {displayStart} z {totalItems} wierszy
              </div>

              {/* Right: Wierszy na stronie dropdown + Page navigation */}
              <div className="flex items-center gap-6">
                {/* Wierszy na stronie dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Wierszy na stronie:</span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      setPageSize(Number(value))
                      setCurrentPage(1) // Reset to first page when changing page size
                    }}
                  >
                    <SelectTrigger className="w-[70px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Page navigation */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Strona {currentPage} z {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FigmaTabsContent>

        {/* Zaproszeni Tab */}
        <FigmaTabsContent value="zaproszeni" className="mt-0">
          <div className="mt-6">
            <PendingInvitationsSection invitations={invitations} teams={teams} />
          </div>
        </FigmaTabsContent>

        {/* Zarchiwizowani Tab */}
        <FigmaTabsContent value="zarchiwizowani" className="mt-0">
          {/* Pending Changes Section */}
          <PendingChangesSection
            users={pendingRemovalUsers}
            onCancelRemoval={handleCancelRemoval}
            className="mb-6 mt-6"
          />

          <ArchivedUsersSection
            users={archivedUsers}
            teams={teams}
            onReactivate={handleReactivateUser}
          />
        </FigmaTabsContent>
      </FigmaTabs>

      {/* Archive Employee Confirmation Dialog */}
      <Dialog open={isRemoveDialogOpen} onOpenChange={(open) => {
        setIsRemoveDialogOpen(open)
        if (!open) {
          setMemberToRemove(null)
        }
      }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Czy na pewno chcesz dezaktywować użytkownika?</DialogTitle>
            <DialogDescription>
              Użytkownik utraci dostęp do systemu oraz nie będzie uwzględniany w planowaniu grafiku.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setIsRemoveDialogOpen(false)}
              disabled={loading}
            >
              Zamknij
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRemoveEmployee}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tak, archiwizuj użytkownika
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Detail Sheet */}
      <UserDetailSheet
        isOpen={isDetailSheetOpen}
        onClose={() => {
          setIsDetailSheetOpen(false)
          setSelectedEmployee(null)
        }}
        employee={selectedEmployee}
        leaveBalances={leaveBalances}
        approvers={approvers}
        onEdit={handleEditFromDetail}
        onArchive={handleArchiveFromDetail}
      />

      {/* Edit Employee Sheet */}
      <EditEmployeeSheet
        isOpen={isEditSheetOpen}
        onClose={() => {
          setIsEditSheetOpen(false)
          setSelectedEmployee(null)
        }}
        employee={selectedEmployee}
        teams={teams}
        leaveTypes={leaveTypes}
        approvers={approvers}
        leaveBalances={leaveBalances}
        onSuccess={() => {
          fetchData()
        }}
      />

      {/* Invite Users Sheet */}
      <InviteUsersDialog
        open={isInviteSheetOpen}
        onOpenChange={setIsInviteSheetOpen}
        organizationId={organizationId}
        organizationName={organizationName}
        seatInfo={seatInfo}
        activeMembers={filteredTeamMembers}
        onInviteSent={() => {
          fetchData() // Refresh user list
          fetchSeatInfo() // Refresh seat info
        }}
      />

    </div>
  )
} 