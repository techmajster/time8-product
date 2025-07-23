'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface Organization {
  id: string
  name: string
  slug: string
  google_domain?: string | null
  require_google_domain?: boolean
  brand_color?: string | null
  logo_url?: string | null
  country_code?: string
  locale?: string
  created_at: string
}

interface EditGoogleWorkspaceSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organization: Organization | null
  onSave: (data: any) => void
}

export function EditGoogleWorkspaceSheet({
  open,
  onOpenChange,
  organization,
  onSave
}: EditGoogleWorkspaceSheetProps) {
  const [formData, setFormData] = useState({
    googleDomain: organization?.google_domain || '',
    requireGoogleDomain: organization?.require_google_domain || false
  })

  const handleSave = async () => {
    try {
      const response = await fetch('/api/admin/settings/google-workspace', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save Google Workspace settings')
      }

      const result = await response.json()
      onSave(result.organization)
      toast.success('Zmiany zostały zapisane')
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving Google Workspace settings:', error)
      toast.error('Błąd podczas zapisywania zmian')
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    // Reset form data
    setFormData({
      googleDomain: organization?.google_domain || '',
      requireGoogleDomain: organization?.require_google_domain || false
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="lg" className="overflow-y-auto">
        <div className="bg-background relative rounded-lg h-full">
          <div className="flex flex-col h-full">
            <div className="flex flex-col gap-6 p-6 flex-1 overflow-y-auto">
              <div className="flex flex-col gap-1.5 w-full">
                <SheetTitle className="text-xl font-semibold text-neutral-950">Edycja integracji z Google Workspace</SheetTitle>
                <SheetDescription className="text-sm text-neutral-500">
                  Zmień ustawienia integracji Google Workspace
                </SheetDescription>
              </div>

              {/* Separator */}
              <div className="w-full h-px bg-neutral-200" />

              {/* Form */}
              <div className="space-y-6 flex-1">
          <div className="space-y-4">
            {/* Google Workspace Domain */}
            <div className="space-y-2">
              <Label htmlFor="google-domain">Domena Google Workspace</Label>
              <Input
                id="google-domain"
                value={formData.googleDomain}
                onChange={(e) => setFormData(prev => ({ ...prev, googleDomain: e.target.value }))}
                placeholder="bb8.pl"
              />
              <p className="text-sm text-muted-foreground">
                Jeśli ustawione, tylko użytkownicy z tej domeny będą mogli się logować przez Google
              </p>
            </div>

            {/* Require Google Domain Switch */}
            <div className="flex items-start gap-3">
              <Switch
                id="require-google-domain"
                checked={formData.requireGoogleDomain}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requireGoogleDomain: checked }))}
              />
              <div className="space-y-2">
                <Label htmlFor="require-google-domain" className="text-sm font-medium">
                  Wymagaj domeny Google dla wszystkich nowych użytkowników
                </Label>
              </div>
            </div>
          </div>
              </div>
            </div>
            
            {/* Footer - Fixed at Bottom */}
            <div className="flex flex-row gap-2 items-center justify-between w-full p-6 pt-0 bg-background">
              <Button 
                variant="outline" 
                onClick={handleCancel}
                className="h-9"
              >
                Anuluj
              </Button>
              <Button 
                onClick={handleSave}
                className="h-9"
              >
                Zapisz zmiany
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
} 