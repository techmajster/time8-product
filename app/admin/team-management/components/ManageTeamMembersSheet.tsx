'use client'

import React, { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'
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
  description?: string | null
  color?: string
  manager?: {
    id: string
    full_name: string | null
    email: string
    avatar_url?: string | null
  } | null
  members?: TeamMember[]
}

interface ManageTeamMembersSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedTeam: Team | null
  teamMembers: TeamMember[]
  onTeamUpdated?: () => void
}

export function ManageTeamMembersSheet({ 
  open, 
  onOpenChange, 
  selectedTeam, 
  teamMembers,
  onTeamUpdated 
}: ManageTeamMembersSheetProps) {
  const [loading, setLoading] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<{
    toAdd: string[]
    toRemove: string[]
  }>({ toAdd: [], toRemove: [] })
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)

  // Get current team members and available members
  const currentTeamMembers = teamMembers.filter(member => member.team_id === selectedTeam?.id)
  const availableMembers = teamMembers.filter(member => !member.team_id)

  // Check if there are any pending changes
  const hasChanges = pendingChanges.toAdd.length > 0 || pendingChanges.toRemove.length > 0

  // Reset pending changes when sheet opens/closes or team changes
  useEffect(() => {
    if (!open || !selectedTeam) {
      setPendingChanges({ toAdd: [], toRemove: [] })
    }
  }, [open, selectedTeam?.id])

  const getUserInitials = (member: TeamMember): string => {
    if (member.full_name) {
      return member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    }
    return member.email.charAt(0).toUpperCase()
  }

  const handleAddMember = (memberId: string) => {
    setPendingChanges(prev => ({
      toAdd: [...prev.toAdd, memberId],
      toRemove: prev.toRemove.filter(id => id !== memberId)
    }))
  }

  const handleRemoveMember = (memberId: string) => {
    setPendingChanges(prev => ({
      toRemove: [...prev.toRemove, memberId],
      toAdd: prev.toAdd.filter(id => id !== memberId)
    }))
  }

  const handleUndoAdd = (memberId: string) => {
    setPendingChanges(prev => ({
      ...prev,
      toAdd: prev.toAdd.filter(id => id !== memberId)
    }))
  }

  const handleUndoRemove = (memberId: string) => {
    setPendingChanges(prev => ({
      ...prev,
      toRemove: prev.toRemove.filter(id => id !== memberId)
    }))
  }

  const handleCloseSheet = () => {
    if (hasChanges) {
      setShowUnsavedDialog(true)
    } else {
      onOpenChange(false)
    }
  }

  const handleUpdateTeam = async () => {
    if (!selectedTeam || !hasChanges) return

    setLoading(true)
    try {
      // Process additions
      if (pendingChanges.toAdd.length > 0) {
        const addResponse = await fetch(`/api/teams/${selectedTeam.id}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ member_ids: pendingChanges.toAdd })
        })

        if (!addResponse.ok) {
          const errorData = await addResponse.json()
          throw new Error(errorData.error || 'Failed to add members')
        }
      }

      // Process removals
      if (pendingChanges.toRemove.length > 0) {
        const removeResponse = await fetch(`/api/teams/${selectedTeam.id}/members`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ member_ids: pendingChanges.toRemove })
        })

        if (!removeResponse.ok) {
          const errorData = await removeResponse.json()
          throw new Error(errorData.error || 'Failed to remove members')
        }
      }

      toast.success('Zespół został zaktualizowany pomyślnie')
      setPendingChanges({ toAdd: [], toRemove: [] })
      onOpenChange(false)
      
      if (onTeamUpdated) {
        onTeamUpdated()
      } else {
        window.location.reload()
      }

    } catch (error) {
      console.error('Error updating team:', error)
      toast.error(error instanceof Error ? error.message : 'Błąd podczas aktualizacji grupy')
    } finally {
      setLoading(false)
    }
  }

  // Get display lists with pending changes applied
  const displayCurrentMembers = currentTeamMembers.filter(member => 
    !pendingChanges.toRemove.includes(member.id)
  )
  const displayAvailableMembers = availableMembers.filter(member => 
    !pendingChanges.toAdd.includes(member.id)
  )
  const membersToAdd = teamMembers.filter(member => 
    pendingChanges.toAdd.includes(member.id)
  )
  const membersToRemove = currentTeamMembers.filter(member => 
    pendingChanges.toRemove.includes(member.id)
  )

  return (
    <>
      <Sheet open={open} onOpenChange={handleCloseSheet}>
        <SheetContent 
          side="right" 
          size="content"
          className="overflow-y-auto"
        >
          <div className="bg-background relative rounded-lg h-full">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex flex-col gap-1.5 p-6 pb-0">
                <SheetTitle className="text-xl font-semibold text-foreground">
                  Zarządzaj zespołem
                </SheetTitle>
                <SheetDescription className="text-sm text-muted-foreground">
                  Dodaj lub usuń członków z grupy {selectedTeam?.name}
                </SheetDescription>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-8">
                <div className="flex flex-col gap-8">
                  {/* Current Team Members */}
                  <div className="flex flex-col gap-3">
                    <div className="text-sm font-medium text-foreground">
                      Członkowie grupy
                    </div>
                    <div className="flex flex-col gap-4">
                      {displayCurrentMembers.length > 0 ? (
                        displayCurrentMembers.map((member) => (
                          <div key={member.id} className="flex items-center gap-4">
                            <Avatar className="size-10">
                              <AvatarImage src={member.avatar_url || undefined} />
                              <AvatarFallback className="text-sm font-normal text-foreground">
                                {getUserInitials(member)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-foreground truncate">
                                {member.full_name || 'Bez nazwiska'}
                              </div>
                              <div className="text-sm text-muted-foreground truncate">
                                {member.email}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveMember(member.id)}
                              className="h-8 px-3 text-xs"
                            >
                              Usuń
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground py-4">
                          Ta grupa nie ma jeszcze członków
                        </div>
                      )}

                      {/* Show members pending removal with undo option */}
                      {membersToRemove.map((member) => (
                        <div key={`removing-${member.id}`} className="flex items-center gap-4 opacity-50">
                          <Avatar className="size-10">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback className="text-sm font-normal text-foreground">
                              {getUserInitials(member)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate line-through">
                              {member.full_name || 'Bez nazwiska'}
                            </div>
                            <div className="text-sm text-muted-foreground truncate">
                              {member.email}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUndoRemove(member.id)}
                            className="h-8 px-3 text-xs"
                          >
                            Cofnij
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Separator */}
                  <Separator />

                  {/* Available Members */}
                  <div className="flex flex-col gap-3">
                    <div className="text-sm font-medium text-foreground">
                      Dostępni
                    </div>
                    <div className="flex flex-col gap-4">
                      {displayAvailableMembers.length > 0 ? (
                        displayAvailableMembers.map((member) => (
                          <div key={member.id} className="flex items-center gap-4">
                            <Avatar className="size-10">
                              <AvatarImage src={member.avatar_url || undefined} />
                              <AvatarFallback className="text-sm font-normal text-foreground">
                                {getUserInitials(member)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-foreground truncate">
                                {member.full_name || 'Bez nazwiska'}
                              </div>
                              <div className="text-sm text-muted-foreground truncate">
                                {member.email}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddMember(member.id)}
                              className="h-8 px-3 text-xs bg-muted"
                            >
                              Dodaj
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground py-4">
                          Wszyscy dostępni członkowie są już przypisani do zespołów
                        </div>
                      )}

                      {/* Show members pending addition with undo option */}
                      {membersToAdd.map((member) => (
                        <div key={`adding-${member.id}`} className="flex items-center gap-4 opacity-50">
                          <Avatar className="size-10">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback className="text-sm font-normal text-foreground">
                              {getUserInitials(member)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">
                              {member.full_name || 'Bez nazwiska'} (oczekuje)
                            </div>
                            <div className="text-sm text-muted-foreground truncate">
                              {member.email}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUndoAdd(member.id)}
                            className="h-8 px-3 text-xs"
                          >
                            Cofnij
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex flex-row gap-2 items-center justify-between w-full p-6 pt-0 bg-background">
                <Button 
                  variant="outline"
                  onClick={handleCloseSheet}
                  className="h-9"
                >
                  Anuluj
                </Button>
                <Button 
                  onClick={handleUpdateTeam}
                  disabled={!hasChanges || loading}
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

      {/* Unsaved Changes Dialog */}
      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Niezapisane zmiany</DialogTitle>
            <DialogDescription>
              Masz niezapisane zmiany. Czy na pewno chcesz zamknąć panel bez ich zapisania?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowUnsavedDialog(false)}
            >
              Pozostań
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                setShowUnsavedDialog(false)
                setPendingChanges({ toAdd: [], toRemove: [] })
                onOpenChange(false)
              }}
            >
              Odrzuć zmiany
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 