'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, SquarePlus, ChevronDownIcon, Ellipsis } from 'lucide-react'
import { toast } from 'sonner'
import { ManageTeamMembersSheet } from '@/app/admin/team-management/components/ManageTeamMembersSheet'
import { CreateTeamSheet } from '@/app/admin/team-management/components/CreateTeamSheet'
import { useRouter } from 'next/navigation'
import { refetchTeamManagement, REFETCH_TEAM_MANAGEMENT } from '@/lib/refetch-events'
import { getInitials } from '@/lib/utils/initials'

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
  const t = useTranslations('groups')

  // State for team editing
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isMembersSheetOpen, setIsMembersSheetOpen] = useState(false)
  const [isTeamDetailsOpen, setIsTeamDetailsOpen] = useState(false)
  const [membersSheetOrigin, setMembersSheetOrigin] = useState<'table' | 'details' | null>(null)
  const [loading, setLoading] = useState(false)

  // State for team deletion confirmation
  const [isDeleteTeamDialogOpen, setIsDeleteTeamDialogOpen] = useState(false)
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null)

  // State for team members in details sheet
  const [detailsTeamMembers, setDetailsTeamMembers] = useState<TeamMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    manager_id: ''
  })

  // Listen for refetch events to refresh data
  useEffect(() => {
    const handleRefetch = () => {
      router.refresh()
    }

    window.addEventListener(REFETCH_TEAM_MANAGEMENT, handleRefetch)
    return () => window.removeEventListener(REFETCH_TEAM_MANAGEMENT, handleRefetch)
  }, [router])

  // Update team members when details sheet opens or team changes
  useEffect(() => {
    if (isTeamDetailsOpen && selectedTeam) {
      // Filter members from the teamMembers prop instead of fetching from API
      const members = teamMembers.filter(member => member.team_id === selectedTeam.id)
      setDetailsTeamMembers(members)
    }
  }, [isTeamDetailsOpen, selectedTeam?.id, teamMembers])

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

      // Trigger event-driven refetch
      refetchTeamManagement()

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

      // Trigger event-driven refetch
      refetchTeamManagement()

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
  const openMembersSheet = (team: Team, origin: 'table' | 'details' = 'table') => {
    setSelectedTeam(team)
    setMembersSheetOrigin(origin)
    setIsTeamDetailsOpen(false) // Close details sheet if open
    setIsMembersSheetOpen(true)
  }

  // Get potential managers (admins and managers)
  const potentialManagers = teamMembers.filter(member =>
    member.role === 'admin' || member.role === 'manager'
  )

  return (
    <div className="py-11 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-foreground">{t('title')}</h1>
        <Button
          size="sm"
          onClick={() => {
            resetForm()
            setIsCreateDialogOpen(true)
          }}
          disabled={loading}
        >
          <SquarePlus />
          {t('addGroup')}
        </Button>
      </div>

      {/* Groups Table */}
      {teams.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground text-sm border rounded-lg">
          {t('noTeams')}
        </div>
      ) : (
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-medium text-muted-foreground">{t('name')}</TableHead>
                <TableHead className="font-medium text-muted-foreground">{t('table.description')}</TableHead>
                <TableHead className="font-medium text-muted-foreground">{t('table.groupManager')}</TableHead>
                <TableHead className="font-medium text-muted-foreground text-right">{t('table.employeeCount')}</TableHead>
                <TableHead className="font-medium text-muted-foreground text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
              <TableBody>
                {teams.map((team) => (
                  <TableRow
                    key={team.id}
                    className="h-[52px] cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleTeamRowClick(team)}
                  >
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {team.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-foreground">
                        {team.description || '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {team.manager ? (
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarImage src={team.manager.avatar_url || undefined} />
                            <AvatarFallback className="text-sm">
                              {getInitials(team.manager.full_name, team.manager.email.charAt(0).toUpperCase())}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <div className="text-sm font-medium text-foreground leading-5">
                              {team.manager.full_name || team.manager.email}
                            </div>
                            <div className="text-xs text-muted-foreground leading-4">
                              {team.manager.email}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">—</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-foreground font-medium">
                        {team.member_count || 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-[36px] w-[36px]"
                          >
                            <Ellipsis className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(team)}>
                            {t('dropdown.editGroup')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openMembersSheet(team)}>
                            {t('dropdown.manageMembers')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteTeam(team)}
                            className="text-destructive"
                          >
                            {t('dropdown.deleteGroup')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
      )}

      {/* Create Team Sheet */}
      <CreateTeamSheet
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        teamMembers={teamMembers}
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
                    {t('editSheet.title')}
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
                      {t('editSheet.nameLabel')}
                    </Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Design team"
                      className="h-9 border shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                    />
                  </div>

                  {/* Opis */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-medium text-foreground">
                      {t('editSheet.descriptionLabel')}
                    </Label>
                    <Textarea
                      id="edit-description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder={t('editSheet.descriptionPlaceholder')}
                      className="min-h-[60px] border shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] resize-none"
                    />
                  </div>

                  {/* Kierownik grupy */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-medium text-foreground">
                      {t('editSheet.managerLabel')}
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
                                      {getInitials(selectedManager.full_name, selectedManager.email.charAt(0).toUpperCase())}
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
                            <span className="text-muted-foreground">{t('editSheet.managerPlaceholder')}</span>
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
                              <div className="text-sm font-medium">{t('editSheet.noManager')}</div>
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
                                    {getInitials(manager.full_name, manager.email.charAt(0).toUpperCase())}
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
                  {t('editSheet.delete')}
                </Button>
                <div className="flex-1" />
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  className="h-9"
                >
                  {t('editSheet.cancel')}
                </Button>
                <Button
                  onClick={handleUpdateTeam}
                  disabled={loading}
                  className="h-9"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('editSheet.save')}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Manage Team Members Sheet */}
      <ManageTeamMembersSheet
        open={isMembersSheetOpen}
        onOpenChange={(open) => {
          setIsMembersSheetOpen(open)
          // Only re-open details sheet if it was opened from details sheet
          if (!open && selectedTeam && membersSheetOrigin === 'details') {
            setIsTeamDetailsOpen(true)
          }
          // Reset origin when closing
          if (!open) {
            setMembersSheetOrigin(null)
          }
        }}
        selectedTeam={selectedTeam}
        teamMembers={teamMembers}
        onTeamUpdated={() => {
          // Refetch will update the teamMembers prop from the server
          refetchTeamManagement()
        }}
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
                    {t('detailsSheet.title')}
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
                        {t('detailsSheet.name')}
                      </div>
                      <div className="text-xl font-semibold text-foreground leading-7">
                        {selectedTeam.name}
                      </div>
                    </div>

                    {/* Opis */}
                    <div className="flex flex-col gap-2">
                      <div className="text-sm font-medium text-foreground">
                        {t('detailsSheet.description')}
                      </div>
                      <div className="text-base font-normal text-foreground leading-6">
                        {selectedTeam.description || t('detailsSheet.noDescription')}
                      </div>
                    </div>

                    {/* Separator */}
                    <div className="w-full">
                      <div className="h-px bg-border w-full" />
                    </div>

                    {/* Członkowie grupy */}
                    <div className="flex flex-col gap-2">
                      <div className="text-sm font-medium text-foreground">
                        {t('detailsSheet.groupMembers')}
                      </div>
                      {loadingMembers ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="size-4 animate-spin" />
                          <span className="text-sm">{t('detailsSheet.loadingMembers')}</span>
                        </div>
                      ) : detailsTeamMembers.length === 0 ? (
                        <div className="text-base text-muted-foreground">{t('detailsSheet.noMembers')}</div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {detailsTeamMembers.map((member) => (
                            <div key={member.id} className="flex items-center gap-3">
                              <Avatar className="size-10">
                                <AvatarImage src={member.avatar_url || undefined} />
                                <AvatarFallback className="text-sm">
                                  {getInitials(member.full_name, member.email.charAt(0).toUpperCase())}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col flex-1">
                                <div className="text-sm font-medium text-foreground leading-5">
                                  {member.full_name || member.email}
                                </div>
                                <div className="text-sm text-muted-foreground leading-5">
                                  {member.email}
                                </div>
                              </div>
                              {member.id === selectedTeam?.manager?.id ? (
                                <div className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                                  {t('detailsSheet.roles.manager')}
                                </div>
                              ) : (
                                <div className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs font-medium">
                                  {t('detailsSheet.roles.employee')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Separator */}
              <div className="w-full px-6">
                <div className="h-px bg-border w-full" />
              </div>

              {/* Footer - Fixed at Bottom */}
              <div className="flex flex-row gap-2 items-center w-full p-6 pt-6 bg-background">
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (selectedTeam) {
                      handleDeleteTeam(selectedTeam)
                      setIsTeamDetailsOpen(false)
                    }
                  }}
                  className="h-9"
                  disabled={loading}
                >
                  {t('detailsSheet.delete')}
                </Button>
                <div className="flex-1" />
                <Button
                  variant="outline"
                  onClick={() => {
                    if (selectedTeam) {
                      openMembersSheet(selectedTeam, 'details')
                    }
                  }}
                  className="h-9"
                >
                  {t('detailsSheet.manageMembers')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (selectedTeam) {
                      openEditDialog(selectedTeam)
                      setIsTeamDetailsOpen(false)
                    }
                  }}
                  className="h-9"
                >
                  {t('detailsSheet.edit')}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Team Confirmation Dialog */}
      <AlertDialog open={isDeleteTeamDialogOpen} onOpenChange={setIsDeleteTeamDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="destructive"
              onClick={confirmDeleteTeam}
              disabled={loading}
              className="h-9"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('deleteDialog.confirm')}
            </Button>
            <Button
              onClick={() => setIsDeleteTeamDialogOpen(false)}
              disabled={loading}
              className="h-9"
            >
              {t('deleteDialog.cancel')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
