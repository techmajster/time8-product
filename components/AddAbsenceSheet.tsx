'use client'

import React, { useState, useEffect, Suspense, forwardRef, useImperativeHandle } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { CalendarDays, Clock, User, Loader2, CheckCircle, ChevronsUpDown, Info, X, Calendar, TreePalm, ChevronDownIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { format, addDays, differenceInDays, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { getApplicableLeaveTypes, isLeaveTypeDisabled } from '@/lib/leave-validation'
import { LeaveType, LeaveBalance } from '@/types/leave'
import { useDisabledDates } from '@/hooks/use-disabled-dates'
import { useHolidays } from '@/hooks/useHolidays'

interface Employee {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: string
  team_id: string | null
}

interface OverlapUser {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  leave_type_name: string
  end_date: string
  color: string
}

interface AddAbsenceSheetProps {
  preloadedEmployees?: Employee[]
  userRole?: string
  activeOrganizationId?: string
  workingDays?: string[]
  isOpen: boolean
  onClose: () => void
}

// Vacation icon component matching Figma design
function VacationIcon() {
  return (
    <div className="bg-cyan-200 relative rounded-lg size-10 flex items-center justify-center">
      <TreePalm className="h-6 w-6 text-foreground" />
    </div>
  )
}

// Employee dropdown trigger component matching Figma design
function EmployeeSelectTrigger({ 
  employee, 
  placeholder = "Wybierz pracownika" 
}: { 
  employee?: Employee | null
  placeholder?: string 
}) {
  if (!employee) {
    return (
      <div className="flex flex-row items-center gap-2 h-12 px-3 py-2 w-full">
        <div className="bg-muted rounded-full size-8 flex items-center justify-center">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 flex flex-col">
          <span className="text-sm text-muted-foreground">{placeholder}</span>
        </div>
        <ChevronsUpDown className="h-4 w-4 opacity-50" />
      </div>
    )
  }

  return (
    <div className="flex flex-row items-center gap-2 h-12 px-3 py-2 w-full">
      <Avatar className="size-8">
        <AvatarImage src={employee.avatar_url || undefined} />
        <AvatarFallback className="text-sm font-normal">
          {(employee.full_name || employee.email)?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 flex flex-col items-start justify-center">
        <div className="font-medium text-sm text-foreground leading-5 truncate w-full">
          {employee.full_name || employee.email}
        </div>
        <div className="font-normal text-xs text-muted-foreground leading-4 truncate w-full">
          {employee.email}
        </div>
      </div>
      <ChevronsUpDown className="h-4 w-4 opacity-50" />
    </div>
  )
}

// Leave type dropdown trigger component
function LeaveTypeSelectTrigger({ 
  leaveType, 
  balance,
  placeholder = "Wybierz typ nieobecności" 
}: { 
  leaveType?: LeaveType | null
  balance?: number
  placeholder?: string 
}) {
  if (!leaveType) {
    return (
      <div className="flex flex-row items-center gap-2 h-12 px-3 py-2 w-full">
        <div className="flex-1 flex flex-col items-start justify-center">
          <span className="text-sm text-muted-foreground">{placeholder}</span>
        </div>
        <ChevronsUpDown className="h-4 w-4 opacity-50" />
      </div>
    )
  }

  return (
    <div className="flex flex-row items-center gap-2 h-12 px-3 py-2 w-full">
      <div className="flex-1 flex flex-col items-start justify-center">
        <div className="font-medium text-sm text-foreground leading-5 truncate w-full">
          {leaveType.name}
          {typeof balance === 'number' && ` (${balance} dni dostępne)`}
        </div>
      </div>
      <ChevronsUpDown className="h-4 w-4 opacity-50" />
    </div>
  )
}

// Overlap warning user item component
function OverlapUserItem({ user }: { user: OverlapUser }) {
  return (
    <div className="flex flex-row gap-4 items-center justify-start w-full min-w-[85px]">
      <Avatar className="size-10">
        <AvatarImage src={user.avatar_url || undefined} />
        <AvatarFallback>
          {(user.full_name || user.email)?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 flex flex-col items-start justify-start">
        <div className="font-medium text-sm text-foreground leading-5 truncate w-full">
          {user.full_name || user.email}
        </div>
        <div className="font-normal text-sm text-muted-foreground leading-5 truncate w-full">
          {user.email}
        </div>
      </div>
      <div className="flex flex-col items-end justify-center text-sm">
        <div className="font-medium text-foreground leading-5">
          {user.leave_type_name}
        </div>
        <div className="font-normal text-muted-foreground leading-5">
          do {format(parseISO(user.end_date), 'dd.MM', { locale: pl })}
        </div>
      </div>
    </div>
  )
}

const AddAbsenceSheetContent = forwardRef<{ resetForm: () => void }, AddAbsenceSheetProps>(
  function AddAbsenceSheetContent({ preloadedEmployees, userRole, activeOrganizationId, isOpen, onClose, workingDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] }, ref) {
    const supabase = createClient()
    const sheetContentRef = React.useRef<HTMLDivElement>(null)

  // State
  const [loading, setLoading] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>(preloadedEmployees || [])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([])
  const [overlapUsers, setOverlapUsers] = useState<OverlapUser[]>([])
  const [employeesLoaded, setEmployeesLoaded] = useState(!!preloadedEmployees)
  const [organizationId, setOrganizationId] = useState<string>('')
  
  const [formData, setFormData] = useState({
    employee_id: '',
    leave_type_id: '',
    start_date: '',
    end_date: '',
    notes: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Handle sheet close with form reset
  const resetForm = () => {
    setFormData({
      employee_id: '',
      leave_type_id: '',
      start_date: '',
      end_date: '',
      notes: ''
    })
    setErrors({})
    setOverlapUsers([])
  }

  const handleClose = () => {
    resetForm()
    // Call parent onClose
    onClose()
  }

  // Expose resetForm to parent via ref
  useImperativeHandle(ref, () => ({
    resetForm
  }))

  // Fetch disabled dates for selected employee
  const { disabledDates } = useDisabledDates({
    userId: formData.employee_id || null,
    organizationId: organizationId
  })

  // Fetch holidays for disabled dates using React Query
  const { data: holidays = [], isLoading: isLoadingHolidays } = useHolidays({
    organizationId: organizationId,
    countryCode: 'PL' // Default to Poland, ideally this should come from organization settings
  })

  // Computed values
  const selectedEmployee = employees.find(emp => emp.id === formData.employee_id)
  const selectedLeaveType = leaveTypes.find(lt => lt.id === formData.leave_type_id)
  const selectedBalance = leaveBalances.find(lb => lb.leave_type_id === formData.leave_type_id)
  
  // Calculate selected days
  const selectedDays = formData.start_date && formData.end_date 
    ? differenceInDays(parseISO(formData.end_date), parseISO(formData.start_date)) + 1
    : 0
  
  // Calculate remaining days after this request
  const remainingAfter = selectedBalance 
    ? Math.max(0, selectedBalance.remaining_days - selectedDays)
    : 0

  // Load employees when sheet is opened (either preloaded or fresh load)
  useEffect(() => {
    if (isOpen) {
      if (!employeesLoaded) {
        console.log('🔍 AddAbsenceSheet - Loading employees from API')
        loadEmployees()
      } else {
        console.log('🔍 AddAbsenceSheet - Using preloaded employees:', {
          count: preloadedEmployees?.length,
          userRole,
          employees: preloadedEmployees
        })
      }
    }
  }, [isOpen, employeesLoaded])

  // Load leave types and balances when employee is selected
  useEffect(() => {
    if (formData.employee_id) {
      loadEmployeeLeaveData(formData.employee_id)
    }
  }, [formData.employee_id])

  // Check for overlaps when dates change
  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      checkOverlaps()
    } else {
      setOverlapUsers([])
    }
  }, [formData.start_date, formData.end_date])

  const loadEmployees = async () => {
    try {
      setLoading(true)
      
      // Get current user profile if we don't have role
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Use the active organization ID passed from parent component or fall back to organizationId state
      const orgId = activeOrganizationId || organizationId
      if (!orgId) return

      let query = supabase
        .from('user_organizations')
        .select(`
          user_id,
          role,
          team_id,
          profiles!user_organizations_user_id_fkey (
            id,
            email,
            full_name,
            avatar_url
          )
        `)
        .eq('organization_id', orgId)
        .eq('is_active', true)

      // If manager, show team members (including themselves for self-absence requests)
      if (userRole === 'manager') {
        console.log('🔍 AddAbsenceSheet - Manager loading team members for user:', user.id)

        const { data: managerOrg, error: managerOrgError } = await supabase
          .from('user_organizations')
          .select('team_id')
          .eq('user_id', user.id)
          .eq('organization_id', orgId)
          .eq('is_active', true)
          .single()
        
        console.log('🔍 AddAbsenceSheet - Manager org lookup:', { managerOrg, managerOrgError })
        
        if (managerOrg?.team_id) {
          console.log('🔍 AddAbsenceSheet - Filtering by team_id:', managerOrg.team_id)
          query = query.eq('team_id', managerOrg.team_id)
        } else {
          // Manager has no team assigned - show only themselves
          query = query.eq('user_id', user.id)
        }
        
        // Note: We include the manager themselves so they can create their own absence requests
      }

      const { data: employeesData, error } = await query

      console.log('🔍 AddAbsenceSheet - Query result:', { 
        count: employeesData?.length, 
        error,
        data: employeesData 
      })

      if (error) throw error

      // Transform the data to match the Employee interface
      const transformedEmployees = employeesData?.map(userOrg => {
        const profile = Array.isArray(userOrg.profiles) ? userOrg.profiles[0] : userOrg.profiles
        return {
          id: profile?.id || userOrg.user_id,
          email: profile?.email || '',
          full_name: profile?.full_name,
          avatar_url: profile?.avatar_url,
          role: userOrg.role,
          team_id: userOrg.team_id
        }
      }) || []

      console.log('🔍 AddAbsenceSheet - Transformed employees:', transformedEmployees)

      setEmployees(transformedEmployees)
      setEmployeesLoaded(true)
    } catch (error) {
      console.error('Error loading employees:', error)
      toast.error('Błąd ładowania pracowników')
    } finally {
      setLoading(false)
    }
  }

  const loadEmployeeLeaveData = async (employeeId: string) => {
    try {
      setLoading(true)

      console.log('🔍 AddAbsenceSheet - Loading leave data for employee:', employeeId)

      // MULTI-ORG UPDATE: Get employee's organization via API (bypasses RLS)
      let finalOrgId = null
      
      try {
        const orgResponse = await fetch(`/api/employees/${employeeId}/organization`)
        
        if (orgResponse.ok) {
          const orgData = await orgResponse.json()
          console.log('🔍 AddAbsenceSheet - Employee org from API:', orgData)
          finalOrgId = orgData.organization_id
        } else {
          const errorData = await orgResponse.json().catch(() => ({}))
          console.error('❌ Organization API error:', { status: orgResponse.status, error: errorData })
        }
      } catch (apiError) {
        console.error('❌ Organization API request failed:', apiError)
      }
      
      // Fallback: get current user's organization directly using API
      if (!finalOrgId) {
        console.log('⚠️ API failed, trying current user org fallback via API')
        
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          try {
            const currentUserOrgResponse = await fetch(`/api/employees/${user.id}/organization`)
            if (currentUserOrgResponse.ok) {
              const currentUserOrgData = await currentUserOrgResponse.json()
              finalOrgId = currentUserOrgData.organization_id
              console.log('🔍 Got current user org via API:', finalOrgId)
            }
          } catch (fallbackError) {
            console.error('❌ Current user org API also failed:', fallbackError)
          }
        }
      }

      // Final fallback: If all API calls fail, try one more direct query without RLS restrictions
      if (!finalOrgId) {
        console.log('⚠️ All API calls failed, trying direct query without employee filter')
        
        // Just get ANY active organization from our own profile (emergency fallback)
        try {
          const { data: anyOrg } = await supabase
            .from('user_organizations')
            .select('organization_id')
            .eq('is_active', true)
            .limit(1)
          
          if (anyOrg && anyOrg.length > 0) {
            finalOrgId = anyOrg[0].organization_id
            console.log('🔍 Emergency fallback using any active org:', finalOrgId)
          }
        } catch (emergencyError) {
          console.error('❌ Emergency fallback also failed:', emergencyError)
        }
      }

      if (!finalOrgId) {
        console.error('❌ No organization found for employee:', employeeId)
        toast.error('Nie można znaleźć organizacji dla pracownika')
        return
      }

      setOrganizationId(finalOrgId)

      // Load leave types
      const { data: leaveTypesData, error: leaveTypesError } = await supabase
        .from('leave_types')
        .select('*')
        .eq('organization_id', finalOrgId)
        .order('name')

      console.log('🔍 AddAbsenceSheet - Leave types query:', {
        finalOrgId,
        count: leaveTypesData?.length,
        error: leaveTypesError,
        leaveTypes: leaveTypesData
      })

      if (leaveTypesError) throw leaveTypesError

      // Load employee's leave balances via API (bypasses RLS)
      const currentYear = new Date().getFullYear()
      
      let balancesData = []
      try {
        const balancesResponse = await fetch(`/api/employees/${employeeId}/leave-balances`)
        
        if (balancesResponse.ok) {
          const balancesApiData = await balancesResponse.json()
          balancesData = balancesApiData.balances || []
          console.log('🔍 AddAbsenceSheet - Leave balances from API:', {
            employeeId,
            currentYear,
            count: balancesData.length,
            balances: balancesData
          })
        } else {
          const errorData = await balancesResponse.json().catch(() => ({}))
          console.error('❌ Leave balances API error:', { status: balancesResponse.status, error: errorData })
        }
      } catch (apiError) {
        console.error('❌ Leave balances API request failed:', apiError)
      }

      console.log('🔍 AddAbsenceSheet - Leave balances query:', {
        employeeId,
        currentYear,
        count: balancesData?.length,
        error: null,
        balances: balancesData
      })

      setLeaveTypes(leaveTypesData || [])
      setLeaveBalances(balancesData || [])
      
      console.log('🔍 AddAbsenceSheet - Data loaded successfully:', {
        leaveTypesCount: leaveTypesData?.length || 0,
        leaveBalancesCount: balancesData?.length || 0
      })
      
    } catch (error) {
      console.error('Error loading leave data:', error)
      toast.error('Błąd ładowania danych urlopowych')
    } finally {
      setLoading(false)
    }
  }

  const checkOverlaps = async () => {
    if (!formData.start_date || !formData.end_date || !formData.employee_id) return
    // Use the active organization ID passed from parent component or fall back to organizationId state
    const orgId = activeOrganizationId || organizationId
    if (!orgId) return

    try {
      console.log('[Add Absence Sheet] Checking overlaps via API:', {
        start_date: formData.start_date,
        end_date: formData.end_date,
        exclude_user_id: formData.employee_id
      })

      // Use API endpoint with admin client to fetch overlaps
      const response = await fetch('/api/leave-requests/overlapping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_date: formData.start_date,
          end_date: formData.end_date,
          exclude_user_id: formData.employee_id, // Exclude the selected employee
        }),
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      const overlaps = data.overlappingRequests || []

      console.log('[Add Absence Sheet] Found overlaps:', overlaps.length)

      // Format for display
      const formattedOverlaps: OverlapUser[] = overlaps.map((request: any) => ({
        id: request.id,
        full_name: request.full_name,
        email: request.email,
        avatar_url: request.avatar_url,
        leave_type_name: request.leave_type_name,
        end_date: request.end_date,
        color: request.color || '#22d3ee'
      }))

      setOverlapUsers(formattedOverlaps)
    } catch (error) {
      console.error('[Add Absence Sheet] Error checking overlaps:', error instanceof Error ? error.message : error)
      setOverlapUsers([])
    }
  }

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {}

    // Validation
    if (!formData.employee_id) newErrors.employee_id = 'Wybierz pracownika'
    if (!formData.leave_type_id) newErrors.leave_type_id = 'Wybierz typ nieobecności'
    if (!formData.start_date) newErrors.start_date = 'Wybierz datę rozpoczęcia'
    if (!formData.end_date) newErrors.end_date = 'Wybierz datę zakończenia'

    // Check if employee has conflicts
    if (formData.start_date && formData.end_date && formData.employee_id) {
      const { data: conflictCheck } = await supabase
        .from('leave_requests')
        .select('id')
        .eq('user_id', formData.employee_id)
        .or(`
          and(start_date.lte.${formData.end_date},end_date.gte.${formData.start_date}),
          and(start_date.gte.${formData.start_date},start_date.lte.${formData.end_date}),
          and(end_date.gte.${formData.start_date},end_date.lte.${formData.end_date})
        `)
        .in('status', ['pending', 'approved'])

      if (conflictCheck && conflictCheck.length > 0) {
        newErrors.dates = 'Pracownik ma już zaplanowaną nieobecność w tym okresie'
      }
    }

    // Check balance
    if (selectedBalance && selectedDays > selectedBalance.remaining_days) {
      newErrors.balance = `Niewystarczające saldo. Dostępne: ${selectedBalance.remaining_days} dni`
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      setLoading(true)

      const requestData = {
        user_id: formData.employee_id,
        leave_type_id: formData.leave_type_id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        notes: formData.notes || null,
        status: 'approved',

        auto_approve: true,
        employee_id: formData.employee_id
      }

      const response = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Błąd tworzenia nieobecności')
      }

      toast.success('Nieobecność została dodana')

      // Trigger refetch for pages using manual fetch
      window.dispatchEvent(new CustomEvent('refetch-leave-requests'))

      // Small delay to allow UI to update
      await new Promise(resolve => setTimeout(resolve, 300))
      handleClose()

    } catch (error) {
      console.error('Error creating absence:', error)
      toast.error(error instanceof Error ? error.message : 'Błąd tworzenia nieobecności')
    } finally {
      setLoading(false)
    }
  }

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (!range) {
      // Clear dates if range is undefined
      setFormData(prev => ({
        ...prev,
        start_date: '',
        end_date: ''
      }))
      setErrors(prev => ({ ...prev, start_date: '', end_date: '', dates: '' }))
      return
    }

    if (range.from && range.to) {
      // Both dates selected - format and update
      console.log('🔍 Date range received:', {
        from: range.from,
        to: range.to,
        fromString: range.from.toString(),
        toString: range.to.toString(),
        fromUTC: range.from.toISOString(),
        toUTC: range.to.toISOString()
      })

      // Format dates in local timezone to avoid off-by-one errors
      const formatDateLocal = (date: Date) => {
        console.log('🔍 Formatting date:', {
          originalDate: date,
          getFullYear: date.getFullYear(),
          getMonth: date.getMonth(),
          getDate: date.getDate(),
          getTimezoneOffset: date.getTimezoneOffset()
        })
        
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const formatted = `${year}-${month}-${day}`
        
        console.log('🔍 Formatted result:', formatted)
        return formatted
      }

      const startDate = formatDateLocal(range.from!)
      const endDate = formatDateLocal(range.to!)

      console.log('🔍 Final dates to save:', { startDate, endDate })

      setFormData(prev => ({
        ...prev,
        start_date: startDate,
        end_date: endDate
      }))
      setErrors(prev => ({ ...prev, start_date: '', end_date: '', dates: '' }))
    }
    // Note: We don't handle the case where only `from` is set because the DateRangePicker
    // manages that state internally and will call this handler again when both dates are selected
  }

  return (
    <SheetContent ref={sheetContentRef} size="content" className="overflow-y-auto">
      <div className="flex flex-col h-full">
        <div className="flex flex-col p-6 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-1.5 w-full">
            <SheetTitle className="text-lg font-semibold">Dodaj urlop</SheetTitle>
            <Separator className="mt-4" />
          </div>

          <div className="space-y-6 pt-6">
            {/* Employee Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Wybierz pracownika
              </Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between h-auto min-h-9 px-3 py-2"
                  >
                    {formData.employee_id ? (
                      (() => {
                        const selectedEmployee = employees.find(emp => emp.id === formData.employee_id)
                        return selectedEmployee ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="size-6">
                              <AvatarImage src={selectedEmployee.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {(selectedEmployee.full_name || selectedEmployee.email)?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start">
                              <span className="font-medium text-sm">{selectedEmployee.full_name || selectedEmployee.email}</span>
                              <span className="text-xs text-muted-foreground">{selectedEmployee.email}</span>
                            </div>
                          </div>
                        ) : null
                      })()
                    ) : (
                      <span className="text-muted-foreground">Wybierz pracownika</span>
                    )}
                    <ChevronDownIcon className="size-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  {employees.map((employee) => (
                    <DropdownMenuItem
                      key={employee.id}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, employee_id: employee.id, leave_type_id: '' }))
                        setErrors(prev => ({ ...prev, employee_id: '' }))
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6">
                          <AvatarImage src={employee.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {(employee.full_name || employee.email)?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{employee.full_name || employee.email}</span>
                          <span className="text-xs text-muted-foreground">{employee.email}</span>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {errors.employee_id && <p className="text-sm text-destructive">{errors.employee_id}</p>}
            </div>

            {/* Leave Type Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Jaki typ nieobecności
              </Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between h-auto min-h-9 px-3 py-2"
                    disabled={!formData.employee_id || loading}
                  >
                    {loading && formData.employee_id ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-muted-foreground">Ładowanie typów nieobecności...</span>
                      </div>
                    ) : formData.leave_type_id ? (
                      (() => {
                        const selectedLeaveType = leaveTypes.find(lt => lt.id === formData.leave_type_id)
                        const balance = leaveBalances.find(lb => lb.leave_type_id === formData.leave_type_id)
                        return selectedLeaveType ? (
                          <div className="flex flex-col items-start">
                            <span className="font-medium text-sm">{selectedLeaveType.name}</span>
                            {balance && (
                              <span className="text-xs text-muted-foreground">
                                Dostępne {balance.remaining_days} dni
                              </span>
                            )}
                          </div>
                        ) : null
                      })()
                    ) : (
                      <span className="text-muted-foreground">Wybierz typ nieobecności</span>
                    )}
                    {!loading && <ChevronDownIcon className="size-4 opacity-50" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  {(() => {
                    // For AddAbsenceSheet, we need to create a user profile for the selected employee
                    if (!selectedEmployee || !organizationId) return leaveTypes.map((type, index, array) => (
                      <React.Fragment key={type.id}>
                        <DropdownMenuItem
                          onClick={() => setFormData({ ...formData, leave_type_id: type.id })}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{type.name}</span>
                            <span className="text-xs text-muted-foreground">Bez limitu</span>
                          </div>
                        </DropdownMenuItem>
                        {index < array.length - 1 && <DropdownMenuSeparator />}
                      </React.Fragment>
                    ))
                    
                    const employeeProfile = {
                      id: selectedEmployee.id,
                      full_name: selectedEmployee.full_name,
                      email: selectedEmployee.email,
                      role: selectedEmployee.role,
                      organization_id: organizationId,
                      team_id: selectedEmployee.team_id,
                    }
                    
                    const employeeBalances = leaveBalances.filter(balance => balance.user_id === selectedEmployee.id)
                    
                    return getApplicableLeaveTypes(employeeProfile, leaveTypes, employeeBalances, organizationId).map((type, index, array) => {
                      const balance = employeeBalances.find(lb => lb.leave_type_id === type.id)
                      const disabledState = isLeaveTypeDisabled(type, balance)
                      
                      return (
                        <React.Fragment key={type.id}>
                          <DropdownMenuItem
                            onClick={() => !disabledState.disabled && setFormData({ ...formData, leave_type_id: type.id })}
                            className={`${disabledState.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            disabled={disabledState.disabled}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{type.name}</span>
                              {balance && (
                                <span className="text-xs text-muted-foreground">
                                  Dostępne {Math.max(0, balance.remaining_days)} dni
                                </span>
                              )}
                              {!balance && (
                                <span className="text-xs text-muted-foreground">
                                  Bez limitu
                                </span>
                              )}
                              {disabledState.reason && (
                                <span className="text-xs text-red-500">
                                  {disabledState.reason}
                                </span>
                              )}
                            </div>
                          </DropdownMenuItem>
                          {index < array.length - 1 && <DropdownMenuSeparator />}
                        </React.Fragment>
                      )
                    })
                  })()}
                </DropdownMenuContent>
              </DropdownMenu>
              {errors.leave_type_id && <p className="text-sm text-destructive">{errors.leave_type_id}</p>}
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Termin nieobecności
              </Label>
              <DateRangePicker
                value={formData.start_date && formData.end_date ? {
                  from: parseISO(formData.start_date),
                  to: parseISO(formData.end_date)
                } : undefined}
                onDateRangeChange={handleDateRangeChange}
                container={sheetContentRef.current}
                existingLeaveRequests={disabledDates}
                holidaysToDisable={holidays}
                isLoadingHolidays={isLoadingHolidays}
                workingDays={workingDays}
              />
              {(errors.start_date || errors.end_date || errors.dates) && (
                <p className="text-sm text-destructive">
                  {errors.dates || errors.start_date || errors.end_date}
                </p>
              )}
            </div>

            {/* Balance Summary Cards */}
            {(() => {
              const selectedLeaveType = leaveTypes.find(type => type.id === formData.leave_type_id)
              const availableDays = selectedBalance?.remaining_days || 0
              const requestedDays = selectedDays
              const remainingDays = remainingAfter

              // Only show for leave types that require balance AND when dates are selected
              if (!formData.leave_type_id || !selectedLeaveType?.requires_balance || !formData.start_date || !formData.end_date) return null

              return (
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center justify-center p-4 border rounded-lg bg-background">
                    <span className="text-xs text-muted-foreground mb-1">Dostępny</span>
                    <span className="text-lg font-semibold">{availableDays} dni</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-4 border rounded-lg bg-background">
                    <span className="text-xs text-muted-foreground mb-1">Wnioskowany</span>
                    <span className="text-lg font-semibold">{requestedDays} dni</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-4 border rounded-lg bg-background">
                    <span className="text-xs text-muted-foreground mb-1">Pozostanie</span>
                    <span className="text-lg font-semibold">{remainingDays} dni</span>
                  </div>
                </div>
              )
            })()}
            {errors.balance && <p className="text-sm text-destructive">{errors.balance}</p>}

            {/* Overlap Warning */}
            {overlapUsers.length > 0 && (
              <div className="border border-border rounded-lg p-4 bg-amber-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-medium text-sm text-card-foreground leading-5">
                    W tym terminie również planują urlop:
                  </p>
                </div>
                <div className="space-y-2">
                  {overlapUsers.map((user, index) => (
                    <OverlapUserItem key={`${user.id}-${index}`} user={user} />
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">
                Chcesz coś dodać?
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Wpisz opcjonalny komentarz"
                className="min-h-[60px] resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer with buttons at bottom */}
        <div className="p-6">
          <div className="flex justify-between items-center w-full">
            <Button
              variant="outline"
              className="h-9 px-4 py-2"
              onClick={handleClose}
            >
              Anuluj
            </Button>
            <Button
              className="h-9 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Dodawanie...
                </>
              ) : (
                'Dodaj urlop'
              )}
            </Button>
          </div>
        </div>
      </div>
    </SheetContent>
  )
})

// Main component with global event listener
export default function AddAbsenceSheet({ preloadedEmployees, userRole, activeOrganizationId, workingDays }: Omit<AddAbsenceSheetProps, 'isOpen' | 'onClose'>) {
  const [isOpen, setIsOpen] = useState(false)
  const contentRef = React.useRef<{ resetForm: () => void } | null>(null)

  useEffect(() => {
    const handleOpenAddAbsence = () => {
      setIsOpen(true)
    }

    window.addEventListener('openAddAbsence', handleOpenAddAbsence)
    return () => window.removeEventListener('openAddAbsence', handleOpenAddAbsence)
  }, [])

  const handleSheetClose = (open: boolean) => {
    if (!open) {
      // Sheet is closing - reset form via ref if available
      contentRef.current?.resetForm()
    }
    setIsOpen(open)
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleSheetClose}>
      <Suspense fallback={<div>Loading...</div>}>
        <AddAbsenceSheetContent
          ref={contentRef}
          preloadedEmployees={preloadedEmployees}
          userRole={userRole}
          activeOrganizationId={activeOrganizationId}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          workingDays={workingDays}
        />
      </Suspense>
    </Sheet>
  )
} 