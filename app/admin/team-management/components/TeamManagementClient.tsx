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
import { Loader2, Plus, Edit, Trash2, Users, UserPlus, UserMinus, ChevronDownIcon } from 'lucide-react'
import { toast } from 'sonner'
import { ManageTeamMembersSheet } from './ManageTeamMembersSheet'
import { PendingInvitationsSection } from './PendingInvitationsSection'

import Link from 'next/link'

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
  // State for active team filter
  const [activeTeamFilter, setActiveTeamFilter] = useState('Wszyscy')
  
  // State for team editing
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isMembersSheetOpen, setIsMembersSheetOpen] = useState(false)
  const [isTeamDetailsOpen, setIsTeamDetailsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
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
    return balance?.remaining_days || 0
  }

  const getUserInitials = (member: TeamMember): string => {
    if (member.full_name) {
      return member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    }
    return member.email.charAt(0).toUpperCase()
  }

  const getTeamDisplayName = (member: TeamMember): string => {
    return member.teams?.name || 'Brak zespołu'
  }

  const getManagerName = (member: TeamMember): string => {
    // Get the manager from the team data
    if (member.teams && member.team_id) {
      const team = teams.find(t => t.id === member.team_id)
      return team?.manager?.full_name || 'Brak menedżera'
    }
    return 'Brak zespołu'
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
        throw new Error(data.error || 'Failed to create team')
      }

      toast.success(data.message || 'Zespół został utworzony pomyślnie')
      setIsCreateDialogOpen(false)
      resetForm()
      
      // TODO: Implement proper state refresh instead of page reload
      window.location.reload()

    } catch (error) {
      console.error('Error creating team:', error)
      toast.error(error instanceof Error ? error.message : 'Błąd podczas tworzenia zespołu')
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
        throw new Error(data.error || 'Failed to update team')
      }

      toast.success(data.message || 'Zespół został zaktualizowany pomyślnie')
      setIsEditDialogOpen(false)
      setSelectedTeam(null)
      resetForm()
      
      // TODO: Implement proper state refresh instead of page reload
      window.location.reload()

    } catch (error) {
      console.error('Error updating team:', error)
      toast.error(error instanceof Error ? error.message : 'Błąd podczas aktualizacji zespołu')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTeam = async (team: Team) => {
    if (Array.isArray(team.members) && team.members.length > 0) {
      toast.error('Nie można usunąć zespołu z członkami. Najpierw usuń wszystkich członków.')
      return
    }

    if (!confirm(`Czy na pewno chcesz usunąć zespół "${team.name}"?`)) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/teams/${team.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete team')
      }

      toast.success(data.message || 'Zespół został usunięty pomyślnie')
      
      // TODO: Implement proper state refresh instead of page reload
      window.location.reload()

    } catch (error) {
      console.error('Error deleting team:', error)
      toast.error(error instanceof Error ? error.message : 'Błąd podczas usuwania zespołu')
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
            <FigmaTabsTrigger value="teams">Zespoły</FigmaTabsTrigger>
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
                    <TableHead className="font-medium text-muted-foreground min-w-64">Zespół</TableHead>
                    <TableHead className="font-medium text-muted-foreground min-w-64">Manager</TableHead>
                    <TableHead className="font-medium text-muted-foreground text-right min-w-40">Pozostały urlop</TableHead>
                    <TableHead className="font-medium text-muted-foreground text-right min-w-40">Urlop NŻ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeamMembers.map((member) => {
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
                            {vacationDays} dni
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-foreground">
                            {parentalDays} dni
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>


          
          {/* Empty state */}
          {filteredTeamMembers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {activeTeamFilter === 'Wszyscy' 
                ? 'Brak pracowników w organizacji' 
                : `Brak pracowników w zespole ${activeTeamFilter}`
              }
            </div>
          )}
        </FigmaTabsContent>

        {/* Zespoły Tab */}
        <FigmaTabsContent value="teams" className="mt-2">
          <div className="mb-4 min-h-[60px] flex items-center">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-medium">Lista zespołów</h2>
              </div>
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
                  Dodaj zespół
                </Button>
              </div>
            </div>
          </div>

          <Card className="py-2">
            <CardContent className="px-4 py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium text-muted-foreground">Nazwa zespołu</TableHead>
                    <TableHead className="font-medium text-muted-foreground">Manager zespołu</TableHead>
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
                          {Array.isArray(team.members) ? team.members.length : 0}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </FigmaTabsContent>
      </FigmaTabs>

            {/* Create Team Sheet */}
      <Sheet open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <SheetContent 
          side="right" 
          size="content"
          className="overflow-y-auto"
        >
          <div className="bg-background relative rounded-lg h-full">
            <div className="flex flex-col h-full">
              <div className="flex flex-col gap-6 p-6 flex-1 overflow-y-auto">
                <div className="flex flex-col gap-1.5 w-full">
                  <SheetTitle className="text-xl font-semibold text-neutral-950">Dodaj nowy zespół</SheetTitle>
                  <SheetDescription className="text-sm text-neutral-500">
                    Utwórz nowy zespół w swojej organizacji
                  </SheetDescription>
                </div>

                {/* Separator */}
                <div className="w-full h-px bg-neutral-200" />

                {/* Form */}
                <form onSubmit={(e) => { e.preventDefault(); handleCreateTeam() }} className="space-y-6 flex-1">
                  <div className="space-y-2">
                    <Label htmlFor="create-name" className="text-sm font-medium">Nazwa zespołu</Label>
                    <Input
                      id="create-name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Wprowadź nazwę zespołu"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="create-description" className="text-sm font-medium">Opis zespołu</Label>
                    <Textarea
                      id="create-description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Opcjonalny opis zespołu"
                      className="min-h-[60px] resize-none"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Wybierz managera zespołu</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between h-auto min-h-9 px-3 py-2"
                        >
                          {formData.manager_id && formData.manager_id !== 'none' ? (
                            (() => {
                              const selectedManager = potentialManagers.find(m => m.id === formData.manager_id)
                              return selectedManager ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-medium">
                                    {selectedManager.full_name ? selectedManager.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : selectedManager.email.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex flex-col items-start">
                                    <span className="font-medium text-sm">{selectedManager.full_name || selectedManager.email}</span>
                                    <span className="text-xs text-muted-foreground">{selectedManager.email}</span>
                                  </div>
                                </div>
                              ) : null
                            })()
                          ) : (
                            <span className="text-muted-foreground">Wybierz managera zespołu</span>
                          )}
                          <ChevronDownIcon className="size-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                        <DropdownMenuItem
                          onClick={() => setFormData(prev => ({ ...prev, manager_id: 'none' }))}
                          className="cursor-pointer"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">Brak przypisanego menedżera</span>
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
                                <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-medium">
                                  {manager.full_name ? manager.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : manager.email.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm">{manager.full_name || manager.email}</span>
                                  <span className="text-xs text-muted-foreground">{manager.email}</span>
                                </div>
                              </div>
                            </DropdownMenuItem>
                            {index < array.length - 1 && <DropdownMenuSeparator />}
                          </React.Fragment>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </form>
              </div>
              
              {/* Footer - Fixed at Bottom */}
              <div className="flex flex-row gap-2 items-center justify-between w-full p-6 pt-0 bg-background">
            <Button 
              variant="outline" 
              onClick={() => setIsCreateDialogOpen(false)}
              className="h-9"
            >
              Anuluj
            </Button>
            <Button 
              onClick={handleCreateTeam} 
              disabled={loading || !formData.name.trim()}
              className="h-9"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Utwórz zespół
            </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

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
                    Edytuj zespół
                  </SheetTitle>
                </div>

                {/* Separator */}
                <div className="w-full">
                  <div className="h-px bg-neutral-200 w-full" />
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col gap-6">
                  {/* Nazwa zespołu */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-medium text-neutral-950">
                      Nazwa zespołu
                    </Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Design team"
                      className="h-9 border-neutral-200 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                    />
                  </div>

                  {/* Opis zespołu */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-medium text-neutral-950">
                      Opis zespołu
                    </Label>
                    <Textarea
                      id="edit-description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Opcjonalny opis zespołu"
                      className="min-h-[60px] border-neutral-200 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] resize-none"
                    />
                  </div>

                  {/* Wybierz managera zespołu */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-medium text-neutral-950">
                      Wybierz managera zespołu
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
                            <span className="text-neutral-500">Wybierz menedżera zespołu</span>
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
                  Usuń zespół
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
                  Zaktualizuj zespół
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
                    Szczegóły zespołu
                  </SheetTitle>
                </div>

                {/* Separator */}
                <div className="w-full">
                  <div className="h-px bg-neutral-200 w-full" />
                </div>

                {selectedTeam && (
                  <div className="flex-1 flex flex-col gap-8">
                    {/* Nazwa zespołu */}
                    <div className="flex flex-col gap-2">
                      <div className="text-sm font-medium text-neutral-950">
                        Nazwa zespołu
                      </div>
                      <div className="text-xl font-semibold text-neutral-950 leading-7">
                        {selectedTeam.name}
                      </div>
                    </div>

                    {/* Opis zespołu */}
                    <div className="flex flex-col gap-2">
                      <div className="text-sm font-medium text-neutral-950">
                        Opis zespołu
                      </div>
                      <div className="text-base font-normal text-neutral-950 leading-6">
                        {selectedTeam.description || 'brak'}
                      </div>
                    </div>

                    {/* Manager zespołu */}
                    <div className="flex flex-col gap-2">
                      <div className="text-sm font-medium text-neutral-950">
                        Manager zespołu
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

                    {/* Członkowie zespołu */}
                    <div className="flex flex-col gap-2">
                      <div className="text-sm font-medium text-neutral-950">
                        Członkowie zespołu ({Array.isArray(selectedTeam.members) ? selectedTeam.members.length : 0})
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
                            Ten zespół nie ma jeszcze członków
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
                  Edytuj zespół
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Employee Dialog */}

    </div>
  )
} 