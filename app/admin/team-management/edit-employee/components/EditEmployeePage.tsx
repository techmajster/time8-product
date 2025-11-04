'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

import { DatePickerWithDropdowns } from '@/components/ui/date-picker'
import { RadioGroup, RadioGroupItem, RadioGroupItemLabel, RadioGroupItemDescription } from '@/components/ui/radio-group'

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


interface TeamMember {
  id: string
  email: string
  full_name: string | null
  role: string
}

interface EditEmployeePageProps {
  teams: Team[]
  leaveTypes: LeaveType[]
  organizationId: string
  teamMembers: TeamMember[]
  employeeToEdit: {
    id: string
    email: string
    full_name: string
    birth_date: string
    role: string
    team_id: string | null
    employment_type: string | null
    contract_start_date: string | null
  }
  existingBalances: LeaveBalance[]
}

export function EditEmployeePage({ teams, leaveTypes, organizationId, teamMembers, employeeToEdit, existingBalances }: EditEmployeePageProps) {
  const [loading, setLoading] = useState(false)
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false)
  const router = useRouter()

  // Form state for single employee - initialize with existing data
  const [formData, setFormData] = useState({
    full_name: employeeToEdit.full_name || '',
    email: employeeToEdit.email || '',
    birth_date: employeeToEdit.birth_date || '',
    role: (employeeToEdit.role || 'employee') as 'admin' | 'manager' | 'employee',
    team_id: employeeToEdit.team_id || '',
    work_schedule: 'traditional'
  })

  // Filter leave types to show only the specific ones in the table
  const displayedLeaveTypes = leaveTypes.filter(type =>
    ['Urlop wypoczynkowy', 'Dni wolne wychowawcze', 'Urlop macierzyński', 'Urlop ojcowski', 'Urlop rodzicielski'].includes(type.name)
  )

  // Leave balances state - initialize with existing balances or defaults
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>(
    leaveTypes.map(type => {
      // Check if employee already has a balance for this leave type
      const existingBalance = existingBalances.find(b => b.leave_type_id === type.id)
      return {
        leave_type_id: type.id,
        entitled_days: existingBalance?.entitled_days ?? type.days_per_year,
        used_days: existingBalance?.used_days ?? 0
      }
    })
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
    return (
      formData.full_name.trim() !== '' &&
      formData.email.trim() !== '' &&
      formData.email.includes('@') &&
      formData.work_schedule !== ''
    )
  }

  const handleSubmit = async () => {
    if (!isFormValid()) {
      toast.error('Proszę wypełnić wszystkie wymagane pola')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/employees/${employeeToEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          full_name: formData.full_name,
          birth_date: formData.birth_date || null,
          role: formData.role,
          team_id: formData.team_id || null,
          leave_balance_overrides: leaveBalances.map(balance => ({
            leave_type_id: balance.leave_type_id,
            entitled_days: balance.entitled_days
          }))
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update employee')
      }

      // Show success message with balance updates if any
      if (data.balance_updates && data.balance_updates.length > 0) {
        toast.success(`Pracownik i ${data.balance_updates.length} sald urlopowych zostało zaktualizowanych`)
      } else {
        toast.success('Pracownik został pomyślnie zaktualizowany')
      }

      router.push('/admin/team-management')
    } catch (error) {
      console.error('Error updating employee:', error)
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


  return (
    <div className="py-11 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="bg-muted h-9 w-9 p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Edytowanie pracownika</h1>
        </div>
      </div>

      {/* Content - Only single employee editing */}
      <div className="mt-6 overflow-visible">
        <div className="max-w-4xl overflow-visible">
          <div className="mt-0">
              <div className="flex flex-col gap-6 max-w-[960px] overflow-visible">
                {/* Personal Data Card */}
                <Card className="border border rounded-lg shadow-sm py-0 gap-0 overflow-visible">
                  <CardHeader className="pb-4 pt-6 px-6">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-semibold text-foreground">Dane</h2>
                        </div>
                        <p className="text-sm text-muted-foreground">Wprowadź podstawowe dane</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-6 px-6 overflow-visible">
                    <div className="flex flex-col gap-6">
                      <div className="w-[400px] space-y-2">
                        <Label htmlFor="full_name" className="text-sm font-medium text-foreground">
                          Imię i nazwisko *
                        </Label>
                        <Input
                          id="full_name"
                          placeholder="Wprowadź imię i nazwisko"
                          value={formData.full_name}
                          onChange={(e) => handleInputChange('full_name', e.target.value)}
                          className="h-9 border shadow-sm"
                        />
                      </div>
                      
                      <div className="w-[400px] space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-foreground">
                          Adres email *
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="Wprowadź adres email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="h-9 border shadow-sm"
                        />
                      </div>
                      
                      <div className="w-[400px] space-y-2">
                        <Label className="text-sm font-medium text-foreground">
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
                          className="h-9 border shadow-sm"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Leave Balances Card */}
                <Card className="border border rounded-lg shadow-sm py-0 gap-0 overflow-visible">
                  <CardHeader className="pb-4 pt-6 px-6">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-semibold text-foreground">Dostępny urlop rocznie</h2>
                        </div>
                        <p className="text-sm text-muted-foreground">Określ dostępność urlopu</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-6 px-6 overflow-visible">
                    <div className="w-full">
                      <div className="grid grid-cols-3 gap-0">
                        {/* Table Headers */}
                        <div className="border-b border px-2 py-3">
                          <span className="text-sm font-medium text-muted-foreground">Rodzaj urlopu</span>
                        </div>
                        <div className="border-b border px-2 py-3">
                          <span className="text-sm font-medium text-muted-foreground">Dni rocznie</span>
                        </div>
                        <div className="border-b border px-2 py-3">
                          <span className="text-sm font-medium text-muted-foreground">Wykorzystanych</span>
                        </div>

                        {/* Table Rows */}
                        {displayedLeaveTypes.map((leaveType, index) => {
                          const balance = leaveBalances.find(b => b.leave_type_id === leaveType.id)
                          return (
                            <div key={leaveType.id} className="contents">
                              <div className={`px-2 py-4 ${index < displayedLeaveTypes.length - 1 ? 'border-b border' : ''}`}>
                                <span className="text-sm font-medium text-foreground">{leaveType.name}</span>
                              </div>
                              <div className={`px-2 py-2 ${index < displayedLeaveTypes.length - 1 ? 'border-b border' : ''}`}>
                                <Input
                                  type="number"
                                  value={balance?.entitled_days || 0}
                                  onChange={(e) => handleLeaveBalanceChange(leaveType.id, 'entitled_days', parseInt(e.target.value) || 0)}
                                  className="h-9 border shadow-sm text-sm"
                                />
                              </div>
                              <div className={`px-2 py-2 ${index < displayedLeaveTypes.length - 1 ? 'border-b border' : ''}`}>
                                <Input
                                  type="number"
                                  value={balance?.used_days || 0}
                                  onChange={(e) => handleLeaveBalanceChange(leaveType.id, 'used_days', parseInt(e.target.value) || 0)}
                                  className="h-9 border shadow-sm text-sm"
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
                <Card className="border border rounded-lg shadow-sm py-0 gap-0 overflow-visible">
                  <CardHeader className="pb-4 pt-6 px-6">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-semibold text-foreground">Rola i grupa</h2>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Wybierz grupę do której zostanie przypisany nowy pracownik
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className=""
                          onClick={() => setIsCreateTeamOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          <span className="text-sm font-medium text-foreground">Dodaj nową grupę</span>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-6 px-6 overflow-visible">
                    <div className="flex flex-col gap-6">
                      <div className="w-[400px] space-y-2">
                        <Label className="text-sm font-medium text-foreground">Rola</Label>
                        <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                          <SelectTrigger className="h-9 border shadow-sm">
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
                        <Label className="text-sm font-medium text-foreground">Zespół</Label>
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
                <Card className="border border rounded-lg shadow-sm py-0 gap-0 overflow-visible">
                  <CardHeader className="pb-4 pt-6 px-6">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-semibold text-foreground">Tryb pracy</h2>
                        </div>
                        <p className="text-sm text-muted-foreground">Określ rodzaj trybu pracy pracownika</p>
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
                <div className="bg-muted border border rounded-lg p-6">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => router.back()}
                      className="h-9 px-4 border shadow-sm"
                    >
                      Anuluj
                    </Button>
                    <Button 
                      onClick={handleSubmit}
                      disabled={loading || !isFormValid()}
                      className="h-9 px-4  shadow-sm disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {loading ? 'Aktualizowanie...' : 'Zapisz zmiany'}
                    </Button>
                  </div>
                </div>
              </div>
          </div>
        </div>
      </div>
      
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

 