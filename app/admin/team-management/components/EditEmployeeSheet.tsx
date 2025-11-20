'use client'

import React, { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePickerWithDropdowns } from '@/components/ui/date-picker'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { RefreshCcw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'

interface Team {
  id: string
  name: string
}

interface LeaveType {
  id: string
  name: string
  requires_balance: boolean
  days_per_year?: number
}

interface LeaveBalance {
  id: string
  user_id: string
  leave_type_id: string
  entitled_days: number
  remaining_days: number
  leave_types: {
    id: string
    name: string
    color: string
    requires_balance: boolean
  }
}

interface Approver {
  id: string
  full_name: string | null
  email: string
}

interface Employee {
  id: string
  full_name: string | null
  email: string
  birth_date: string | null
  role: string
  team_id: string | null
  approver_id: string | null
  teams?: {
    id: string
    name: string
  } | null
}

interface EditEmployeeSheetProps {
  isOpen: boolean
  onClose: () => void
  employee: Employee | null
  teams: Team[]
  leaveTypes: LeaveType[]
  approvers: Approver[]
  leaveBalances: LeaveBalance[]
  onSuccess?: () => void
}

export function EditEmployeeSheet({
  isOpen,
  onClose,
  employee,
  teams,
  leaveTypes: globalLeaveTypes,
  approvers: globalApprovers,
  leaveBalances: globalLeaveBalances,
  onSuccess
}: EditEmployeeSheetProps) {
  const [loading, setLoading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    birth_date: null as Date | null,
    role: 'employee' as 'employee' | 'manager' | 'admin',
    team_id: '',
    approver_id: ''
  })

  const [leaveBalances, setLeaveBalances] = useState<Record<string, number>>({})

  // Populate form data when sheet opens
  useEffect(() => {
    if (employee && isOpen) {
      // Get employee's leave balances
      const employeeBalances = globalLeaveBalances.filter(lb => lb.user_id === employee.id)
      const balances: Record<string, number> = {}
      employeeBalances.forEach(balance => {
        balances[balance.leave_type_id] = balance.entitled_days
      })
      setLeaveBalances(balances)

      // Set form data
      setFormData({
        full_name: employee.full_name || '',
        email: employee.email || '',
        birth_date: employee.birth_date ? parseISO(employee.birth_date) : null,
        role: employee.role as 'employee' | 'manager' | 'admin',
        team_id: employee.team_id || '',
        approver_id: employee.approver_id || ''
      })
    }
  }, [employee, isOpen, globalLeaveBalances])

  const handleClose = () => {
    setFormData({
      full_name: '',
      email: '',
      birth_date: null,
      role: 'employee',
      team_id: '',
      approver_id: ''
    })
    setLeaveBalances({})
    onClose()
  }

  const handleResetToDefault = (leaveTypeId: string) => {
    const leaveType = globalLeaveTypes.find(lt => lt.id === leaveTypeId)
    if (leaveType?.days_per_year !== undefined) {
      setLeaveBalances(prev => ({
        ...prev,
        [leaveTypeId]: leaveType.days_per_year!
      }))
    }
  }

  const handleSubmit = async () => {
    // Validation
    if (!formData.full_name) {
      toast.error('Nazwa wyświetlana jest wymagana')
      return
    }
    if (!formData.email) {
      toast.error('Adres email jest wymagany')
      return
    }

    // Task 3.1: Validate approver_id is not empty
    if (!formData.approver_id) {
      toast.error('Osoba akceptująca urlop jest wymagana')
      return
    }

    // Task 3.2 & 3.3: Validate manager cannot self-approve, but admin can
    if (formData.approver_id === employee?.id) {
      // If the employee is a manager, prevent self-approval
      if (formData.role === 'manager') {
        toast.error('Manager nie może być swoim własnym akceptującym')
        return
      }
      // Admin can self-approve (allowed)
    }

    if (!employee) return

    setLoading(true)
    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          email: formData.email,
          birth_date: formData.birth_date ? format(formData.birth_date, 'yyyy-MM-dd') : null,
          role: formData.role,
          team_id: formData.team_id || null,
          approver_id: formData.approver_id || null,
          leave_balances: Object.entries(leaveBalances).map(([leave_type_id, entitled_days]) => ({
            leave_type_id,
            entitled_days
          }))
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Nie udało się zaktualizować użytkownika')
      }

      toast.success('Użytkownik został zaktualizowany')
      onSuccess?.()
      handleClose()
    } catch (error) {
      console.error('Error updating employee:', error)
      toast.error(error instanceof Error ? error.message : 'Wystąpił błąd podczas aktualizacji')
    } finally {
      setLoading(false)
    }
  }

  // Filter leave types to only show those that require balance
  const leaveTypesWithBalance = globalLeaveTypes.filter(lt => lt.requires_balance)

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent size="content">
        <div className="flex flex-col h-full">
          <div className="flex flex-col p-6 flex-1 overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col gap-1.5 w-full">
              <SheetTitle className="text-xl font-semibold">Szczegóły użytkownika</SheetTitle>
              <Separator className="mt-4" />
            </div>

            <div className="space-y-6 pt-6">
              {/* Section 1: Dane użytkownika */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Dane użytkownika</h3>

                {/* Status Badge */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status</Label>
                  <div>
                    <Badge
                      variant="default"
                      className="bg-green-600 text-white border-transparent"
                    >
                      Aktywny
                    </Badge>
                  </div>
                </div>

                {/* Nazwa wyświetlana */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Nazwa wyświetlana</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Imię i nazwisko"
                  />
                </div>

                {/* Adres email */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Adres email</Label>
                  <Input
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="jan.nowak@bb8.pl"
                    type="email"
                  />
                </div>

                {/* Data urodzenia */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Data urodzenia</Label>
                  <DatePickerWithDropdowns
                    value={formData.birth_date || undefined}
                    onDateChange={(date) => setFormData(prev => ({ ...prev, birth_date: date || null }))}
                    placeholder="Wybierz datę"
                  />
                </div>

                {/* Rola */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Rola</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Pracownik</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Grupa */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Grupa</Label>
                  <Select
                    value={formData.team_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, team_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz grupę" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Section 2: Dostępny urlop rocznie */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">Dostępny urlop rocznie</h3>
                  <p className="text-sm text-muted-foreground">Określ dostępność urlopu</p>
                </div>

                {/* Leave Types Table */}
                <div>
                  {/* Table Header */}
                  <div className="flex">
                    <div className="w-[180px] min-w-[85px] px-2 py-2.5 flex items-center">
                      <span className="text-sm font-medium text-muted-foreground">Rodzaj urlopu</span>
                    </div>
                    <div className="w-[200px] min-w-[85px] px-2 py-2.5 flex items-center">
                      <span className="text-sm font-medium text-muted-foreground">Liczba dni na start</span>
                    </div>
                    <div className="flex-1 min-w-[85px] px-2 py-2.5 flex items-center justify-end">
                      <span className="text-sm font-medium text-muted-foreground">Akcje</span>
                    </div>
                  </div>

                  {/* Table Rows */}
                  {leaveTypesWithBalance.map((leaveType) => (
                    <div key={leaveType.id} className="flex">
                      <div className="w-[180px] min-w-[85px] px-2 py-3 flex items-center">
                        <span className="text-sm font-medium">{leaveType.name}</span>
                      </div>
                      <div className="w-[200px] min-w-[85px] px-2 py-3 flex items-center">
                        <Input
                          type="number"
                          value={leaveBalances[leaveType.id] ?? leaveType.days_per_year ?? 0}
                          onChange={(e) => setLeaveBalances(prev => ({
                            ...prev,
                            [leaveType.id]: parseInt(e.target.value) || 0
                          }))}
                          className="h-9"
                        />
                      </div>
                      <div className="flex-1 min-w-[85px] px-2 py-3 flex items-center justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResetToDefault(leaveType.id)}
                          className="h-9"
                        >
                          <RefreshCcw className="h-4 w-4 mr-2" />
                          Domyślne
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Section 3: Osoba akceptująca urlop */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Osoba akceptująca urlop <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.approver_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, approver_id: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz osobę akceptującą" />
                    </SelectTrigger>
                    <SelectContent>
                      {globalApprovers.map((approver) => (
                        <SelectItem key={approver.id} value={approver.id}>
                          {approver.full_name || approver.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Fixed outside scroll area */}
          <div className="p-6">
            <Separator className="mb-6" />
            <div className="flex justify-between items-center w-full">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Anuluj
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Zapisz zmiany
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
