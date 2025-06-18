'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Save, Upload, X, Palette } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Organization {
  id: string
  name: string
  brand_color?: string | null
  logo_url?: string | null
}

interface OrganizationBrandingFormProps {
  organization: Organization | null
}

const BRAND_COLOR_PRESETS = [
  '#0F5765', // Aer Lingus green-blue
  '#1D4ED8', // Blue
  '#059669', // Green  
  '#DC2626', // Red
  '#7C3AED', // Purple
  '#EA580C', // Orange
  '#BE185D', // Pink
  '#374151', // Gray
]

export function OrganizationBrandingForm({ organization }: OrganizationBrandingFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(organization?.logo_url || null)
  const [formData, setFormData] = useState({
    brand_color: organization?.brand_color || '#0F5765',
    logo_file: null as File | null
  })

  const handleLogoUpload = async (file: File) => {
    if (!file || !organization?.id) return null
    
    setUploading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Plik musi być obrazem')
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Plik nie może być większy niż 2MB')
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `logo-${organization.id}-${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('organization-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('organization-assets')
        .getPublicUrl(uploadData.path)

      return urlData.publicUrl
    } catch (error) {
      console.error('Error uploading logo:', error)
      setError(error instanceof Error ? error.message : 'Błąd podczas przesyłania logo')
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Create preview
    const previewUrl = URL.createObjectURL(file)
    setLogoPreview(previewUrl)
    setFormData(prev => ({ ...prev, logo_file: file }))
  }

  const removeLogo = () => {
    setLogoPreview(null)
    setFormData(prev => ({ ...prev, logo_file: null }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = createClient()
      let logoUrl = organization?.logo_url

      // Upload logo if changed
      if (formData.logo_file) {
        const uploadedUrl = await handleLogoUpload(formData.logo_file)
        if (uploadedUrl) {
          logoUrl = uploadedUrl
        } else {
          return // Error already set in handleLogoUpload
        }
      }

      // Update organization
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          brand_color: formData.brand_color,
          logo_url: logoUrl
        })
        .eq('id', organization?.id)

      if (updateError) {
        throw updateError
      }

      setSuccess('Branding organizacji został zaktualizowany!')
      router.refresh()

    } catch (error) {
      console.error('Error updating branding:', error)
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
      {/* Logo Upload */}
      <div className="space-y-4">
        <Label>Logo organizacji</Label>
        
        {logoPreview ? (
          <div className="relative w-32 h-32 border border-border rounded-lg overflow-hidden bg-white">
            <Image
              src={logoPreview}
              alt="Logo preview"
              fill
              className="object-contain p-2"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-1 right-1 h-6 w-6 p-0"
              onClick={removeLogo}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="w-32 h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center bg-muted/50">
            <div className="text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Brak logo</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Przesyłanie...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {logoPreview ? 'Zmień logo' : 'Dodaj logo'}
              </>
            )}
          </Button>
          
          {logoPreview && (
            <Button
              type="button"
              variant="ghost"
              onClick={removeLogo}
              disabled={loading || uploading}
            >
              <X className="h-4 w-4 mr-2" />
              Usuń
            </Button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <p className="text-xs text-muted-foreground">
          Wspierane formaty: JPG, PNG, SVG. Maksymalny rozmiar: 2MB
        </p>
      </div>

      {/* Brand Color */}
      <div className="space-y-4">
        <Label htmlFor="brand_color">Kolor marki</Label>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-md border border-border"
              style={{ backgroundColor: formData.brand_color }}
            />
            <Input
              id="brand_color"
              type="color"
              value={formData.brand_color}
              onChange={(e) => setFormData(prev => ({ ...prev, brand_color: e.target.value }))}
              className="w-20 h-10 p-1 cursor-pointer"
              disabled={loading}
            />
            <Input
              value={formData.brand_color}
              onChange={(e) => setFormData(prev => ({ ...prev, brand_color: e.target.value }))}
              placeholder="#000000"
              className="font-mono text-sm"
              disabled={loading}
            />
          </div>

          {/* Color Presets */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Gotowe kolory:</Label>
            <div className="flex flex-wrap gap-2">
              {BRAND_COLOR_PRESETS.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-md border-2 transition-all ${
                    formData.brand_color === color 
                      ? 'border-foreground ring-2 ring-foreground/20' 
                      : 'border-border hover:border-foreground/50'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData(prev => ({ ...prev, brand_color: color }))}
                  disabled={loading}
                />
              ))}
            </div>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Kolor marki będzie używany w nawigacji, przyciskach i innych elementach interfejsu
        </p>
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

      <div className="flex items-center gap-4 pt-4 border-t">
        <Button 
          type="submit" 
          disabled={loading || uploading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Zapisywanie...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Zapisz branding
            </>
          )}
        </Button>
      </div>
    </form>
  )
} 