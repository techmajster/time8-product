'use client'

import React, { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

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

interface EditLeavePoliciesSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  policies: LeavePolicies
  onSave: (updatedPolicies: LeavePolicies) => void
}

export function EditLeavePoliciesSheet({
  open,
  onOpenChange,
  policies,
  onSave
}: EditLeavePoliciesSheetProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<LeavePolicies>({
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

  useEffect(() => {
    if (open && policies) {
      setFormData({ ...policies })
    }
  }, [open, policies])

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // Here you would call the API to save leave policies
      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      onSave(formData)
      toast.success('Polityki urlopowe zostały zapisane')
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving leave policies:', error)
      toast.error('Błąd podczas zapisywania')
    } finally {
      setIsLoading(false)
    }
  }

  const updateField = (field: keyof LeavePolicies, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto max-w-2xl">
        <SheetHeader>
          <SheetTitle>Edytuj polityki urlopowe</SheetTitle>
          <SheetDescription>
            Skonfiguruj zasady zatwierdzania i ograniczenia urlopów
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Podstawowe zasady */}
          <Card>
            <CardHeader>
              <CardTitle>Podstawowe zasady</CardTitle>
              <CardDescription>
                Podstawowe ustawienia dotyczące wniosków urlopowych
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Minimalne wyprzedzenie (dni)</Label>
                  <Input
                    type="number"
                    value={formData.minimum_notice_days}
                    onChange={(e) => updateField('minimum_notice_days', parseInt(e.target.value) || 0)}
                    placeholder="7"
                  />
                  <p className="text-sm text-muted-foreground">
                    Ile dni wcześniej należy złożyć wniosek urlopowy
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Auto-zatwierdzanie do (dni)</Label>
                  <Input
                    type="number"
                    value={formData.auto_approve_days}
                    onChange={(e) => updateField('auto_approve_days', parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                  <p className="text-sm text-muted-foreground">
                    Urlopy do X dni będą automatycznie zatwierdzane (0 = wyłączone)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Limity urlopowe */}
          <Card>
            <CardHeader>
              <CardTitle>Limity urlopowe</CardTitle>
              <CardDescription>
                Ograniczenia dotyczące długości i częstotliwości urlopów
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Maksymalne kolejne dni</Label>
                  <Input
                    type="number"
                    value={formData.max_consecutive_days}
                    onChange={(e) => updateField('max_consecutive_days', parseInt(e.target.value) || 0)}
                    placeholder="7"
                  />
                  <p className="text-sm text-muted-foreground">
                    Maksymalna liczba kolejnych dni urlopu w jednym wniosku
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Minimalne wyprzedzenie dla długich urlopów (dni)</Label>
                  <Input
                    type="number"
                    value={formData.min_advance_for_long_leave}
                    onChange={(e) => updateField('min_advance_for_long_leave', parseInt(e.target.value) || 0)}
                    placeholder="14"
                  />
                  <p className="text-sm text-muted-foreground">
                    Urlopy dłuższe niż X dni wymagają większego wyprzedzenia
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Zezwalaj na ujemne saldo urlopowe</Label>
                  <p className="text-sm text-muted-foreground">
                    Czy pracownicy mogą brać urlopy przekraczające ich saldo
                  </p>
                </div>
                <Switch
                  checked={formData.allow_negative_balance}
                  onCheckedChange={(checked) => updateField('allow_negative_balance', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Przenoszenie urlopów */}
          <Card>
            <CardHeader>
              <CardTitle>Przenoszenie urlopów</CardTitle>
              <CardDescription>
                Ustawienia dotyczące przenoszenia niewykorzystanych urlopów
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Zezwalaj na przenoszenie niewykorzystanych urlopów</Label>
                  <p className="text-sm text-muted-foreground">
                    Czy niewykorzystane urlopy można przenieść na kolejny rok
                  </p>
                </div>
                <Switch
                  checked={formData.allow_carry_over}
                  onCheckedChange={(checked) => updateField('allow_carry_over', checked)}
                />
              </div>
              
              {formData.allow_carry_over && (
                <div className="space-y-2">
                  <Label>Maksymalna liczba dni do przeniesienia</Label>
                  <Input
                    type="number"
                    value={formData.max_carry_over_days}
                    onChange={(e) => updateField('max_carry_over_days', parseInt(e.target.value) || 0)}
                    placeholder="5"
                  />
                  <p className="text-sm text-muted-foreground">
                    Ile dni urlopu można przenieść na kolejny rok
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Zasady liczenia dni roboczych */}
          <Card>
            <CardHeader>
              <CardTitle>Zasady liczenia dni roboczych</CardTitle>
              <CardDescription>
                Zasady dotyczące liczenia weekendów i dni świątecznych
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Polityka liczenia weekendów</Label>
                <Select
                  value={formData.weekend_policy}
                  onValueChange={(value: 'count' | 'exclude') => updateField('weekend_policy', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exclude">Nie licz weekendów</SelectItem>
                    <SelectItem value="count">Licz weekendy</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Jak traktować weekendy przy liczeniu dni urlopu
                </p>
              </div>

              <div className="space-y-2">
                <Label>Polityka liczenia świąt</Label>
                <Select
                  value={formData.holiday_policy}
                  onValueChange={(value: 'count' | 'exclude') => updateField('holiday_policy', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exclude">Nie licz świąt</SelectItem>
                    <SelectItem value="count">Licz święta</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Jak traktować dni świąteczne przy liczeniu dni urlopu
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        <div className="flex justify-end gap-3 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Anuluj
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? 'Zapisywanie...' : 'Zapisz zmiany'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
} 