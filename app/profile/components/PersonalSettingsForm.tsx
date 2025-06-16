'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Loader2, Save, Bell, Mail, Calendar, Moon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useUserTheme } from '@/hooks/use-user-theme'

interface PersonalSettingsFormProps {
  userId: string
}

interface UserSettings {
  id?: string
  user_id: string
  email_notifications: boolean
  push_notifications: boolean
  leave_request_reminders: boolean
  team_leave_notifications: boolean
  weekly_summary: boolean
  dark_mode: boolean
  timezone: string
  language: string
  date_format: string
}

export function PersonalSettingsForm({ userId }: PersonalSettingsFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [tableExists, setTableExists] = useState(true)
  const { updateUserTheme } = useUserTheme(userId)
  const [settings, setSettings] = useState<UserSettings>({
    user_id: userId,
    email_notifications: true,
    push_notifications: false,
    leave_request_reminders: true,
    team_leave_notifications: true,
    weekly_summary: true,
    dark_mode: false,
    timezone: 'Europe/Warsaw',
    language: 'pl',
    date_format: 'DD/MM/YYYY'
  })

  const fetchSettings = useCallback(async () => {
    try {
      setInitialLoading(true)
      const supabase = createClient()
      
      // Test table access first
      const { data: testData, error: testError } = await supabase
        .from('user_settings')
        .select('id')
        .limit(1)
      
      if (testError) {
        console.log('Table access test failed:', testError.message)
        if (testError.message.includes('relation "user_settings" does not exist')) {
          setTableExists(false)
          return
        }
      }

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found, use defaults
          console.log('No user settings found, using defaults')
        } else {
          console.error('Error fetching settings:', error)
          setError('Nie udało się załadować ustawień')
        }
      } else if (data) {
        setSettings(data)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('Nieoczekiwany błąd podczas ładowania ustawień')
    } finally {
      setInitialLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Don't submit if table doesn't exist
    if (!tableExists) {
      setError('Tabela ustawień nie została jeszcze utworzona. Funkcja jest niedostępna.')
      return
    }
    
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = createClient()

      // Upsert settings (insert or update)
      const { error: upsertError } = await supabase
        .from('user_settings')
        .upsert(settings, {
          onConflict: 'user_id'
        })

      if (upsertError) {
        // If table doesn't exist, show helpful error message
        if (upsertError.code === 'PGRST106' || 
            upsertError.code === '42P01' ||
            upsertError.message?.includes('relation "user_settings" does not exist') ||
            upsertError.message?.includes('table "user_settings" does not exist')) {
          setTableExists(false)
          setError('Tabela ustawień nie została jeszcze utworzona. Skontaktuj się z administratorem.')
          return
        }
        throw upsertError
      }

      setSuccess('Ustawienia zostały zaktualizowane!')
      router.refresh()

    } catch (error) {
      console.error('Error updating settings:', error)
      setError(error instanceof Error ? error.message : 'Wystąpił błąd podczas aktualizacji ustawień')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Ładowanie ustawień...</span>
      </div>
    )
  }

  // If table doesn't exist, show setup message
  if (!tableExists) {
    return (
      <div className="space-y-6">
        <div className="p-6 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Ustawienia osobiste wymagają konfiguracji bazy danych
              </h3>
              <p className="text-sm text-primary-foreground mb-4">
                Aby włączyć ustawienia osobiste, administrator musi utworzyć tabelę user_settings w bazie danych.
              </p>
              
                              <div className="bg-muted/50 p-3 rounded border text-xs font-mono text-foreground mb-4">
                <p className="mb-2 font-semibold">Uruchom ten SQL w Supabase SQL Editor:</p>
                <pre className="whitespace-pre-wrap text-xs">CREATE TABLE user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  email_notifications BOOLEAN DEFAULT true,
  leave_request_reminders BOOLEAN DEFAULT true,
  team_leave_notifications BOOLEAN DEFAULT true,
  weekly_summary BOOLEAN DEFAULT true,
  dark_mode BOOLEAN DEFAULT false,
  timezone VARCHAR(50) DEFAULT 'Europe/Warsaw',
  language VARCHAR(10) DEFAULT 'pl',
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY'
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own settings" ON user_settings
  FOR ALL USING (auth.uid() = user_id);</pre>
              </div>

                              <p className="text-xs text-muted-foreground">
                💡 Po utworzeniu tabeli odśwież stronę, aby aktywować ustawienia.
              </p>
            </div>
          </div>
        </div>

        {/* Show preview of what settings will look like */}
        <div className="opacity-50 pointer-events-none">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <h3 className="text-lg font-medium">Powiadomienia (Podgląd)</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Powiadomienia email</Label>
                  <p className="text-sm text-muted-foreground">
                    Otrzymuj powiadomienia na adres email
                  </p>
                </div>
                <div className="w-11 h-6 bg-primary rounded-full"></div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Tryb ciemny</Label>
                  <p className="text-sm text-muted-foreground">
                    Przełącz na ciemny motyw interfejsu
                  </p>
                </div>
                <div className="w-11 h-6 bg-muted rounded-full"></div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Strefa czasowa</Label>
                  <p className="text-sm text-muted-foreground">
                    Europa/Warszawa (GMT+1)
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">Wybierz strefę</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Notification Settings */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h3 className="text-lg font-medium">Powiadomienia</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="email_notifications">Powiadomienia email</Label>
              <p className="text-sm text-muted-foreground">
                Otrzymuj powiadomienia na adres email
              </p>
            </div>
            <Switch
              id="email_notifications"
              checked={settings.email_notifications}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, email_notifications: checked }))}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="leave_request_reminders">Przypomnienia o wnioskach</Label>
              <p className="text-sm text-muted-foreground">
                Powiadamiaj o oczekujących wnioskach urlopowych
              </p>
            </div>
            <Switch
              id="leave_request_reminders"
              checked={settings.leave_request_reminders}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, leave_request_reminders: checked }))}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="team_leave_notifications">Powiadomienia o zespole</Label>
              <p className="text-sm text-muted-foreground">
                Informuj o urlopach członków zespołu
              </p>
            </div>
            <Switch
              id="team_leave_notifications"
              checked={settings.team_leave_notifications}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, team_leave_notifications: checked }))}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="weekly_summary">Tygodniowe podsumowanie</Label>
              <p className="text-sm text-muted-foreground">
                Otrzymuj cotygodniowe podsumowanie urlopów
              </p>
            </div>
            <Switch
              id="weekly_summary"
              checked={settings.weekly_summary}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, weekly_summary: checked }))}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Display Settings */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Moon className="h-5 w-5" />
          <h3 className="text-lg font-medium">Wygląd</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="dark_mode">Tryb ciemny</Label>
              <p className="text-sm text-muted-foreground">
                Przełącz na ciemny motyw interfejsu
              </p>
            </div>
            <Switch
              id="dark_mode"
              checked={settings.dark_mode}
              onCheckedChange={async (checked) => {
                try {
                  // Update theme immediately
                  await updateUserTheme(checked)
                  // Update local state
                  setSettings(prev => ({ ...prev, dark_mode: checked }))
                  setSuccess('Motyw został zaktualizowany!')
                  setTimeout(() => setSuccess(null), 3000)
                } catch (error) {
                  console.error('Error updating theme:', error)
                  setError('Błąd podczas zmiany motywu')
                  setTimeout(() => setError(null), 5000)
                }
              }}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Regional Settings */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <h3 className="text-lg font-medium">Ustawienia regionalne</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="timezone">Strefa czasowa</Label>
            <select
              id="timezone"
              value={settings.timezone}
              onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
              className="w-full px-3 py-2 border border-input rounded-md"
              disabled={loading}
            >
              <option value="Europe/Warsaw">Europa/Warszawa (GMT+1)</option>
              <option value="Europe/London">Europa/Londyn (GMT+0)</option>
              <option value="Europe/Berlin">Europa/Berlin (GMT+1)</option>
              <option value="Europe/Paris">Europa/Paryż (GMT+1)</option>
              <option value="America/New_York">Ameryka/Nowy Jork (GMT-5)</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Język</Label>
            <select
              id="language"
              value={settings.language}
              onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
              className="w-full px-3 py-2 border border-input rounded-md"
              disabled={loading}
            >
              <option value="pl">Polski</option>
              <option value="en">English</option>
              <option value="de">Deutsch</option>
              <option value="fr">Français</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="date_format">Format daty</Label>
          <select
            id="date_format"
            value={settings.date_format}
            onChange={(e) => setSettings(prev => ({ ...prev, date_format: e.target.value }))}
            className="w-full px-3 py-2 border border-input rounded-md"
            disabled={loading}
          >
            <option value="DD/MM/YYYY">DD/MM/RRRR (31/12/2024)</option>
            <option value="MM/DD/YYYY">MM/DD/RRRR (12/31/2024)</option>
            <option value="YYYY-MM-DD">RRRR-MM-DD (2024-12-31)</option>
            <option value="DD.MM.YYYY">DD.MM.RRRR (31.12.2024)</option>
          </select>
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
              Zapisz ustawienia
            </>
          )}
        </Button>
        
        <div className="text-sm text-muted-foreground">
          Ustawienia będą stosowane natychmiast
        </div>
      </div>
    </form>
  )
} 