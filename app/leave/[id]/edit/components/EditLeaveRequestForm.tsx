'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Calendar, Info, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { 
  validateLeaveRequest, 
  getApplicableLeaveTypes, 
  calculateWorkingDays, 
  formatValidationErrors 
} from '@/lib/leave-validation'
import { LeaveType, LeaveBalance, LeaveRequest, UserProfile, LeaveCategory } from '@/types/leave'

interface EditLeaveRequestFormProps {
  leaveRequest: LeaveRequest
  leaveTypes: LeaveType[]
  leaveBalances: LeaveBalance[]
  userProfile?: UserProfile
  onSuccess?: () => void
  inDialog?: boolean
}

export function EditLeaveRequestForm({ leaveRequest, leaveTypes, leaveBalances, userProfile, onSuccess, inDialog }: EditLeaveRequestFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [validationMessages, setValidationMessages] = useState<string[]>([])
  const [formData, setFormData] = useState({
    leave_type_id: leaveRequest.leave_type_id,
    start_date: leaveRequest.start_date,
    end_date: leaveRequest.end_date,
    reason: leaveRequest.reason || ''
  })
  const [calculatedDays, setCalculatedDays] = useState<number | null>(leaveRequest.days_requested)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      calculateWorkingDaysWithHolidays()
    } else {
      setCalculatedDays(null)
    }
  }, [formData.start_date, formData.end_date])

  const calculateWorkingDaysWithHolidays = async () => {
    try {
      const response = await fetch('/api/working-days', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: formData.start_date,
          endDate: formData.end_date,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setCalculatedDays(result.working_days)
      } else {
        // Fallback to basic calculation if API fails
        calculateBusinessDays()
      }
    } catch (error) {
      console.error('Error calculating working days:', error)
      // Fallback to basic calculation
      calculateBusinessDays()
    }
  }

  const calculateBusinessDays = () => {
    if (!formData.start_date || !formData.end_date) return

    const startDate = new Date(formData.start_date)
    const endDate = new Date(formData.end_date)
    
    if (endDate < startDate) {
      setCalculatedDays(null)
      return
    }

    let businessDays = 0
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay()
      // Count Monday (1) through Friday (5)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        businessDays++
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    setCalculatedDays(businessDays)
  }

  const getSelectedLeaveBalance = () => {
    if (!formData.leave_type_id) return null
    return leaveBalances.find(balance => balance.leave_type_id === formData.leave_type_id)
  }

  const hasChanges = () => {
    return (
      formData.leave_type_id !== leaveRequest.leave_type_id ||
      formData.start_date !== leaveRequest.start_date ||
      formData.end_date !== leaveRequest.end_date ||
      formData.reason !== (leaveRequest.reason || '')
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (!formData.leave_type_id || !formData.start_date || !formData.end_date) {
        setError('Wszystkie pola są wymagane')
        return
      }

      if (!calculatedDays || calculatedDays <= 0) {
        setError('Nieprawidłowy zakres dat')
        return
      }

      if (!hasChanges()) {
        setError('Nie wprowadzono żadnych zmian')
        return
      }

      // Check if user has enough balance for the new leave type
      const selectedBalance = getSelectedLeaveBalance()
      if (selectedBalance && calculatedDays > selectedBalance.remaining_days) {
        setError(`Niewystarczające saldo urlopowe. Pozostało: ${selectedBalance.remaining_days} dni, potrzebujesz: ${calculatedDays} dni`)
        return
      }

      // Update leave request via API
      const response = await fetch(`/api/leave-requests/${leaveRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leave_type_id: formData.leave_type_id,
          start_date: formData.start_date,
          end_date: formData.end_date,
          days_requested: calculatedDays,
          reason: formData.reason || null,
        }),
      })

      let result
      try {
        const responseText = await response.text()
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError)
        throw new Error(`Server returned invalid response (${response.status})`)
      }

      if (!response.ok) {
        console.error('API Error:', result)
        throw new Error(result.error || result.details || `Failed to update leave request (${response.status})`)
      }

      setSuccess('Wniosek urlopowy został zaktualizowany i wymaga ponownego zatwierdzenia!')
      
      // Call onSuccess callback if provided, otherwise redirect
      if (onSuccess) {
        setTimeout(() => {
          onSuccess()
        }, 1500)
      } else {
        setTimeout(() => {
          router.push(`/leave/${leaveRequest.id}`)
        }, 2000)
      }
      
    } catch (err) {
      console.error('Error updating leave request:', err)
      setError(err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd')
    } finally {
      setLoading(false)
    }
  }

  const isSubmitDisabled = !formData.leave_type_id || !formData.start_date || !formData.end_date || !calculatedDays || calculatedDays <= 0 || !hasChanges()

  const content = (
    <div className="space-y-6">
      {/* Re-approval Warning */}
      {!inDialog && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Ważne:</strong> Po wprowadzeniu zmian status wniosku zostanie zmieniony na "Oczekujący" 
            i będzie wymagał ponownego zatwierdzenia przez menedżera.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Leave Type Selection */}
        <div className="space-y-2">
          <Label htmlFor="leave_type_id">Typ urlopu *</Label>
          <Select 
            value={formData.leave_type_id} 
            onValueChange={(value) => setFormData({ ...formData, leave_type_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Wybierz typ urlopu" />
            </SelectTrigger>
            <SelectContent>
              {leaveTypes.map((type) => {
                const balance = leaveBalances.find(b => b.leave_type_id === type.id)
                return (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: type.color }}
                        />
                        {type.name}
                      </div>
                      <span className="text-xs text-muted-foreground ml-2">
                        {(() => {
                          // Special handling for "Urlop na żądanie" - always 4 days per year
                          if (type.name === 'Urlop na żądanie') {
                            return '4 dni'
                          }
                          
                          // Show balance only for types that require it
                          if (type.requires_balance && balance) {
                            return `${balance.remaining_days} dni`
                          }
                          
                          // Don't show any label for types that don't require balance
                          return ''
                        })()}
                      </span>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start_date">Data rozpoczęcia *</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_date">Data zakończenia *</Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              min={formData.start_date}
              required
            />
          </div>
        </div>

        {/* Calculated Days */}
        {calculatedDays !== null && (
          <Alert>
            <Calendar className="h-4 w-4" />
            <AlertDescription>
              <strong>Liczba dni roboczych:</strong> {calculatedDays} dni
              {calculatedDays > 0 && (
                <span className="block text-xs text-muted-foreground mt-1">
                  Nie licząc weekendów i polskich świąt
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Reason */}
        <div className="space-y-2">
          <Label htmlFor="reason">Powód (opcjonalnie)</Label>
          <Textarea
            id="reason"
            placeholder="Opisz powód urlopu..."
            value={formData.reason}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, reason: e.target.value })}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Dodatkowe informacje dla menedżera
          </p>
        </div>

        {/* Error/Success Messages */}
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

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button 
            type="submit" 
            disabled={loading || isSubmitDisabled}
            className="flex-1"
          >
            {loading ? 'Zapisywanie zmian...' : 'Zapisz zmiany'}
          </Button>
          {!inDialog && (
            <Button 
              type="button" 
              variant="outline" 
              asChild
            >
              <Link href={`/leave/${leaveRequest.id}`}>Anuluj</Link>
            </Button>
          )}
        </div>
      </form>
    </div>
  )

  if (inDialog) {
    return content
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <Link 
          href={`/leave/${leaveRequest.id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Powrót do szczegółów wniosku
        </Link>

        <Card>
          <CardHeader>
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Edytuj wniosek urlopowy</CardTitle>
            <CardDescription>
              Wprowadź zmiany w swoim wniosku urlopowym. Po zapisaniu wniosek będzie wymagał ponownego zatwierdzenia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {content}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 