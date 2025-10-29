import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Loader2, ChevronDownIcon } from 'lucide-react'
import { toast } from 'sonner'

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
        // Fallback to page reload if no callback provided
        window.location.reload()
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
                <SheetTitle className="text-xl font-semibold text-foreground">Dodaj nową grupę</SheetTitle>
                <SheetDescription className="text-sm text-muted-foreground">
                  Utwórz nową grupę w swojej organizacji
                </SheetDescription>
              </div>

              {/* Separator */}
              <div className="w-full h-px bg-border" />

              {/* Form */}
              <form onSubmit={(e) => { e.preventDefault(); handleCreateTeam() }} className="space-y-6 flex-1">
                <div className="space-y-2">
                  <Label htmlFor="create-name" className="text-sm font-medium">Nazwa grupy</Label>
                  <Input
                    id="create-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Wprowadź nazwę grupy"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="create-description" className="text-sm font-medium">Opis grupy</Label>
                  <Textarea
                    id="create-description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Opcjonalny opis grupy"
                    className="min-h-[60px] resize-none"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Wybierz managera grupy</Label>
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
                          <span className="text-muted-foreground">Wybierz managera grupy</span>
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
                onClick={() => onOpenChange(false)}
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
                Utwórz grupę
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
} 