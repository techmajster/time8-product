'use client'

import React from 'react'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'

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

interface LeaveBalance {
  id: string
  user_id: string
  leave_type_id: string
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

interface UserDetailSheetProps {
  isOpen: boolean
  onClose: () => void
  employee: Employee | null
  leaveBalances: LeaveBalance[]
  approvers: Approver[]
  onEdit: () => void
  onArchive: () => void
}

export function UserDetailSheet({
  isOpen,
  onClose,
  employee,
  leaveBalances: allLeaveBalances,
  approvers,
  onEdit,
  onArchive
}: UserDetailSheetProps) {
  // Filter leave balances for this employee
  const employeeLeaveBalances = employee
    ? allLeaveBalances.filter(lb => lb.user_id === employee.id)
    : []

  // Find approver for this employee
  const approver = employee?.approver_id
    ? approvers.find(a => a.id === employee.approver_id)
    : null

  const handleClose = () => {
    onClose()
  }

  const handleEdit = () => {
    // Only call onEdit - parent's handleEditFromDetail already handles closing this sheet
    // Calling handleClose() here would trigger parent's onClose which clears selectedEmployee
    onEdit()
  }

  if (!employee) return null

  const roleLabels: Record<string, string> = {
    employee: 'Pracownik',
    manager: 'Manager',
    admin: 'Admin'
  }

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
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <div className="bg-green-600 border border-transparent rounded-md px-2 py-0.5 inline-flex items-center justify-center w-fit">
                      <span className="text-xs font-semibold text-white">Aktywny</span>
                    </div>
                  </div>

                  {/* Nazwa wyświetlana */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Nazwa wyświetlana</p>
                    <p className="text-base font-medium">{employee.full_name || employee.email}</p>
                  </div>

                  {/* Adres email */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Adres email</p>
                    <p className="text-base font-medium">{employee.email}</p>
                  </div>

                  {/* Data urodzenia */}
                  {employee.birth_date && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Data urodzenia</p>
                      <p className="text-base font-medium">
                        {format(parseISO(employee.birth_date), 'dd.MM.yyyy', { locale: pl })}
                      </p>
                    </div>
                  )}

                  {/* Rola */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Rola</p>
                    <p className="text-base font-medium">{roleLabels[employee.role] || employee.role}</p>
                  </div>

                  {/* Grupa */}
                  {employee.teams && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Grupa</p>
                      <p className="text-base font-medium">{employee.teams.name}</p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Section 2: Dostępny urlop rocznie */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Dostępny urlop rocznie</h3>

                  {/* Leave Balance Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    {employeeLeaveBalances.map((balance) => (
                      <div
                        key={balance.leave_type_id}
                        className="border rounded-lg p-4 space-y-1"
                      >
                        <p className="text-sm font-medium text-muted-foreground">
                          {balance.leave_types.name}
                        </p>
                        <p className="text-2xl font-semibold">{balance.remaining_days} dni</p>
                      </div>
                    ))}
                  </div>

                  {/* Osoba akceptująca urlop */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Osoba akceptująca urlop</p>
                    <p className="text-base font-medium">{approver ? (approver.full_name || approver.email) : 'Nie przypisano'}</p>
                  </div>
                </div>
              </div>
          </div>

          {/* Footer - Fixed outside scroll area */}
          <div className="p-6">
            <Separator className="mb-6" />
            <div className="flex justify-between items-center w-full">
              <Button
                variant="destructive"
                onClick={onArchive}
              >
                Archiwizuj
              </Button>
              <Button
                variant="outline"
                onClick={handleEdit}
              >
                Edytuj
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
