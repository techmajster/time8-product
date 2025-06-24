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
import { Badge } from '@/components/ui/badge'
import { DatePicker } from '@/components/ui/date-picker'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ArrowLeft, Calendar, Info, AlertTriangle, CheckCircle, HelpCircle, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import { DateRange } from "react-day-picker"
import { 
  validateLeaveRequest, 
  getApplicableLeaveTypes, 
  calculateWorkingDays, 
  formatValidationErrors 
} from '@/lib/leave-validation'
import { LeaveType, LeaveBalance, UserProfile, LeaveCategory } from '@/types/leave'

interface NewLeaveRequestFormProps {
  leaveTypes: LeaveType[]
  leaveBalances: LeaveBalance[]
  userProfile?: UserProfile
  onSuccess?: () => void
  inDialog?: boolean
}

export function NewLeaveRequestForm({ leaveTypes, leaveBalances, userProfile, onSuccess, inDialog = false }: NewLeaveRequestFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [validationMessages, setValidationMessages] = useState<string[]>([])
  const [formData, setFormData] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: ''
  })
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [calculatedDays, setCalculatedDays] = useState<number | null>(null)
  
  const router = useRouter()
  const supabase = createClient()



  // Filter leave types based on user eligibility
  const applicableLeaveTypes = userProfile 
    ? getApplicableLeaveTypes(userProfile, leaveTypes, leaveBalances, userProfile.organization_id)
    : leaveTypes

  // Sync date range with form data
  useEffect(() => {
    if (dateRange?.from) {
      const startDateString = dateRange.from.toISOString().split('T')[0]
      setFormData(prev => ({ ...prev, start_date: startDateString }))
    }
    if (dateRange?.to) {
      const endDateString = dateRange.to.toISOString().split('T')[0]
      setFormData(prev => ({ ...prev, end_date: endDateString }))
    }
    // Clear dates if range is cleared
    if (!dateRange?.from) {
      setFormData(prev => ({ ...prev, start_date: '' }))
    }
    if (!dateRange?.to) {
      setFormData(prev => ({ ...prev, end_date: '' }))
    }
  }, [dateRange])

  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      calculateWorkingDaysWithHolidays()
    } else {
      setCalculatedDays(null)
      setValidationMessages([])
    }
  }, [formData.start_date, formData.end_date, formData.leave_type_id])

  const calculateWorkingDaysWithHolidays = async () => {
    console.log('🔧 Calculating working days for:', formData.start_date, 'to', formData.end_date)
    
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

      console.log('🔧 API response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('🔧 API returned:', result.working_days, 'working days')
        setCalculatedDays(result.working_days)
        
        // Validate the request if we have all required data
        if (formData.leave_type_id && userProfile && result.working_days > 0) {
          validateCurrentRequest(result.working_days)
        }
      } else {
        console.log('🔧 API failed, using fallback calculation')
        // Fallback to basic calculation if API fails
        const days = calculateWorkingDays(new Date(formData.start_date), new Date(formData.end_date))
        console.log('🔧 Fallback returned:', days, 'working days')
        setCalculatedDays(days)
        
        if (formData.leave_type_id && userProfile && days > 0) {
          validateCurrentRequest(days)
        }
      }
    } catch (error) {
      console.error('🔧 Error calculating working days:', error)
      // Fallback to basic calculation
      const days = calculateWorkingDays(new Date(formData.start_date), new Date(formData.end_date))
      console.log('🔧 Error fallback returned:', days, 'working days')
      setCalculatedDays(days)
      
      if (formData.leave_type_id && userProfile && days > 0) {
        validateCurrentRequest(days)
      }
    }
  }

  const validateCurrentRequest = async (daysRequested: number) => {
    if (!userProfile || !formData.leave_type_id) return

    const selectedLeaveType = leaveTypes.find(lt => lt.id === formData.leave_type_id)
    if (!selectedLeaveType) return

    const selectedBalance = leaveBalances.find(b => b.leave_type_id === formData.leave_type_id)

    // Get user's existing requests for validation
    const { data: existingRequests } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('user_id', userProfile.id)
      .in('status', ['pending', 'approved'])

    const validationResult = validateLeaveRequest(
      new Date(formData.start_date),
      new Date(formData.end_date),
      formData.leave_type_id,
      leaveTypes,
      leaveBalances,
      existingRequests || []
    )

    setValidationMessages(formatValidationErrors(validationResult))
  }

  const getSelectedLeaveBalance = () => {
    if (!formData.leave_type_id) return null
    return leaveBalances.find(balance => balance.leave_type_id === formData.leave_type_id)
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

      // Check if user has enough balance
      const selectedBalance = getSelectedLeaveBalance()
      if (selectedBalance && calculatedDays > selectedBalance.remaining_days) {
        setError(`Niewystarczające saldo urlopowe. Pozostało: ${selectedBalance.remaining_days} dni, potrzebujesz: ${calculatedDays} dni`)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Nie jesteś zalogowany')
        return
      }

      // Get user profile to get organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!profile?.organization_id) {
        setError('Nie znaleziono profilu użytkownika')
        return
      }

      // Create leave request via API
      const response = await fetch('/api/leave-requests', {
        method: 'POST',
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

      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))

      let result
      try {
        const responseText = await response.text()
        console.log('Response text:', responseText)
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError)
        throw new Error(`Server returned invalid response (${response.status})`)
      }

      if (!response.ok) {
        console.error('API Error:', result)
        throw new Error(result.error || result.details || `Failed to create leave request (${response.status})`)
      }

      setSuccess('Wniosek urlopowy został pomyślnie złożony!')
      
      // Call onSuccess callback if provided, otherwise redirect
      if (onSuccess) {
        setTimeout(() => {
          onSuccess()
        }, 1500)
      } else {
        setTimeout(() => {
          router.push('/leave')
        }, 2000)
      }
      
    } catch (err) {
      console.error('Error creating leave request:', err)
      setError(err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd')
    } finally {
      setLoading(false)
    }
  }

  const hasValidationErrors = validationMessages.some(msg => !msg.startsWith('⚠️'))
  const isSubmitDisabled = !formData.leave_type_id || !dateRange?.from || !dateRange?.to || !calculatedDays || calculatedDays <= 0 || hasValidationErrors

  const content = (
    <TooltipProvider>
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Leave Balance Overview */}
        {leaveBalances.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Przegląd sald urlopowych</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Aktualne stany Twoich urlopów na {new Date().getFullYear()} rok</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Typ urlopu</TableHead>
                    <TableHead className="text-center">Przysługuje</TableHead>
                    <TableHead className="text-center">Wykorzystane</TableHead>
                    <TableHead className="text-center">Pozostało</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveBalances.map((balance) => {
                    const leaveType = leaveTypes.find(lt => lt.id === balance.leave_type_id)
                    if (!leaveType) return null
                    
                    return (
                      <TableRow key={balance.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: leaveType.color }}
                            />
                            <span className="font-medium">{leaveType.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{balance.entitled_days}</TableCell>
                        <TableCell className="text-center">{balance.used_days}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={(() => {
                            if (leaveType.name === 'Urlop na żądanie') {
                              const vacationBalance = leaveBalances.find(b => {
                                const vLeaveType = leaveTypes.find(lt => lt.id === b.leave_type_id)
                                return vLeaveType?.name === 'Urlop wypoczynkowy'
                              })
                              if (vacationBalance) {
                                const usedThisYear = Math.min(balance.used_days, 4)
                                const remainingAnnual = 4 - usedThisYear
                                const actualRemaining = Math.min(remainingAnnual, vacationBalance.remaining_days)
                                return actualRemaining > 0 ? "default" : "destructive"
                              }
                            }
                            return balance.remaining_days > 0 ? "default" : "destructive"
                          })()}>
                            {(() => {
                              if (leaveType.name === 'Urlop na żądanie') {
                                const vacationBalance = leaveBalances.find(b => {
                                  const vLeaveType = leaveTypes.find(lt => lt.id === b.leave_type_id)
                                  return vLeaveType?.name === 'Urlop wypoczynkowy'
                                })
                                if (vacationBalance) {
                                  const usedThisYear = Math.min(balance.used_days, 4)
                                  const remainingAnnual = 4 - usedThisYear
                                  const actualRemaining = Math.min(remainingAnnual, vacationBalance.remaining_days)
                                  return Math.max(0, actualRemaining)
                                }
                              }
                              return Math.max(0, balance.remaining_days)
                            })()}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      {/* Leave Type Selection */}
              <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="leave_type_id">Typ urlopu *</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Wybierz typ urlopu zgodny z polskim prawem pracy.<br/>Sprawdź swoje saldo przed złożeniem wniosku.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Select 
          value={formData.leave_type_id} 
          onValueChange={(value) => setFormData({ ...formData, leave_type_id: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Wybierz typ urlopu" />
          </SelectTrigger>
          <SelectContent>
            {applicableLeaveTypes.map((type) => {
              const balance = leaveBalances.find(b => b.leave_type_id === type.id)
              const isPaid = type.is_paid ?? true
              const requiresBalance = type.requires_balance ?? true
              
              return (
                <SelectItem key={type.id} value={type.id}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: type.color }}
                      />
                      <div className="flex flex-col">
                        <span>{type.name}</span>
                        <div className="flex gap-1 mt-1">
                          <Badge variant={isPaid ? "default" : "secondary"} className="text-xs">
                            {isPaid ? "Płatny" : "Bezpłatny"}
                          </Badge>
                          {type.advance_notice_days && type.advance_notice_days > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {type.advance_notice_days}d wyprzedzenia
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground ml-2">
                      {(() => {
                        // Special handling for "Urlop na żądanie" - always 4 days per year
                        if (type.name === 'Urlop na żądanie') {
                          return '4 dni'
                        }
                        
                        // Show balance only for types that require it
                        if (requiresBalance && balance) {
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
        
        {/* Show selected leave type info */}
        {formData.leave_type_id && (
          <div className="mt-2 p-3 bg-primary/5 rounded-lg">
            {(() => {
              const selectedType = leaveTypes.find(t => t.id === formData.leave_type_id)
              if (!selectedType) return null
              
              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary-foreground">
                      Informacje o typie urlopu
                    </span>
                  </div>
                                        <div className="text-xs text-primary space-y-1">
                    {selectedType.advance_notice_days && selectedType.advance_notice_days > 0 && (
                      <p>• Wymagane wyprzedzenie: {selectedType.advance_notice_days} dni</p>
                    )}
                    {selectedType.max_days_per_request && (
                      <p>• Maksymalnie za jednym razem: {selectedType.max_days_per_request} dni</p>
                    )}
                                         {selectedType.name === 'Urlop na żądanie' && (
                       <>
                         <p>• Roczny limit: 4 dni (prawo pracownika)</p>
                         <p>• Jest częścią urlopu wypoczynkowego - będzie odliczone z obu sald</p>
                       </>
                     )}
                     {selectedType.leave_category === LeaveCategory.EMERGENCY && (
                       <p>• Dostępny w nagłych, nieprzewidzianych okolicznościach</p>
                     )}
                     {selectedType.leave_category === LeaveCategory.PARENTAL && (
                       <p>• Obejmuje: urlop macierzyński, ojcowski, rodzicielski i wychowawczy</p>
                     )}
                     <p>• {selectedType.is_paid ? "Urlop płatny" : "Urlop bezpłatny"}</p>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>

      {/* Date Range Picker */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>Okres urlopu *</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Wybierz zakres dat urlopu.<br/>Weekendy i święta nie są liczone do dni roboczych.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <DateRangePicker
          date={dateRange}
          onDateChange={setDateRange}
          placeholder="Wybierz okres urlopu"
        />
      </div>

      {/* Calculated Days and Validation */}
      {calculatedDays !== null && (
        <div className="space-y-2">
          <Alert>
            <Calendar className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span><strong>Liczba dni roboczych:</strong> {calculatedDays} dni</span>
                {getSelectedLeaveBalance() && (
                  <span className="text-sm text-muted-foreground">
                    Po urlopie pozostanie: {Math.max(0, getSelectedLeaveBalance()!.remaining_days - calculatedDays)} dni
                  </span>
                )}
              </div>
              {calculatedDays > 0 && (
                <span className="block text-xs text-muted-foreground mt-1">
                  Nie licząc weekendów i polskich świąt
                </span>
              )}
            </AlertDescription>
          </Alert>
          
          {/* Validation Messages */}
          {validationMessages.length > 0 && (
            <div className="space-y-1">
              {validationMessages.map((message, index) => {
                const isWarning = message.startsWith('⚠️')
                return (
                  <Alert key={index} variant={isWarning ? "default" : "destructive"}>
                    {isWarning ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <AlertDescription>
                      {message.replace('⚠️ ', '')}
                    </AlertDescription>
                  </Alert>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Reason */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="reason">Powód (opcjonalnie)</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Dodatkowe informacje dla przełożonego.<br/>Może przyspieszyć proces zatwierdzenia.</p>
            </TooltipContent>
          </Tooltip>
        </div>
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
          {loading ? 'Składanie wniosku...' : 'Złóż wniosek urlopowy'}
        </Button>
        {!inDialog && (
          <Button 
            type="button" 
            variant="outline" 
            asChild
          >
            <Link href="/leave">Anuluj</Link>
          </Button>
        )}
      </div>
    </form>
    </TooltipProvider>
  )

  if (inDialog) {
    return content
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <Link 
          href="/leave" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Powrót do wniosków urlopowych
        </Link>

        <Card>
          <CardHeader>
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
            <CardTitle>Nowy wniosek urlopowy</CardTitle>
            <CardDescription>
              Wypełnij formularz aby złożyć wniosek o urlop
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