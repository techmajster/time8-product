'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useUpdateWorkMode } from '@/hooks/use-admin-mutations'

interface WorkModeSettingsProps {
  currentOrganization: {
    id: string
    work_mode?: 'monday_to_friday' | 'multi_shift'
    working_days?: string[]
  }
}

export function WorkModeSettings({ currentOrganization }: WorkModeSettingsProps) {
  const router = useRouter()
  const [selectedMode, setSelectedMode] = useState<'monday_to_friday' | 'multi_shift'>(
    currentOrganization?.work_mode || 'monday_to_friday'
  )

  // React Query mutation
  const updateWorkModeMutation = useUpdateWorkMode()

  const handleSaveWorkMode = async () => {
    // Prepare default working days based on mode
    let workingDays: string[] = []

    if (selectedMode === 'monday_to_friday') {
      workingDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    }

    // Use React Query mutation
    updateWorkModeMutation.mutate({
      work_mode: selectedMode,
      working_days: workingDays
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dostępne tryby pracy</CardTitle>
        <CardDescription>
          Konfiguracja trybu pracy dla organizacji. Określa, które dni tygodnia są dniami roboczymi, a które są weekendami.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup
          value={selectedMode}
          onValueChange={(value) => setSelectedMode(value as 'monday_to_friday' | 'multi_shift')}
          className="space-y-4"
        >
          {/* Monday to Friday Mode */}
          <div className="flex items-start space-x-3 space-y-0">
            <RadioGroupItem value="monday_to_friday" id="monday_to_friday" />
            <div className="flex-1">
              <Label
                htmlFor="monday_to_friday"
                className="text-base font-medium cursor-pointer"
              >
                Poniedziałek - Piątek
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Standardowy tydzień pracy (5 dni). Sobota i niedziela są weekendami i będą wyświetlane na kalendarzu jako dni wolne.
              </p>
              <div className="mt-2 flex gap-2 flex-wrap">
                {['Pon', 'Wt', 'Śr', 'Czw', 'Pt'].map((day, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded"
                  >
                    {day}
                  </span>
                ))}
                {['Sob', 'Niedz'].map((day, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200 rounded"
                  >
                    {day}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Multi-shift Mode (Coming Soon) */}
          <div className="flex items-start space-x-3 space-y-0 opacity-50 cursor-not-allowed">
            <RadioGroupItem value="multi_shift" id="multi_shift" disabled />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="multi_shift"
                  className="text-base font-medium cursor-not-allowed"
                >
                  Multi-shift
                </Label>
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded">
                  Wkrótce
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Elastyczny harmonogram pracy z możliwością pracy w weekendy. Ta funkcja będzie dostępna wkrótce.
              </p>
            </div>
          </div>
        </RadioGroup>

        {/* Save Button */}
        <div className="pt-4 border-t">
          <Button
            onClick={handleSaveWorkMode}
            disabled={updateWorkModeMutation.isPending || selectedMode === currentOrganization?.work_mode}
          >
            {updateWorkModeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Zapisz tryb pracy
          </Button>
          {selectedMode !== currentOrganization?.work_mode && (
            <p className="text-sm text-muted-foreground mt-2">
              Masz niezapisane zmiany
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
