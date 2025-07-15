'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Plus, Edit, Trash2, Users, UserPlus, UserMinus } from 'lucide-react'
import { toast } from 'sonner'

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
  color: string
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

interface TeamManagementClientProps {
  teamMembers: TeamMember[]
  teams: Team[]
  leaveBalances: LeaveBalance[]
}

export function TeamManagementClient({ teamMembers, teams, leaveBalances }: TeamManagementClientProps) {
  // State for active team filter
  const [activeTeamFilter, setActiveTeamFilter] = useState('Wszyscy')
  
  // State for team editing
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    manager_id: '',
    color: '#6366f1'
  })
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

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
    // For now, return static manager name as shown in Figma
    // This should be dynamically determined based on team structure
    return 'Paweł Chróściak'
  }

  // Team editing functions
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      manager_id: '',
      color: '#6366f1'
    })
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
      
      // Refresh the page to show updated data
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
      
      // Refresh the page to show updated data
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
      manager_id: team.manager?.id || 'none',
      color: team.color
    })
    setIsEditDialogOpen(true)
  }

  // Team member management functions
  const handleManageMembers = async (action: 'add' | 'remove') => {
    if (!selectedTeam) return
    if (selectedMembers.length === 0) return

    setLoading(true)
    try {
      const response = await fetch(`/api/teams/${selectedTeam.id}/members`, {
        method: action === 'add' ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_ids: selectedMembers })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} members`)
      }

      toast.success(data.message)
      setSelectedMembers([])
      setIsMembersDialogOpen(false)
      
      // Refresh the page to show updated data
      window.location.reload()

    } catch (error) {
      console.error(`Error ${action}ing members:`, error)
      toast.error(error instanceof Error ? error.message : `Błąd podczas ${action === 'add' ? 'dodawania' : 'usuwania'} członków`)
    } finally {
      setLoading(false)
    }
  }

  const openMembersDialog = (team: Team) => {
    setSelectedTeam(team)
    setSelectedMembers([])
    setIsMembersDialogOpen(true)
  }

  // Helper functions for member management
  const availableMembers = teamMembers.filter(member => !member.team_id)
  const currentTeamMembers = selectedTeam ? teamMembers.filter(member => member.team_id === selectedTeam.id) : []

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
      <Tabs defaultValue="employees" className="w-full">
        <TabsList className="grid w-fit grid-cols-2">
          <TabsTrigger value="employees">Pracownicy</TabsTrigger>
          <TabsTrigger value="teams">Zespoły</TabsTrigger>
        </TabsList>

        {/* Pracownicy Tab */}
        <TabsContent value="employees" className="mt-6">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-medium">Lista pracowników</h2>
                
                {/* Custom Figma-style tabs for team filtering */}
                <div className="bg-neutral-100 relative rounded-[10px] p-[3px] flex">
                  {teamTabs.map((teamName: string) => (
                    <button
                      key={teamName}
                      onClick={() => setActiveTeamFilter(teamName)}
                      className={`
                        flex items-center justify-center px-3 py-1 rounded-lg text-sm font-medium transition-all
                        ${activeTeamFilter === teamName 
                          ? 'bg-white text-neutral-950 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]' 
                          : 'text-neutral-950 hover:bg-neutral-50'
                        }
                      `}
                    >
                      {teamName}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Filtry</Button>
                <Button variant="outline" size="sm">Export</Button>
                <Button size="sm" className="bg-foreground text-background">
                  Dodaj pracownika
                </Button>
                <Button variant="outline" size="sm">Import</Button>
              </div>
            </div>
          </div>

          <Card className="py-2">
            <CardContent className="px-4 py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium text-muted-foreground">Wnioskujący</TableHead>
                    <TableHead className="font-medium text-muted-foreground">Zespół</TableHead>
                    <TableHead className="font-medium text-muted-foreground">Akceptujący</TableHead>
                    <TableHead className="font-medium text-muted-foreground text-right">Pozostały urlop</TableHead>
                    <TableHead className="font-medium text-muted-foreground text-right">Urlop NŻ</TableHead>
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
        </TabsContent>

        {/* Zespoły Tab */}
        <TabsContent value="teams" className="mt-6">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Lista zespołów</h2>
              <div className="flex gap-2">
                <Button size="sm" className="bg-foreground text-background">
                  <Plus className="mr-2 h-4 w-4" />
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
                    <TableHead className="font-medium text-muted-foreground">Menedżer</TableHead>
                    <TableHead className="font-medium text-muted-foreground text-right">Członkowie</TableHead>
                    <TableHead className="font-medium text-muted-foreground text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((team) => (
                    <TableRow key={team.id} className="h-[72px]">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: team.color }}
                          />
                          <div>
                            <div className="font-medium text-foreground">
                              {team.name}
                            </div>
                            {team.description && (
                              <div className="text-sm text-muted-foreground">
                                {team.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {team.manager?.full_name || 'Brak menedżera'}
                        </div>
                        {team.manager?.email && (
                          <div className="text-sm text-muted-foreground">
                            {team.manager.email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-foreground">
                          {Array.isArray(team.members) ? team.members.length : 0}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openMembersDialog(team)}
                            disabled={loading}
                          >
                            <Users className="h-4 w-4 mr-1" />
                            Członkowie
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditDialog(team)}
                            disabled={loading}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteTeam(team)}
                            disabled={loading || (Array.isArray(team.members) && team.members.length > 0)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Team Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edytuj zespół</DialogTitle>
            <DialogDescription>
              Wprowadź zmiany w szczegółach zespołu.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nazwa zespołu *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Wprowadź nazwę zespołu..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Opis</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Opis zespołu (opcjonalny)..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-manager">Menedżer zespołu</Label>
              <Select 
                value={formData.manager_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, manager_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz menedżera zespołu (opcjonalny)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Brak przypisanego menedżera</SelectItem>
                  {potentialManagers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.full_name || manager.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-color">Kolor zespołu</Label>
              <Input
                id="edit-color"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="w-20 h-10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleUpdateTeam} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Zaktualizuj zespół
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Members Dialog */}
      <Dialog open={isMembersDialogOpen} onOpenChange={setIsMembersDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Zarządzaj członkami zespołu</DialogTitle>
            <DialogDescription>
              Dodaj lub usuń członków z zespołu {selectedTeam?.name}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="add" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="add">Dodaj członków</TabsTrigger>
              <TabsTrigger value="remove">Usuń członków</TabsTrigger>
            </TabsList>
            
            <TabsContent value="add" className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Dostępni członkowie</Label>
                <p className="text-sm text-muted-foreground">
                  Wybierz członków do dodania do zespołu
                </p>
              </div>
              
              <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                {availableMembers.length > 0 ? (
                  <div className="space-y-3">
                    {availableMembers.map((member) => (
                      <div key={member.id} className="flex items-center space-x-3">
                        <Checkbox
                          id={`add-${member.id}`}
                          checked={selectedMembers.includes(member.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedMembers(prev => [...prev, member.id])
                            } else {
                              setSelectedMembers(prev => prev.filter(id => id !== member.id))
                            }
                          }}
                        />
                        <Avatar className="size-8">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getUserInitials(member)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {member.full_name || 'Bez nazwiska'}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {member.email}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {member.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Wszyscy członkowie organizacji są już przypisani do zespołów
                  </p>
                )}
              </div>
              
              {availableMembers.length > 0 && (
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsMembersDialogOpen(false)}>
                    Anuluj
                  </Button>
                  <Button 
                    onClick={() => handleManageMembers('add')} 
                    disabled={selectedMembers.length === 0 || loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <UserPlus className="mr-2 h-4 w-4" />
                    Dodaj wybranych ({selectedMembers.length})
                  </Button>
                </DialogFooter>
              )}
            </TabsContent>
            
            <TabsContent value="remove" className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Obecni członkowie</Label>
                <p className="text-sm text-muted-foreground">
                  Wybierz członków do usunięcia z zespołu
                </p>
              </div>
              
              <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                {currentTeamMembers.length > 0 ? (
                  <div className="space-y-3">
                    {currentTeamMembers.map((member) => (
                      <div key={member.id} className="flex items-center space-x-3">
                        <Checkbox
                          id={`remove-${member.id}`}
                          checked={selectedMembers.includes(member.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedMembers(prev => [...prev, member.id])
                            } else {
                              setSelectedMembers(prev => prev.filter(id => id !== member.id))
                            }
                          }}
                        />
                        <Avatar className="size-8">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getUserInitials(member)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {member.full_name || 'Bez nazwiska'}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {member.email}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {member.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Ten zespół nie ma jeszcze żadnych członków
                  </p>
                )}
              </div>
              
              {currentTeamMembers.length > 0 && (
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsMembersDialogOpen(false)}>
                    Anuluj
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => handleManageMembers('remove')} 
                    disabled={selectedMembers.length === 0 || loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <UserMinus className="mr-2 h-4 w-4" />
                    Usuń wybranych ({selectedMembers.length})
                  </Button>
                </DialogFooter>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
} 