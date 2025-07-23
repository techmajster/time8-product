'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { UserPlus, Upload, FileText, CheckCircle, XCircle, AlertTriangle, Download, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'

interface Team {
  id: string
  name: string
  color: string
}

interface Employee {
  email: string
  full_name: string
  role: 'admin' | 'manager' | 'employee'
  team_id?: string
  personal_message?: string
  send_invitation: boolean
}

interface ProcessingResult {
  email: string
  full_name: string
  role: string
  team_id?: string
  status: 'created' | 'invited'
  profile_id?: string
  invitation_id?: string
  invitation_code?: string
  verification_sent?: boolean
  invitation_sent?: boolean
}

interface ProcessingError {
  email: string
  error: string
}

export function AddEmployeeDialog() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [mode, setMode] = useState<'direct' | 'invitation'>('direct')
  const [currentTab, setCurrentTab] = useState('single')
  const [results, setResults] = useState<ProcessingResult[]>([])
  const [errors, setErrors] = useState<ProcessingError[]>([])
  
  // Single employee form
  const [singleEmployee, setSingleEmployee] = useState<Employee>({
    email: '',
    full_name: '',
    role: 'employee',
    team_id: '',
    personal_message: '',
    send_invitation: true
  })
  
  // Bulk employees
  const [bulkEmployees, setBulkEmployees] = useState<Employee[]>([])
  const [csvContent, setCsvContent] = useState('')
  const [bulkDefaults, setBulkDefaults] = useState({
    role: 'employee' as 'admin' | 'manager' | 'employee',
    team_id: '',
    personal_message: '',
    send_invitation: true
  })
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const t = useTranslations('team')
  
  const isOpen = searchParams.get('add-employee') === 'true'

  // Fetch teams when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchTeams()
    }
  }, [isOpen])

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams')
      const data = await response.json()
      if (response.ok) {
        setTeams(data.teams || [])
      }
    } catch (error) {
      console.error('Error fetching teams:', error)
    }
  }

  const handleClose = () => {
    setSingleEmployee({
      email: '',
      full_name: '',
      role: 'employee',
      team_id: '',
      personal_message: '',
      send_invitation: true
    })
    setBulkEmployees([])
    setCsvContent('')
    setError(null)
    setSuccess(null)
    setResults([])
    setErrors([])
    setCurrentTab('single')
    
    // Remove the add-employee parameter from current URL instead of redirecting to /team
    const url = new URL(window.location.href)
    url.searchParams.delete('add-employee')
    router.push(url.pathname + url.search)
  }

  const validateEmployee = (employee: Employee): string | null => {
    if (!employee.email?.trim()) return 'Email jest wymagany'
    if (!employee.full_name?.trim()) return 'Imię i nazwisko jest wymagane'
    if (!employee.role) return 'Rola jest wymagana'
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(employee.email)) {
      return 'Nieprawidłowy format adresu email'
    }
    
    return null
  }

  const handleSingleSubmit = async () => {
    const validationError = validateEmployee(singleEmployee)
    if (validationError) {
      setError(validationError)
      return
    }

    await processEmployees([singleEmployee])
  }

  const processEmployees = async (employees: Employee[]) => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    setResults([])
    setErrors([])

    try {
      // Convert "no-team" to null for API compatibility
      const processedEmployees = employees.map(emp => ({
        ...emp,
        team_id: emp.team_id === 'no-team' ? null : emp.team_id
      }))
      
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employees: processedEmployees,
          mode
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process employees')
      }

      setResults(data.results || [])
      setErrors(data.errors || [])

      if (data.summary) {
        if (data.summary.failed === 0) {
          setSuccess(`✅ Pomyślnie przetworzono ${data.summary.successful} pracownik(ów) w trybie ${mode === 'direct' ? 'bezpośredniej kreacji' : 'zaproszeniowym'}`)
        } else {
          setSuccess(`⚠️ Przetworzono ${data.summary.successful} z ${data.summary.total} pracowników. ${data.summary.failed} zakończono błędem.`)
        }
      }

      // Clear forms on success
      if (currentTab === 'single') {
        setSingleEmployee({
          email: '',
          full_name: '',
          role: 'employee',
          team_id: '',
          personal_message: '',
          send_invitation: true
        })
      } else {
        setBulkEmployees([])
        setCsvContent('')
      }

      // Refresh data
      setTimeout(() => {
        router.refresh()
      }, 2000)

    } catch (err) {
      console.error('Error processing employees:', err)
      setError(err instanceof Error ? err.message : 'Wystąpił błąd podczas przetwarzania pracowników')
    } finally {
      setLoading(false)
    }
  }

  const parseCsvContent = () => {
    try {
      const lines = csvContent.trim().split('\n')
      if (lines.length === 0) {
        setError('Plik CSV jest pusty')
        return
      }

      const employees: Employee[] = []
      
      // Check if first line is header
      const firstLine = lines[0].toLowerCase()
      const hasHeader = firstLine.includes('email') || firstLine.includes('imię') || firstLine.includes('name')
      const startIndex = hasHeader ? 1 : 0

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const [email, full_name, role, team_name] = line.split(',').map(col => col.trim())
        
        if (!email || !full_name) {
          setError(`Linia ${i + 1}: Email i imię są wymagane`)
          return
        }

        // Find team by name
        let team_id = bulkDefaults.team_id
        if (team_name) {
          const team = teams.find(t => t.name.toLowerCase() === team_name.toLowerCase())
          if (team) {
            team_id = team.id
          }
        }

        employees.push({
          email: email.toLowerCase(),
          full_name,
          role: (['admin', 'manager', 'employee'].includes(role)) ? role as any : bulkDefaults.role,
          team_id,
          personal_message: bulkDefaults.personal_message,
          send_invitation: bulkDefaults.send_invitation
        })
      }

      setBulkEmployees(employees)
      setError(null)
      setSuccess(`Wczytano ${employees.length} pracownik(ów) z CSV`)

    } catch (err) {
      setError('Błąd podczas parsowania CSV: ' + (err instanceof Error ? err.message : 'Nieznany błąd'))
    }
  }

  const addBulkEmployee = () => {
    setBulkEmployees([...bulkEmployees, {
      email: '',
      full_name: '',
      role: bulkDefaults.role,
      team_id: bulkDefaults.team_id,
      personal_message: bulkDefaults.personal_message,
      send_invitation: bulkDefaults.send_invitation
    }])
  }

  const updateBulkEmployee = (index: number, field: keyof Employee, value: any) => {
    const updated = [...bulkEmployees]
    updated[index] = { ...updated[index], [field]: value }
    setBulkEmployees(updated)
  }

  const removeBulkEmployee = (index: number) => {
    setBulkEmployees(bulkEmployees.filter((_, i) => i !== index))
  }

  const downloadCsvTemplate = () => {
    const csvContent = 'email,imię_nazwisko,rola,zespół\njan.kowalski@example.com,Jan Kowalski,employee,Development\nanna.nowak@example.com,Anna Nowak,manager,Marketing'
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'szablon_pracownikow.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }



  const canSubmit = () => {
    if (currentTab === 'single') {
      return singleEmployee.email && singleEmployee.full_name
    } else if (currentTab === 'bulk') {
      return bulkEmployees.length > 0 && bulkEmployees.every(emp => emp.email && emp.full_name)
    } else if (currentTab === 'csv') {
      return bulkEmployees.length > 0
    }
    return false
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Dodaj pracowników
          </DialogTitle>
          <DialogDescription>
            Dodaj nowych pracowników do organizacji poprzez bezpośrednią kreację kont lub system zaproszeń
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mode Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Tryb dodawania</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="creation-mode"
                    checked={mode === 'direct'}
                    onCheckedChange={(checked) => setMode(checked ? 'direct' : 'invitation')}
                  />
                  <Label htmlFor="creation-mode" className="text-sm">
                    {mode === 'direct' ? 'Bezpośrednia kreacja' : 'System zaproszeń'}
                  </Label>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                {mode === 'direct' ? (
                  <div className="space-y-1">
                    <p>✅ Natychmiastowe utworzenie kont użytkowników</p>
                    <p>✅ Automatyczne wysłanie danych logowania</p>
                    <p>✅ Pracownicy mogą od razu się zalogować</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p>📧 Wysłanie kodów zaproszeniowych</p>
                    <p>🔐 Pracownicy sami tworzą konta</p>
                    <p>⏰ Zaproszenia wygasają po 7 dniach</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Method Selection Tabs */}
          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="single">Pojedynczy</TabsTrigger>
              <TabsTrigger value="bulk">Masowe</TabsTrigger>
              <TabsTrigger value="csv">Import CSV</TabsTrigger>
            </TabsList>

            {/* Single Employee */}
            <TabsContent value="single" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Adres email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jan.kowalski@example.com"
                    value={singleEmployee.email}
                    onChange={(e) => setSingleEmployee(prev => ({ ...prev, email: e.target.value }))}
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="full_name">Imię i nazwisko *</Label>
                  <Input
                    id="full_name"
                    placeholder="Jan Kowalski"
                    value={singleEmployee.full_name}
                    onChange={(e) => setSingleEmployee(prev => ({ ...prev, full_name: e.target.value }))}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Rola *</Label>
                  <Select
                    value={singleEmployee.role}
                    onValueChange={(value) => setSingleEmployee(prev => ({ ...prev, role: value as any }))}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz rolę" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Pracownik</SelectItem>
                      <SelectItem value="manager">Menedżer</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="team">Zespół</Label>
                  <Select
                    value={singleEmployee.team_id}
                    onValueChange={(value) => setSingleEmployee(prev => ({ ...prev, team_id: value }))}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz zespół" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-team">Bez zespołu</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          <div className="flex items-center gap-2">
                            {team.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="personal_message">Wiadomość (opcjonalnie)</Label>
                <Textarea
                  id="personal_message"
                  placeholder="Dodaj osobistą wiadomość..."
                  value={singleEmployee.personal_message}
                  onChange={(e) => setSingleEmployee(prev => ({ ...prev, personal_message: e.target.value }))}
                  disabled={loading}
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="send_invitation"
                  checked={singleEmployee.send_invitation}
                  onCheckedChange={(checked) => setSingleEmployee(prev => ({ ...prev, send_invitation: checked }))}
                  disabled={loading}
                />
                <Label htmlFor="send_invitation" className="text-sm">
                  {mode === 'direct' ? 'Wyślij dane logowania' : 'Wyślij zaproszenie'}
                </Label>
              </div>
            </TabsContent>

            {/* Bulk Employees */}
            <TabsContent value="bulk" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Domyślne ustawienia</CardTitle>
                  <CardDescription className="text-xs">
                    Te ustawienia będą stosowane do wszystkich nowych pracowników
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Domyślna rola</Label>
                      <Select
                        value={bulkDefaults.role}
                        onValueChange={(value) => setBulkDefaults(prev => ({ ...prev, role: value as any }))}
                        disabled={loading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Pracownik</SelectItem>
                          <SelectItem value="manager">Menedżer</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Domyślny zespół</Label>
                      <Select
                        value={bulkDefaults.team_id}
                        onValueChange={(value) => setBulkDefaults(prev => ({ ...prev, team_id: value }))}
                        disabled={loading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz zespół" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no-team">Bez zespołu</SelectItem>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              <div className="flex items-center gap-2">
                                {team.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label>Domyślna wiadomość</Label>
                    <Textarea
                      placeholder="Wiadomość dla wszystkich pracowników..."
                      value={bulkDefaults.personal_message}
                      onChange={(e) => setBulkDefaults(prev => ({ ...prev, personal_message: e.target.value }))}
                      disabled={loading}
                      rows={2}
                    />
                  </div>

                  <div className="mt-4 flex items-center space-x-2">
                    <Switch
                      id="bulk_send_invitation"
                      checked={bulkDefaults.send_invitation}
                      onCheckedChange={(checked) => setBulkDefaults(prev => ({ ...prev, send_invitation: checked }))}
                      disabled={loading}
                    />
                    <Label htmlFor="bulk_send_invitation" className="text-sm">
                      {mode === 'direct' ? 'Wyślij dane logowania' : 'Wyślij zaproszenia'}
                    </Label>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Pracownicy ({bulkEmployees.length})</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addBulkEmployee}
                  disabled={loading}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Dodaj pracownika
                </Button>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {bulkEmployees.map((employee, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-5 gap-3 items-start">
                      <div className="space-y-1">
                        <Label className="text-xs">Email *</Label>
                        <Input
                          type="email"
                          placeholder="email@example.com"
                          value={employee.email}
                          onChange={(e) => updateBulkEmployee(index, 'email', e.target.value)}
                          disabled={loading}
                          className="text-xs"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">Imię i nazwisko *</Label>
                        <Input
                          placeholder="Jan Kowalski"
                          value={employee.full_name}
                          onChange={(e) => updateBulkEmployee(index, 'full_name', e.target.value)}
                          disabled={loading}
                          className="text-xs"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">Rola</Label>
                        <Select
                          value={employee.role}
                          onValueChange={(value) => updateBulkEmployee(index, 'role', value)}
                          disabled={loading}
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employee">Pracownik</SelectItem>
                            <SelectItem value="manager">Menedżer</SelectItem>
                            <SelectItem value="admin">Administrator</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">Zespół</Label>
                        <Select
                          value={employee.team_id || 'no-team'}
                          onValueChange={(value) => updateBulkEmployee(index, 'team_id', value)}
                          disabled={loading}
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue placeholder="Wybierz" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no-team">Bez zespołu</SelectItem>
                            {teams.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                <div className="flex items-center gap-2">
                                  {team.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBulkEmployee(index)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {bulkEmployees.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Kliknij "Dodaj pracownika" aby rozpocząć</p>
                </div>
              )}
            </TabsContent>

            {/* CSV Import */}
            <TabsContent value="csv" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    Import CSV
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={downloadCsvTemplate}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Pobierz szablon
                    </Button>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Wklej dane CSV lub skopiuj z arkusza kalkulacyjnego. Format: email,imię_nazwisko,rola,zespół
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Domyślna rola dla importu</Label>
                      <Select
                        value={bulkDefaults.role}
                        onValueChange={(value) => setBulkDefaults(prev => ({ ...prev, role: value as any }))}
                        disabled={loading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Pracownik</SelectItem>
                          <SelectItem value="manager">Menedżer</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Domyślny zespół</Label>
                      <Select
                        value={bulkDefaults.team_id}
                        onValueChange={(value) => setBulkDefaults(prev => ({ ...prev, team_id: value }))}
                        disabled={loading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz zespół" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no-team">Bez zespołu</SelectItem>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              <div className="flex items-center gap-2">
                                {team.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Dane CSV</Label>
                    <Textarea
                      placeholder="email,imię_nazwisko,rola,zespół&#10;jan.kowalski@example.com,Jan Kowalski,employee,Development&#10;anna.nowak@example.com,Anna Nowak,manager,Marketing"
                      value={csvContent}
                      onChange={(e) => setCsvContent(e.target.value)}
                      disabled={loading}
                      rows={6}
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={parseCsvContent}
                      disabled={loading || !csvContent.trim()}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Parsuj CSV
                    </Button>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="csv_send_invitation"
                        checked={bulkDefaults.send_invitation}
                        onCheckedChange={(checked) => setBulkDefaults(prev => ({ ...prev, send_invitation: checked }))}
                        disabled={loading}
                      />
                      <Label htmlFor="csv_send_invitation" className="text-sm">
                        {mode === 'direct' ? 'Wyślij dane logowania' : 'Wyślij zaproszenia'}
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {bulkEmployees.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Podgląd importu ({bulkEmployees.length} pracowników)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {bulkEmployees.slice(0, 10).map((employee, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded text-xs">
                          <div className="flex items-center gap-4">
                            <span className="font-medium">{employee.full_name}</span>
                            <span className="text-muted-foreground">{employee.email}</span>
                            <Badge variant="outline" className="text-xs">{employee.role}</Badge>
                            {employee.team_id && (
                              <span className="text-muted-foreground">
                                {teams.find(t => t.id === employee.team_id)?.name}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {bulkEmployees.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center">
                          ... i {bulkEmployees.length - 10} więcej
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* Results */}
          {(results.length > 0 || errors.length > 0) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Wyniki przetwarzania</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {results.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-green-700 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Pomyślnie przetworzono ({results.length})
                    </h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {results.map((result, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded text-xs">
                          <span>{result.full_name} ({result.email})</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs bg-white">
                              {result.status === 'created' ? 'Utworzono' : 'Zaproszono'}
                            </Badge>
                            {result.invitation_code && (
                              <code className="px-1 py-0.5 bg-white rounded text-xs font-mono">
                                {result.invitation_code}
                              </code>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-red-700 flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Błędy ({errors.length})
                    </h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {errors.map((error, index) => (
                        <div key={index} className="p-2 bg-red-50 rounded text-xs">
                          <span className="font-medium">{error.email}:</span>
                          <span className="text-red-700 ml-2">{error.error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Error/Success Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">{success}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Anuluj
          </Button>
          
          <Button
            type="button"
            onClick={currentTab === 'single' ? handleSingleSubmit : () => processEmployees(bulkEmployees)}
            disabled={loading || !canSubmit()}
          >
            {loading ? 'Przetwarzanie...' : (
              currentTab === 'single' 
                ? (mode === 'direct' ? 'Utwórz konto' : 'Wyślij zaproszenie')
                : `${mode === 'direct' ? 'Utwórz konta' : 'Wyślij zaproszenia'} (${currentTab === 'csv' ? bulkEmployees.length : bulkEmployees.length})`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 