'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Edit, Trash2, Users, UserMinus, UserPlus, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Team {
  id: string
  name: string
  description: string | null
  color: string
  created_at: string
  updated_at: string
  manager: {
    id: string
    full_name: string | null
    email: string
  } | null
  members: Array<{
    id: string
    full_name: string | null
    email: string
    role: string
    avatar_url: string | null
  }>
}

interface TeamMember {
  id: string
  full_name: string | null
  email: string
  role: string
  avatar_url: string | null
  team_id: string | null
}

interface TeamManagementProps {
  initialTeams: Team[]
  allMembers: TeamMember[]
  managers: Array<{
    id: string
    full_name: string | null
    email: string
  }>
  currentUserRole: string
}

export function TeamManagement({ initialTeams, allMembers: initialAllMembers, managers, currentUserRole }: TeamManagementProps) {
  const [teams, setTeams] = useState<Team[]>(initialTeams)
  const [allMembers, setAllMembers] = useState<TeamMember[]>(initialAllMembers)
  const [loading, setLoading] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    manager_id: '',
    color: '#6366f1'
  })

  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

  const canCreateTeams = currentUserRole === 'admin' || currentUserRole === 'manager'

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      manager_id: 'none',
      color: '#6366f1'
    })
  }

  const handleCreateTeam = async () => {
    if (!formData.name.trim()) {
      toast.error('Team name is required')
      return
    }

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

      // Refresh teams list
      await refreshTeams()
      await refreshMembers()
      toast.success('Team created successfully!')
      setIsCreateDialogOpen(false)
      resetForm()

    } catch (error) {
      console.error('Error creating team:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create team')
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

      await refreshTeams()
      await refreshMembers()
      toast.success(data.message || 'Team updated successfully')
      setIsEditDialogOpen(false)
      setSelectedTeam(null)
      resetForm()

    } catch (error) {
      console.error('Error updating team:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update team')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTeam = async (team: Team) => {
    if (team.members.length > 0) {
      toast.error('Cannot delete team with members. Remove all members first.')
      return
    }

    if (!confirm(`Are you sure you want to delete team "${team.name}"?`)) {
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

      await refreshTeams()
      toast.success(data.message || 'Team deleted successfully')

    } catch (error) {
      console.error('Error deleting team:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete team')
    } finally {
      setLoading(false)
    }
  }

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

      await refreshTeams()
      await refreshMembers()
      toast.success(data.message)
      setSelectedMembers([])
      setIsMembersDialogOpen(false)

    } catch (error) {
      console.error(`Error ${action}ing members:`, error)
      toast.error(error instanceof Error ? error.message : `Failed to ${action} members`)
    } finally {
      setLoading(false)
    }
  }

  const refreshTeams = async () => {
    try {
      const response = await fetch('/api/teams')
      const data = await response.json()
      if (response.ok) {
        setTeams(data.teams || [])
      }
    } catch (error) {
      console.error('Error refreshing teams:', error)
    }
  }

  const refreshMembers = async () => {
    try {
      const response = await fetch('/api/organization/members')
      const data = await response.json()
      if (response.ok) {
        setAllMembers(data.members || [])
      } else {
        console.error('Error fetching members:', data.error)
      }
    } catch (error) {
      console.error('Error refreshing members:', error)
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

  const openMembersDialog = (team: Team) => {
    setSelectedTeam(team)
    setSelectedMembers([])
    setIsMembersDialogOpen(true)
  }

  const availableMembers = allMembers.filter(member => !member.team_id)
  const teamMembers = selectedTeam ? allMembers.filter(member => member.team_id === selectedTeam.id) : []

  if (!canCreateTeams) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Only managers and administrators can manage teams.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Team Management</h2>
          <p className="text-muted-foreground">
            Create and manage teams within your organization
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Create a new team to organize your employees better.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Team Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter team name..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Team description (optional)..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="manager">Team Manager</Label>
                <Select 
                  value={formData.manager_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, manager_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team manager (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No manager assigned</SelectItem>
                    {managers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.full_name || manager.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="color">Team Color</Label>
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-20 h-10"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTeam} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Team
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {teams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Get started by creating your first team to organize your employees.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card key={team.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      {team.description && (
                        <CardDescription className="mt-1">
                          {team.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(team)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTeam(team)}
                      disabled={team.members.length > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {team.manager && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Manager</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">
                            {(team.manager.full_name || team.manager.email).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{team.manager.full_name || team.manager.email}</span>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs text-muted-foreground">
                        Members ({team.members.length})
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openMembersDialog(team)}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {team.members.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {team.members.slice(0, 3).map((member) => (
                          <Avatar key={member.id} className="w-6 h-6">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {(member.full_name || member.email).charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {team.members.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                            +{team.members.length - 3}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No members assigned</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Team Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>
              Make changes to the team details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Team Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter team name..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Team description (optional)..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-manager">Team Manager</Label>
              <Select 
                value={formData.manager_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, manager_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team manager (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No manager assigned</SelectItem>
                  {managers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.full_name || manager.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-color">Team Color</Label>
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
              Cancel
            </Button>
            <Button onClick={handleUpdateTeam} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Members Dialog */}
      <Dialog open={isMembersDialogOpen} onOpenChange={setIsMembersDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manage Team Members</DialogTitle>
            <DialogDescription>
              Add or remove members from {selectedTeam?.name}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="add" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="add">Add Members</TabsTrigger>
              <TabsTrigger value="remove">Remove Members</TabsTrigger>
            </TabsList>
            
            <TabsContent value="add" className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Available Members</Label>
                <p className="text-sm text-muted-foreground">
                  Select members to add to the team
                </p>
              </div>
              
              <div className="max-h-60 overflow-y-auto space-y-2">
                {availableMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    All members are already assigned to teams
                  </p>
                ) : (
                  availableMembers.map((member) => (
                    <div key={member.id} className="flex items-center space-x-2">
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
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback>
                            {(member.full_name || member.email).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{member.full_name || member.email}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                        <Badge variant="outline" className="ml-auto">
                          {member.role}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {availableMembers.length > 0 && (
                <DialogFooter>
                  <Button 
                    onClick={() => handleManageMembers('add')} 
                    disabled={selectedMembers.length === 0 || loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Selected ({selectedMembers.length})
                  </Button>
                </DialogFooter>
              )}
            </TabsContent>
            
            <TabsContent value="remove" className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Current Members</Label>
                <p className="text-sm text-muted-foreground">
                  Select members to remove from the team
                </p>
              </div>
              
              <div className="max-h-60 overflow-y-auto space-y-2">
                {teamMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No members in this team
                  </p>
                ) : (
                  teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center space-x-2">
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
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback>
                            {(member.full_name || member.email).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{member.full_name || member.email}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                        <Badge variant="outline" className="ml-auto">
                          {member.role}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {teamMembers.length > 0 && (
                <DialogFooter>
                  <Button 
                    variant="destructive"
                    onClick={() => handleManageMembers('remove')} 
                    disabled={selectedMembers.length === 0 || loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <UserMinus className="mr-2 h-4 w-4" />
                    Remove Selected ({selectedMembers.length})
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