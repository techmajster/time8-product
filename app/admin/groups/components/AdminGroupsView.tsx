'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Plus, ChevronDownIcon } from 'lucide-react'
import { toast } from 'sonner'
import { ManageTeamMembersSheet } from '@/app/admin/team-management/components/ManageTeamMembersSheet'
import { CreateTeamSheet } from '@/app/admin/team-management/components/CreateTeamSheet'
import { useRouter } from 'next/navigation'

interface TeamMember {
  id: string
  email: string
  full_name: string | null
  role: string
  avatar_url: string | null
}

interface Team {
  id: string
  name: string
  description?: string | null
  manager?: any
  member_count?: number
}

interface AdminGroupsViewProps {
  teams: Team[]
  teamMembers: TeamMember[]
}

export function AdminGroupsView({ teams, teamMembers }: AdminGroupsViewProps) {
  const router = useRouter()

  // State for team editing
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isMembersSheetOpen, setIsMembersSheetOpen] = useState(false)
  const [isTeamDetailsOpen, setIsTeamDetailsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // State for team deletion confirmation
  const [isDeleteTeamDialogOpen, setIsDeleteTeamDialogOpen] = useState(false)
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    manager_id: ''
  })

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

  // Get potential managers (admins and managers)
  const potentialManagers = teamMembers.filter(member =>
    member.role === 'admin' || member.role === 'manager'
  )

  return (
    <div className="py-11 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-foreground">Grupy</h1>
        <Button
          size="sm"
          className=""
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

      {/* Groups Table */}
      {teams.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground text-sm border rounded-lg">
          Brak zespołów
        </div>
      ) : (
        <Card>
          <CardContent className="py-0">
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
                            <AvatarFallback className="text-sm font-medium">
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
                  <SheetTitle className="text-xl font-semibold text-foreground">
                    Edytuj grupę
                  </SheetTitle>
                </div>

                {/* Separator */}
                <div className="w-full">
                  <div className="h-px bg-border w-full" />
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col gap-6">
                  {/* Nazwa grupy */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-medium text-foreground">
                      Nazwa grupy
                    </Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Design team"
                      className="h-9 border shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                    />
                  </div>

                  {/* Opis grupy */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-medium text-foreground">
                      Opis grupy
                    </Label>
                    <Textarea
                      id="edit-description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Opcjonalny opis grupy"
                      className="min-h-[60px] border shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] resize-none"
                    />
                  </div>

                  {/* Wybierz managera grupy */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-medium text-foreground">
                      Wybierz managera grupy
                    </Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between h-12 px-3 py-2 border shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                        >
                          {formData.manager_id && formData.manager_id !== 'none' ? (
                            (() => {
                              const selectedManager = potentialManagers.find(m => m.id === formData.manager_id)
                              return selectedManager ? (
                                <div className="flex items-center gap-2">
                                  <Avatar className="size-8">
                                    <AvatarImage src={selectedManager.avatar_url || undefined} />
                                    <AvatarFallback className="text-sm font-normal">
                                      {selectedManager.full_name ? selectedManager.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : selectedManager.email.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col text-left">
                                    <div className="text-sm font-medium text-foreground leading-5">
                                      {selectedManager.full_name || selectedManager.email}
                                    </div>
                                    <div className="text-xs font-normal text-muted-foreground leading-4">
                                      {selectedManager.email}
                                    </div>
                                  </div>
                                </div>
                              ) : null
                            })()
                          ) : (
                            <span className="text-muted-foreground">Wybierz menedżera grupy</span>
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
                            <div className="size-8 bg-muted rounded-full flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">—</span>
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
                                  <AvatarFallback className="text-sm font-normal">
                                    {manager.full_name ? manager.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : manager.email.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <div className="text-sm font-medium text-foreground">
                                    {manager.full_name || manager.email}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
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
                  <SheetTitle className="text-xl font-semibold text-foreground">
                    Szczegóły grupy
                  </SheetTitle>
                </div>

                {/* Separator */}
                <div className="w-full">
                  <div className="h-px bg-border w-full" />
                </div>

                {selectedTeam && (
                  <div className="flex-1 flex flex-col gap-8">
                    {/* Nazwa grupy */}
                    <div className="flex flex-col gap-2">
                      <div className="text-sm font-medium text-foreground">
                        Nazwa grupy
                      </div>
                      <div className="text-xl font-semibold text-foreground leading-7">
                        {selectedTeam.name}
                      </div>
                    </div>

                    {/* Opis grupy */}
                    <div className="flex flex-col gap-2">
                      <div className="text-sm font-medium text-foreground">
                        Opis grupy
                      </div>
                      <div className="text-base font-normal text-foreground leading-6">
                        {selectedTeam.description || 'brak'}
                      </div>
                    </div>

                    {/* Manager grupy */}
                    <div className="flex flex-col gap-2">
                      <div className="text-sm font-medium text-foreground">
                        Manager grupy
                      </div>
                      {selectedTeam.manager ? (
                        <div className="flex items-center gap-4">
                          <Avatar className="size-10">
                            <AvatarImage src={selectedTeam.manager.avatar_url || undefined} />
                            <AvatarFallback className="text-sm font-normal">
                              {selectedTeam.manager.full_name ? selectedTeam.manager.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : selectedTeam.manager.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <div className="text-sm font-medium text-foreground leading-5">
                              {selectedTeam.manager.full_name || selectedTeam.manager.email}
                            </div>
                            <div className="text-sm font-normal text-muted-foreground leading-5">
                              {selectedTeam.manager.email}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-base font-normal text-foreground leading-6">
                          brak
                        </div>
                      )}
                    </div>

                    {/* Członkowie grupy - count only */}
                    <div className="flex flex-col gap-2">
                      <div className="text-sm font-medium text-foreground">
                        Członkowie grupy
                      </div>
                      <div className="text-xl font-semibold text-foreground leading-7">
                        {selectedTeam.member_count || 0}
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

      {/* Delete Team Confirmation Dialog */}
      <Dialog open={isDeleteTeamDialogOpen} onOpenChange={setIsDeleteTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usuń grupę</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz usunąć grupę "{teamToDelete?.name}"?
              {teamToDelete?.member_count && teamToDelete.member_count > 0 && (
                <>
                  <br />
                  <br />
                  Członkowie grupy ({teamToDelete.member_count}) zostaną automatycznie przeniesieni do stanu "bez zespołu".
                </>
              )}
              <br />
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
