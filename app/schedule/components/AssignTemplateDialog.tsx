'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Clock, User } from 'lucide-react'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'

interface WorkScheduleTemplate {
  id: string
  name: string
  description?: string
  is_default: boolean
  schedule_type: 'fixed' | 'flexible' | 'shift'
}

interface TeamMember {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager' | 'employee'
  avatar_url?: string
}

interface AssignTemplateDialogProps {
  template: WorkScheduleTemplate
  onAssignmentComplete: () => void
  trigger?: React.ReactNode
}

export function AssignTemplateDialog({ template, onAssignmentComplete, trigger }: AssignTemplateDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)

  useEffect(() => {
    if (open) {
      loadTeamMembers()
    }
  }, [open])

  const loadTeamMembers = async () => {
    try {
      setLoadingEmployees(true)
      
      const response = await fetch('/api/schedule/employee-info')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load team members')
      }

      // Extract unique team members from the employee info
      const employees = data.employees?.map((emp: any) => emp.employee) || []
      setTeamMembers(employees)
      
    } catch (error) {
      console.error('Error loading team members:', error)
      toast.error('Błąd podczas ładowania członków zespołu')
    } finally {
      setLoadingEmployees(false)
    }
  }

  const handleAssignTemplate = async () => {
    if (selectedEmployees.length === 0) {
      toast.error('Wybierz przynajmniej jednego pracownika')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/schedule/assign-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_ids: selectedEmployees,
          template_id: template.id
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign template')
      }

      toast.success(`Szablon "${template.name}" został przypisany do ${selectedEmployees.length} pracowników`)
      setOpen(false)
      setSelectedEmployees([])
      onAssignmentComplete()
      
    } catch (error) {
      console.error('Error assigning template:', error)
      toast.error(error instanceof Error ? error.message : 'Błąd podczas przypisywania szablonu')
    } finally {
      setLoading(false)
    }
  }

  const handleEmployeeSelection = (employeeId: string, checked: boolean) => {
    if (checked) {
      setSelectedEmployees(prev => [...prev, employeeId])
    } else {
      setSelectedEmployees(prev => prev.filter(id => id !== employeeId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmployees(teamMembers.map(member => member.id))
    } else {
      setSelectedEmployees([])
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Users className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Przypisz szablon: {template.name}
          </DialogTitle>
          <DialogDescription>
            Wybierz pracowników, którym chcesz przypisać ten szablon harmonogramu. 
            Istniejące harmonogramy zostaną zastąpione.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Szczegóły szablonu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={template.is_default ? 'default' : 'outline'}>
                  {template.is_default ? 'Domyślny' : 'Własny'}
                </Badge>
                <Badge variant="secondary">
                  {template.schedule_type === 'fixed' ? 'Stały' : 
                   template.schedule_type === 'flexible' ? 'Elastyczny' : 'Zmianowy'}
                </Badge>
              </div>
              {template.description && (
                <p className="text-sm text-muted-foreground">{template.description}</p>
              )}
            </CardContent>
          </Card>

          {/* Team Members Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Wybierz pracowników</CardTitle>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedEmployees.length === teamMembers.length && teamMembers.length > 0}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    />
                    <span>Zaznacz wszystkich ({selectedEmployees.length}/{teamMembers.length})</span>
                  </label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingEmployees ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Ładowanie pracowników...</p>
                  </div>
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Brak członków zespołu</h3>
                  <p className="text-sm text-muted-foreground">
                    Nie znaleziono członków zespołu do przypisania szablonu.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {teamMembers.map((member) => (
                    <div 
                      key={member.id} 
                      className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={selectedEmployees.includes(member.id)}
                        onCheckedChange={(checked) => handleEmployeeSelection(member.id, !!checked)}
                      />
                      
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback>
                          {member.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {member.full_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {member.email}
                        </div>
                      </div>
                      
                      <Badge variant="outline" className="text-xs">
                        {member.role === 'admin' ? 'Administrator' :
                         member.role === 'manager' ? 'Menedżer' : 'Pracownik'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Warning */}
          {selectedEmployees.length > 0 && (
            <div className="bg-warning/10 p-4 rounded-lg border border-warning/20">
              <div className="flex items-start gap-2">
                <div className="text-warning text-sm">⚠️</div>
                <div className="text-sm text-warning-foreground">
                                          <p className="font-medium text-foreground mb-1">Uwaga!</p>
                  <p>
                    Przypisanie szablonu do {selectedEmployees.length} pracowników zastąpi wszystkie ich 
                    istniejące harmonogramy. Ta akcja nie może zostać cofnięta.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Anuluj
          </Button>
          <Button 
            onClick={handleAssignTemplate}
            disabled={selectedEmployees.length === 0 || loading}
          >
            {loading ? 'Przypisywanie...' : `Przypisz szablon (${selectedEmployees.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 