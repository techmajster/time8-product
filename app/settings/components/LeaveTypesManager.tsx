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

interface LeaveType {
  id: string
  name: string
  days_per_year: number
  color: string
  leave_category: string
  organization_id: string
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
    color: 'hsl(var(--primary))',
    leave_category: 'vacation'
  })

  const colors = [
    { name: 'Podstawowy', value: 'hsl(var(--primary))' },
    { name: 'Sukces', value: 'hsl(var(--success))' },
    { name: 'Ostrzeżenie', value: 'hsl(var(--warning))' },
    { name: 'Błąd', value: 'hsl(var(--destructive))' },
    { name: 'Informacja', value: 'hsl(var(--info))' },
    { name: 'Akcentujący', value: 'hsl(var(--accent))' },
    { name: 'Wyciszony', value: 'hsl(var(--muted))' }
  ]

  const categories = [
    { value: 'vacation', name: 'Urlop wypoczynkowy' },
    { value: 'sick', name: 'Zwolnienie lekarskie' },
    { value: 'personal', name: 'Urlop okolicznościowy' },
    { value: 'maternity', name: 'Urlop macierzyński' },
    { value: 'paternity', name: 'Urlop ojcowski' },
    { value: 'parental', name: 'Urlop rodzicielski' },
    { value: 'study', name: 'Urlop szkoleniowy' },
    { value: 'other', name: 'Inne' }
  ]

  const resetForm = () => {
    setFormData({
      name: '',
      days_per_year: 0,
      color: 'hsl(var(--primary))',
      leave_category: 'vacation'
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
      leave_category: leaveType.leave_category
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

      const { error: insertError } = await supabase
        .from('leave_types')
        .insert({
          organization_id: organizationId,
          name: formData.name,
          days_per_year: formData.days_per_year,
          color: formData.color,
          leave_category: formData.leave_category
        })

      if (insertError) {
        throw insertError
      }

      setSuccess('Rodzaj urlopu został dodany!')
      router.refresh()
      setTimeout(() => {
        setAddDialogOpen(false)
        resetForm()
      }, 1500)

    } catch (error) {
      console.error('Error adding leave type:', error)
      setError('Wystąpił błąd podczas dodawania rodzaju urlopu')
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
          leave_category: formData.leave_category
        })
        .eq('id', selectedLeaveType?.id)

      if (updateError) {
        throw updateError
      }

      setSuccess('Rodzaj urlopu został zaktualizowany!')
      router.refresh()
      setTimeout(() => {
        setEditDialogOpen(false)
        resetForm()
      }, 1500)

    } catch (error) {
      console.error('Error updating leave type:', error)
      setError('Wystąpił błąd podczas aktualizacji rodzaju urlopu')
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
        throw deleteError
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
                <h4 className="font-medium">{leaveType.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {leaveType.days_per_year} dni rocznie • {categories.find(c => c.value === leaveType.leave_category)?.name}
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
          <div className="text-center py-8 text-muted-foreground">
            <p>Brak rodzajów urlopów</p>
            <p className="text-sm">Dodaj pierwszy rodzaj urlopu dla organizacji</p>
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
                placeholder="26"
                required
                min="0"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-category">Kategoria *</Label>
              <select
                id="add-category"
                value={formData.leave_category}
                onChange={(e) => setFormData(prev => ({ ...prev, leave_category: e.target.value }))}
                className="w-full px-3 py-2 border border-input rounded-md"
                required
                disabled={loading}
              >
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.name}
                  </option>
                ))}
              </select>
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

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-success/10 border-success/20 text-success">
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
              <Label htmlFor="edit-category">Kategoria *</Label>
              <select
                id="edit-category"
                value={formData.leave_category}
                onChange={(e) => setFormData(prev => ({ ...prev, leave_category: e.target.value }))}
                className="w-full px-3 py-2 border border-input rounded-md"
                required
                disabled={loading}
              >
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.name}
                  </option>
                ))}
              </select>
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

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-success/10 border-success/20 text-success">
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
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Usuń rodzaj urlopu
            </DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz usunąć ten rodzaj urlopu? Ta akcja nie może być cofnięta.
            </DialogDescription>
          </DialogHeader>

          {selectedLeaveType && (
            <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: selectedLeaveType.color }}
                />
                <div>
                  <h4 className="font-medium text-destructive-foreground">{selectedLeaveType.name}</h4>
                  <p className="text-sm text-destructive">
                    {selectedLeaveType.days_per_year} dni rocznie
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={loading}>
              Anuluj
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleSubmitDelete} 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Usuwanie...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Usuń rodzaj urlopu
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 