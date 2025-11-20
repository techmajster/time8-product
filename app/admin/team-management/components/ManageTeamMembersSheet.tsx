'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, Plus, Minus } from 'lucide-react'
import { toast } from 'sonner'
import { refetchTeamManagement } from '@/lib/refetch-events'
import { getInitials } from '@/lib/utils/initials'

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
  const t = useTranslations('groups')
  const [loading, setLoading] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<{
    toAdd: string[]
    toRemove: string[]
  }>({ toAdd: [], toRemove: [] })

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
    return getInitials(member.full_name, member.email.charAt(0).toUpperCase())
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
        refetchTeamManagement()
      }

    } catch (error) {
      console.error('Error updating team:', error)
      toast.error(error instanceof Error ? error.message : 'Błąd podczas aktualizacji grupy')
    } finally {
      setLoading(false)
    }
  }

  // Apply pending changes to display
  const displayCurrentMembers = currentTeamMembers.filter(member =>
    !pendingChanges.toRemove.includes(member.id)
  ).concat(
    teamMembers.filter(member => pendingChanges.toAdd.includes(member.id))
  )

  const displayAvailableMembers = availableMembers.filter(member =>
    !pendingChanges.toAdd.includes(member.id)
  ).concat(
    currentTeamMembers.filter(member => pendingChanges.toRemove.includes(member.id))
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
                {t('membersSheet.title')}
              </SheetTitle>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-8">
              <div className="flex flex-col gap-8">
                {/* Current Team Members Table */}
                <div className="flex flex-col gap-3">
                  <div className="text-sm font-medium text-foreground">
                    {t('membersSheet.currentMembers', { name: selectedTeam?.name })}
                  </div>
                  <div className="overflow-hidden">
                    {displayCurrentMembers.length > 0 ? (
                      <div className="divide-y border-y">
                        {displayCurrentMembers.map((member) => {
                          const isPendingRemoval = pendingChanges.toRemove.includes(member.id)
                          const isPendingAdd = pendingChanges.toAdd.includes(member.id)

                          return (
                            <div
                              key={member.id}
                              className={`flex items-center h-[52px] px-2 ${isPendingRemoval || isPendingAdd ? 'bg-muted/50' : 'bg-background'}`}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <Avatar className="size-10">
                                  <AvatarImage src={member.avatar_url || undefined} />
                                  <AvatarFallback className="text-sm font-normal text-foreground">
                                    {getUserInitials(member)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col flex-1 min-w-0">
                                  <div className="text-sm font-medium text-foreground truncate">
                                    {member.full_name || t('noLastName')}
                                  </div>
                                  <div className="text-sm text-muted-foreground truncate">
                                    {member.email}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className={`px-2 py-1 rounded-md text-xs font-semibold ${
                                  member.id === selectedTeam?.manager?.id
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-background border border-border text-foreground'
                                }`}>
                                  {member.id === selectedTeam?.manager?.id ? t('membersSheet.roles.manager') : t('membersSheet.roles.employee')}
                                </div>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="size-9"
                                  onClick={() => isPendingRemoval ? setPendingChanges(prev => ({ ...prev, toRemove: prev.toRemove.filter(id => id !== member.id) })) : handleRemoveMember(member.id)}
                                >
                                  <Minus className="size-4" />
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground py-8 text-center">
                        {t('membersSheet.noCurrentMembers')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Available Members Table */}
                <div className="flex flex-col gap-3">
                  <div className="text-sm font-medium text-foreground">
                    {t('membersSheet.availableMembers')}
                  </div>
                  <div className="overflow-hidden">
                    {displayAvailableMembers.length > 0 ? (
                      <div className="divide-y border-y">
                        {displayAvailableMembers.map((member) => {
                          const isPendingAdd = pendingChanges.toAdd.includes(member.id)
                          const isPendingRemoval = pendingChanges.toRemove.includes(member.id)

                          return (
                            <div
                              key={member.id}
                              className={`flex items-center h-[52px] px-2 ${isPendingAdd || isPendingRemoval ? 'bg-muted/50' : 'bg-background'}`}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <Avatar className="size-10">
                                  <AvatarImage src={member.avatar_url || undefined} />
                                  <AvatarFallback className="text-sm font-normal text-foreground">
                                    {getUserInitials(member)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col flex-1 min-w-0">
                                  <div className="text-sm font-medium text-foreground truncate">
                                    {member.full_name || t('noLastName')}
                                  </div>
                                  <div className="text-sm text-muted-foreground truncate">
                                    {member.email}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="px-2 py-1 rounded-md bg-background border border-border text-foreground text-xs font-semibold">
                                  {t('membersSheet.roles.employee')}
                                </div>
                                <Button
                                  size="icon"
                                  className="size-9"
                                  onClick={() => isPendingAdd ? setPendingChanges(prev => ({ ...prev, toAdd: prev.toAdd.filter(id => id !== member.id) })) : handleAddMember(member.id)}
                                >
                                  <Plus className="size-4" />
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground py-8 text-center">
                        {t('membersSheet.noAvailableMembers')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-row gap-2 items-center justify-between w-full p-6 pt-0 bg-background">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-9"
              >
                {t('membersSheet.cancel')}
              </Button>
              <Button
                onClick={handleUpdateTeam}
                disabled={!hasChanges || loading}
                className="h-9"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('membersSheet.saveChanges')}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
