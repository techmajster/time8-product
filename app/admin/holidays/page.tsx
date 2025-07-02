'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar, Plus, Flag, Building2, Trash2, Loader2, Edit } from 'lucide-react'
import { AppLayoutClient } from '@/components/app-layout-client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'
import { DatePicker } from '@/components/ui/date-picker'

interface Holiday {
  id: string
  name: string
  date: string
  type: string
  organization_id: string | null
  description?: string
  holiday_type?: string
  days_until?: number
}

interface UserProfile {
  role: string
  organization_id: string
  organizations?: {
    name: string
  } | null
}

function AddCompanyHolidayDialog({ organizationId, onHolidayAdded }: { organizationId: string, onHolidayAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    description: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = createClient()

      // Validate date is not in the past
      const selectedDate = new Date(formData.date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (selectedDate < today) {
        setError('Data święta nie może być z przeszłości')
        return
      }

      // Check if holiday already exists on this date
      const { data: existingHoliday } = await supabase
        .from('company_holidays')
        .select('id, name')
        .eq('date', formData.date)
        .or(`organization_id.eq.${organizationId},organization_id.is.null`)
        .single()

      if (existingHoliday) {
        setError(`Święto "${existingHoliday.name}" już istnieje w tym dniu`)
        return
      }

      // Create company holiday
      const { error: insertError } = await supabase
        .from('company_holidays')
        .insert({
          organization_id: organizationId,
          name: formData.name,
          date: formData.date,
          type: 'organization',
          description: formData.description || null
        })

      if (insertError) {
        throw insertError
      }

      setSuccess('Święto firmowe zostało dodane pomyślnie!')
      setFormData({ name: '', date: '', description: '' })
      
      // Call callback to refresh data
      onHolidayAdded()
      
      // Close dialog after a short delay
      setTimeout(() => {
        setOpen(false)
        setSuccess(null)
      }, 1500)

    } catch (error) {
      console.error('Error adding company holiday:', error)
      setError('Wystąpił błąd podczas dodawania święta firmowego')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setError(null)
    setSuccess(null)
    setFormData({ name: '', date: '', description: '' })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="">
          <Plus className="h-4 w-4 mr-2" />
          Dodaj święto firmowe
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Dodaj święto firmowe
          </DialogTitle>
          <DialogDescription>
            Utwórz dodatkowy dzień wolny dla Twojej organizacji
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nazwa święta *</Label>
            <Input
              id="name"
              placeholder="np. Dzień firmy, Dzień zespołu..."
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data *</Label>
            <DatePicker
              date={formData.date ? new Date(formData.date) : undefined}
              onDateChange={(date) => setFormData(prev => ({ ...prev, date: date ? date.toISOString().split('T')[0] : '' }))}
              placeholder="Wybierz datę święta"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Opis (opcjonalnie)</Label>
            <Textarea
              id="description"
              placeholder="Dodatkowe informacje o święcie..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              disabled={loading}
              rows={3}
            />
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
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Anuluj
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Dodawanie...' : 'Dodaj święto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditHolidayDialog({ holiday, onHolidayUpdated }: { holiday: Holiday, onHolidayUpdated: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: holiday.name,
    date: holiday.date,
    description: holiday.description || ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = createClient()

      // Validate date is not in the past
      const selectedDate = new Date(formData.date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (selectedDate < today) {
        setError('Data święta nie może być z przeszłości')
        return
      }

      // Check if holiday already exists on this date (excluding current holiday)
      const { data: existingHoliday } = await supabase
        .from('company_holidays')
        .select('id, name')
        .eq('date', formData.date)
        .neq('id', holiday.id)
        .or(`organization_id.eq.${holiday.organization_id},organization_id.is.null`)
        .single()

      if (existingHoliday) {
        setError(`Święto "${existingHoliday.name}" już istnieje w tym dniu`)
        return
      }

      // Update company holiday
      const { error: updateError } = await supabase
        .from('company_holidays')
        .update({
          name: formData.name,
          date: formData.date,
          description: formData.description || null
        })
        .eq('id', holiday.id)

      if (updateError) {
        throw updateError
      }

      setSuccess('Święto firmowe zostało zaktualizowane pomyślnie!')
      
      // Call callback to refresh data
      onHolidayUpdated()
      
      // Close dialog after a short delay
      setTimeout(() => {
        setOpen(false)
        setSuccess(null)
      }, 1500)

    } catch (error) {
      console.error('Error updating company holiday:', error)
      setError('Wystąpił błąd podczas aktualizacji święta firmowego')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setError(null)
    setSuccess(null)
    // Reset form data to original values
    setFormData({
      name: holiday.name,
      date: holiday.date,
      description: holiday.description || ''
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary hover:bg-primary/5"
        >
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edytuj święto firmowe
          </DialogTitle>
          <DialogDescription>
            Zaktualizuj informacje o święcie firmowym
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nazwa święta *</Label>
            <Input
              id="edit-name"
              placeholder="np. Dzień firmy, Dzień zespołu..."
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-date">Data *</Label>
            <DatePicker
              date={formData.date ? new Date(formData.date) : undefined}
              onDateChange={(date) => setFormData(prev => ({ ...prev, date: date ? date.toISOString().split('T')[0] : '' }))}
              placeholder="Wybierz datę święta"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Opis (opcjonalnie)</Label>
            <Textarea
              id="edit-description"
              placeholder="Dodatkowe informacje o święcie..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              disabled={loading}
              rows={3}
            />
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
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
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
  )
}

function DeleteHolidayButton({ holiday, onHolidayDeleted }: { holiday: Holiday, onHolidayDeleted: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const { error: deleteError } = await supabase
        .from('company_holidays')
        .delete()
        .eq('id', holiday.id)

      if (deleteError) {
        throw deleteError
      }

      onHolidayDeleted()
      setOpen(false)
    } catch (error) {
      console.error('Error deleting holiday:', error)
      setError('Wystąpił błąd podczas usuwania święta')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/5"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Usuń święto firmowe
          </DialogTitle>
          <DialogDescription>
            Czy na pewno chcesz usunąć to święto? Ta akcja nie może być cofnięta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
            <div className="flex items-center gap-3">
                             <span className="text-xl">
                 {holiday.holiday_type === 'national' ? '🇵🇱' : 
                  holiday.holiday_type === 'organization' ? '🏢' : '📅'}
               </span>
              <div>
                <h4 className="font-medium text-destructive-foreground">{holiday.name}</h4>
                <p className="text-sm text-destructive">
                  {new Date(holiday.date).toLocaleDateString('pl-PL', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                  })}
                </p>
                {holiday.description && (
                  <p className="text-xs text-destructive mt-1">
                    {holiday.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Anuluj
          </Button>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={handleDelete} 
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
                Usuń święto
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function HolidaysPage() {
  const router = useRouter()
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [upcomingHolidays, setUpcomingHolidays] = useState<Holiday[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get user profile
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: userProfile } = await supabase
        .from('profiles')
        .select(`
          role, 
          organization_id,
          organizations (
            name
          )
        `)
        .eq('id', user.id)
        .single()

      if (!userProfile || userProfile.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      if (!userProfile.organization_id) {
        router.push('/onboarding')
        return
      }

      // Transform the data to match our interface
      const transformedProfile: UserProfile = {
        role: userProfile.role,
        organization_id: userProfile.organization_id,
        organizations: Array.isArray(userProfile.organizations) 
          ? userProfile.organizations[0] || null 
          : userProfile.organizations || null
      }

      setProfile(transformedProfile)

      // Get organization settings to filter holidays by country
      const { data: orgData } = await supabase
        .from('organizations')
        .select('country_code')
        .eq('id', userProfile.organization_id)
        .single()

      const countryCode = orgData?.country_code || 'PL'

      // Fetch holidays (national holidays for the selected country + organization holidays)
      const currentYear = new Date().getFullYear()
      const { data: holidaysData, error: holidaysError } = await supabase
        .from('company_holidays')
        .select('id, name, date, type, organization_id, description, country_code')
        .gte('date', `${currentYear}-01-01`)
        .lte('date', `${currentYear}-12-31`)
        .or(`organization_id.eq.${userProfile.organization_id},and(type.eq.national,country_code.eq.${countryCode})`)
        .order('date', { ascending: true })

      if (holidaysError) {
        throw holidaysError
      }

      // Transform holidays
      const transformedHolidays = holidaysData?.map(holiday => ({
        ...holiday,
        holiday_type: holiday.type || 'organization',
      })) || []

      setHolidays(transformedHolidays)

      // Fetch upcoming holidays (filtered by country)
      const today = new Date().toISOString().split('T')[0]
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 90)
      const future = futureDate.toISOString().split('T')[0]

      const { data: upcomingData, error: upcomingError } = await supabase
        .from('company_holidays')
        .select('id, name, date, type, organization_id, description, country_code')
        .gte('date', today)
        .lte('date', future)
        .or(`organization_id.eq.${userProfile.organization_id},and(type.eq.national,country_code.eq.${countryCode})`)
        .order('date', { ascending: true })
        .limit(5)

      if (upcomingError) {
        throw upcomingError
      }

      // Transform upcoming holidays with days_until
      const transformedUpcoming = upcomingData?.map(holiday => {
        const holidayDate = new Date(holiday.date)
        const todayDate = new Date()
        const diffTime = holidayDate.getTime() - todayDate.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        return {
          ...holiday,
          holiday_type: holiday.type || 'organization',
          days_until: Math.max(0, diffDays)
        }
      }) || []

      setUpcomingHolidays(transformedUpcoming)

    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Wystąpił błąd podczas ładowania danych')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const nationalHolidays = holidays.filter(h => h.holiday_type === 'national')
  const organizationHolidays = holidays.filter(h => h.holiday_type === 'organization')

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  }

  const getHolidayTypeIcon = (type: string) => {
    return ''
  }

  const getHolidayTypeName = (type: string) => {
    switch (type) {
      case 'national': return 'Święto państwowe'
      case 'organization': return 'Święto firmowe'
      default: return 'Inne'
    }
  }

  const refreshHolidays = () => {
    fetchData()
  }

  if (loading) {
    return (
      <AppLayoutClient userRole="admin">
        <div className="container mx-auto py-6 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Ładowanie świąt...</span>
          </div>
        </div>
      </AppLayoutClient>
    )
  }

  if (error) {
    return (
      <AppLayoutClient userRole="admin">
        <div className="container mx-auto py-6">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </AppLayoutClient>
    )
  }

  if (!profile) {
    return null
  }

  return (
    <AppLayoutClient userRole={profile.role}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-card-foreground">Zarządzanie świętami</h1>
            <p className="text-muted-foreground">
              Przeglądaj święta państwowe i zarządzaj świętami firmowymi
            </p>
          </div>
          
          <AddCompanyHolidayDialog 
            organizationId={profile.organization_id}
            onHolidayAdded={refreshHolidays}
          />
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Święta państwowe</CardTitle>
              <Flag className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{nationalHolidays.length}</div>
              <p className="text-xs text-muted-foreground">
                Święta narodowe
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Święta firmowe</CardTitle>
              <Building2 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{organizationHolidays.length}</div>
              <p className="text-xs text-muted-foreground">
                Dodatkowe dni wolne
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nadchodzące święta</CardTitle>
              <Calendar className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingHolidays.length}</div>
              <p className="text-xs text-muted-foreground">
                W ciągu 90 dni
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Holidays */}
        {upcomingHolidays.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Nadchodzące święta
              </CardTitle>
              <CardDescription>
                Najbliższe święta w ciągu następnych 90 dni
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingHolidays.map((holiday) => (
                <div
                  key={holiday.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <h4 className="font-medium">{holiday.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(holiday.date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <Badge variant="outline">
                        {holiday.days_until === 0 ? 'Dziś' : 
                         holiday.days_until === 1 ? 'Jutro' : 
                         `Za ${holiday.days_until} dni`}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getHolidayTypeName(holiday.holiday_type || '')}
                      </p>
                    </div>
                    {holiday.holiday_type === 'organization' && (
                      <div className="flex items-center gap-1">
                        <EditHolidayDialog 
                          holiday={holiday}
                          onHolidayUpdated={refreshHolidays}
                        />
                        <DeleteHolidayButton 
                          holiday={holiday}
                          onHolidayDeleted={refreshHolidays}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* All Holidays */}
        <Card>
          <CardHeader>
            <CardTitle>Wszystkie święta ({new Date().getFullYear()})</CardTitle>
            <CardDescription>
              Lista wszystkich świąt w bieżącym roku kalendarzowym
            </CardDescription>
          </CardHeader>
          <CardContent>
            {holidays.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Brak świąt w bazie danych</p>
                <p className="text-sm">Skontaktuj się z administratorem systemu</p>
              </div>
            ) : (
              <div className="space-y-2">
                {holidays.map((holiday) => (
                  <div
                    key={holiday.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <h4 className="font-medium">{holiday.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(holiday.date)}
                        </p>
                        {holiday.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {holiday.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={holiday.holiday_type === 'national' ? 'default' : 'secondary'}
                      >
                        {getHolidayTypeName(holiday.holiday_type || '')}
                      </Badge>
                      {holiday.holiday_type === 'organization' && (
                        <>
                          <EditHolidayDialog 
                            holiday={holiday}
                            onHolidayUpdated={refreshHolidays}
                          />
                          <DeleteHolidayButton 
                            holiday={holiday}
                            onHolidayDeleted={refreshHolidays}
                          />
                        </>
                      )}
                      {holiday.holiday_type === 'national' && (
                        <div className="px-2 py-1 text-xs text-muted-foreground">
                          Tylko do odczytu
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayoutClient>
  )
} 