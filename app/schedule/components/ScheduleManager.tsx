'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'

import { Calendar, Clock, User, Users, Edit, Trash, Plus } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { EditEmployeeScheduleDialog } from './EditEmployeeScheduleDialog'

interface TeamMember {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager' | 'employee'
  avatar_url?: string
}

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

interface EmployeeSchedule {
  id: string
  user_id: string
  organization_id: string
  date: string
  shift_start_time?: string
  shift_end_time?: string
  is_working_day: boolean
  notes?: string
  created_at?: string
  updated_at?: string
}

interface EmployeeScheduleInfo {
  employee: TeamMember
  current_template?: WorkScheduleTemplate
  schedule_count: number
  recent_schedules: EmployeeSchedule[]
}

interface ScheduleManagerProps {
  teamMembers: TeamMember[]
  userRole: 'admin' | 'manager' | 'employee'
}

export function ScheduleManager({ teamMembers, userRole }: ScheduleManagerProps) {
  const [scheduleInfo, setScheduleInfo] = useState<EmployeeScheduleInfo[]>([])
  const [templates, setTemplates] = useState<WorkScheduleTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [bulkAssignTemplate, setBulkAssignTemplate] = useState<string>('')
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)

  const canManageSchedules = userRole === 'admin' || userRole === 'manager'

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load templates and schedule data in parallel
      const [templatesData, schedulesData] = await Promise.all([
        fetchTemplates(),
        fetchEmployeeScheduleInfo()
      ])
      
      setTemplates(templatesData)
      setScheduleInfo(schedulesData)
    } catch (err) {
      console.error('Error loading schedule data:', err)
      setError(err instanceof Error ? err.message : 'Błąd podczas ładowania danych')
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async (): Promise<WorkScheduleTemplate[]> => {
    const response = await fetch('/api/schedule/templates')
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch templates')
    }
    
    return data.templates || []
  }

  const fetchEmployeeScheduleInfo = async (): Promise<EmployeeScheduleInfo[]> => {
    const response = await fetch('/api/schedule/employee-info')
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch employee schedule info')
    }
    
    return data.employees || []
  }

  const assignTemplateToEmployees = async (employeeIds: string[], templateId: string) => {
    try {
      const response = await fetch('/api/schedule/assign-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_ids: employeeIds,
          template_id: templateId
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign template')
      }

      toast.success(`Szablon został przypisany do ${employeeIds.length} pracowników`)
      
      // Refresh data
      await loadData()
      
      // Reset selection
      setSelectedEmployees([])
      setBulkAssignTemplate('')
      setAssignDialogOpen(false)
      
    } catch (error) {
      console.error('Error assigning template:', error)
      toast.error(error instanceof Error ? error.message : 'Błąd podczas przypisywania szablonu')
    }
  }

  const removeEmployeeSchedules = async (employeeId: string) => {
    try {
      const response = await fetch(`/api/schedule/employee/${employeeId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove schedules')
      }

      toast.success('Harmonogramy zostały usunięte')
      await loadData()
      
    } catch (error) {
      console.error('Error removing schedules:', error)
      toast.error(error instanceof Error ? error.message : 'Błąd podczas usuwania harmonogramów')
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
      setSelectedEmployees(teamMembers.map(m => m.id))
    } else {
      setSelectedEmployees([])
    }
  }

  const getScheduleCoverage = (info: EmployeeScheduleInfo) => {
    const weekCount = Math.ceil(info.schedule_count / 7)
    if (weekCount >= 4) return { label: 'Pełne pokrycie', color: 'bg-green-100 text-green-800' }
    if (weekCount >= 2) return { label: 'Częściowe pokrycie', color: 'bg-yellow-100 text-yellow-800' }
    if (weekCount >= 1) return { label: 'Minimalne pokrycie', color: 'bg-orange-100 text-orange-800' }
    return { label: 'Brak harmonogramu', color: 'bg-red-100 text-red-800' }
  }

  const formatTime = (time?: string) => {
    if (!time) return '--:--'
    return time.slice(0, 5)
  }

  const getWorkingHours = (info: EmployeeScheduleInfo) => {
    const workingSchedules = info.recent_schedules.filter(s => s.is_working_day)
    if (workingSchedules.length === 0) return 'Brak danych'
    
    const schedule = workingSchedules[0]
    if (!schedule.shift_start_time || !schedule.shift_end_time) return 'Elastyczne'
    
    return `${formatTime(schedule.shift_start_time)} - ${formatTime(schedule.shift_end_time)}`
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Zarządzanie harmonogramami
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Ładowanie danych...</p>
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
            <Users className="h-5 w-5" />
            Zarządzanie harmonogramami
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={loadData} variant="outline" className="mt-4">
            Spróbuj ponownie
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Zarządzanie harmonogramami
              </CardTitle>
              <CardDescription>
                Przypisz szablony harmonogramów i zarządzaj rozkładami pracy zespołu
              </CardDescription>
            </div>
            
            {canManageSchedules && (
              <div className="flex gap-2">
                <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="default" 
                      disabled={selectedEmployees.length === 0}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Przypisz szablon ({selectedEmployees.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Przypisz szablon harmonogramu</DialogTitle>
                      <DialogDescription>
                        Wybierz szablon do przypisania dla {selectedEmployees.length} pracowników
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Szablon harmonogramu</label>
                        <Select value={bulkAssignTemplate} onValueChange={setBulkAssignTemplate}>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz szablon..." />
                          </SelectTrigger>
                          <SelectContent>
                            {templates.map(template => (
                              <SelectItem key={template.id} value={template.id}>
                                <div className="flex items-center gap-2">
                                  <span>{template.name}</span>
                                  {template.is_default && (
                                    <Badge variant="secondary" className="text-xs">
                                      Domyślny
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                        Anuluj
                      </Button>
                      <Button 
                        onClick={() => assignTemplateToEmployees(selectedEmployees, bulkAssignTemplate)}
                        disabled={!bulkAssignTemplate}
                      >
                        Przypisz szablon
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {/* Bulk Actions */}
            {canManageSchedules && (
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedEmployees.length === teamMembers.length}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                  />
                  <span className="text-sm font-medium">
                    Zaznacz wszystkich ({selectedEmployees.length}/{teamMembers.length})
                  </span>
                </label>
              </div>
            )}

            {/* Employee Schedule Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    {canManageSchedules && <TableHead className="w-12"></TableHead>}
                    <TableHead>Pracownik</TableHead>
                    <TableHead>Status harmonogramu</TableHead>
                    <TableHead>Godziny pracy</TableHead>
                    <TableHead>Liczba dni</TableHead>
                    <TableHead>Ostatnia aktualizacja</TableHead>
                    {canManageSchedules && <TableHead className="text-right">Akcje</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduleInfo.map((info) => {
                    const coverage = getScheduleCoverage(info)
                    const workingHours = getWorkingHours(info)
                    const lastUpdate = info.recent_schedules[0]?.updated_at
                    
                    return (
                      <TableRow key={info.employee.id}>
                        {canManageSchedules && (
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedEmployees.includes(info.employee.id)}
                              onChange={(e) => handleEmployeeSelection(info.employee.id, e.target.checked)}
                              className="rounded"
                            />
                          </TableCell>
                        )}
                        
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={info.employee.avatar_url} />
                              <AvatarFallback>
                                {info.employee.full_name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{info.employee.full_name}</div>
                              <div className="text-sm text-muted-foreground">{info.employee.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <Badge className={coverage.color}>
                            {coverage.label}
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{workingHours}</span>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <span className="text-sm">{info.schedule_count} dni</span>
                        </TableCell>
                        
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {lastUpdate 
                              ? new Date(lastUpdate).toLocaleDateString('pl-PL')
                              : 'Brak danych'
                            }
                          </span>
                        </TableCell>
                        
                        {canManageSchedules && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <EditEmployeeScheduleDialog 
                                employee={info.employee}
                                onScheduleUpdated={loadData}
                                trigger={
                                  <Button variant="outline" size="sm">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                }
                              />
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Usuń harmonogramy</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Czy na pewno chcesz usunąć wszystkie harmonogramy dla {info.employee.full_name}? 
                                      Ta akcja nie może zostać cofnięta.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => removeEmployeeSchedules(info.employee.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Usuń harmonogramy
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Podsumowanie harmonogramów
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {scheduleInfo.filter(info => getScheduleCoverage(info).label === 'Pełne pokrycie').length}
              </div>
              <div className="text-sm text-muted-foreground">Pełne pokrycie</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {scheduleInfo.filter(info => ['Częściowe pokrycie', 'Minimalne pokrycie'].includes(getScheduleCoverage(info).label)).length}
              </div>
              <div className="text-sm text-muted-foreground">Częściowe pokrycie</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {scheduleInfo.filter(info => getScheduleCoverage(info).label === 'Brak harmonogramu').length}
              </div>
              <div className="text-sm text-muted-foreground">Brak harmonogramu</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {templates.length}
              </div>
              <div className="text-sm text-muted-foreground">Dostępne szablony</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 