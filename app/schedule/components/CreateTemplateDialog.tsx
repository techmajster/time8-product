'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface CreateTemplateDialogProps {
  onTemplateCreated: () => void
  trigger?: React.ReactNode
}

interface TemplateData {
  name: string
  description: string
  schedule_type: 'fixed' | 'flexible' | 'shift'
  is_default: boolean
  monday_start: string
  monday_end: string
  monday_is_working: boolean
  tuesday_start: string
  tuesday_end: string
  tuesday_is_working: boolean
  wednesday_start: string
  wednesday_end: string
  wednesday_is_working: boolean
  thursday_start: string
  thursday_end: string
  thursday_is_working: boolean
  friday_start: string
  friday_end: string
  friday_is_working: boolean
  saturday_start: string
  saturday_end: string
  saturday_is_working: boolean
  sunday_start: string
  sunday_end: string
  sunday_is_working: boolean
}

const defaultTemplateData: TemplateData = {
  name: '',
  description: '',
  schedule_type: 'fixed',
  is_default: false,
  monday_start: '09:00',
  monday_end: '17:00',
  monday_is_working: true,
  tuesday_start: '09:00',
  tuesday_end: '17:00',
  tuesday_is_working: true,
  wednesday_start: '09:00',
  wednesday_end: '17:00',
  wednesday_is_working: true,
  thursday_start: '09:00',
  thursday_end: '17:00',
  thursday_is_working: true,
  friday_start: '09:00',
  friday_end: '17:00',
  friday_is_working: true,
  saturday_start: '09:00',
  saturday_end: '17:00',
  saturday_is_working: false,
  sunday_start: '09:00',
  sunday_end: '17:00',
  sunday_is_working: false,
}

const dayNames = [
  { key: 'monday', label: 'Poniedziałek' },
  { key: 'tuesday', label: 'Wtorek' },
  { key: 'wednesday', label: 'Środa' },
  { key: 'thursday', label: 'Czwartek' },
  { key: 'friday', label: 'Piątek' },
  { key: 'saturday', label: 'Sobota' },
  { key: 'sunday', label: 'Niedziela' },
]

export function CreateTemplateDialog({ onTemplateCreated, trigger }: CreateTemplateDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [templateData, setTemplateData] = useState<TemplateData>(defaultTemplateData)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!templateData.name.trim()) {
      toast.error('Nazwa szablonu jest wymagana')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/schedule/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...templateData,
          // Convert time format from HH:MM to HH:MM:SS
          monday_start: templateData.monday_is_working ? `${templateData.monday_start}:00` : null,
          monday_end: templateData.monday_is_working ? `${templateData.monday_end}:00` : null,
          tuesday_start: templateData.tuesday_is_working ? `${templateData.tuesday_start}:00` : null,
          tuesday_end: templateData.tuesday_is_working ? `${templateData.tuesday_end}:00` : null,
          wednesday_start: templateData.wednesday_is_working ? `${templateData.wednesday_start}:00` : null,
          wednesday_end: templateData.wednesday_is_working ? `${templateData.wednesday_end}:00` : null,
          thursday_start: templateData.thursday_is_working ? `${templateData.thursday_start}:00` : null,
          thursday_end: templateData.thursday_is_working ? `${templateData.thursday_end}:00` : null,
          friday_start: templateData.friday_is_working ? `${templateData.friday_start}:00` : null,
          friday_end: templateData.friday_is_working ? `${templateData.friday_end}:00` : null,
          saturday_start: templateData.saturday_is_working ? `${templateData.saturday_start}:00` : null,
          saturday_end: templateData.saturday_is_working ? `${templateData.saturday_end}:00` : null,
          sunday_start: templateData.sunday_is_working ? `${templateData.sunday_start}:00` : null,
          sunday_end: templateData.sunday_is_working ? `${templateData.sunday_end}:00` : null,
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create template')
      }

      toast.success('Szablon został utworzony pomyślnie')
      setOpen(false)
      setTemplateData(defaultTemplateData)
      onTemplateCreated()
      
    } catch (error) {
      console.error('Error creating template:', error)
      toast.error(error instanceof Error ? error.message : 'Błąd podczas tworzenia szablonu')
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: keyof TemplateData, value: string | boolean) => {
    setTemplateData(prev => ({ ...prev, [field]: value }))
  }

  const toggleWorkingDay = (day: string, isWorking: boolean) => {
    setTemplateData(prev => ({
      ...prev,
      [`${day}_is_working`]: isWorking
    }))
  }

  const updateDayTime = (day: string, timeType: 'start' | 'end', value: string) => {
    setTemplateData(prev => ({
      ...prev,
      [`${day}_${timeType}`]: value
    }))
  }

  const setAllDaysTo = (startTime: string, endTime: string, workingDays: string[]) => {
    const updates: Record<string, boolean | string> = {}
    
    dayNames.forEach(({ key }) => {
      const isWorking = workingDays.includes(key)
      updates[`${key}_is_working`] = isWorking
      updates[`${key}_start`] = isWorking ? startTime : '09:00'
      updates[`${key}_end`] = isWorking ? endTime : '17:00'
    })
    
    setTemplateData(prev => ({ ...prev, ...updates as Partial<TemplateData> }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nowy szablon
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Utwórz nowy szablon harmonogramu
          </DialogTitle>
          <DialogDescription>
            Stwórz wzorzec godzin pracy, który będzie można przypisać do pracowników
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nazwa szablonu *</Label>
              <Input
                id="name"
                placeholder="np. Standardowy 9-17"
                value={templateData.name}
                onChange={(e) => updateField('name', e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="schedule_type">Typ harmonogramu</Label>
              <Select value={templateData.schedule_type} onValueChange={(value) => updateField('schedule_type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Stały</SelectItem>
                  <SelectItem value="flexible">Elastyczny</SelectItem>
                  <SelectItem value="shift">Zmianowy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Opis</Label>
            <Textarea
              id="description"
              placeholder="Krótki opis harmonogramu pracy..."
              value={templateData.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_default"
              checked={templateData.is_default}
              onCheckedChange={(checked) => updateField('is_default', checked)}
            />
            <Label htmlFor="is_default">Ustaw jako szablon domyślny</Label>
          </div>

          {/* Quick Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Szybka konfiguracja</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setAllDaysTo('09:00', '17:00', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])}
                >
                  Standardowy (Pn-Pt 9-17)
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setAllDaysTo('06:00', '14:00', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])}
                >
                  Wczesna zmiana (6-14)
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setAllDaysTo('14:00', '22:00', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])}
                >
                  Późna zmiana (14-22)
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setAllDaysTo('08:00', '16:00', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])}
                >
                  7 dni w tygodniu
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Godziny pracy w tygodniu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {dayNames.map(({ key, label }) => {
                const isWorking = templateData[`${key}_is_working` as keyof TemplateData] as boolean
                const startTime = templateData[`${key}_start` as keyof TemplateData] as string
                const endTime = templateData[`${key}_end` as keyof TemplateData] as string

                return (
                  <div key={key} className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 w-32">
                      <Switch
                        checked={isWorking}
                        onCheckedChange={(checked) => toggleWorkingDay(key, checked)}
                      />
                      <Label className="text-sm font-medium">{label}</Label>
                    </div>
                    
                    {isWorking && (
                      <div className="flex items-center space-x-2">
                        <Input
                          type="time"
                          value={startTime}
                          onChange={(e) => updateDayTime(key, 'start', e.target.value)}
                          className="w-32"
                        />
                        <span className="text-muted-foreground">do</span>
                        <Input
                          type="time"
                          value={endTime}
                          onChange={(e) => updateDayTime(key, 'end', e.target.value)}
                          className="w-32"
                        />
                      </div>
                    )}
                    
                    {!isWorking && (
                      <span className="text-sm text-muted-foreground">Dzień wolny</span>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Tworzenie...' : 'Utwórz szablon'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 