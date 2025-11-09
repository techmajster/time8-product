import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, ChevronDownIcon } from 'lucide-react'
import { toast } from 'sonner'
import { refetchTeamManagement } from '@/lib/refetch-events'

/**
 * CREATE GROUP COMPONENT
 * 
 * Note: This component is named "CreateTeamSheet" for historical reasons,
 * but it creates "groups" in the UI terminology. The underlying API uses /api/teams
 * but the UI consistently refers to these as "groups" to differentiate from 
 * organizational teams.
 */

interface TeamMember {
  id: string
  email: string
  full_name: string | null
  role: string
}

interface CreateTeamSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamMembers: TeamMember[]
  onTeamCreated?: () => void
}

export function CreateTeamSheet({ open, onOpenChange, teamMembers, onTeamCreated }: CreateTeamSheetProps) {
  const t = useTranslations('groups')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    manager_id: ''
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      manager_id: ''
    })
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
      onOpenChange(false)
      resetForm()

      // Call the callback to refresh data
      if (onTeamCreated) {
        onTeamCreated()
      } else {
        // Fallback to event-driven refetch
        refetchTeamManagement()
      }

    } catch (error) {
      console.error('Error creating group:', error)
      toast.error(error instanceof Error ? error.message : 'Błąd podczas tworzenia grupy')
    } finally {
      setLoading(false)
    }
  }

  // Get potential managers (admins and managers)
  const potentialManagers = teamMembers.filter(member => 
    member.role === 'admin' || member.role === 'manager'
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
            <div className="flex flex-col gap-6 p-6 flex-1 overflow-y-auto">
              <div className="flex flex-col gap-1.5 w-full">
                <SheetTitle className="text-xl font-semibold text-foreground">{t('createSheet.title')}</SheetTitle>
                <SheetDescription className="text-sm text-muted-foreground">
                  {t('createSheet.subtitle')}
                </SheetDescription>
              </div>

              {/* Separator */}
              <div className="w-full h-px bg-border" />

              {/* Form */}
              <form onSubmit={(e) => { e.preventDefault(); handleCreateTeam() }} className="space-y-6 flex-1">
                <div className="space-y-2">
                  <Label htmlFor="create-name" className="text-sm font-medium">{t('createSheet.nameLabel')}</Label>
                  <Input
                    id="create-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={t('createSheet.namePlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-description" className="text-sm font-medium">{t('createSheet.descriptionLabel')}</Label>
                  <Textarea
                    id="create-description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={t('createSheet.descriptionPlaceholder')}
                    className="min-h-[60px] resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {t('createSheet.managerLabel')} <span className="text-muted-foreground">{t('createSheet.managerOptional')}</span>
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
                                    {selectedManager.full_name ? selectedManager.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : selectedManager.email.charAt(0).toUpperCase()}
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
                          <span className="text-muted-foreground">{t('createSheet.managerPlaceholder')}</span>
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
                            <div className="text-sm font-medium">{t('createSheet.noManager')}</div>
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
                                  {manager.full_name ? manager.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : manager.email.charAt(0).toUpperCase()}
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
              </form>
            </div>
            
            {/* Footer - Fixed at Bottom */}
            <div className="flex flex-row gap-2 items-center justify-between w-full p-6 pt-0 bg-background">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-9"
              >
                {t('createSheet.cancel')}
              </Button>
              <Button
                onClick={handleCreateTeam}
                disabled={loading || !formData.name.trim()}
                className="h-9"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('createSheet.create')}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
} 