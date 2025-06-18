'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Save, Globe, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'

interface HolidayCalendarSettingsProps {
  organizationId: string
  currentCountryCode: string
}

interface HolidayCalendar {
  code: string
  name: string
  flag: string
  description: string
  holidayCount: number
}

const AVAILABLE_CALENDARS: HolidayCalendar[] = [
  {
    code: 'PL',
    name: 'Polska',
    flag: '🇵🇱',
    description: 'Kalendarz polskich świąt narodowych i religijnych',
    holidayCount: 26
  },
  {
    code: 'IE',
    name: 'Irlandia',
    flag: '🇮🇪',
    description: 'Kalendarz irlandzkich świąt narodowych i bank holidays',
    holidayCount: 10
  },
  {
    code: 'US',
    name: 'Stany Zjednoczone',
    flag: '🇺🇸',
    description: 'Kalendarz amerykańskich świąt federalnych',
    holidayCount: 0 // Not yet implemented
  },
  {
    code: 'UK',
    name: 'Wielka Brytania',
    flag: '🇬🇧',
    description: 'Kalendarz brytyjskich bank holidays i świąt narodowych',
    holidayCount: 0 // Not yet implemented
  },
  {
    code: 'DE',
    name: 'Niemcy',
    flag: '🇩🇪',
    description: 'Kalendarz niemieckich świąt narodowych',
    holidayCount: 0 // Not yet implemented
  },
  {
    code: 'FR',
    name: 'Francja',
    flag: '🇫🇷',
    description: 'Kalendarz francuskich świąt narodowych',
    holidayCount: 0 // Not yet implemented
  }
]

export function HolidayCalendarSettings({ organizationId, currentCountryCode }: HolidayCalendarSettingsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedCountry, setSelectedCountry] = useState(currentCountryCode)

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = createClient()

      // Update organization's country code
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          country_code: selectedCountry
        })
        .eq('id', organizationId)

      if (updateError) {
        throw updateError
      }

      setSuccess('Kalendarz świąt został zaktualizowany!')
      router.refresh()

    } catch (error) {
      console.error('Error updating holiday calendar:', error)
      setError(error instanceof Error ? error.message : 'Wystąpił błąd podczas aktualizacji')
    } finally {
      setLoading(false)
    }
  }

  const selectedCalendar = AVAILABLE_CALENDARS.find(cal => cal.code === selectedCountry)

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label>Wybierz kalendarz świąt narodowych</Label>
        <p className="text-sm text-muted-foreground">
          Wybrany kalendarz będzie używany do automatycznego oznaczania dni wolnych od pracy.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AVAILABLE_CALENDARS.map((calendar) => {
            const isSelected = selectedCountry === calendar.code
            const isAvailable = calendar.holidayCount > 0

            return (
              <div
                key={calendar.code}
                className={`relative p-4 border rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : isAvailable
                    ? 'border-border hover:border-primary/50 hover:bg-muted/50'
                    : 'border-border bg-muted/25 opacity-60 cursor-not-allowed'
                }`}
                onClick={() => isAvailable && setSelectedCountry(calendar.code)}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className="text-2xl">{calendar.flag}</div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{calendar.name}</h3>
                                             {calendar.holidayCount > 0 ? (
                         <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
                           {calendar.holidayCount} świąt
                         </Badge>
                       ) : (
                         <Badge variant="outline" className="text-xs">
                           Wkrótce
                         </Badge>
                       )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {calendar.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {selectedCalendar && selectedCalendar.holidayCount > 0 && (
          <Alert className="bg-info/10 border-info/20">
            <Globe className="h-4 w-4" />
            <AlertDescription>
              <strong>{selectedCalendar.name}</strong> - {selectedCalendar.holidayCount} świąt narodowych 
              będzie automatycznie oznaczanych jako dni wolne od pracy w kalendarzu urlopów.
            </AlertDescription>
          </Alert>
        )}
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
          onClick={handleSave}
          disabled={loading || selectedCountry === currentCountryCode}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Zapisywanie...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Zapisz kalendarz
            </>
          )}
        </Button>
        
        {selectedCountry !== currentCountryCode && (
          <p className="text-sm text-muted-foreground">
            Zmiana z <strong>{AVAILABLE_CALENDARS.find(c => c.code === currentCountryCode)?.name}</strong> na{' '}
            <strong>{selectedCalendar?.name}</strong>
          </p>
        )}
      </div>
    </div>
  )
} 