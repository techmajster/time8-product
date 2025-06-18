'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar as CalendarIcon, Edit, Clock, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { DatePicker } from '@/components/ui/date-picker'

interface TeamMember {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager' | 'employee'
  avatar_url?: string
}

interface EmployeeSchedule {
  id: string
  user_id: string
  date: string
  shift_start_time?: string
  shift_end_time?: string
  is_working_day: boolean
  notes?: string
}

interface WorkScheduleTemplate {
  id: string
  name: string
  description?: string
  is_default: boolean
  schedule_type: 'fixed' | 'flexible' | 'shift'
}

interface EditEmployeeScheduleDialogProps {
  employee: TeamMember
  onScheduleUpdated: () => void
  trigger?: React.ReactNode
}

export function EditEmployeeScheduleDialog({ employee, onScheduleUpdated, trigger }: EditEmployeeScheduleDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [schedules, setSchedules] = useState<EmployeeSchedule[]>([])
  const [templates, setTemplates] = useState<WorkScheduleTemplate[]>([])
  const [selectedAction, setSelectedAction] = useState<'template' | 'custom' | 'view'>('view')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [customSchedule, setCustomSchedule] = useState({
    start_date: '',
    end_date: '',
    shift_start_time: '09:00',
    shift_end_time: '17:00',
    is_working_day: true,
    notes: '',
    days_of_week: [] as number[] // 1=Monday, 7=Sunday
  })

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load employee schedules and templates
      const [schedulesRes, templatesRes] = await Promise.all([
        fetch(`/api/schedule/employee/${employee.id}`),
        fetch('/api/schedule/templates')
      ])

      const schedulesData = await schedulesRes.json()
      const templatesData = await templatesRes.json()

      if (schedulesRes.ok) {
        setSchedules(schedulesData.schedules || [])
      }

      if (templatesRes.ok) {
        setTemplates(templatesData.templates || [])
      }

    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Błąd podczas ładowania danych')
    } finally {
      setLoading(false)
    }
  }

  const handleAssignTemplate = async () => {
    if (!selectedTemplate) {
      toast.error('Wybierz szablon')
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch('/api/schedule/assign-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_ids: [employee.id],
          template_id: selectedTemplate
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign template')
      }

      toast.success('Szablon został przypisany')
      setOpen(false)
      onScheduleUpdated()
      
    } catch (error) {
      console.error('Error assigning template:', error)
      toast.error(error instanceof Error ? error.message : 'Błąd podczas przypisywania szablonu')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCustomSchedule = async () => {
    if (!customSchedule.start_date || !customSchedule.end_date) {
      toast.error('Wybierz zakres dat')
      return
    }

    if (customSchedule.days_of_week.length === 0) {
      toast.error('Wybierz przynajmniej jeden dzień tygodnia')
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch('/api/schedule/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employee.id,
          ...customSchedule
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create custom schedule')
      }

      toast.success('Harmonogram został utworzony')
      setOpen(false)
      onScheduleUpdated()
      
    } catch (error) {
      console.error('Error creating custom schedule:', error)
      toast.error(error instanceof Error ? error.message : 'Błąd podczas tworzenia harmonogramu')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSchedules = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/schedule/employee/${employee.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete schedules')
      }

      toast.success('Harmonogramy zostały usunięte')
      setOpen(false)
      onScheduleUpdated()
      
    } catch (error) {
      console.error('Error deleting schedules:', error)
      toast.error(error instanceof Error ? error.message : 'Błąd podczas usuwania harmonogramów')
    } finally {
      setLoading(false)
    }
  }

  const toggleDayOfWeek = (day: number) => {
    setCustomSchedule(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day].sort()
    }))
  }

  const formatTime = (time?: string) => {
    if (!time) return '--:--'
    return time.slice(0, 5)
  }

  const getDayName = (dayNum: number) => {
    const days = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota']
    return days[dayNum]
  }

  const getScheduleStats = () => {
    const totalDays = schedules.length
    const workingDays = schedules.filter(s => s.is_working_day).length
    const nonWorkingDays = totalDays - workingDays
    
    return { totalDays, workingDays, nonWorkingDays }
  }

  const stats = getScheduleStats()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Zarządzaj harmonogramem: {employee.full_name}
          </DialogTitle>
          <DialogDescription>
            Przeglądaj i modyfikuj harmonogram pracy dla {employee.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Schedule Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Aktualny harmonogram
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalDays}</div>
                  <div className="text-sm text-muted-foreground">Łączne dni</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.workingDays}</div>
                  <div className="text-sm text-muted-foreground">Dni robocze</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{stats.nonWorkingDays}</div>
                  <div className="text-sm text-muted-foreground">Dni wolne</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Akcje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  variant={selectedAction === 'view' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedAction('view')}
                >
                  Podgląd
                </Button>
                <Button
                  variant={selectedAction === 'template' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedAction('template')}
                >
                  Przypisz szablon
                </Button>
                <Button
                  variant={selectedAction === 'custom' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedAction('custom')}
                >
                  Własny harmonogram
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Content based on selected action */}
          {selectedAction === 'view' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Najnowsze harmonogramy</CardTitle>
              </CardHeader>
              <CardContent>
                {schedules.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Brak harmonogramów</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {schedules.slice(0, 20).map((schedule) => (
                      <div key={schedule.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-3">
                          <Badge variant={schedule.is_working_day ? 'default' : 'outline'}>
                            {schedule.date}
                          </Badge>
                          {schedule.is_working_day ? (
                            <span className="text-sm">
                              {formatTime(schedule.shift_start_time)} - {formatTime(schedule.shift_end_time)}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">Dzień wolny</span>
                          )}
                        </div>
                        {schedule.notes && (
                          <span className="text-xs text-muted-foreground">{schedule.notes}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {selectedAction === 'template' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Przypisz szablon harmonogramu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Wybierz szablon</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz szablon..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            <span>{template.name}</span>
                            {template.is_default && (
                              <Badge variant="secondary" className="text-xs">Domyślny</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="bg-yellow-50 p-3 rounded border">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Przypisanie szablonu zastąpi wszystkie istniejące harmonogramy dla tego pracownika.
                  </p>
                </div>

                <Button onClick={handleAssignTemplate} disabled={!selectedTemplate || loading}>
                  {loading ? 'Przypisywanie...' : 'Przypisz szablon'}
                </Button>
              </CardContent>
            </Card>
          )}

          {selectedAction === 'custom' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Utwórz własny harmonogram</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data rozpoczęcia</Label>
                    <DatePicker
                      date={customSchedule.start_date ? new Date(customSchedule.start_date) : undefined}
                      onDateChange={(date) => setCustomSchedule(prev => ({ ...prev, start_date: date ? date.toISOString().split('T')[0] : '' }))}
                      placeholder="Wybierz datę rozpoczęcia"
                    />
                  </div>
                  <div>
                    <Label>Data zakończenia</Label>
                    <DatePicker
                      date={customSchedule.end_date ? new Date(customSchedule.end_date) : undefined}
                      onDateChange={(date) => setCustomSchedule(prev => ({ ...prev, end_date: date ? date.toISOString().split('T')[0] : '' }))}
                      placeholder="Wybierz datę zakończenia"
                    />
                  </div>
                </div>

                <div>
                  <Label>Dni tygodnia</Label>
                  <div className="flex gap-2 mt-2">
                    {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                      <Button
                        key={day}
                        type="button"
                        variant={customSchedule.days_of_week.includes(day) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleDayOfWeek(day)}
                      >
                        {getDayName(day).slice(0, 3)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={customSchedule.is_working_day}
                    onCheckedChange={(checked) => setCustomSchedule(prev => ({ ...prev, is_working_day: checked }))}
                  />
                  <Label>Dzień roboczy</Label>
                </div>

                {customSchedule.is_working_day && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Godzina rozpoczęcia</Label>
                      <Input
                        type="time"
                        value={customSchedule.shift_start_time}
                        onChange={(e) => setCustomSchedule(prev => ({ ...prev, shift_start_time: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Godzina zakończenia</Label>
                      <Input
                        type="time"
                        value={customSchedule.shift_end_time}
                        onChange={(e) => setCustomSchedule(prev => ({ ...prev, shift_end_time: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label>Notatki</Label>
                  <Textarea
                    placeholder="Dodatkowe informacje o harmonogramie..."
                    value={customSchedule.notes}
                    onChange={(e) => setCustomSchedule(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                  />
                </div>

                <Button onClick={handleCreateCustomSchedule} disabled={loading}>
                  {loading ? 'Tworzenie...' : 'Utwórz harmonogram'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Danger Zone */}
          {schedules.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-sm text-red-600">Strefa niebezpieczna</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Usuń wszystkie harmonogramy dla tego pracownika. Ta akcja nie może zostać cofnięta.
                </p>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteSchedules}
                  disabled={loading}
                >
                  {loading ? 'Usuwanie...' : 'Usuń wszystkie harmonogramy'}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Zamknij
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 