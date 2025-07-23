'use client'

import React, { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface LeaveType {
  id: string
  name: string
  days_per_year: number
  color: string
  requires_balance: boolean
  requires_approval: boolean
  leave_category?: string
  description?: string
}

interface EditLeaveTypesSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leaveTypes: LeaveType[]
  onSave: (updatedTypes: LeaveType[]) => void
}

export function EditLeaveTypesSheet({
  open,
  onOpenChange,
  leaveTypes,
  onSave
}: EditLeaveTypesSheetProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<LeaveType[]>([])

  useEffect(() => {
    if (open && leaveTypes) {
      setFormData([...leaveTypes])
    }
  }, [open, leaveTypes])

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // Here you would call the API to save leave types
      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      onSave(formData)
      toast.success('Rodzaje urlopów zostały zapisane')
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving leave types:', error)
      toast.error('Błąd podczas zapisywania')
    } finally {
      setIsLoading(false)
    }
  }

  const addLeaveType = () => {
    const newType: LeaveType = {
      id: `temp-${Date.now()}`,
      name: '',
      days_per_year: 0,
      color: '#3b82f6',
      requires_balance: true,
      requires_approval: true,
      leave_category: 'annual'
    }
    setFormData([...formData, newType])
  }

  const removeLeaveType = (index: number) => {
    setFormData(formData.filter((_, i) => i !== index))
  }

  const updateLeaveType = (index: number, field: keyof LeaveType, value: any) => {
    const updated = [...formData]
    updated[index] = { ...updated[index], [field]: value }
    setFormData(updated)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto max-w-2xl">
        <SheetHeader>
          <SheetTitle>Edytuj rodzaje urlopów</SheetTitle>
          <SheetDescription>
            Zarządzaj dostępnymi rodzajami urlopów w organizacji
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {formData.map((leaveType, index) => (
            <Card key={leaveType.id} className="border border-border">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {leaveType.name || 'Nowy rodzaj urlopu'}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLeaveType(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nazwa</Label>
                    <Input
                      value={leaveType.name}
                      onChange={(e) => updateLeaveType(index, 'name', e.target.value)}
                      placeholder="np. Urlop wypoczynkowy"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dni w roku</Label>
                    <Input
                      type="number"
                      value={leaveType.days_per_year}
                      onChange={(e) => updateLeaveType(index, 'days_per_year', parseInt(e.target.value) || 0)}
                      placeholder="26"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kolor</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={leaveType.color}
                        onChange={(e) => updateLeaveType(index, 'color', e.target.value)}
                        className="w-12 h-9 rounded border border-input"
                      />
                      <Input
                        value={leaveType.color}
                        onChange={(e) => updateLeaveType(index, 'color', e.target.value)}
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Kategoria</Label>
                    <Select
                      value={leaveType.leave_category || 'annual'}
                      onValueChange={(value) => updateLeaveType(index, 'leave_category', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">Urlop wypoczynkowy</SelectItem>
                        <SelectItem value="sick">Urlop chorobowy</SelectItem>
                        <SelectItem value="maternity">Urlop macierzyński</SelectItem>
                        <SelectItem value="paternity">Urlop ojcowski</SelectItem>
                        <SelectItem value="childcare">Opieka nad dzieckiem</SelectItem>
                        <SelectItem value="other">Inne</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Wymaga salda urlopowego</Label>
                    <Switch
                      checked={leaveType.requires_balance}
                      onCheckedChange={(checked) => updateLeaveType(index, 'requires_balance', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Wymaga zatwierdzenia</Label>
                    <Switch
                      checked={leaveType.requires_approval}
                      onCheckedChange={(checked) => updateLeaveType(index, 'requires_approval', checked)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Opis (opcjonalnie)</Label>
                  <Input
                    value={leaveType.description || ''}
                    onChange={(e) => updateLeaveType(index, 'description', e.target.value)}
                    placeholder="Dodatkowe informacje o rodzaju urlopu"
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          <Button
            variant="outline"
            onClick={addLeaveType}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Dodaj nowy rodzaj urlopu
          </Button>
        </div>

        <Separator />

        <div className="flex justify-end gap-3 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Anuluj
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? 'Zapisywanie...' : 'Zapisz zmiany'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
} 