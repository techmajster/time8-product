'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, HelpCircle, UserPlus, Download, FileText, Trash2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { DatePickerWithDropdowns } from '@/components/ui/date-picker'
import { RadioGroup, RadioGroupItem, RadioGroupItemLabel, RadioGroupItemDescription } from '@/components/ui/radio-group'

import { FigmaTabs, FigmaTabsContent, FigmaTabsList, FigmaTabsTrigger } from '../../components/FigmaTabs'
import { CreateTeamSheet } from '../../components/CreateTeamSheet'
import { toast } from 'sonner'

interface Team {
  id: string
  name: string
  color?: string
  members?: { id: string }[]
}

interface LeaveType {
  id: string
  name: string
  days_per_year: number
  leave_category: string
  requires_balance: boolean
}

interface LeaveBalance {
  leave_type_id: string
  entitled_days: number
  used_days: number
}

interface Employee {
  email: string
  full_name: string
  role: 'admin' | 'manager' | 'employee'
  team_id: string | null
  personal_message?: string
  send_invitation: boolean
}

interface ProcessingResult {
  email: string
  success: boolean
  message: string
}

interface ProcessingError {
  email: string
  error: string
}

interface TeamMember {
  id: string
  email: string
  full_name: string | null
  role: string
}

interface Organization {
  id: string
  name: string
  google_domain?: string | null
  require_google_domain?: boolean
}

interface AddEmployeePageProps {
  teams: Team[]
  leaveTypes: LeaveType[]
  organizationId: string
  teamMembers: TeamMember[]
  organization: Organization
}

export function AddEmployeePage({ teams, leaveTypes, organizationId, teamMembers, organization }: AddEmployeePageProps) {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('pojedynczy')
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false)
  const router = useRouter()
  
  // Bulk employees state
  const [bulkEmployees, setBulkEmployees] = useState<Employee[]>([])
  const [csvEmployees, setCsvEmployees] = useState<Employee[]>([])
  const [csvContent, setCsvContent] = useState('')
  const [bulkDefaults, setBulkDefaults] = useState({
    role: 'employee' as 'admin' | 'manager' | 'employee',
    team_id: 'no-team',
    personal_message: '',
    send_invitation: true
  })
  
  // Results state
  const [results, setResults] = useState<ProcessingResult[]>([])
  const [errors, setErrors] = useState<ProcessingError[]>([])
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Form state for single employee
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    birth_date: '',
    role: 'employee' as 'admin' | 'manager' | 'employee',
    team_id: '',
    work_schedule: 'traditional'
  })

  // Filter leave types to show only the specific ones in the table
  const displayedLeaveTypes = leaveTypes.filter(type => 
    ['Urlop wypoczynkowy', 'Dni wolne wychowawcze', 'Urlop macierzyński', 'Urlop ojcowski', 'Urlop rodzicielski'].includes(type.name)
  )

  // Leave balances state - initialize with all leave types but only display filtered ones
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>(
    leaveTypes.map(type => ({
      leave_type_id: type.id,
      entitled_days: type.days_per_year,
      used_days: 0
    }))
  )

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleLeaveBalanceChange = (leaveTypeId: string, field: 'entitled_days' | 'used_days', value: number) => {
    setLeaveBalances(prev =>
      prev.map(balance =>
        balance.leave_type_id === leaveTypeId
          ? { ...balance, [field]: value }
          : balance
      )
    )
  }

  const isFormValid = () => {
    const basicValidation = (
      formData.full_name.trim() !== '' &&
      formData.email.trim() !== '' &&
      formData.email.includes('@') &&
      formData.work_schedule !== ''
    )
    
    // Check domain validation if required
    if (organization.require_google_domain && organization.google_domain) {
      const emailDomain = formData.email.toLowerCase().split('@')[1]
      const requiredDomain = organization.google_domain.toLowerCase()
      
      if (emailDomain !== requiredDomain) {
        return false
      }
    }
    
    return basicValidation
  }

  const handleSubmit = async () => {
    if (!isFormValid()) {
      // Check for domain validation error specifically
      if (organization.require_google_domain && organization.google_domain) {
        const emailDomain = formData.email.toLowerCase().split('@')[1]
        const requiredDomain = organization.google_domain.toLowerCase()
        
        if (emailDomain !== requiredDomain) {
          toast.error(`Adres email musi mieć domenę @${organization.google_domain}`)
          return
        }
      }
      toast.error('Proszę wypełnić wszystkie wymagane pola')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employees: [{
            email: formData.email,
            full_name: formData.full_name,
            birth_date: formData.birth_date || null,
            role: formData.role,
            team_id: formData.team_id || null,
            send_invitation: true
          }],
          mode: 'invitation'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle seat limit exceeded error specifically
        if (response.status === 409 && data.error === 'Seat limit exceeded') {
          const details = data.details
          toast.error(
            `Brak dostępnych miejsc! Masz ${details.available} wolnych miejsc, ale próbujesz dodać ${details.requested} osób.`,
            {
              duration: 6000,
              action: {
                label: "Zwiększ plan",
                onClick: () => {
                  const currentSeats = details.current_members + details.pending_invitations + details.requested
                  const recommendedSeats = Math.max(currentSeats, details.total_seats + 1)
                  window.location.href = `/onboarding/add-users?upgrade=true&current_org=${organizationId}&seats=${recommendedSeats}`
                }
              }
            }
          )
          return
        }
        
        throw new Error(data.error || 'Failed to add employee')
      }

      toast.success('Pracownik został pomyślnie dodany')
      router.push('/admin/team-management')
    } catch (error) {
      console.error('Error adding employee:', error)
      toast.error(error instanceof Error ? error.message : 'Wystąpił błąd')
    } finally {
      setLoading(false)
    }
  }

  const getTeamMemberCount = (teamId: string) => {
    const team = teams.find(t => t.id === teamId)
    return team?.members?.length || 0
  }

  const handleTeamCreated = () => {
    // Refresh the page to get updated teams data
    // Cache revalidation is handled by the API
    router.refresh()
  }

  // Bulk functionality
  const validateEmployee = (employee: Employee): string | null => {
    if (!employee.email?.trim()) return 'Email jest wymagany'
    if (!employee.full_name?.trim()) return 'Imię i nazwisko jest wymagane'
    if (!employee.role) return 'Rola jest wymagana'
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(employee.email)) {
      return 'Nieprawidłowy format adresu email'
    }
    
    return null
  }

  const processEmployees = async (employees: Employee[]) => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    setResults([])
    setErrors([])

    try {
      const processedEmployees = employees.map(emp => ({
        ...emp,
        team_id: emp.team_id === 'no-team' ? null : emp.team_id
      }))
      
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employees: processedEmployees,
          mode: 'invitation'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle seat limit exceeded error specifically
        if (response.status === 409 && data.error === 'Seat limit exceeded') {
          const details = data.details
          toast.error(
            `Brak dostępnych miejsc! Masz ${details.available} wolnych miejsc, ale próbujesz dodać ${details.requested} osób.`,
            {
              duration: 8000,
              action: {
                label: "Zwiększ plan",
                onClick: () => {
                  const currentSeats = details.current_members + details.pending_invitations + details.requested
                  const recommendedSeats = Math.max(currentSeats, details.total_seats + 1)
                  window.location.href = `/onboarding/add-users?upgrade=true&current_org=${organizationId}&seats=${recommendedSeats}`
                }
              }
            }
          )
          return
        }
        
        throw new Error(data.error || 'Failed to process employees')
      }

      setResults(data.results || [])
      setErrors(data.errors || [])

      if (data.summary) {
        if (data.summary.failed === 0) {
          setSuccess(`✅ Pomyślnie przetworzono ${data.summary.successful} pracownik(ów)`)
        } else {
          setSuccess(`⚠️ Przetworzono ${data.summary.successful} z ${data.summary.total} pracowników. ${data.summary.failed} zakończono błędem.`)
        }
      }

      // Clear forms on success
      if (activeTab === 'masowy') {
        setBulkEmployees([])
      } else if (activeTab === 'import-csv') {
        setCsvEmployees([])
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

  const parseCsvContent = () => {
    try {
      const lines = csvContent.trim().split('\n')
      if (lines.length === 0) {
        setError('Plik CSV jest pusty')
        return
      }

      const employees: Employee[] = []
      
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

      setCsvEmployees(employees)
      setError(null)
      setSuccess(`Wczytano ${employees.length} pracownik(ów) z CSV`)

    } catch (err) {
      setError('Błąd podczas parsowania CSV: ' + (err instanceof Error ? err.message : 'Nieznany błąd'))
    }
  }

  const downloadCsvTemplate = () => {
    const csvContent = 'email,imię_nazwisko,rola,grupa\njan.kowalski@example.com,Jan Kowalski,employee,Development\nanna.nowak@example.com,Anna Nowak,manager,Marketing'
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'szablon_pracownikow.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="bg-neutral-100 h-9 w-9 p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Dodawanie pracowników</h1>
        </div>
      </div>

      {/* Tabs */}
      <FigmaTabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="relative -mx-12 px-12">
          <FigmaTabsList className="border-b-0">
            <FigmaTabsTrigger value="pojedynczy">
              Pojedynczy
            </FigmaTabsTrigger>
            <FigmaTabsTrigger value="masowy">
              Masowy
            </FigmaTabsTrigger>
            <FigmaTabsTrigger value="import-csv">
              Import CSV
            </FigmaTabsTrigger>
          </FigmaTabsList>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
        </div>

        {/* Content */}
        <div className="mt-6 overflow-visible">
          <div className="max-w-4xl overflow-visible">
            <FigmaTabsContent value="pojedynczy" className="mt-0">
              <div className="flex flex-col gap-6 max-w-[960px] overflow-visible">
                {/* Personal Data Card */}
                <Card className="border border-neutral-200 rounded-[10px] shadow-sm py-0 gap-0 overflow-visible">
                  <CardHeader className="pb-4 pt-6 px-6">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-semibold text-neutral-950">Dane</h2>
                        </div>
                        <p className="text-sm text-neutral-500">Wprowadź podstawowe dane</p>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {/* Domain Restriction Alert */}
                  {organization.require_google_domain && organization.google_domain && (
                    <div className="px-6 pb-4">
                      <Alert className="border-amber-200 bg-amber-50">
                        <AlertDescription className="text-amber-800">
                          <strong>Ograniczenie domeny:</strong> Tylko adresy email z domeny @{organization.google_domain} mogą być dodawane do organizacji.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                  
                  <CardContent className="pt-0 pb-6 px-6 overflow-visible">
                    <div className="flex flex-col gap-6">
                      <div className="w-[400px] space-y-2">
                        <Label htmlFor="full_name" className="text-sm font-medium text-neutral-950">
                          Imię i nazwisko *
                        </Label>
                        <Input
                          id="full_name"
                          placeholder="Wprowadź imię i nazwisko"
                          value={formData.full_name}
                          onChange={(e) => handleInputChange('full_name', e.target.value)}
                          className="h-9 border-neutral-200 shadow-sm"
                        />
                      </div>
                      
                      <div className="w-[400px] space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-neutral-950">
                          Adres email *
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder={organization.require_google_domain && organization.google_domain 
                            ? `Wprowadź adres email (@${organization.google_domain})` 
                            : "Wprowadź adres email"
                          }
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="h-9 border-neutral-200 shadow-sm"
                        />
                        {organization.require_google_domain && organization.google_domain && (
                          <p className="text-sm text-muted-foreground">
                            Tylko adresy email z domeny @{organization.google_domain} są dozwolone
                          </p>
                        )}
                      </div>
                      
                      <div className="w-[400px] space-y-2">
                        <Label className="text-sm font-medium text-neutral-950">
                          Data urodzenia
                        </Label>
                        <DatePickerWithDropdowns
                          value={formData.birth_date ? new Date(formData.birth_date + 'T00:00:00') : undefined}
                          onDateChange={(date) => {
                            if (!date) {
                              handleInputChange('birth_date', '')
                              return
                            }
                            // Format date in local timezone to avoid off-by-one errors
                            const year = date.getFullYear()
                            const month = String(date.getMonth() + 1).padStart(2, '0')
                            const day = String(date.getDate()).padStart(2, '0')
                            const localDateString = `${year}-${month}-${day}`
                            handleInputChange('birth_date', localDateString)
                          }}
                          placeholder="Wybierz datę"
                          className="h-9 border-neutral-200 shadow-sm"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Leave Balances Card */}
                <Card className="border border-neutral-200 rounded-[10px] shadow-sm py-0 gap-0 overflow-visible">
                  <CardHeader className="pb-4 pt-6 px-6">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-semibold text-neutral-950">Dostępny urlop rocznie</h2>
                        </div>
                        <p className="text-sm text-neutral-500">Określ dostępność urlopu</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-6 px-6 overflow-visible">
                    <div className="w-full">
                      <div className="grid grid-cols-3 gap-0">
                        {/* Table Headers */}
                        <div className="border-b border-neutral-200 px-2 py-3">
                          <span className="text-sm font-medium text-neutral-500">Rodzaj urlopu</span>
                        </div>
                        <div className="border-b border-neutral-200 px-2 py-3">
                          <span className="text-sm font-medium text-neutral-500">Dni rocznie</span>
                        </div>
                        <div className="border-b border-neutral-200 px-2 py-3">
                          <span className="text-sm font-medium text-neutral-500">Wykorzystanych</span>
                        </div>

                        {/* Table Rows */}
                        {displayedLeaveTypes.map((leaveType, index) => {
                          const balance = leaveBalances.find(b => b.leave_type_id === leaveType.id)
                          return (
                            <div key={leaveType.id} className="contents">
                              <div className={`px-2 py-4 ${index < displayedLeaveTypes.length - 1 ? 'border-b border-neutral-200' : ''}`}>
                                <span className="text-sm font-medium text-neutral-950">{leaveType.name}</span>
                              </div>
                              <div className={`px-2 py-2 ${index < displayedLeaveTypes.length - 1 ? 'border-b border-neutral-200' : ''}`}>
                                <Input
                                  type="number"
                                  value={balance?.entitled_days || 0}
                                  onChange={(e) => handleLeaveBalanceChange(leaveType.id, 'entitled_days', parseInt(e.target.value) || 0)}
                                  className="h-9 border-neutral-200 shadow-sm text-sm"
                                />
                              </div>
                              <div className={`px-2 py-2 ${index < displayedLeaveTypes.length - 1 ? 'border-b border-neutral-200' : ''}`}>
                                <Input
                                  type="number"
                                  value={balance?.used_days || 0}
                                  onChange={(e) => handleLeaveBalanceChange(leaveType.id, 'used_days', parseInt(e.target.value) || 0)}
                                  className="h-9 border-neutral-200 shadow-sm text-sm"
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Role and Team Card */}
                <Card className="border border-neutral-200 rounded-[10px] shadow-sm py-0 gap-0 overflow-visible">
                  <CardHeader className="pb-4 pt-6 px-6">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-semibold text-neutral-950">Rola i grupa</h2>
                        </div>
                        <p className="text-sm text-neutral-500">
                          Wybierz grupę do której zostanie przypisany nowy pracownik
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="bg-neutral-100"
                          onClick={() => setIsCreateTeamOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          <span className="text-sm font-medium text-neutral-900">Dodaj nową grupę</span>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-6 px-6 overflow-visible">
                    <div className="flex flex-col gap-6">
                      <div className="w-[400px] space-y-2">
                        <Label className="text-sm font-medium text-neutral-950">Rola</Label>
                        <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                          <SelectTrigger className="h-9 border-neutral-200 shadow-sm">
                            <SelectValue placeholder="Pracownik" />
                          </SelectTrigger>
                          <SelectContent className="z-[9999]">
                            <SelectItem value="employee">Pracownik</SelectItem>
                            <SelectItem value="manager">Menedżer</SelectItem>
                            <SelectItem value="admin">Administrator</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Separator className="w-full" />

                      <div className="space-y-2 w-full">
                        <Label className="text-sm font-medium text-neutral-950">Zespół</Label>
                        <RadioGroup value={formData.team_id} onValueChange={(value) => handleInputChange('team_id', value)} style="box">
                          <div className="flex flex-col gap-3">
                            <RadioGroupItem value="">
                              <RadioGroupItemLabel>Bez przypisania do grupy</RadioGroupItemLabel>
                              <RadioGroupItemDescription>Pracownik nie będzie przypisany do żadnej grupy</RadioGroupItemDescription>
                            </RadioGroupItem>
                            {teams.map((team) => (
                              <RadioGroupItem key={team.id} value={team.id}>
                                <RadioGroupItemLabel>{team.name}</RadioGroupItemLabel>
                                <RadioGroupItemDescription>{getTeamMemberCount(team.id)} osób</RadioGroupItemDescription>
                              </RadioGroupItem>
                            ))}
                          </div>
                        </RadioGroup>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Work Schedule Card */}
                <Card className="border border-neutral-200 rounded-[10px] shadow-sm py-0 gap-0 overflow-visible">
                  <CardHeader className="pb-4 pt-6 px-6">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-semibold text-neutral-950">Tryb pracy</h2>
                        </div>
                        <p className="text-sm text-neutral-500">Określ rodzaj trybu pracy pracownika</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-6 px-6 overflow-visible">
                    <RadioGroup value={formData.work_schedule} onValueChange={(value) => handleInputChange('work_schedule', value)} style="box">
                      <div className="flex flex-col gap-3">
                        <RadioGroupItem value="traditional">
                          <RadioGroupItemLabel>Tradycyjny</RadioGroupItemLabel>
                          <RadioGroupItemDescription>Od poniedziałku do piątku</RadioGroupItemDescription>
                        </RadioGroupItem>
                        
                        <div className="opacity-50">
                          <RadioGroupItem value="irregular" disabled>
                            <RadioGroupItemLabel>Nieregularny</RadioGroupItemLabel>
                            <RadioGroupItemDescription>W przygotowaniu</RadioGroupItemDescription>
                          </RadioGroupItem>
                        </div>
                        
                        <div className="opacity-50">
                          <RadioGroupItem value="shift" disabled>
                            <RadioGroupItemLabel>Zmianowy</RadioGroupItemLabel>
                            <RadioGroupItemDescription>W przygotowaniu</RadioGroupItemDescription>
                          </RadioGroupItem>
                        </div>
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="bg-neutral-100 border border-neutral-200 rounded-[10px] p-6">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => router.back()}
                      className="h-9 px-4 border-neutral-200 shadow-sm"
                    >
                      Anuluj
                    </Button>
                    <Button 
                      onClick={handleSubmit}
                      disabled={loading || !isFormValid()}
                      className="h-9 px-4 bg-neutral-900 hover:bg-neutral-800 shadow-sm disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {loading ? 'Dodawanie...' : 'Dodaj pracownika'}
                    </Button>
                  </div>
                </div>
              </div>
            </FigmaTabsContent>
            
            <FigmaTabsContent value="masowy" className="mt-0">
              <div className="flex flex-col gap-6 max-w-[960px] overflow-visible">
                {/* Default Settings Card */}
                <Card className="border border-neutral-200 rounded-[10px] shadow-sm py-0 gap-0 overflow-visible">
                  <CardHeader className="pb-4 pt-6 px-6">
                    <CardTitle className="text-xl font-semibold text-neutral-950">Domyślne ustawienia</CardTitle>
                    <CardDescription className="text-sm text-neutral-500">
                      Te ustawienia będą stosowane do wszystkich nowych pracowników
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 pb-6 px-6 overflow-visible">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Domyślna rola</Label>
                        <Select
                          value={bulkDefaults.role}
                          onValueChange={(value) => setBulkDefaults(prev => ({ ...prev, role: value as any }))}
                          disabled={loading}
                        >
                          <SelectTrigger className="h-9 border-neutral-200 shadow-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[9999]">
                            <SelectItem value="employee">Pracownik</SelectItem>
                            <SelectItem value="manager">Menedżer</SelectItem>
                            <SelectItem value="admin">Administrator</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Domyślna grupa</Label>
                        <Select
                          value={bulkDefaults.team_id}
                          onValueChange={(value) => setBulkDefaults(prev => ({ ...prev, team_id: value }))}
                          disabled={loading}
                        >
                          <SelectTrigger className="h-9 border-neutral-200 shadow-sm">
                            <SelectValue placeholder="Wybierz grupę" />
                          </SelectTrigger>
                          <SelectContent className="z-[9999]">
                            <SelectItem value="no-team">Bez grupy</SelectItem>
                            {teams.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
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
                        className="border-neutral-200 shadow-sm"
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
                        Wyślij dane logowania
                      </Label>
                    </div>
                  </CardContent>
                </Card>

                {/* Employee List Card */}
                <Card className="border border-neutral-200 rounded-[10px] shadow-sm py-0 gap-0 overflow-visible">
                  <CardHeader className="pb-4 pt-6 px-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-xl font-semibold text-neutral-950">Pracownicy ({bulkEmployees.length})</CardTitle>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addBulkEmployee}
                        disabled={loading}
                        className="bg-neutral-100 shadow-sm"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Dodaj pracownika
                      </Button>
                    </div>
                  </CardHeader>
                  
                  {/* Domain Restriction Alert for Bulk */}
                  {organization.require_google_domain && organization.google_domain && (
                    <div className="px-6 pb-4">
                      <Alert className="border-amber-200 bg-amber-50">
                        <AlertDescription className="text-amber-800">
                          <strong>Ograniczenie domeny:</strong> Tylko adresy email z domeny @{organization.google_domain} mogą być dodawane do organizacji.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                  
                  <CardContent className="pt-0 pb-6 px-6 overflow-visible">
                    <div className="space-y-3">
                      {bulkEmployees.map((employee, index) => (
                        <Card key={index} className="p-4 border border-neutral-200">
                          <div className="grid grid-cols-5 gap-3 items-start">
                            <div className="space-y-1">
                              <Label className="text-xs">Email *</Label>
                              <Input
                                type="email"
                                placeholder={organization.require_google_domain && organization.google_domain 
                                  ? `email@${organization.google_domain}` 
                                  : "email@example.com"
                                }
                                value={employee.email}
                                onChange={(e) => updateBulkEmployee(index, 'email', e.target.value)}
                                disabled={loading}
                                className="text-xs h-9 border-neutral-200"
                              />
                            </div>
                            
                            <div className="space-y-1">
                              <Label className="text-xs">Imię i nazwisko *</Label>
                              <Input
                                placeholder="Jan Kowalski"
                                value={employee.full_name}
                                onChange={(e) => updateBulkEmployee(index, 'full_name', e.target.value)}
                                disabled={loading}
                                className="text-xs h-9 border-neutral-200"
                              />
                            </div>
                            
                            <div className="space-y-1">
                              <Label className="text-xs">Rola</Label>
                              <Select
                                value={employee.role}
                                onValueChange={(value) => updateBulkEmployee(index, 'role', value)}
                                disabled={loading}
                              >
                                <SelectTrigger className="text-xs h-9 border-neutral-200">
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
                                <SelectTrigger className="text-xs h-9 border-neutral-200">
                                  <SelectValue placeholder="Wybierz" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="no-team">Bez grupy</SelectItem>
                                  {teams.map((team) => (
                                    <SelectItem key={team.id} value={team.id}>
                                      {team.name}
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
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="bg-neutral-100 border border-neutral-200 rounded-[10px] p-6">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => router.back()}
                      className="h-9 px-4 border-neutral-200 shadow-sm"
                    >
                      Anuluj
                    </Button>
                    <Button 
                      onClick={() => processEmployees(bulkEmployees)}
                      disabled={loading || bulkEmployees.length === 0 || !bulkEmployees.every(emp => emp.email && emp.full_name)}
                      className="h-9 px-4 bg-neutral-900 hover:bg-neutral-800 shadow-sm disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {loading ? 'Przetwarzanie...' : `Dodaj pracowników (${bulkEmployees.length})`}
                    </Button>
                  </div>
                </div>
              </div>
            </FigmaTabsContent>
            
            <FigmaTabsContent value="import-csv" className="mt-0">
              <div className="flex flex-col gap-6 max-w-[960px] overflow-visible">
                {/* CSV Import Card */}
                <Card className="border border-neutral-200 rounded-[10px] shadow-sm py-0 gap-0 overflow-visible">
                  <CardHeader className="pb-4 pt-6 px-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-xl font-semibold text-neutral-950">Import CSV</CardTitle>
                        <CardDescription className="text-sm text-neutral-500">
                          Wklej dane CSV lub skopiuj z arkusza kalkulacyjnego. Format: email,imię_nazwisko,rola,grupa
                        </CardDescription>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={downloadCsvTemplate}
                        className="bg-neutral-100 shadow-sm"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Pobierz szablon
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-6 px-6 space-y-4 overflow-visible">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Domyślna rola dla importu</Label>
                        <Select
                          value={bulkDefaults.role}
                          onValueChange={(value) => setBulkDefaults(prev => ({ ...prev, role: value as any }))}
                          disabled={loading}
                        >
                          <SelectTrigger className="h-9 border-neutral-200 shadow-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[9999]">
                            <SelectItem value="employee">Pracownik</SelectItem>
                            <SelectItem value="manager">Menedżer</SelectItem>
                            <SelectItem value="admin">Administrator</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Domyślna grupa</Label>
                        <Select
                          value={bulkDefaults.team_id}
                          onValueChange={(value) => setBulkDefaults(prev => ({ ...prev, team_id: value }))}
                          disabled={loading}
                        >
                          <SelectTrigger className="h-9 border-neutral-200 shadow-sm">
                            <SelectValue placeholder="Wybierz grupę" />
                          </SelectTrigger>
                          <SelectContent className="z-[9999]">
                            <SelectItem value="no-team">Bez grupy</SelectItem>
                            {teams.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Dane CSV</Label>
                      <Textarea
                        placeholder="email,imię_nazwisko,rola,grupa&#10;jan.kowalski@example.com,Jan Kowalski,employee,Development&#10;anna.nowak@example.com,Anna Nowak,manager,Marketing"
                        value={csvContent}
                        onChange={(e) => setCsvContent(e.target.value)}
                        disabled={loading}
                        rows={6}
                        className="font-mono text-xs border-neutral-200 shadow-sm"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={parseCsvContent}
                        disabled={loading || !csvContent.trim()}
                        className="border-neutral-200 shadow-sm"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Parsuj CSV
                      </Button>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <Switch
                          id="csv_send_invitation"
                          checked={bulkDefaults.send_invitation}
                          onCheckedChange={(checked) => setBulkDefaults(prev => ({ ...prev, send_invitation: checked }))}
                          disabled={loading}
                        />
                        <Label htmlFor="csv_send_invitation" className="text-sm">
                          Wyślij dane logowania
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Preview Card */}
                {csvEmployees.length > 0 && (
                  <Card className="border border-neutral-200 rounded-[10px] shadow-sm py-0 gap-0 overflow-visible">
                    <CardHeader className="pb-4 pt-6 px-6">
                      <CardTitle className="text-xl font-semibold text-neutral-950">
                        Podgląd importu ({csvEmployees.length} pracowników)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 pb-6 px-6 overflow-visible">
                      <div className="space-y-2">
                        {csvEmployees.slice(0, 10).map((employee, index) => (
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
                        {csvEmployees.length > 10 && (
                          <p className="text-xs text-muted-foreground text-center">
                            ... i {csvEmployees.length - 10} więcej
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Results */}
                {(success || error || results.length > 0 || errors.length > 0) && (
                  <Card className="border border-neutral-200 rounded-[10px] shadow-sm py-0 gap-0 overflow-visible">
                    <CardHeader className="pb-4 pt-6 px-6">
                      <CardTitle className="text-xl font-semibold text-neutral-950">Wyniki przetwarzania</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 pb-6 px-6 space-y-4 overflow-visible">
                      {success && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-800">{success}</p>
                        </div>
                      )}
                      
                      {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-800">{error}</p>
                        </div>
                      )}

                      {results.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Pomyślnie przetworzono:</h4>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {results.filter(r => r.success).map((result, index) => (
                              <div key={index} className="flex items-center gap-2 text-xs p-2 bg-green-50 rounded">
                                <CheckCircle className="h-3 w-3 text-green-600" />
                                <span>{result.email}</span>
                                <span className="text-muted-foreground">- {result.message}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {errors.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-red-800">Błędy:</h4>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {errors.map((error, index) => (
                              <div key={index} className="flex items-center gap-2 text-xs p-2 bg-red-50 rounded">
                                <XCircle className="h-3 w-3 text-red-600" />
                                <span>{error.email}</span>
                                <span className="text-red-600">- {error.error}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <div className="bg-neutral-100 border border-neutral-200 rounded-[10px] p-6">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => router.back()}
                      className="h-9 px-4 border-neutral-200 shadow-sm"
                    >
                      Anuluj
                    </Button>
                    <Button 
                      onClick={() => processEmployees(csvEmployees)}
                      disabled={loading || csvEmployees.length === 0}
                      className="h-9 px-4 bg-neutral-900 hover:bg-neutral-800 shadow-sm disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {loading ? 'Przetwarzanie...' : `Dodaj pracowników (${csvEmployees.length})`}
                    </Button>
                  </div>
                </div>
              </div>
            </FigmaTabsContent>
          </div>
        </div>
      </FigmaTabs>
      
      {/* Create Team Sheet */}
      <CreateTeamSheet
        open={isCreateTeamOpen}
        onOpenChange={setIsCreateTeamOpen}
        teamMembers={teamMembers}
        onTeamCreated={handleTeamCreated}
      />
    </div>
  )
}

 