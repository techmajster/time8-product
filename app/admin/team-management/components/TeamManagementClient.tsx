'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FigmaTabs, FigmaTabsContent, FigmaTabsList, FigmaTabsTrigger } from './FigmaTabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Plus, Edit, Trash2, Users, UserPlus, UserMinus, ChevronDownIcon, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { ManageTeamMembersSheet } from './ManageTeamMembersSheet'
import { PendingInvitationsSection } from './PendingInvitationsSection'
import { CreateTeamSheet } from './CreateTeamSheet'

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

interface Team {
  id: string
  name: string
  description?: string | null
  manager?: any
  members?: any[]
  member_count?: number
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

interface TeamManagementClientProps {
  teamMembers: TeamMember[]
  teams: Team[]
  leaveBalances: LeaveBalance[]
  invitations: Invitation[]
}

export function TeamManagementClient({ teamMembers, teams, leaveBalances, invitations }: TeamManagementClientProps) {
  const router = useRouter()
  
  // Debug: Log the received data
  console.log('📊 TeamManagementClient received data:', {
    teamMembersCount: teamMembers.length,
    teamsCount: teams.length,
    leaveBalancesCount: leaveBalances.length,
    leaveBalancesSample: leaveBalances.slice(0, 3),
    memberIds: teamMembers.map(m => m.id)
  })
  
  // State for active team filter
  const [activeTeamFilter, setActiveTeamFilter] = useState('Wszyscy')
  
  // State for team editing
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isMembersSheetOpen, setIsMembersSheetOpen] = useState(false)
  const [isTeamDetailsOpen, setIsTeamDetailsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // State for employee removal confirmation
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null)
  
  // State for team deletion confirmation
  const [isDeleteTeamDialogOpen, setIsDeleteTeamDialogOpen] = useState(false)
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    manager_id: ''
  })

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

  // Team editing functions
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      manager_id: ''
    })
  }

  const handleTeamRowClick = (team: Team) => {
    setSelectedTeam(team)
    setIsTeamDetailsOpen(true)
  }

  const handleCreateTeam = async () => {
    if (!formData.name.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          manager_id: formData.manager_id === 'none' ? null : formData.manager_id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create group')
      }

      toast.success(data.message || 'Grupa została utworzona pomyślnie')
      setIsCreateDialogOpen(false)
      resetForm()
      
      // TODO: Implement proper state refresh instead of page reload
      window.location.reload()

    } catch (error) {
      console.error('Error creating team:', error)
      toast.error(error instanceof Error ? error.message : 'Błąd podczas tworzenia grupy')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateTeam = async () => {
    if (!selectedTeam || !formData.name.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/teams/${selectedTeam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          manager_id: formData.manager_id === 'none' ? null : formData.manager_id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update group')
      }

      toast.success(data.message || 'Grupa została zaktualizowana pomyślnie')
      setIsEditDialogOpen(false)
      setSelectedTeam(null)
      resetForm()
      
      // TODO: Implement proper state refresh instead of page reload
      window.location.reload()

    } catch (error) {
      console.error('Error updating team:', error)
      toast.error(error instanceof Error ? error.message : 'Błąd podczas aktualizacji grupy')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTeam = (team: Team) => {
    if (team.member_count && team.member_count > 0) {
      toast.error('Nie można usunąć grupy z członkami. Najpierw usuń wszystkich członków.')
      return
    }

    setTeamToDelete(team)
    setIsDeleteTeamDialogOpen(true)
  }

  const confirmDeleteTeam = async () => {
    if (!teamToDelete) return

    setLoading(true)
    try {
      const response = await fetch(`/api/teams/${teamToDelete.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete group')
      }

      toast.success(data.message || 'Grupa została usunięta pomyślnie')
      setIsDeleteTeamDialogOpen(false)
      setTeamToDelete(null)
      
      // TODO: Implement proper state refresh instead of page reload
      window.location.reload()

    } catch (error) {
      console.error('Error deleting team:', error)
      toast.error(error instanceof Error ? error.message : 'Błąd podczas usuwania grupy')
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = (team: Team) => {
    setSelectedTeam(team)
    setFormData({
      name: team.name,
      description: team.description || '',
      manager_id: team.manager?.id || 'none'
    })
    setIsEditDialogOpen(true)
  }

  // Team member management functions
  const openMembersSheet = (team: Team) => {
    setSelectedTeam(team)
    setIsTeamDetailsOpen(false) // Close details sheet if open
    setIsMembersSheetOpen(true)
  }

  const handleTeamUpdated = () => {
    // TODO: Implement proper state refresh instead of page reload
    window.location.reload()
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
      const response = await fetch(`/api/employees/${memberToRemove.id}`, {
        method: 'DELETE'
      })

      let data: any = {}
      
      // Check if response has content before parsing JSON
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text()
        if (text) {
          try {
            data = JSON.parse(text)
          } catch (e) {
            console.error('Failed to parse JSON response:', e)
          }
        }
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to remove employee')
      }

      toast.success(data.message || 'Pracownik został usunięty z organizacji')
      setIsRemoveDialogOpen(false)
      setMemberToRemove(null)
      
      // TODO: Implement proper state refresh instead of page reload
      window.location.reload()

    } catch (error) {
      console.error('Error removing employee:', error)
      toast.error(error instanceof Error ? error.message : 'Wystąpił błąd podczas usuwania pracownika')
    } finally {
      setLoading(false)
    }
  }

  // Get potential managers (admins and managers)
  const potentialManagers = teamMembers.filter(member => 
    member.role === 'admin' || member.role === 'manager'
  )

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Zarządzanie zespołami</h1>
      </div>

      {/* Tabs */}
      <FigmaTabs defaultValue="employees" className="w-full">
        <div className="relative -mx-12 px-12">
          <FigmaTabsList className="border-b-0">
            <FigmaTabsTrigger value="employees">Pracownicy</FigmaTabsTrigger>
            <FigmaTabsTrigger value="teams">Grupy</FigmaTabsTrigger>
          </FigmaTabsList>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
        </div>

        {/* Pracownicy Tab */}
        <FigmaTabsContent value="employees" className="mt-6">
          {/* Pending Invitations Section */}
          <PendingInvitationsSection invitations={invitations} />
          
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
                    className="bg-foreground text-background"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Dodaj pracownika
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <Card className="py-2 ">
            <CardContent className="px-4 py-0">
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
                                <AvatarFallback className="bg-muted text-sm font-medium">
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

        {/* Grupy Tab */}
        <FigmaTabsContent value="teams" className="mt-2">
          <div className="mb-4 min-h-[60px] flex items-center">
            <div className="flex items-center justify-between w-full">
              <h2 className="text-lg font-medium">Lista zespołów</h2>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  className="bg-foreground text-background"
                  onClick={() => {
                    resetForm()
                    setIsCreateDialogOpen(true)
                  }}
                  disabled={loading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Dodaj grupę
                </Button>
              </div>
            </div>
          </div>

          {teams.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm border rounded-lg">
              Brak zespołów
            </div>
          ) : (
            <Card className="py-2">
              <CardContent className="px-4 py-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-medium text-muted-foreground">Nazwa grupy</TableHead>
                      <TableHead className="font-medium text-muted-foreground">Manager grupy</TableHead>
                      <TableHead className="font-medium text-muted-foreground text-right">Członkowie</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teams.map((team) => (
                      <TableRow 
                        key={team.id} 
                        className="h-[72px] cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleTeamRowClick(team)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="font-medium text-foreground">
                                {team.name}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {team.manager ? (
                            <div className="flex items-center gap-3">
                              <Avatar className="size-10">
                                <AvatarFallback className="bg-muted text-sm font-medium">
                                  {team.manager.full_name ? team.manager.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : team.manager.email.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-foreground">
                                  {team.manager.full_name || team.manager.email}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {team.manager.email}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="font-medium text-muted-foreground">
                              Brak menedżera
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-foreground">
                            {team.member_count || 0}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </FigmaTabsContent>
      </FigmaTabs>

      {/* Create Team Sheet */}
      <CreateTeamSheet
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        teamMembers={teamMembers}
        onTeamCreated={() => window.location.reload()}
      />

      {/* Edit Team Sheet */}
      <Sheet open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <SheetContent 
          side="right" 
          size="content"
          className="overflow-y-auto"
        >
          <div className="bg-background relative rounded-lg h-full">
            <div className="flex flex-col h-full">
              <div className="flex flex-col gap-6 p-6 flex-1 overflow-y-auto">
                {/* Dialog Header */}
                <div className="flex flex-col gap-1.5 w-full">
                  <SheetTitle className="text-xl font-semibold text-neutral-950">
                    Edytuj grupę
                  </SheetTitle>
                </div>

                {/* Separator */}
                <div className="w-full">
                  <div className="h-px bg-neutral-200 w-full" />
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col gap-6">
                  {/* Nazwa grupy */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-medium text-neutral-950">
                      Nazwa grupy
                    </Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Design team"
                      className="h-9 border-neutral-200 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                    />
                  </div>

                  {/* Opis grupy */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-medium text-neutral-950">
                      Opis grupy
                    </Label>
                    <Textarea
                      id="edit-description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Opcjonalny opis grupy"
                      className="min-h-[60px] border-neutral-200 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] resize-none"
                    />
                  </div>

                  {/* Wybierz managera grupy */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-medium text-neutral-950">
                      Wybierz managera grupy
                    </Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between h-12 px-3 py-2 border-neutral-200 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                        >
                          {formData.manager_id && formData.manager_id !== 'none' ? (
                            (() => {
                              const selectedManager = potentialManagers.find(m => m.id === formData.manager_id)
                              return selectedManager ? (
                                <div className="flex items-center gap-2">
                                  <Avatar className="size-8">
                                    <AvatarImage src={selectedManager.avatar_url || undefined} />
                                    <AvatarFallback className="bg-neutral-100 text-sm font-normal text-neutral-950">
                                      {selectedManager.full_name ? selectedManager.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : selectedManager.email.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col text-left">
                                    <div className="text-sm font-medium text-neutral-950 leading-5">
                                      {selectedManager.full_name || selectedManager.email}
                                    </div>
                                    <div className="text-xs font-normal text-neutral-500 leading-4">
                                      {selectedManager.email}
                                    </div>
                                  </div>
                                </div>
                              ) : null
                            })()
                          ) : (
                            <span className="text-neutral-500">Wybierz menedżera grupy</span>
                          )}
                          <ChevronDownIcon className="size-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                        <DropdownMenuItem
                          onClick={() => setFormData(prev => ({ ...prev, manager_id: 'none' }))}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <div className="size-8 bg-neutral-100 rounded-full flex items-center justify-center">
                              <span className="text-xs text-neutral-500">—</span>
                            </div>
                            <div className="flex flex-col">
                              <div className="text-sm font-medium">Brak przypisanego menedżera</div>
                            </div>
                          </div>
                        </DropdownMenuItem>
                        {potentialManagers.length > 0 && <DropdownMenuSeparator />}
                        {potentialManagers.map((manager, index, array) => (
                          <React.Fragment key={manager.id}>
                            <DropdownMenuItem
                              onClick={() => setFormData(prev => ({ ...prev, manager_id: manager.id }))}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <Avatar className="size-8">
                                  <AvatarImage src={manager.avatar_url || undefined} />
                                  <AvatarFallback className="bg-neutral-100 text-sm font-normal text-neutral-950">
                                    {manager.full_name ? manager.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : manager.email.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <div className="text-sm font-medium text-neutral-950">
                                    {manager.full_name || manager.email}
                                  </div>
                                  <div className="text-xs text-neutral-500">
                                    {manager.email}
                                  </div>
                                </div>
                              </div>
                            </DropdownMenuItem>
                            {index < array.length - 1 && <DropdownMenuSeparator />}
                          </React.Fragment>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="flex flex-row gap-2 items-center justify-end w-full p-6 pt-0 bg-background">
                <Button 
                  variant="destructive"
                  onClick={() => {
                    if (selectedTeam) {
                      handleDeleteTeam(selectedTeam)
                      setIsEditDialogOpen(false)
                    }
                  }}
                  className="h-9"
                  disabled={loading}
                >
                  Usuń grupę
                </Button>
                <div className="flex-1" />
                <Button 
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  className="h-9"
                >
                  Anuluj
                </Button>
                <Button 
                  onClick={handleUpdateTeam} 
                  disabled={loading}
                  className="h-9"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Zaktualizuj grupę
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Manage Team Members Sheet */}
      <ManageTeamMembersSheet
        open={isMembersSheetOpen}
        onOpenChange={setIsMembersSheetOpen}
        selectedTeam={selectedTeam}
        teamMembers={teamMembers}
        onTeamUpdated={handleTeamUpdated}
      />


      {/* Team Details Sheet */}
      <Sheet open={isTeamDetailsOpen} onOpenChange={setIsTeamDetailsOpen}>
        <SheetContent 
          side="right" 
          size="content"
          className="overflow-y-auto"
        >
          <div className="bg-background relative rounded-lg h-full">
            <div className="flex flex-col h-full">
              <div className="flex flex-col gap-6 p-6 flex-1 overflow-y-auto">
                {/* Dialog Header */}
                <div className="flex flex-col gap-1.5 w-full">
                  <SheetTitle className="text-xl font-semibold text-neutral-950">
                    Szczegóły grupy
                  </SheetTitle>
                </div>

                {/* Separator */}
                <div className="w-full">
                  <div className="h-px bg-neutral-200 w-full" />
                </div>

                {selectedTeam && (
                  <div className="flex-1 flex flex-col gap-8">
                    {/* Nazwa grupy */}
                    <div className="flex flex-col gap-2">
                      <div className="text-sm font-medium text-neutral-950">
                        Nazwa grupy
                      </div>
                      <div className="text-xl font-semibold text-neutral-950 leading-7">
                        {selectedTeam.name}
                      </div>
                    </div>

                    {/* Opis grupy */}
                    <div className="flex flex-col gap-2">
                      <div className="text-sm font-medium text-neutral-950">
                        Opis grupy
                      </div>
                      <div className="text-base font-normal text-neutral-950 leading-6">
                        {selectedTeam.description || 'brak'}
                      </div>
                    </div>

                    {/* Manager grupy */}
                    <div className="flex flex-col gap-2">
                      <div className="text-sm font-medium text-neutral-950">
                        Manager grupy
                      </div>
                      {selectedTeam.manager ? (
                        <div className="flex items-center gap-4">
                          <Avatar className="size-10">
                            <AvatarImage src={selectedTeam.manager.avatar_url || undefined} />
                            <AvatarFallback className="bg-neutral-100 text-sm font-normal text-neutral-950">
                              {selectedTeam.manager.full_name ? selectedTeam.manager.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : selectedTeam.manager.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <div className="text-sm font-medium text-neutral-950 leading-5">
                              {selectedTeam.manager.full_name || selectedTeam.manager.email}
                            </div>
                            <div className="text-sm font-normal text-neutral-500 leading-5">
                              {selectedTeam.manager.email}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-base font-normal text-neutral-950 leading-6">
                          brak
                        </div>
                      )}
                    </div>

                    {/* Członkowie grupy */}
                    <div className="flex flex-col gap-2">
                      <div className="text-sm font-medium text-neutral-950">
                        Członkowie grupy ({Array.isArray(selectedTeam.members) ? selectedTeam.members.length : 0})
                      </div>
                      <div className="flex flex-col gap-4">
                        {Array.isArray(selectedTeam.members) && selectedTeam.members.length > 0 ? (
                          selectedTeam.members.map((member: any) => (
                            <div key={member.id} className="flex items-center gap-4">
                              <Avatar className="size-10">
                                <AvatarImage src={member.avatar_url || undefined} />
                                <AvatarFallback className="bg-neutral-100 text-sm font-normal text-neutral-950">
                                  {member.full_name ? member.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : member.email.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col flex-1">
                                <div className="text-sm font-medium text-neutral-950 leading-5">
                                  {member.full_name || member.email}
                                </div>
                                <div className="text-sm font-normal text-neutral-500 leading-5">
                                  {member.email}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-base font-normal text-neutral-500 leading-6">
                            Ta grupa nie ma jeszcze członków
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Footer - Fixed at Bottom */}
              <div className="flex flex-row gap-2 items-center justify-end w-full p-6 pt-0 bg-background">
                <Button 
                  variant="outline"
                  onClick={() => {
                    if (selectedTeam) {
                      openMembersSheet(selectedTeam)
                    }
                  }}
                  className="h-9"
                >
                  Zarządzaj członkami
                </Button>
                <Button 
                  onClick={() => {
                    if (selectedTeam) {
                      openEditDialog(selectedTeam)
                      setIsTeamDetailsOpen(false)
                    }
                  }}
                  className="h-9"
                >
                  Edytuj grupę
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Remove Employee Confirmation Dialog */}
      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usuń pracownika</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz usunąć pracownika {memberToRemove?.full_name || memberToRemove?.email} z organizacji?
              {(memberToRemove?.role === 'Manager' || memberToRemove?.role === 'Admin') && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>⚠️ Uwaga:</strong> Ten użytkownik jest obecnie <strong>{memberToRemove.role}</strong>. 
                    Usunięcie go spowoduje utratę wszystkich jego uprawnień administracyjnych.
                  </p>
                </div>
              )}
              <br />
              <strong className="text-red-600">Ta akcja jest nieodwracalna.</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsRemoveDialogOpen(false)}
              disabled={loading}
            >
              Anuluj
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmRemoveEmployee}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Usuń pracownika
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Team Confirmation Dialog */}
      <Dialog open={isDeleteTeamDialogOpen} onOpenChange={setIsDeleteTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usuń grupę</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz usunąć grupę "{teamToDelete?.name}"?
              <br />
              <strong>Ta akcja jest nieodwracalna.</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteTeamDialogOpen(false)}
              disabled={loading}
            >
              Anuluj
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteTeam}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Usuń grupę
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
} 