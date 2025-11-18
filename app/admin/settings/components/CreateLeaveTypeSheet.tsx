'use client'

import React, { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface CreateLeaveTypeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  onSuccess?: (leaveType: any) => void
}

interface LeaveTypeFormData {
  name: string
  days_per_year: number
  requires_balance: boolean
  requires_approval: boolean
  is_paid: boolean
}

export function CreateLeaveTypeSheet({
  open,
  onOpenChange,
  organizationId,
  onSuccess
}: CreateLeaveTypeSheetProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<LeaveTypeFormData>({
    name: '',
    days_per_year: 0,
    requires_balance: true,
    requires_approval: true,
    is_paid: true
  })

  // Reset form when sheet opens
  useEffect(() => {
    if (open) {
      setFormData({
        name: '',
        days_per_year: 0,
        requires_balance: true,
        requires_approval: true,
        is_paid: true
      })
    }
  }, [open])

  const handleClose = () => {
    onOpenChange(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validate form
      if (!formData.name.trim()) {
        throw new Error('Nazwa rodzaju urlopu jest wymagana')
      }

      if (formData.days_per_year < 0) {
        throw new Error('Liczba dni nie może być ujemna')
      }

      const supabase = createClient()

      // Create the leave type
      const { data: createdLeaveType, error: createError } = await supabase
        .from('leave_types')
        .insert({
          organization_id: organizationId,
          name: formData.name,
          days_per_year: formData.days_per_year,
          color: '#3B82F6', // Default blue color
          requires_balance: formData.requires_balance,
          requires_approval: formData.requires_approval,
          is_paid: formData.is_paid,
          leave_category: 'other', // Default to 'other'
          is_mandatory: false // Custom types are never mandatory
        })
        .select()
        .single()

      if (createError) {
        throw new Error(createError.message || 'Nie udało się utworzyć rodzaju urlopu')
      }

      // If requires_balance and has days_per_year > 0, create balances for all existing users
      if (formData.requires_balance && formData.days_per_year > 0) {
        // Get all active users in the organization
        const { data: userOrgs, error: usersError } = await supabase
          .from('user_organizations')
          .select('user_id')
          .eq('organization_id', organizationId)
          .eq('is_active', true)

        if (!usersError && userOrgs && userOrgs.length > 0) {
          // Create leave balances for all users
          const leaveBalances = userOrgs.map(userOrg => ({
            user_id: userOrg.user_id,
            leave_type_id: createdLeaveType.id,
            organization_id: organizationId,
            year: new Date().getFullYear(),
            entitled_days: formData.days_per_year,
            used_days: 0
          }))

          const { error: balancesError } = await supabase
            .from('leave_balances')
            .insert(leaveBalances)

          if (balancesError) {
            console.warn('Could not create leave balances:', balancesError)
          }
        }
      }

      toast.success('Rodzaj urlopu został utworzony!')

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(createdLeaveType)
      }

      handleClose()

    } catch (error) {
      console.error('Error creating leave type:', error)
      toast.error(error instanceof Error ? error.message : 'Wystąpił błąd podczas tworzenia rodzaju urlopu')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        size="content"
        className="overflow-y-auto"
      >
        <div className="bg-background relative rounded-lg h-full">
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              {/* Header */}
              <div className="flex flex-col gap-1.5 w-full px-6 pt-6 pb-6">
                <SheetTitle className="text-xl font-semibold">Dodaj nowy rodzaj urlopu</SheetTitle>
              </div>

              <div className="px-6">
                <Separator />
              </div>

              {/* Form Fields */}
              <div className="flex flex-col gap-4 px-6 py-6">
                {/* Leave Type Name */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Nazwa rodzaju urlopu
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="np. Urlop okolicznościowy"
                    className="h-9 w-full"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {/* Days per Year */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Dni w roku
                  </Label>
                  <Input
                    type="number"
                    value={formData.days_per_year}
                    onChange={(e) => setFormData(prev => ({ ...prev, days_per_year: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                    className="h-9 w-full"
                    min="0"
                    disabled={isSubmitting}
                  />
                  <p className="text-sm text-muted-foreground">
                    Ustaw 0 dla nieograniczonej liczby dni
                  </p>
                </div>
              </div>

              <div className="px-6">
                <Separator />
              </div>

              {/* Checkboxes */}
              <div className="space-y-4 px-6 py-6">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="requires-balance"
                    checked={formData.requires_balance}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_balance: !!checked }))}
                    disabled={isSubmitting}
                    className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="requires-balance" className="text-sm font-medium text-foreground">
                      Wymaga zarządzania saldem urlopowym
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Zaznacz, jeśli ten typ urlopu wymaga śledzenia dostępnych dni
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="requires-approval"
                    checked={formData.requires_approval}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_approval: !!checked }))}
                    disabled={isSubmitting}
                    className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="requires-approval" className="text-sm font-medium text-foreground">
                      Wymaga zatwierdzania
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Wnioski tego typu będą wymagały akceptacji administratora
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="is-paid"
                    checked={formData.is_paid}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_paid: !!checked }))}
                    disabled={isSubmitting}
                    className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="is-paid" className="text-sm font-medium text-foreground">
                      Płatny
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Zaznacz, jeśli pracownik otrzymuje wynagrodzenie za ten urlop
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6">
              <Separator />
            </div>

            {/* Footer - Fixed at Bottom */}
            <div className="flex gap-2 items-center justify-end w-full p-6 bg-background">
              <div className="basis-0 grow flex gap-2.5 items-start">
                <Button variant="outline" className="h-9" onClick={handleClose} disabled={isSubmitting}>
                  Anuluj
                </Button>
              </div>
              <Button
                className="h-9 shadow-sm"
                disabled={!formData.name.trim() || isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? 'Tworzenie...' : 'Utwórz rodzaj urlopu'}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
