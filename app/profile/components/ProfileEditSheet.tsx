'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { DatePickerWithDropdowns } from '@/components/ui/date-picker'
import { Loader2, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface ProfileEditSheetProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  profile: {
    id: string
    full_name: string | null
    email: string
    birth_date: string | null
  }
}

export function ProfileEditSheet({ isOpen, onOpenChange, profile }: ProfileEditSheetProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    birth_date: profile.birth_date || ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = createClient()

      // Validation
      if (!formData.full_name.trim()) {
        throw new Error('Imię i nazwisko jest wymagane')
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name.trim(),
          birth_date: formData.birth_date || null
        })
        .eq('id', profile.id)

      if (updateError) {
        throw updateError
      }

      setSuccess('Profil został zaktualizowany!')
      
      // Wait a moment to show success message
      setTimeout(() => {
        router.refresh()
        onOpenChange(false)
      }, 1000)

    } catch (error: any) {
      console.error('Error updating profile:', error)
      setError(error instanceof Error ? error.message : 'Wystąpił błąd podczas aktualizacji profilu')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    // Reset form to original values
    setFormData({
      full_name: profile.full_name || '',
      birth_date: profile.birth_date || ''
    })
    setError(null)
    setSuccess(null)
    onOpenChange(false)
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="content" className="flex flex-col p-6">
        <SheetHeader className="p-0 mb-3">
          <SheetTitle className="text-xl">Edytuj dane osobowe</SheetTitle>
        </SheetHeader>

        <Separator />

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col mt-3">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Imię i Nazwisko lub Nick</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="np. Jan Kowalski"
                required
                disabled={loading}
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Adres e-mail</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
                className="h-9 opacity-50"
              />
            </div>

            <div className="space-y-2 w-64">
              <Label htmlFor="birth_date">Data urodzenia</Label>
              <DatePickerWithDropdowns
                date={formData.birth_date ? new Date(formData.birth_date) : undefined}
                onDateChange={(date) => setFormData(prev => ({ 
                  ...prev, 
                  birth_date: date ? date.toISOString().split('T')[0] : '' 
                }))}
                placeholder="Wybierz datę"
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mt-4 bg-success/10 border-success/20 text-success">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Separator className="my-6 mt-auto" />

          <div className="flex justify-between">
            <Button 
              type="button"
              variant="outline" 
              onClick={handleCancel}
              disabled={loading}
              className="h-9"
            >
              Anuluj
            </Button>
            <Button 
              type="submit"
              disabled={loading}
              className="h-9"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Zapisywanie...
                </>
              ) : (
                'Zapisz'
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

