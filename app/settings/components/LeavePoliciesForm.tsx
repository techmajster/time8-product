'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Loader2, Save, Clock, AlertTriangle, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface LeavePoliciesFormProps {
  organizationId: string
}

interface LeavePolicy {
  id?: string
  organization_id: string
  min_notice_days: number
  max_consecutive_days: number
  require_manager_approval: boolean
  require_admin_approval_over_days: number
  allow_negative_balance: boolean
  carry_over_enabled: boolean
  max_carry_over_days: number
  blackout_dates: string[]
  auto_approve_up_to_days: number
  require_coverage_plan: boolean
  weekend_policy: 'include' | 'exclude' | 'business_days_only'
  holiday_policy: 'include' | 'exclude'
}

export function LeavePoliciesForm({ organizationId }: LeavePoliciesFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [policies, setPolicies] = useState<LeavePolicy>({
    organization_id: organizationId,
    min_notice_days: 7,
    max_consecutive_days: 30,
    require_manager_approval: true,
    require_admin_approval_over_days: 15,
    allow_negative_balance: false,
    carry_over_enabled: true,
    max_carry_over_days: 5,
    blackout_dates: [],
    auto_approve_up_to_days: 0,
    require_coverage_plan: false,
    weekend_policy: 'exclude',
    holiday_policy: 'exclude'
  })

  // Fetch existing policies on component mount
  useEffect(() => {
    fetchPolicies()
  }, [organizationId])

  const fetchPolicies = async () => {
    try {
      const supabase = createClient()
      
      // Check if leave_policies table exists and has policies
      const { data: existingPolicies, error: fetchError } = await supabase
        .from('leave_policies')
        .select('*')
        .eq('organization_id', organizationId)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No policies found for this organization - this is expected for new organizations
          console.log('No existing policies found for organization, using defaults')
        } else if (fetchError.code === '42P01') {
          // Table doesn't exist
          console.error('leave_policies table does not exist. Please run the database migration.')
          setError('Tabela polityk urlopowych nie istnieje. Skontaktuj się z administratorem systemu.')
        } else {
          // Other database errors
          console.error('Error fetching policies:', {
            message: fetchError.message || 'Unknown error',
            code: fetchError.code || 'NO_CODE',
            details: fetchError.details || 'No details',
            hint: fetchError.hint || 'No hint'
          })
          setError(`Błąd ładowania polityk: ${fetchError.message || 'Nieznany błąd'}`)
        }
      }

      if (existingPolicies) {
        setPolicies(existingPolicies)
      }
    } catch (error) {
      console.error('Error in fetchPolicies:', error)
      setError(`Błąd ładowania polityk: ${error instanceof Error ? error.message : 'Nieznany błąd'}`)
    } finally {
      setInitialLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = createClient()

      // Validation
      if (policies.min_notice_days < 0) {
        throw new Error('Minimalna liczba dni wyprzedzenia nie może być ujemna')
      }

      if (policies.max_consecutive_days <= 0) {
        throw new Error('Maksymalna liczba kolejnych dni musi być większa od 0')
      }

      if (policies.require_admin_approval_over_days < 0) {
        throw new Error('Próg zatwierdzania przez administratora nie może być ujemny')
      }

      // Upsert policies (insert or update)
      const { error: upsertError } = await supabase
        .from('leave_policies')
        .upsert(policies, {
          onConflict: 'organization_id'
        })

      if (upsertError) {
        throw upsertError
      }

      setSuccess('Polityki urlopowe zostały zaktualizowane!')
      router.refresh()

    } catch (error) {
      console.error('Error updating policies:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
        error: error
      })
      setError(error instanceof Error ? error.message : 'Wystąpił błąd podczas aktualizacji polityk')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Ładowanie polityk...</span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Notice and Approval Policies */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium">Zasady zatwierdzania</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="min_notice_days">Minimalne wyprzedzenie (dni) *</Label>
            <Input
              id="min_notice_days"
              type="number"
              value={policies.min_notice_days}
              onChange={(e) => setPolicies(prev => ({ ...prev, min_notice_days: parseInt(e.target.value) || 0 }))}
              min="0"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Ile dni wcześniej należy złożyć wniosek urlopowy
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="require_admin_approval_over_days">Zatwierdzanie przez admin powyżej (dni)</Label>
            <Input
              id="require_admin_approval_over_days"
              type="number"
              value={policies.require_admin_approval_over_days}
              onChange={(e) => setPolicies(prev => ({ ...prev, require_admin_approval_over_days: parseInt(e.target.value) || 0 }))}
              min="0"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Urlopy dłuższe niż X dni wymagają zatwierdzenia przez administratora
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="require_manager_approval"
              checked={policies.require_manager_approval}
              onCheckedChange={(checked) => setPolicies(prev => ({ ...prev, require_manager_approval: checked }))}
              disabled={loading}
            />
            <Label htmlFor="require_manager_approval">
              Wymagaj zatwierdzenia przez menedżera/administratora
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="require_coverage_plan"
              checked={policies.require_coverage_plan}
              onCheckedChange={(checked) => setPolicies(prev => ({ ...prev, require_coverage_plan: checked }))}
              disabled={loading}
            />
            <Label htmlFor="require_coverage_plan">
              Wymagaj planu zastępstwa dla dłuższych urlopów
            </Label>
          </div>
        </div>
      </div>

      {/* Leave Limits */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium">Limity urlopowe</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="max_consecutive_days">Maksymalne kolejne dni *</Label>
            <Input
              id="max_consecutive_days"
              type="number"
              value={policies.max_consecutive_days}
              onChange={(e) => setPolicies(prev => ({ ...prev, max_consecutive_days: parseInt(e.target.value) || 1 }))}
              min="1"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Maksymalna liczba kolejnych dni urlopu w jednym wniosku
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="auto_approve_up_to_days">Auto-zatwierdzanie do (dni)</Label>
            <Input
              id="auto_approve_up_to_days"
              type="number"
              value={policies.auto_approve_up_to_days}
              onChange={(e) => setPolicies(prev => ({ ...prev, auto_approve_up_to_days: parseInt(e.target.value) || 0 }))}
              min="0"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Urlopy do X dni będą automatycznie zatwierdzane (0 = wyłączone)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="allow_negative_balance"
            checked={policies.allow_negative_balance}
            onCheckedChange={(checked) => setPolicies(prev => ({ ...prev, allow_negative_balance: checked }))}
            disabled={loading}
          />
          <Label htmlFor="allow_negative_balance">
            Zezwalaj na ujemne saldo urlopowe
          </Label>
        </div>
      </div>

      {/* Carry Over Policies */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium">Przenoszenie urlopów</h3>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="carry_over_enabled"
            checked={policies.carry_over_enabled}
            onCheckedChange={(checked) => setPolicies(prev => ({ ...prev, carry_over_enabled: checked }))}
            disabled={loading}
          />
          <Label htmlFor="carry_over_enabled">
            Zezwalaj na przenoszenie niewykorzystanych urlopów na kolejny rok
          </Label>
        </div>

        {policies.carry_over_enabled && (
          <div className="space-y-2">
            <Label htmlFor="max_carry_over_days">Maksymalna liczba dni do przeniesienia</Label>
            <Input
              id="max_carry_over_days"
              type="number"
              value={policies.max_carry_over_days}
              onChange={(e) => setPolicies(prev => ({ ...prev, max_carry_over_days: parseInt(e.target.value) || 0 }))}
              min="0"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Maksymalna liczba dni urlopu, które można przenieść na kolejny rok
            </p>
          </div>
        )}
      </div>

      {/* Working Days Policies */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium">Zasady liczenia dni roboczych</h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="weekend_policy">Polityka weekendów</Label>
            <Select
              value={policies.weekend_policy}
              onValueChange={(value) => setPolicies(prev => ({ ...prev, weekend_policy: value as 'include' | 'exclude' | 'business_days_only' }))}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz politykę weekendów" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exclude">Nie licz weekendów</SelectItem>
                <SelectItem value="include">Licz weekendy</SelectItem>
                <SelectItem value="business_days_only">Tylko dni robocze</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Jak traktować weekendy przy liczeniu dni urlopu
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="holiday_policy">Polityka świąt</Label>
            <Select
              value={policies.holiday_policy}
              onValueChange={(value) => setPolicies(prev => ({ ...prev, holiday_policy: value as 'include' | 'exclude' }))}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz politykę świąt" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exclude">Nie licz świąt państwowych</SelectItem>
                <SelectItem value="include">Licz święta państwowe</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Jak traktować święta państwowe przy liczeniu dni urlopu
            </p>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
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
              Zapisz polityki
            </>
          )}
        </Button>
        
        <div className="text-sm text-muted-foreground">
          Zmiany będą miały wpływ na nowe wnioski urlopowe
        </div>
      </div>
    </form>
  )
} 