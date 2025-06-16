'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Loader2, Save, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Organization {
  id: string
  name: string
  slug: string
  google_domain?: string | null
  require_google_domain?: boolean
  created_at: string
}

interface OrganizationSettingsFormProps {
  organization: Organization | null
}

export function OrganizationSettingsForm({ organization }: OrganizationSettingsFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: organization?.name || '',
    slug: organization?.slug || '',
    google_domain: organization?.google_domain || '',
    require_google_domain: organization?.require_google_domain || false
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = createClient()

      // Validate slug format
      const slugRegex = /^[a-z0-9-]+$/
      if (!slugRegex.test(formData.slug)) {
        throw new Error('Slug może zawierać tylko małe litery, cyfry i myślniki')
      }

      // Check if slug is unique (excluding current organization)
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', formData.slug)
        .neq('id', organization?.id || '')
        .single()

      if (existingOrg) {
        throw new Error('Ten slug jest już używany przez inną organizację')
      }

      // Update organization
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          name: formData.name,
          slug: formData.slug,
          google_domain: formData.google_domain || null,
          require_google_domain: formData.require_google_domain
        })
        .eq('id', organization?.id)

      if (updateError) {
        throw updateError
      }

      setSuccess('Ustawienia organizacji zostały zaktualizowane!')
      router.refresh()

    } catch (error) {
      console.error('Error updating organization:', error)
      setError(error instanceof Error ? error.message : 'Wystąpił błąd podczas aktualizacji')
    } finally {
      setLoading(false)
    }
  }

  if (!organization) {
    return (
      <Alert>
        <AlertDescription>Nie można załadować danych organizacji</AlertDescription>
      </Alert>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Nazwa organizacji *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="np. Moja Firma Sp. z o.o."
            required
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            Nazwa wyświetlana w aplikacji
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Slug organizacji *</Label>
          <Input
            id="slug"
            value={formData.slug}
            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase() }))}
            placeholder="np. moja-firma"
            required
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            Unikalny identyfikator (tylko małe litery, cyfry i myślniki)
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Integracja z Google</h3>
        
        <div className="space-y-2">
          <Label htmlFor="google_domain">Domena Google Workspace (opcjonalnie)</Label>
          <Input
            id="google_domain"
            value={formData.google_domain}
            onChange={(e) => setFormData(prev => ({ ...prev, google_domain: e.target.value }))}
            placeholder="np. firma.com"
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            Jeśli ustawione, tylko użytkownicy z tej domeny będą mogli się logować przez Google
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="require_google_domain"
            checked={formData.require_google_domain}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, require_google_domain: checked }))}
            disabled={loading || !formData.google_domain}
          />
          <Label htmlFor="require_google_domain">
            Wymagaj domeny Google dla wszystkich nowych użytkowników
          </Label>
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

      <div className="flex items-center gap-4">
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
              Zapisz zmiany
            </>
          )}
        </Button>
        
        <div className="text-sm text-muted-foreground">
          Organizacja utworzona: {new Date(organization.created_at).toLocaleDateString('pl-PL')}
        </div>
      </div>
    </form>
  )
} 