'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { FigmaTabs, FigmaTabsList, FigmaTabsTrigger, FigmaTabsContent } from '@/app/admin/team-management/components/FigmaTabs'
import { Loader2, Plus, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { PendingInvitationsSection } from './PendingInvitationsSection'
import { PendingChangesSection } from '@/components/admin/PendingChangesSection'
import { ArchivedUsersSection } from '@/components/admin/ArchivedUsersSection'
import { useDeleteAccount, useCancelRemoval, useReactivateUser } from '@/hooks/use-team-mutations'
import { REFETCH_TEAM_MANAGEMENT } from '@/lib/refetch-events'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface TeamMember {
  id: string
  email: string
  full_name: string | null
  role: string
  avatar_url: string | null
  team_id: string | null
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

interface TeamManagementClientProps {
  teamMembers?: TeamMember[]
  teams?: any[]
  leaveBalances?: LeaveBalance[]
  invitations?: Invitation[]
  pendingRemovalUsers?: PendingRemovalUser[]
  archivedUsers?: ArchivedUser[]
}

export function TeamManagementClient({
  teamMembers: initialTeamMembers = [],
  teams: initialTeams = [],
  leaveBalances: initialLeaveBalances = [],
  invitations: initialInvitations = [],
  pendingRemovalUsers: initialPendingUsers = [],
  archivedUsers: initialArchivedUsers = []
}: TeamManagementClientProps) {
  const router = useRouter()

  // State for data
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers)
  const [teams, setTeams] = useState<any[]>(initialTeams)
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>(initialLeaveBalances)
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations)
  const [pendingRemovalUsers, setPendingRemovalUsers] = useState<PendingRemovalUser[]>(initialPendingUsers)
  const [archivedUsers, setArchivedUsers] = useState<ArchivedUser[]>(initialArchivedUsers)

  // State for active tab (aktywni, zaproszeni, zarchiwizowani)
  const [activeTab, setActiveTab] = useState('aktywni')

  // State for active team filter
  const [activeTeamFilter, setActiveTeamFilter] = useState('Wszyscy')
  const [loading, setLoading] = useState(false)
  const [isRefetching, setIsRefetching] = useState(false)

  // Filter invitations by team
  const filteredInvitations = activeTeamFilter === 'Wszyscy'
    ? invitations
    : invitations.filter(inv => inv.team_name === activeTeamFilter)

  // Filter archived users by team
  const filteredArchivedUsers = activeTeamFilter === 'Wszyscy'
    ? archivedUsers
    : archivedUsers.filter(user => {
        // Find the user's team from the teams data
        const member = teamMembers.find(m => m.id === user.id)
        return member?.teams?.name === activeTeamFilter
      })

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
      setArchivedUsers(data.archivedUsers || [])
    } catch (error) {
      console.error('Error fetching team management data:', error)
      toast.error('Nie udało się załadować danych zespołu')
    } finally {
      setIsRefetching(false)
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
    if (member.full_name) {
      return member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    }
    return member.email.charAt(0).toUpperCase()
  }

  const getTeamDisplayName = (member: TeamMember): string => {
    return member.teams?.name || 'Brak grupy'
  }

  const getManagerName = (member: TeamMember): string => {
    // Get the manager from the team data
    if (member.teams && member.team_id) {
      const team = teams.find(t => t.id === member.team_id)
      return team?.manager?.full_name || 'Brak menedżera'
    }
    return 'Brak grupy'
  }

  // Employee management functions
  const handleEditEmployee = (member: TeamMember) => {
    // Navigate to edit employee page using Next.js router
    router.push(`/admin/team-management/edit-employee/${member.id}`)
  }

  const handleRemoveEmployee = (member: TeamMember) => {
    setMemberToRemove(member)
    setIsRemoveDialogOpen(true)
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Zarządzanie zespołami</h1>
      </div>

      {/* Tab Navigation */}
      <FigmaTabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
        <div className="relative -mx-12 px-12">
          <FigmaTabsList className="border-b-0">
            <FigmaTabsTrigger value="aktywni">Aktywni</FigmaTabsTrigger>
            <FigmaTabsTrigger value="zaproszeni">Zaproszeni</FigmaTabsTrigger>
            <FigmaTabsTrigger value="zarchiwizowani">Zarchiwizowani</FigmaTabsTrigger>
          </FigmaTabsList>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
        </div>

        {/* Aktywni Tab */}
        <FigmaTabsContent value="aktywni" className="mt-6">

          <div className="mb-4 mt-8 min-h-[60px] flex items-center">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-medium">Lista pracowników</h2>
                
                {/* Custom Figma-style tabs for team filtering */}
                <div className="bg-muted relative rounded-lg p-[3px] flex">
                  {teamTabs.map((teamName: string) => (
                    <button
                      key={teamName}
                      onClick={() => setActiveTeamFilter(teamName)}
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
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Export</Button>
                <Button variant="outline" size="sm">Import</Button>
                <Link href="/admin/team-management/add-employee">
                  <Button
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Zaproś nowych użytkowników
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <Card>
            <CardContent className="py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium text-muted-foreground w-full min-w-0">Pracownik</TableHead>
                    <TableHead className="font-medium text-muted-foreground min-w-64">Grupa</TableHead>
                    <TableHead className="font-medium text-muted-foreground min-w-64">Manager</TableHead>
                    <TableHead className="font-medium text-muted-foreground text-right min-w-40">Pozostały urlop</TableHead>
                    <TableHead className="font-medium text-muted-foreground text-right min-w-40">Urlop NŻ</TableHead>
                    <TableHead className="font-medium text-muted-foreground text-right min-w-24">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeamMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-16 text-center">
                        <div className="text-muted-foreground">
                          {activeTeamFilter === 'Wszyscy' 
                            ? 'Brak pracowników w organizacji' 
                            : `Brak pracowników w zespole ${activeTeamFilter}`
                          }
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTeamMembers.map((member) => {
                      const vacationDays = getLeaveBalance(member.id, 'Urlop wypoczynkowy')
                      const parentalDays = getLeaveBalance(member.id, 'Urlop NŻ') || getLeaveBalance(member.id, 'Urlop na żądanie')
                      
                      return (
                        <TableRow key={member.id} className="h-[72px]">
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
                              {getManagerName(member)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="text-foreground">
                              {vacationDays > 0 ? `${vacationDays} dni` : 'Brak danych'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="text-foreground">
                              {parentalDays > 0 ? `${parentalDays} dni` : 'Brak danych'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
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
                                  Edytuj pracownika
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleRemoveEmployee(member)}
                                  disabled={loading}
                                  className="cursor-pointer text-destructive focus:text-destructive"
                                >
                                  Usuń pracownika
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
            </CardContent>
          </Card>
        </FigmaTabsContent>

        {/* Zaproszeni Tab */}
        <FigmaTabsContent value="zaproszeni" className="mt-6">
          {/* Group Filter for Invitations */}
          <div className="mb-6">
            <div className="bg-muted relative rounded-lg p-[3px] flex">
              {teamTabs.map((teamName: string) => (
                <button
                  key={teamName}
                  onClick={() => setActiveTeamFilter(teamName)}
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

          <PendingInvitationsSection invitations={filteredInvitations} />
        </FigmaTabsContent>

        {/* Zarchiwizowani Tab */}
        <FigmaTabsContent value="zarchiwizowani" className="mt-6">
          {/* Pending Changes Section */}
          <PendingChangesSection
            users={pendingRemovalUsers}
            onCancelRemoval={handleCancelRemoval}
            className="mb-6"
          />

          {/* Group Filter for Archived Users */}
          <div className="mb-6">
            <div className="bg-muted relative rounded-lg p-[3px] flex">
              {teamTabs.map((teamName: string) => (
                <button
                  key={teamName}
                  onClick={() => setActiveTeamFilter(teamName)}
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

          <ArchivedUsersSection
            users={filteredArchivedUsers}
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

    </div>
  )
} 