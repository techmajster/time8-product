'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Plus, Trash, Users } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { CreateTemplateDialog } from './CreateTemplateDialog'
import { EditTemplateDialog } from './EditTemplateDialog'
import { AssignTemplateDialog } from './AssignTemplateDialog'

interface WorkScheduleTemplate {
  id: string
  name: string
  description?: string
  is_default: boolean
  schedule_type: 'fixed' | 'flexible' | 'shift'
  organization_id: string
  monday_start?: string
  monday_end?: string
  monday_is_working: boolean
  tuesday_start?: string
  tuesday_end?: string
  tuesday_is_working: boolean
  wednesday_start?: string
  wednesday_end?: string
  wednesday_is_working: boolean
  thursday_start?: string
  thursday_end?: string
  thursday_is_working: boolean
  friday_start?: string
  friday_end?: string
  friday_is_working: boolean
  saturday_start?: string
  saturday_end?: string
  saturday_is_working: boolean
  sunday_start?: string
  sunday_end?: string
  sunday_is_working: boolean
  created_at: string
  updated_at: string
}

interface ScheduleTemplateManagerProps {
  userRole: 'admin' | 'manager' | 'employee'
}

async function fetchTemplates(): Promise<WorkScheduleTemplate[]> {
  const response = await fetch('/api/schedule/templates')
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`HTTP ${response.status}: ${errorData.error} - ${errorData.details || ''}`)
  }
  const data = await response.json()
  return data.templates || []
}

export function ScheduleTemplateManager({ userRole }: ScheduleTemplateManagerProps) {
  const [templates, setTemplates] = useState<WorkScheduleTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      setError(null)
      const templatesData = await fetchTemplates()
      setTemplates(templatesData)
    } catch (err) {
      console.error('Error fetching templates:', err)
      setError(err instanceof Error ? err.message : 'Błąd podczas ładowania szablonów')
    } finally {
      setLoading(false)
    }
  }

  const createDefaultTemplates = async () => {
    try {
      const response = await fetch('/api/schedule/create-default-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create templates')
      }

      toast.success(data.message)
      await loadTemplates() // Refresh templates
      
    } catch (error) {
      console.error('Error creating default templates:', error)
      toast.error(error instanceof Error ? error.message : 'Błąd podczas tworzenia szablonów')
    }
  }

  const handleDeleteTemplate = async (template: WorkScheduleTemplate) => {
    if (!confirm(`Czy na pewno chcesz usunąć szablon "${template.name}"? Ta akcja nie może zostać cofnięta.`)) {
      return
    }

    try {
      const response = await fetch(`/api/schedule/templates/${template.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete template')
      }

      toast.success(`Szablon "${template.name}" został usunięty`)
      await loadTemplates() // Refresh templates
      
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error(error instanceof Error ? error.message : 'Błąd podczas usuwania szablonu')
    }
  }

  const formatTime = (time?: string) => {
    if (!time) return '--:--'
    return time.slice(0, 5) // Extract HH:MM from HH:MM:SS
  }

  const getWorkingDays = (template: WorkScheduleTemplate) => {
    const days = []
    if (template.monday_is_working) days.push('Pn')
    if (template.tuesday_is_working) days.push('Wt')
    if (template.wednesday_is_working) days.push('Śr')
    if (template.thursday_is_working) days.push('Czw')
    if (template.friday_is_working) days.push('Pt')
    if (template.saturday_is_working) days.push('Sob')
    if (template.sunday_is_working) days.push('Nd')
    return days.join(', ')
  }

  const getScheduleTypeDisplay = (type: string) => {
    switch (type) {
      case 'fixed': return 'Stały'
      case 'flexible': return 'Elastyczny'
      case 'shift': return 'Zmianowy'
      default: return type
    }
  }

  const canManageTemplates = userRole === 'admin' || userRole === 'manager'

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Szablony harmonogramów
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Ładowanie szablonów...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Szablony harmonogramów
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={loadTemplates} 
            variant="outline" 
            className="mt-4"
          >
            Spróbuj ponownie
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Szablony harmonogramów
            </CardTitle>
            <CardDescription>
              Zarządzaj wzorcami godzin pracy dla organizacji
            </CardDescription>
          </div>
          {canManageTemplates && (
            <CreateTemplateDialog onTemplateCreated={loadTemplates} />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Brak szablonów</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Nie znaleziono żadnych szablonów harmonogramów dla Twojej organizacji.
            </p>
            {canManageTemplates && (
              <div className="flex gap-2">
                <Button onClick={createDefaultTemplates}>
                  <Plus className="h-4 w-4 mr-2" />
                  Utwórz domyślne szablony
                </Button>
                <CreateTemplateDialog 
                  onTemplateCreated={loadTemplates}
                  trigger={
                    <Button variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Własny szablon
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map((template) => (
              <Card key={template.id} className="border-l-4 border-l-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{template.name}</h3>
                        {template.is_default && (
                          <Badge variant="default">Domyślny</Badge>
                        )}
                        <Badge variant="outline">
                          {getScheduleTypeDisplay(template.schedule_type)}
                        </Badge>
                      </div>
                      
                      {template.description && (
                        <p className="text-sm text-muted-foreground">
                          {template.description}
                        </p>
                      )}
                      
                      <div className="space-y-1">
                        <p className="text-sm">
                          <span className="font-medium">Dni robocze:</span> {getWorkingDays(template)}
                        </p>
                        
                        {template.schedule_type === 'fixed' && (
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            {template.monday_is_working && (
                              <div>
                                <span className="font-medium">Pon:</span> {formatTime(template.monday_start)} - {formatTime(template.monday_end)}
                              </div>
                            )}
                            {template.tuesday_is_working && (
                              <div>
                                <span className="font-medium">Wt:</span> {formatTime(template.tuesday_start)} - {formatTime(template.tuesday_end)}
                              </div>
                            )}
                            {template.wednesday_is_working && (
                              <div>
                                <span className="font-medium">Śr:</span> {formatTime(template.wednesday_start)} - {formatTime(template.wednesday_end)}
                              </div>
                            )}
                            {template.thursday_is_working && (
                              <div>
                                <span className="font-medium">Czw:</span> {formatTime(template.thursday_start)} - {formatTime(template.thursday_end)}
                              </div>
                            )}
                            {template.friday_is_working && (
                              <div>
                                <span className="font-medium">Pt:</span> {formatTime(template.friday_start)} - {formatTime(template.friday_end)}
                              </div>
                            )}
                            {template.saturday_is_working && (
                              <div>
                                <span className="font-medium">Sob:</span> {formatTime(template.saturday_start)} - {formatTime(template.saturday_end)}
                              </div>
                            )}
                            {template.sunday_is_working && (
                              <div>
                                <span className="font-medium">Nd:</span> {formatTime(template.sunday_start)} - {formatTime(template.sunday_end)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {canManageTemplates && (
                      <div className="flex gap-2">
                        <EditTemplateDialog 
                          template={template}
                          onTemplateUpdated={loadTemplates}
                        />
                        <AssignTemplateDialog 
                          template={template}
                          onAssignmentComplete={loadTemplates}
                        />
                        {!template.is_default && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteTemplate(template)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 