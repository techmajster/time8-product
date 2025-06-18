'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Save, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { DatePicker } from '@/components/ui/date-picker'

interface Profile {
  id: string
  full_name: string | null
  email: string
  employment_start_date: string | null
  birth_date: string | null
  phone_number: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
}

interface ProfileFormProps {
  profile: Profile
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    employment_start_date: profile.employment_start_date || '',
    birth_date: profile.birth_date || '',
    phone_number: profile.phone_number || '',
    address: profile.address || '',
    city: profile.city || '',
    postal_code: profile.postal_code || '',
    emergency_contact_name: profile.emergency_contact_name || '',
    emergency_contact_phone: profile.emergency_contact_phone || ''
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
          employment_start_date: formData.employment_start_date || null,
          birth_date: formData.birth_date || null,
          phone_number: formData.phone_number.trim() || null,
          address: formData.address.trim() || null,
          city: formData.city.trim() || null,
          postal_code: formData.postal_code.trim() || null,
          emergency_contact_name: formData.emergency_contact_name.trim() || null,
          emergency_contact_phone: formData.emergency_contact_phone.trim() || null
        })
        .eq('id', profile.id)

      if (updateError) {
        throw updateError
      }

      setSuccess('Profil został zaktualizowany!')
      router.refresh()

    } catch (error: any) {
      console.error('Error updating profile:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
        error: error
      })
      setError(error instanceof Error ? error.message : 'Wystąpił błąd podczas aktualizacji profilu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Podstawowe informacje</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="full_name">Imię i nazwisko *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="np. Jan Kowalski"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Adres email</Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Adres email nie może być zmieniony
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="employment_start_date">Data zatrudnienia</Label>
            <DatePicker
              date={formData.employment_start_date ? new Date(formData.employment_start_date) : undefined}
              onDateChange={(date) => setFormData(prev => ({ ...prev, employment_start_date: date ? date.toISOString().split('T')[0] : '' }))}
              placeholder="Wybierz datę zatrudnienia"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="birth_date">Data urodzenia</Label>
            <DatePicker
              date={formData.birth_date ? new Date(formData.birth_date) : undefined}
              onDateChange={(date) => setFormData(prev => ({ ...prev, birth_date: date ? date.toISOString().split('T')[0] : '' }))}
              placeholder="Wybierz datę urodzenia"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Używane do obliczenia wieku dla celów urlopowych
            </p>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Informacje kontaktowe</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="phone_number">Numer telefonu</Label>
            <Input
              id="phone_number"
              type="tel"
              value={formData.phone_number}
              onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
              placeholder="np. +48 123 456 789"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Miasto</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
              placeholder="np. Warszawa"
              disabled={loading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="address">Adres</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="np. ul. Przykładowa 123/45"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="postal_code">Kod pocztowy</Label>
            <Input
              id="postal_code"
              value={formData.postal_code}
              onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
              placeholder="np. 00-001"
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Kontakt awaryjny</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_name">Imię i nazwisko</Label>
            <Input
              id="emergency_contact_name"
              value={formData.emergency_contact_name}
              onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
              placeholder="np. Anna Kowalska"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergency_contact_phone">Numer telefonu</Label>
            <Input
              id="emergency_contact_phone"
              type="tel"
              value={formData.emergency_contact_phone}
              onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
              placeholder="np. +48 987 654 321"
              disabled={loading}
            />
          </div>
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

      <div className="flex items-center gap-4 pt-4 border-t">
        <Button 
          type="submit" 
          disabled={loading}
          className=""
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Zapisywanie...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Zapisz zmiany
            </>
          )}
        </Button>
        
        <div className="text-sm text-muted-foreground">
          Wszystkie pola są opcjonalne oprócz imienia i nazwiska
        </div>
      </div>
    </form>
  )
} 