'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Edit, Plus, Calendar, Users, Trash2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface TeamMember {
  id: string
  email: string
  full_name: string | null
  role: string
}

interface LeaveType {
  id: string
  name: string
  color: string
  days_per_year: number
  requires_balance: boolean
  leave_category?: string
}

interface LeaveBalance {
  id: string
  user_id: string
  leave_type_id: string
  year: number
  allocated_days: number
  used_days: number
  remaining_days: number
  profiles: {
    id: string
    full_name: string | null
    email: string
    role: string
  }
  leave_types: {
    id: string
    name: string
    color: string
  }
}

interface LeaveBalanceManagerProps {
  teamMembers: TeamMember[]
  leaveTypes: LeaveType[]
  leaveBalances: LeaveBalance[]
  organizationId: string
}

interface UserBalances {
  user: TeamMember
  balances: LeaveBalance[]
}

export function LeaveBalanceManager({ 
  teamMembers, 
  leaveTypes, 
  leaveBalances, 
  organizationId 
}: LeaveBalanceManagerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [newBalanceOpen, setNewBalanceOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [showCreateMissingDialog, setShowCreateMissingDialog] = useState(false)
  const [missingBalancesPreview, setMissingBalancesPreview] = useState<{
    userCount: number
    balanceCount: number
    totalDays: number
    details: Array<{user: string, leaveType: string, days: number}>
  } | null>(null)
  const [formData, setFormData] = useState({
    user_id: '',
    leave_type_id: '',
    allocated_days: 0,
    year: new Date().getFullYear()
  })

  const router = useRouter()
  const supabase = createClient()

  // Filter leave types to only those that require balances
  const balanceRequiredLeaveTypes = leaveTypes.filter(type => type.requires_balance)

  // Filter leave balances to only those for leave types that require balances
  const filteredLeaveBalances = leaveBalances.filter(balance => {
    const leaveType = leaveTypes.find(type => type.id === balance.leave_type_id)
    return leaveType?.requires_balance
  })

  // Group balances by user (only those with balance-required leave types)
  const groupedBalances: UserBalances[] = teamMembers.map(user => ({
    user,
    balances: filteredLeaveBalances.filter(balance => balance.user_id === user.id)
  }))

  const handleCreateBalance = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Check if balance already exists (improved check)
      const existingBalance = leaveBalances.find(
        balance => balance.user_id === formData.user_id && 
                  balance.leave_type_id === formData.leave_type_id && 
                  balance.year === formData.year
      )

      if (existingBalance) {
        const user = teamMembers.find(m => m.id === formData.user_id)
        const leaveType = leaveTypes.find(lt => lt.id === formData.leave_type_id)
        throw new Error(`Saldo dla użytkownika ${user?.full_name || user?.email} i typu urlopu "${leaveType?.name}" już istnieje dla roku ${formData.year}`)
      }

      // Validate form data
      if (!formData.user_id || !formData.leave_type_id || formData.allocated_days <= 0) {
        throw new Error('Proszę wypełnić wszystkie wymagane pola poprawnie')
      }

      const { error: insertError } = await supabase
        .from('leave_balances')
        .insert({
          user_id: formData.user_id,
          leave_type_id: formData.leave_type_id,
          year: formData.year,
          entitled_days: formData.allocated_days,
          used_days: 0,
          organization_id: organizationId
        })
        .select()

      if (insertError) {
        // Handle specific database errors with user-friendly messages
        if (insertError.code === '23505') {
          const user = teamMembers.find(m => m.id === formData.user_id)
          const leaveType = leaveTypes.find(lt => lt.id === formData.leave_type_id)
          throw new Error(`Saldo dla użytkownika "${user?.full_name || user?.email}" i typu urlopu "${leaveType?.name}" już istnieje dla roku ${formData.year}`)
        } else if (insertError.code === '23503') {
          throw new Error('Nieprawidłowy użytkownik lub typ urlopu')
        } else {
          throw new Error(`Błąd bazy danych: ${insertError.message}`)
        }
      }

      setSuccess('Saldo urlopowe zostało utworzone pomyślnie')
      setNewBalanceOpen(false)
      setFormData({
        user_id: '',
        leave_type_id: '',
        allocated_days: 0,
        year: new Date().getFullYear()
      })
      router.refresh()

    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Wystąpił nieznany błąd podczas tworzenia salda')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateBalance = async (balanceId: string, newAllocatedDays: number) => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { error: updateError } = await supabase
        .from('leave_balances')
        .update({
          entitled_days: newAllocatedDays
        })
        .eq('id', balanceId)

      if (updateError) throw updateError

      setSuccess('Saldo urlopowe zostało zaktualizowane pomyślnie')
      setEditingUser(null)
      router.refresh()

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Wystąpił błąd podczas aktualizacji salda')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBalance = async (balanceId: string, leaveTypeName: string) => {
    if (!confirm(`Czy na pewno chcesz usunąć saldo "${leaveTypeName}"? Ta operacja jest nieodwracalna.`)) {
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { error: deleteError } = await supabase
        .from('leave_balances')
        .delete()
        .eq('id', balanceId)

      if (deleteError) throw deleteError

      setSuccess('Saldo urlopowe zostało usunięte pomyślnie')
      setEditingUser(null)
      router.refresh()

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Wystąpił błąd podczas usuwania salda')
    } finally {
      setLoading(false)
    }
  }

  const handlePreviewMissingBalances = async () => {
    setLoading(true)
    setError(null)

    try {
      // Calculate what balances would be created
      const autoAssignedTypes = balanceRequiredLeaveTypes.filter(type => 
        type.days_per_year > 0 && 
        !['maternity', 'paternity', 'childcare'].includes(type.leave_category || '')
      )

      const missingDetails: Array<{user: string, leaveType: string, days: number}> = []
      let totalDays = 0

      teamMembers.forEach(user => {
        autoAssignedTypes.forEach(leaveType => {
          const hasBalance = filteredLeaveBalances.some(
            balance => balance.user_id === user.id && balance.leave_type_id === leaveType.id
          )
          if (!hasBalance) {
            missingDetails.push({
              user: user.full_name || user.email,
              leaveType: leaveType.name,
              days: leaveType.days_per_year
            })
            totalDays += leaveType.days_per_year
          }
        })
      })

      const uniqueUsers = new Set(missingDetails.map(d => d.user))

      setMissingBalancesPreview({
        userCount: uniqueUsers.size,
        balanceCount: missingDetails.length,
        totalDays,
        details: missingDetails
      })

      setShowCreateMissingDialog(true)

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Wystąpił błąd podczas sprawdzania brakujących sald')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMissingBalances = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      console.log('Creating missing balances...')
      
      const response = await fetch('/api/admin/leave-balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_defaults_for_all_users',
          target_year: new Date().getFullYear()
        })
      })

      console.log('Response status:', response.status)
      
      const result = await response.json()
      console.log('Response result:', result)

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: Nie udało się utworzyć brakujących sald`)
      }

      setSuccess('Brakujące salda zostały utworzone pomyślnie!')
      setShowCreateMissingDialog(false)
      setMissingBalancesPreview(null)
      
      // Wait a moment before refreshing to ensure the UI updates
      setTimeout(() => {
        router.refresh()
      }, 500)

    } catch (err: unknown) {
      console.error('Error creating missing balances:', err)
      
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Błąd połączenia z serwerem. Sprawdź połączenie internetowe.')
      } else {
        setError(err instanceof Error ? err.message : 'Wystąpił nieznany błąd podczas tworzenia brakujących sald')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Zarządzanie saldami urlopowymi
            </CardTitle>
            <CardDescription>
              Konfiguruj dni urlopowe dla członków zespołu na rok {new Date().getFullYear()}
              <br />
              <span className="text-xs text-muted-foreground">
                Uwaga: Urlop macierzyński, ojcowski i dni wolne wychowawcze należy przyznawać indywidualnie pracownikom z dziećmi
              </span>
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={newBalanceOpen} onOpenChange={setNewBalanceOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Dodaj saldo
                </Button>
              </DialogTrigger>
              <DialogContent>
              <DialogHeader>
                <DialogTitle>Dodaj nowe saldo urlopowe</DialogTitle>
                <DialogDescription>
                  Ustaw liczbę dni urlopowych dla członka zespołu
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateBalance} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="user_id">Członek zespołu</Label>
                  <Select
                    value={formData.user_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, user_id: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz członka zespołu" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.full_name || member.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leave_type_id">Typ urlopu</Label>
                  <Select
                    value={formData.leave_type_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, leave_type_id: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz typ urlopu" />
                    </SelectTrigger>
                    <SelectContent>
                      {balanceRequiredLeaveTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: type.color }}
                            />
                            {type.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allocated_days">Przyznane dni</Label>
                  <Input
                    id="allocated_days"
                    type="number"
                    min="0"
                    max="365"
                    value={formData.allocated_days}
                    onChange={(e) => setFormData(prev => ({ ...prev, allocated_days: parseInt(e.target.value) || 0 }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year">Rok</Label>
                  <Input
                    id="year"
                    type="number"
                    min="2020"
                    max="2030"
                    value={formData.year}
                    onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                    required
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert>
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setNewBalanceOpen(false)} disabled={loading}>
                    Anuluj
                  </Button>
                  <Button type="submit" disabled={loading} className="">
                    {loading ? 'Tworzenie...' : 'Utwórz saldo'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
            </Dialog>

            <Dialog open={showCreateMissingDialog} onOpenChange={setShowCreateMissingDialog}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Tworzenie brakujących sald urlopowych</DialogTitle>
                  <DialogDescription>
                    Przegląd sald, które zostaną utworzone dla roku {new Date().getFullYear()}
                  </DialogDescription>
                </DialogHeader>
                
                {missingBalancesPreview && (
                  <div className="space-y-4">
                    {missingBalancesPreview.balanceCount === 0 ? (
                      <Alert>
                        <AlertDescription>
                          <div className="flex items-center gap-2">
                            <span className="text-green-600">✓</span>
                            Wszyscy użytkownicy posiadają już wszystkie wymagane salda urlopowe. 
                            Nie ma nic do utworzenia.
                          </div>
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <>
                        <div className="bg-muted p-4 rounded-lg">
                          <h4 className="font-medium mb-2">Podsumowanie:</h4>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Użytkownicy:</span>
                              <div className="font-medium">{missingBalancesPreview.userCount}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Salda do utworzenia:</span>
                              <div className="font-medium">{missingBalancesPreview.balanceCount}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Łączne dni:</span>
                              <div className="font-medium">{missingBalancesPreview.totalDays}</div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-3">Szczegóły:</h4>
                          <div className="max-h-60 overflow-y-auto border rounded-lg">
                            <div className="grid grid-cols-3 gap-4 p-3 bg-muted font-medium text-sm border-b">
                              <div>Użytkownik</div>
                              <div>Typ urlopu</div>
                              <div>Dni</div>
                            </div>
                            {missingBalancesPreview.details.map((detail, index) => (
                              <div key={index} className="grid grid-cols-3 gap-4 p-3 text-sm border-b last:border-b-0">
                                <div className="truncate">{detail.user}</div>
                                <div className="truncate">{detail.leaveType}</div>
                                <div>{detail.days}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <Alert>
                          <AlertDescription>
                            Uwaga: Nie zostaną utworzone salda dla urlopów macierzyńskich, ojcowskich 
                            i dni wolnych wychowawczych - te należy przyznawać indywidualnie.
                          </AlertDescription>
                        </Alert>
                      </>
                    )}

                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {success && (
                      <Alert>
                        <AlertDescription>{success}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateMissingDialog(false)} 
                    disabled={loading}
                  >
                    Anuluj
                  </Button>
                  {missingBalancesPreview && missingBalancesPreview.balanceCount > 0 && (
                    <Button 
                      onClick={handleCreateMissingBalances} 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Tworzenie...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Utwórz {missingBalancesPreview.balanceCount} sald
                        </>
                      )}
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Button 
              variant="outline" 
              onClick={handlePreviewMissingBalances}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Utwórz brakujące salda
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {groupedBalances.length > 0 ? (
          <div className="space-y-4">
            {groupedBalances.map((userBalance) => (
              <div
                key={userBalance.user.id}
                className="border rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {userBalance.user.full_name || userBalance.user.email}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {userBalance.user.role === 'admin' ? 'Admin' : userBalance.user.role === 'manager' ? 'Manager' : 'Employee'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {userBalance.balances.length} {userBalance.balances.length === 1 ? 'typ urlopu' : 'typy urlopów'}
                      </p>
                    </div>
                  </div>
                  
                  <Dialog open={editingUser === userBalance.user.id} onOpenChange={(open) => !open && setEditingUser(null)}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingUser(userBalance.user.id)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edytuj salda
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Edytuj salda urlopowe</DialogTitle>
                        <DialogDescription>
                          Zarządzaj saldami urlopowymi dla {userBalance.user.full_name || userBalance.user.email}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {userBalance.balances.map((balance) => (
                          <EditBalanceForm
                            key={balance.id}
                            balance={balance}
                            onUpdate={handleUpdateBalance}
                            onDelete={handleDeleteBalance}
                            loading={loading}
                          />
                        ))}
                        
                        {userBalance.balances.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Brak skonfigurowanych sald dla tego użytkownika
                          </p>
                        )}
                      </div>
                      
                      {error && (
                        <Alert variant="destructive">
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}

                      {success && (
                        <Alert>
                          <AlertDescription>{success}</AlertDescription>
                        </Alert>
                      )}

                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingUser(null)}>
                          Zamknij
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Quick preview of balances */}
                {userBalance.balances.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {userBalance.balances.map((balance) => (
                      <div key={balance.id} className="bg-muted rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: balance.leave_types.color }}
                          />
                          <p className="text-sm font-medium">{balance.leave_types.name}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Przyznane</p>
                            <p className="font-medium">{balance.allocated_days}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Użyte</p>
                            <p className="font-medium">{balance.used_days}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Pozostałe</p>
                            <p className="font-medium text-success">{balance.remaining_days}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Brak skonfigurowanych sald</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Brak członków zespołu</p>
            <p className="text-sm text-muted-foreground mt-1">
              Dodaj członków zespołu aby rozpocząć zarządzanie saldami
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Separate component for editing individual balance
function EditBalanceForm({ 
  balance, 
  onUpdate, 
  onDelete, 
  loading 
}: { 
  balance: LeaveBalance
  onUpdate: (balanceId: string, newDays: number) => void
  onDelete: (balanceId: string, leaveTypeName: string) => void
  loading: boolean 
}) {
  const [allocatedDays, setAllocatedDays] = useState(balance.allocated_days)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdate(balance.id, allocatedDays)
  }

  const handleDelete = () => {
    onDelete(balance.id, balance.leave_types.name)
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div 
          className="w-4 h-4 rounded-full" 
          style={{ backgroundColor: balance.leave_types.color }}
        />
        <h4 className="font-medium">{balance.leave_types.name}</h4>
      </div>
      
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <Label htmlFor={`allocated-${balance.id}`}>Przyznane dni</Label>
          <Input
            id={`allocated-${balance.id}`}
            type="number"
            min="0"
            max="365"
            value={allocatedDays}
            onChange={(e) => setAllocatedDays(parseInt(e.target.value) || 0)}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Wykorzystane dni</Label>
          <div className="mt-1 px-3 py-2 bg-muted rounded-md text-sm">
            {balance.used_days}
          </div>
        </div>
        <div>
          <Label>Pozostałe dni</Label>
          <div className="mt-1 px-3 py-2 bg-muted rounded-md text-sm font-medium text-success">
            {Math.max(0, allocatedDays - balance.used_days)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={loading || allocatedDays === balance.allocated_days}>
          {loading ? 'Zapisywanie...' : 'Zapisz zmiany'}
        </Button>
        <Button type="button" size="sm" variant="destructive" onClick={handleDelete}>
          <Trash2 className="h-4 w-4 mr-2" />
          Usuń
        </Button>
      </div>
    </form>
  )
} 