'use client'

import React, { useState, useEffect } from 'react'
import { FigmaTabs, FigmaTabsList, FigmaTabsTrigger, FigmaTabsContent } from '../../../../app/admin/team-management/components/FigmaTabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { EditOrganizationSheet } from './EditOrganizationSheet'
import { EditLeaveTypesSheet } from './EditLeaveTypesSheet'
import { EditLeavePoliciesSheet } from './EditLeavePoliciesSheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getCountryFlag, getLanguageFlag } from '@/lib/flag-utils'
import { Plus, MoreVertical, X } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface LeaveType {
  id: string
  name: string
  days_per_year: number
  color: string
  requires_balance: boolean
  requires_approval: boolean
}

interface LeavePolicies {
  minimum_notice_days: number
  auto_approve_days: number
  max_consecutive_days: number
  min_advance_for_long_leave: number
  allow_negative_balance: boolean
  allow_carry_over: boolean
  max_carry_over_days: number
  weekend_policy: 'count' | 'exclude'
  holiday_policy: 'count' | 'exclude'
}

interface AdminSettingsClientProps {
  currentOrganization: any
  users: any[]
  leaveTypes: LeaveType[]
}

export default function AdminSettingsClient({ 
  currentOrganization: initialOrganization, 
  users, 
  leaveTypes 
}: AdminSettingsClientProps) {
  const [currentOrganization, setCurrentOrganization] = useState(initialOrganization)
  const router = useRouter()
  
  // Tab state management
  const [activeTab, setActiveTab] = useState('general')
  
  // Sheet states
  const [isOrganizationSheetOpen, setIsOrganizationSheetOpen] = useState(false)
  const [isLeaveTypesSheetOpen, setIsLeaveTypesSheetOpen] = useState(false)
  const [isLeavePoliciesSheetOpen, setIsLeavePoliciesSheetOpen] = useState(false)

  // Dialog states for leave types management
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    days_per_year: 0,
    requires_balance: true
  })

  // Mock leave policies data (would come from API)
  const [leavePolicies] = useState<LeavePolicies>({
    minimum_notice_days: 7,
    auto_approve_days: 0,
    max_consecutive_days: 7,
    min_advance_for_long_leave: 14,
    allow_negative_balance: false,
    allow_carry_over: true,
    max_carry_over_days: 5,
    weekend_policy: 'exclude',
    holiday_policy: 'exclude'
  })

  // Sync with prop changes
  useEffect(() => {
    setCurrentOrganization(initialOrganization)
  }, [initialOrganization])

  // Handler for organization updates
  const handleOrganizationSave = (updatedOrganization: any) => {
    setCurrentOrganization(updatedOrganization)
  }

  // Handlers for leave management updates
  const handleLeaveTypesEdit = () => {
    setIsLeaveTypesSheetOpen(true)
  }

  const handleLeavePoliciesEdit = () => {
    setIsLeavePoliciesSheetOpen(true)
  }

  const handleLeaveTypesUpdate = (updatedTypes: LeaveType[]) => {
    console.log('Leave types updated:', updatedTypes)
    // Refresh data or update state
    window.location.reload()
  }

  const handleLeavePoliciesUpdate = (updatedPolicies: LeavePolicies) => {
    console.log('Leave policies updated:', updatedPolicies)
    // Refresh data or update state
    window.location.reload()
  }

  // Handlers for leave types edit and delete
  const handleEditLeaveType = (leaveType: LeaveType) => {
    setFormData({
      name: leaveType.name,
      days_per_year: leaveType.days_per_year,
      requires_balance: leaveType.requires_balance
    })
    setSelectedLeaveType(leaveType)
    setEditDialogOpen(true)
  }

  const handleDeleteLeaveType = (leaveType: LeaveType) => {
    setSelectedLeaveType(leaveType)
    setDeleteDialogOpen(true)
  }

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from('leave_types')
        .update({
          name: formData.name,
          days_per_year: formData.days_per_year,
          requires_balance: formData.requires_balance
        })
        .eq('id', selectedLeaveType?.id)

      if (updateError) {
        throw new Error(updateError.message || 'Nie udało się zaktualizować rodzaju urlopu')
      }

      toast.success('Rodzaj urlopu został zaktualizowany!')
      setEditDialogOpen(false)
      router.refresh()

    } catch (error) {
      console.error('Error updating leave type:', error)
      toast.error(error instanceof Error ? error.message : 'Wystąpił błąd podczas aktualizacji rodzaju urlopu')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitDelete = async () => {
    setLoading(true)

    try {
      const supabase = createClient()

      // Check if leave type is being used
      const { count } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('leave_type_id', selectedLeaveType?.id)

      if (count && count > 0) {
        throw new Error('Nie można usunąć rodzaju urlopu, który jest używany w istniejących wnioskach')
      }

      const { error: deleteError } = await supabase
        .from('leave_types')
        .delete()
        .eq('id', selectedLeaveType?.id)

      if (deleteError) {
        throw new Error(deleteError.message || 'Nie udało się usunąć rodzaju urlopu')
      }

      toast.success('Rodzaj urlopu został usunięty!')
      setDeleteDialogOpen(false)
      router.refresh()

    } catch (error) {
      console.error('Error deleting leave type:', error)
      toast.error(error instanceof Error ? error.message : 'Wystąpił błąd podczas usuwania rodzaju urlopu')
    } finally {
      setLoading(false)
    }
  }

  const getUserInitials = (name: string, email: string) => {
    if (name && name !== email?.split('@')[0]) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email?.slice(0, 2).toUpperCase() || 'DB'
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Ustawienia administracyjne</h1>
      </div>

      {/* Tabs */}
      <FigmaTabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="relative -mx-12 px-12">
          <FigmaTabsList className="border-b-0">
            <FigmaTabsTrigger value="general">Ogólne</FigmaTabsTrigger>
            <FigmaTabsTrigger value="leave-types">Urlopy</FigmaTabsTrigger>
            <FigmaTabsTrigger value="notifications">Powiadomienia</FigmaTabsTrigger>
            <FigmaTabsTrigger value="work-modes">Tryby pracy</FigmaTabsTrigger>
            <FigmaTabsTrigger value="additional-rules">Dodatkowe reguły</FigmaTabsTrigger>
          </FigmaTabsList>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
        </div>

        {/* Tab Content */}
        <FigmaTabsContent value="general" className="mt-6 space-y-6">
          {/* Organization Settings Card */}
          <Card className="border border-border">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-semibold">Ustawienia organizacji</CardTitle>
                  </div>
                  <CardDescription>
                    Podstawowe informacje o organizacji
                  </CardDescription>
                </div>
                <Button variant="secondary" size="sm" className="h-9" onClick={() => setIsOrganizationSheetOpen(true)}>
                  Edytuj dane
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-6 px-6 space-y-6">
              <div className="space-y-6">
                <div className="w-[400px] space-y-2">
                  <Label htmlFor="org-name">Nazwa organizacji</Label>
                  <Input 
                    id="org-name"
                    value={currentOrganization?.name || 'BB8'} 
                    disabled 
                    className="opacity-50"
                  />
                </div>
                
                <div className="w-[400px] space-y-2">
                  <Label htmlFor="org-logo">Logo organizacji</Label>
                  <div className="relative">
                    <Input 
                      id="org-logo"
                      value="Nie wybrano pliku" 
                      disabled 
                      className="opacity-50 pl-[100px]"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <Button variant="ghost" size="sm" className="h-auto p-1.5 text-sm font-medium">
                        Wybierz plik
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="w-[400px] space-y-2">
                  <Label htmlFor="org-slug">Slug organizacji</Label>
                  <Input 
                    id="org-slug"
                    value={currentOrganization?.slug || 'bb8'} 
                    disabled 
                    className="opacity-50"
                  />
                  <p className="text-sm text-muted-foreground">
                    Unikalny identyfikator (tylko małe litery, cyfry i myślniki)
                  </p>
                </div>

                <div className="w-[400px] space-y-2">
                  <Label>Administrator</Label>
                  <div className="flex items-center gap-4 w-full">
                    {(() => {
                      const adminUser = users.find(u => u.role === 'admin')
                      return adminUser ? (
                        <>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={adminUser.avatar_url || undefined} />
                            <AvatarFallback className="bg-muted">
                              {getUserInitials(adminUser.full_name || '', adminUser.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{adminUser.full_name || adminUser.email}</p>
                            <p className="text-sm text-muted-foreground">{adminUser.email}</p>
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Brak administratora</span>
                      )
                    })()}
                  </div>
                </div>

                <Separator />

                <div className="w-[400px] space-y-2">
                  <Label htmlFor="holiday-calendar">Kalendarz świąt</Label>
                  <Select value={currentOrganization?.country_code || 'PL'} disabled>
                    <SelectTrigger>
                      <div className="flex items-center gap-2">
                        {currentOrganization?.country_code === 'PL' && (
                          <span className="text-lg">🇵🇱</span>
                        )}
                        {currentOrganization?.country_code === 'IE' && (
                          <span className="text-lg">🇮🇪</span>
                        )}
                        {currentOrganization?.country_code === 'US' && (
                          <span className="text-lg">🇺🇸</span>
                        )}
                        <span className="font-medium text-sm">
                          {currentOrganization?.country_code === 'PL' ? 'Polska' :
                           currentOrganization?.country_code === 'IE' ? 'Irlandia' :
                           currentOrganization?.country_code === 'US' ? 'Stany Zjednoczone' :
                           'Polska'}
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pl">Polska</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-[400px] space-y-2">
                  <Label htmlFor="primary-language">Język podstawowy organizacji</Label>
                  <Select value={currentOrganization?.locale || 'pl'} disabled>
                    <SelectTrigger>
                      <div className="flex items-center gap-2">
                        {(currentOrganization?.locale === 'pl' || !currentOrganization?.locale) && (
                          <span className="text-lg">🇵🇱</span>
                        )}
                        {currentOrganization?.locale === 'en' && (
                          <span className="text-lg">🇺🇸</span>
                        )}
                        <span className="font-medium text-sm">
                          {(currentOrganization?.locale === 'pl' || !currentOrganization?.locale) ? 'Polski' :
                           currentOrganization?.locale === 'en' ? 'English' :
                           'Polski'}
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pl">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🇵🇱</span>
                          <span>Polski</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="en">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🇺🇸</span>
                          <span>English</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Domyślny język dla nowych użytkowników. Użytkownicy mogą zmienić język w swoim profilu.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Google Workspace Integration Card */}
          <Card className="border border-border">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-semibold">Integracja z Google Workspace</CardTitle>
                  </div>
                  <CardDescription>
                    Konfiguracja domeny Google
                  </CardDescription>
                </div>
                <Button variant="secondary" size="sm" className="h-9" onClick={() => setIsOrganizationSheetOpen(true)}>
                  Edytuj dane
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-6 px-6">
              <div className="space-y-6">
                <div className="w-[400px] space-y-2">
                  <Label htmlFor="google-domain">Domena Google Workspace</Label>
                  <Input 
                    id="google-domain"
                    value={currentOrganization?.google_domain || 'bb8.pl'} 
                    disabled 
                    className="opacity-50"
                  />
                  <p className="text-sm text-muted-foreground">
                    Jeśli ustawione, tylko użytkownicy z tej domeny będą mogli się logować przez Google
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <Switch 
                    id="require-google-domain" 
                    checked={currentOrganization?.require_google_domain || false}
                    disabled
                    className="opacity-50"
                  />
                  <div className="space-y-2">
                    <Label htmlFor="require-google-domain" className="text-sm font-medium">
                      Wymagaj domeny Google dla wszystkich nowych użytkowników
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </FigmaTabsContent>

        <FigmaTabsContent value="leave-types" className="mt-6 space-y-6">
          {/* Nested Tabs for Urlopy */}
          <Tabs defaultValue="rodzaje-urlopow" className="w-full">
            <TabsList className="bg-neutral-100 p-[3px] h-9 rounded-[10px]">
              <TabsTrigger value="rodzaje-urlopow" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Rodzaje urlopów
              </TabsTrigger>
              <TabsTrigger value="polityki-urlopowe" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Polityki urlopowe
              </TabsTrigger>
            </TabsList>

            {/* Leave Types Tab */}
            <TabsContent value="rodzaje-urlopow" className="mt-6">
              <Card className="border border-border">
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl font-semibold">Rodzaje urlopów</CardTitle>
                      </div>
                      <CardDescription>
                        Zarządzaj dostępnymi rodzajami urlopów w organizacji
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button className="bg-neutral-900 text-neutral-50 h-9 px-4 rounded-lg shadow-sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Dodaj rodzaj urlopu
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-6 px-6">
                  <div className="overflow-hidden">
                    <table className="w-full">
                      {/* Table Header */}
                      <thead>
                        <tr className="border-b border-neutral-200">
                          <th className="text-left py-2.5 px-2 text-sm font-medium text-neutral-500">
                            Rodzaj urlopu
                          </th>
                          <th className="text-left py-2.5 px-2 text-sm font-medium text-neutral-500">
                            Dni rocznie
                          </th>
                          <th className="py-2.5 px-2"></th>
                          <th className="py-2.5 px-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaveTypes.map((leaveType) => (
                          <tr key={leaveType.id} className="border-b border-neutral-200 last:border-b-0">
                            <td className="py-2 px-2">
                              <div className="flex flex-col gap-0">
                                <span className="text-sm font-medium text-neutral-950">
                                  {leaveType.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-2 px-2">
                              <span className="text-sm font-medium text-neutral-950">
                                {leaveType.days_per_year === 0 
                                  ? "Nielimitowany" 
                                  : `${leaveType.days_per_year} dni rocznie`}
                              </span>
                            </td>
                            <td className="py-2 px-2">
                              {leaveType.requires_balance && (
                                <Badge className="bg-neutral-900 text-neutral-50 text-xs px-2 py-0.5 rounded-lg">
                                  Saldo
                                </Badge>
                              )}
                            </td>
                            <td className="py-2 px-2 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-neutral-100">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-32">
                                  <DropdownMenuItem onClick={() => handleEditLeaveType(leaveType)}>
                                    Edytuj
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDeleteLeaveType(leaveType)} className="text-red-600 focus:text-red-600">
                                    Usuń
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    Anuluj
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Leave Policies Tab */}
            <TabsContent value="polityki-urlopowe" className="mt-6 space-y-6">
              {/* Zasady zatwierdzania */}
              <Card className="border border-border">
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                      <CardTitle className="text-xl font-semibold">Zasady zatwierdzania</CardTitle>
                      <CardDescription>
                        Skonfiguruj zasady zatwierdzania i ograniczenia urlopów
                      </CardDescription>
                    </div>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="h-9"
                      onClick={handleLeavePoliciesEdit}
                    >
                      Edytuj
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-0 px-6 space-y-6">
                  <div className="flex gap-6">
                    <div className="w-[400px] space-y-2">
                      <Label className="text-sm font-medium text-neutral-950">
                        Minimalne wyprzedzenie (dni)
                      </Label>
                      <Input 
                        value="7" 
                        disabled 
                        className="bg-white opacity-50 border-neutral-200 h-9"
                      />
                      <p className="text-sm text-neutral-500">
                        Ile dni wcześniej należy złożyć wniosek urlopowy
                      </p>
                    </div>
                    <div className="w-[400px] space-y-2">
                      <Label className="text-sm font-medium text-neutral-950">
                        Zatwierdzenie przez admina wymagane powyżej (dni)
                      </Label>
                      <Input 
                        value="30" 
                        disabled 
                        className="bg-white opacity-50 border-neutral-200 h-9"
                      />
                      <p className="text-sm text-neutral-500">
                        Urlopy dłuższe niż x dni wymagają zatwierdzenia przez administratora
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Switch disabled className="data-[state=unchecked]:bg-neutral-200" />
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-neutral-950">
                        Wymagaj zatwierdzenia przez menedżera/administratora
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Limity urlopowe */}
              <Card className="border border-border">
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                      <CardTitle className="text-xl font-semibold">Limity urlopowe</CardTitle>
                      <CardDescription>
                        Skonfiguruj zasady zatwierdzania i ograniczenia urlopów
                      </CardDescription>
                    </div>
                    <Button variant="secondary" size="sm" className="h-9">
                      Edytuj
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-0 px-6 space-y-6">
                  <div className="flex gap-6">
                    <div className="w-[400px] space-y-2">
                      <Label className="text-sm font-medium text-neutral-950">
                        Maksymalne kolejne dni
                      </Label>
                      <Input 
                        value="7" 
                        disabled 
                        className="bg-white opacity-50 border-neutral-200 h-9"
                      />
                      <p className="text-sm text-neutral-500">
                        Maksymalna liczba kolejnych dni urlopu w jednym wniosku
                      </p>
                    </div>
                    <div className="w-[400px] space-y-2">
                      <Label className="text-sm font-medium text-neutral-950">
                        Minimalne wyprzedzenie dla długich urlopów (dni)
                      </Label>
                      <Input 
                        value="14" 
                        disabled 
                        className="bg-white opacity-50 border-neutral-200 h-9"
                      />
                      <p className="text-sm text-neutral-500">
                        Urlopy dłuższe niż x dni wymagają zatwierdzenia przez administratora
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Przenoszenie urlopów */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Przenoszenie urlopów</CardTitle>
                      <CardDescription className="text-sm text-neutral-600">
                        Ustawienia dotyczące przenoszenia niewykorzystanych urlopów
                      </CardDescription>
                    </div>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="h-9"
                      onClick={handleLeavePoliciesEdit}
                    >
                      Edytuj
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-0 px-6 space-y-6">
                  <div className="flex items-start gap-3">
                    <Switch disabled checked className="data-[state=checked]:bg-neutral-900" />
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-neutral-950">
                        Zezwalaj na przenoszenie niewykorzystanych urlopów na kolejny rok
                      </Label>
                    </div>
                  </div>
                  <div className="w-[400px] space-y-2">
                    <Label className="text-sm font-medium text-neutral-950">
                      Maksymalna liczba dni do przeniesienia
                    </Label>
                    <Input 
                      value="5" 
                      disabled 
                      className="bg-white opacity-50 border-neutral-200 h-9"
                    />
                    <p className="text-sm text-neutral-500">
                      Ile dni urlopu można przenieść na kolejny rok
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Zasady liczenia dni roboczych */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Zasady liczenia dni roboczych</CardTitle>
                      <CardDescription className="text-sm text-neutral-600">
                        Zasady dotyczące liczenia weekendów i dni świątecznych
                      </CardDescription>
                    </div>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="h-9"
                      onClick={handleLeavePoliciesEdit}
                    >
                      Edytuj
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-0 px-6 space-y-6">
                  <div className="w-[400px] space-y-2">
                    <Label className="text-sm font-medium text-neutral-950">
                      Polityka liczenia weekendów
                    </Label>
                    <Select disabled>
                      <SelectTrigger className="bg-white border-neutral-200 h-9">
                        <SelectValue placeholder="Nie licz weekendów" />
                      </SelectTrigger>
                    </Select>
                    <p className="text-sm text-neutral-500">
                      Jak traktować weekendy przy liczeniu dni urlopu
                    </p>
                  </div>
                  <div className="w-[400px] space-y-2">
                    <Label className="text-sm font-medium text-neutral-950">
                      Polityka świąt
                    </Label>
                    <Input 
                      value="Nie licz świąt państwowych" 
                      disabled 
                      className="bg-white opacity-50 border-neutral-200 h-9"
                    />
                    <p className="text-sm text-neutral-500">
                      Jak traktować święta państwowe przy liczeniu dni urlopu
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </FigmaTabsContent>

        <FigmaTabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Powiadomienia</CardTitle>
              <CardDescription>
                Konfiguracja powiadomień email i w aplikacji
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Ta sekcja będzie wkrótce dostępna.</p>
            </CardContent>
          </Card>
        </FigmaTabsContent>

        <FigmaTabsContent value="work-modes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Dostępne tryby pracy</CardTitle>
              <CardDescription>
                Konfiguracja trybów pracy dostępnych w organizacji
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Ta sekcja będzie wkrótce dostępna.</p>
            </CardContent>
          </Card>
        </FigmaTabsContent>

        <FigmaTabsContent value="additional-rules" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Dodatkowe reguły</CardTitle>
              <CardDescription>
                Dodatkowe reguły biznesowe i konfiguracja zaawansowana
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Ta sekcja będzie wkrótce dostępna.</p>
            </CardContent>
          </Card>
                  </FigmaTabsContent>
      </FigmaTabs>

      {/* Edit Leave Type Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <div className="absolute right-4 top-4 z-10">
            <Button
              variant="ghost" 
              size="sm" 
              className="h-9 w-9 p-0 border border-neutral-200 bg-white shadow-sm"
              onClick={() => setEditDialogOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-lg font-semibold text-neutral-950">
              Edytuj rodzaj urlopu
            </DialogTitle>
            <DialogDescription className="text-sm text-neutral-500">
              Zaktualizuj informacje o rodzaju urlopu
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-sm font-medium text-neutral-950">
                Nazwa urlopu
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="h-9 border-neutral-200 bg-white"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-days" className="text-sm font-medium text-neutral-950">
                Liczba dni w roku
              </Label>
              <Input
                id="edit-days"
                type="number"
                value={formData.days_per_year}
                onChange={(e) => setFormData(prev => ({ ...prev, days_per_year: parseInt(e.target.value) || 0 }))}
                className="h-9 border-neutral-200 bg-white"
                required
                min="0"
                disabled={loading}
              />
              <p className="text-sm text-neutral-500">
                Pamiętaj aby nie zmieniać podstawowych dni ustawowych.
              </p>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="edit-requires-balance"
                checked={formData.requires_balance}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_balance: !!checked }))}
                disabled={loading}
                className="mt-0.5 data-[state=checked]:bg-neutral-900 data-[state=checked]:border-neutral-900"
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="edit-requires-balance" className="text-sm font-medium text-neutral-950">
                  Wymagaj zarządzania saldem urlopowym
                </Label>
                <p className="text-sm text-neutral-500">
                  Zaznacz jeśli ten typ urlopu wymaga śledzenia i zarządzaniem dni urlopowych
                </p>
              </div>
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={loading}
                className="h-9 px-4 border-neutral-200 bg-white"
              >
                Anuluj
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="h-9 px-4 bg-neutral-900 text-neutral-50"
              >
                {loading ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Leave Type Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <div className="absolute right-4 top-4 z-10">
            <Button
              variant="ghost" 
              size="sm" 
              className="h-9 w-9 p-0 border border-neutral-200 bg-white shadow-sm"
              onClick={() => setDeleteDialogOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-lg font-semibold text-neutral-950">
              Usuń rodzaj urlopu
            </DialogTitle>
            <DialogDescription className="text-sm text-neutral-500">
              Czy na pewno chcesz usunąć rodzaj urlopu<br />
              "{selectedLeaveType?.name}"? Ta operacja jest nieodwracalna.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={loading}
              className="h-9 px-4 border-neutral-200 bg-white"
            >
              Anuluj
            </Button>
            <Button
              type="button"
              onClick={handleSubmitDelete}
              disabled={loading}
              className="h-9 px-4 bg-red-600 text-red-50 hover:bg-red-700"
            >
              {loading ? 'Usuwanie...' : 'Usuń rodzaj urlopu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Sheets */}
        <EditOrganizationSheet
          open={isOrganizationSheetOpen}
          onOpenChange={setIsOrganizationSheetOpen}
          organization={currentOrganization}
          users={users}
          onSave={handleOrganizationSave}
        />

        <EditLeaveTypesSheet
          open={isLeaveTypesSheetOpen}
          onOpenChange={setIsLeaveTypesSheetOpen}
          leaveTypes={leaveTypes}
          onSave={handleLeaveTypesUpdate}
        />

        <EditLeavePoliciesSheet
          open={isLeavePoliciesSheetOpen}
          onOpenChange={setIsLeavePoliciesSheetOpen}
          policies={leavePolicies}
          onSave={handleLeavePoliciesUpdate}
        />
    </div>
  )
} 