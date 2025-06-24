'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Loader2, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'

interface LeaveType {
  id: string
  name: string
  days_per_year: number
  color: string
  organization_id: string
  requires_balance?: boolean
}

interface LeaveTypesManagerProps {
  leaveTypes: LeaveType[]
  organizationId: string
}

export function LeaveTypesManager({ leaveTypes, organizationId }: LeaveTypesManagerProps) {
  const router = useRouter()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    days_per_year: 0,
    color: '#3B82F6',
    requires_balance: true
  })

  const colors = [
    { name: 'Niebieski', value: '#3B82F6' },
    { name: 'Zielony', value: '#10B981' },
    { name: 'Żółty', value: '#F59E0B' },
    { name: 'Czerwony', value: '#EF4444' },
    { name: 'Fioletowy', value: '#8B5CF6' },
    { name: 'Szary', value: '#6B7280' },
    { name: 'Turkusowy', value: '#14B8A6' }
  ]

  const resetForm = () => {
    setFormData({
      name: '',
      days_per_year: 0,
      color: '#3B82F6',
      requires_balance: true
    })
    setError(null)
    setSuccess(null)
  }

  const handleAdd = () => {
    resetForm()
    setAddDialogOpen(true)
  }

  const handleEdit = (leaveType: LeaveType) => {
    setFormData({
      name: leaveType.name,
      days_per_year: leaveType.days_per_year,
      color: leaveType.color,
      requires_balance: leaveType.requires_balance ?? true
    })
    setSelectedLeaveType(leaveType)
    setError(null)
    setSuccess(null)
    setEditDialogOpen(true)
  }

  const handleDelete = (leaveType: LeaveType) => {
    setSelectedLeaveType(leaveType)
    setDeleteDialogOpen(true)
  }

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const { data: newLeaveType, error: insertError } = await supabase
        .from('leave_types')
        .insert({
          organization_id: organizationId,
          name: formData.name,
          days_per_year: formData.days_per_year,
          color: formData.color,
          requires_balance: formData.requires_balance,
          leave_category: 'annual', // Default category
          requires_approval: true // Default approval requirement
        })
        .select()
        .single()

      if (insertError) {
        console.error('Database error:', insertError)
        throw new Error(insertError.message || 'Nie udało się dodać rodzaju urlopu')
      }

      // If this leave type requires balance and has days allocated, create balances for all users
      if (formData.requires_balance && formData.days_per_year > 0) {
        try {
          const response = await fetch('/api/admin/leave-balances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create_defaults_for_all_users',
              target_year: new Date().getFullYear()
            })
          })

          if (!response.ok) {
            console.warn('Failed to auto-create leave balances:', await response.text())
          } else {
            const result = await response.json()
            console.log('Auto-created leave balances:', result)
          }
        } catch (balanceError) {
          console.warn('Error creating leave balances:', balanceError)
          // Don't fail the leave type creation if balance creation fails
        }
      }

      setSuccess('Rodzaj urlopu został dodany!')
      router.refresh()
      setTimeout(() => {
        setAddDialogOpen(false)
        resetForm()
      }, 1500)

    } catch (error) {
      console.error('Error adding leave type:', error)
      setError(error instanceof Error ? error.message : 'Wystąpił błąd podczas dodawania rodzaju urlopu')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from('leave_types')
        .update({
          name: formData.name,
          days_per_year: formData.days_per_year,
          color: formData.color,
          requires_balance: formData.requires_balance
        })
        .eq('id', selectedLeaveType?.id)

      if (updateError) {
        console.error('Database error:', updateError)
        throw new Error(updateError.message || 'Nie udało się zaktualizować rodzaju urlopu')
      }

      setSuccess('Rodzaj urlopu został zaktualizowany!')
      router.refresh()
      setTimeout(() => {
        setEditDialogOpen(false)
        resetForm()
      }, 1500)

    } catch (error) {
      console.error('Error updating leave type:', error)
      setError(error instanceof Error ? error.message : 'Wystąpił błąd podczas aktualizacji rodzaju urlopu')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitDelete = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Check if leave type is being used
      const { count } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('leave_type_id', selectedLeaveType?.id)

      if (count && count > 0) {
        throw new Error('Nie można usunąć rodzaju urlopu, który jest używany w istniejących wnioskach')
      }

      const { error: deleteError } = await supabase
        .from('leave_types')
        .delete()
        .eq('id', selectedLeaveType?.id)

      if (deleteError) {
        throw new Error(deleteError.message || 'Nie udało się usunąć rodzaju urlopu')
      }

      router.refresh()
      setDeleteDialogOpen(false)

    } catch (error) {
      console.error('Error deleting leave type:', error)
      setError(error instanceof Error ? error.message : 'Wystąpił błąd podczas usuwania rodzaju urlopu')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDefaults = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/create-default-leave-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Nie udało się utworzyć domyślnych rodzajów urlopów')
      }

      router.refresh()
      setSuccess('Domyślne rodzaje urlopów zostały utworzone!')
      
      setTimeout(() => {
        setSuccess(null)
      }, 3000)

    } catch (error) {
      console.error('Error creating default leave types:', error)
      setError(error instanceof Error ? error.message : 'Wystąpił błąd podczas tworzenia domyślnych rodzajów urlopów')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Zarządzaj rodzajami urlopów dostępnymi w organizacji
        </p>
        <Button onClick={handleAdd} className="">
          <Plus className="h-4 w-4 mr-2" />
          Dodaj rodzaj urlopu
        </Button>
      </div>

      {/* Global alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200 text-green-800">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Leave Types List */}
      <div className="space-y-4">
        {leaveTypes.map((leaveType) => (
          <div
            key={leaveType.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="flex items-center gap-4">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: leaveType.color }}
              />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{leaveType.name}</h4>
                  {leaveType.requires_balance && (
                    <Badge variant="secondary" className="text-xs">
                      Saldo
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {leaveType.days_per_year} dni rocznie
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(leaveType)}
                className="text-primary hover:bg-primary/5"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(leaveType)}
                className="text-destructive hover:bg-destructive/5"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {leaveTypes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground space-y-4">
            <p>Brak rodzajów urlopów</p>
            <p className="text-sm">Dodaj pierwszy rodzaj urlopu dla organizacji lub użyj domyślnych typów urlopów</p>
            <Button 
              onClick={handleCreateDefaults}
              variant="outline"
              disabled={loading}
              className="mx-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Tworzenie...
                </>
              ) : (
                'Utwórz domyślne rodzaje urlopów'
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj rodzaj urlopu</DialogTitle>
            <DialogDescription>
              Utwórz nowy rodzaj urlopu dla organizacji
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Nazwa *</Label>
              <Input
                id="add-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="np. Urlop wypoczynkowy"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-days">Dni w roku *</Label>
              <Input
                id="add-days"
                type="number"
                value={formData.days_per_year}
                onChange={(e) => setFormData(prev => ({ ...prev, days_per_year: parseInt(e.target.value) || 0 }))}
                placeholder="0"
                required
                min="0"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>Kolor *</Label>
              <div className="grid grid-cols-4 gap-2">
                {colors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                    className={`w-full h-10 rounded-md border-2 ${formData.color === color.value ? 'border-gray-900' : 'border-border'}`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-requires-balance">Zarządzanie saldem</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="add-requires-balance"
                  checked={formData.requires_balance}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_balance: !!checked }))}
                  disabled={loading}
                />
                <Label htmlFor="add-requires-balance" className="text-sm font-normal">
                  Wymaga zarządzania saldem urlopowym
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Zaznacz, jeśli ten typ urlopu wymaga śledzenia i zarządzania saldem dni urlopowych
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-50 border-green-200 text-green-800">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)} disabled={loading}>
                Anuluj
              </Button>
              <Button type="submit" disabled={loading} className="">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Dodawanie...
                  </>
                ) : (
                  'Dodaj rodzaj urlopu'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj rodzaj urlopu</DialogTitle>
            <DialogDescription>
              Zaktualizuj informacje o rodzaju urlopu
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nazwa *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-days">Dni w roku *</Label>
              <Input
                id="edit-days"
                type="number"
                value={formData.days_per_year}
                onChange={(e) => setFormData(prev => ({ ...prev, days_per_year: parseInt(e.target.value) || 0 }))}
                required
                min="0"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>Kolor *</Label>
              <div className="grid grid-cols-4 gap-2">
                {colors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                    className={`w-full h-10 rounded-md border-2 ${formData.color === color.value ? 'border-gray-900' : 'border-border'}`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-requires-balance">Zarządzanie saldem</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-requires-balance"
                  checked={formData.requires_balance}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_balance: !!checked }))}
                  disabled={loading}
                />
                <Label htmlFor="edit-requires-balance" className="text-sm font-normal">
                  Wymaga zarządzania saldem urlopowym
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Zaznacz, jeśli ten typ urlopu wymaga śledzenia i zarządzania saldem dni urlopowych
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-50 border-green-200 text-green-800">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} disabled={loading}>
                Anuluj
              </Button>
              <Button type="submit" disabled={loading} className="">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Zapisywanie...
                  </>
                ) : (
                  'Zapisz zmiany'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usuń rodzaj urlopu</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz usunąć rodzaj urlopu "{selectedLeaveType?.name}"?
              Ta operacja jest nieodwracalna.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={loading}>
              Anuluj
            </Button>
            <Button type="button" variant="destructive" onClick={handleSubmitDelete} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Usuwanie...
                </>
              ) : (
                'Usuń rodzaj urlopu'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 