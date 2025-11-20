'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, User, Camera, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { getInitials } from '@/lib/utils/initials'

interface AvatarUploadProps {
  userId: string
  currentAvatarUrl?: string | null
  userName: string
}

export function AvatarUpload({ userId, currentAvatarUrl, userName }: AvatarUploadProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl || null)

  // Sync local state with prop changes
  useEffect(() => {
    setAvatarUrl(currentAvatarUrl || null)
  }, [currentAvatarUrl])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Proszę wybrać plik obrazu')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Plik jest za duży. Maksymalny rozmiar to 5MB')
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload file
    uploadAvatar(file)
  }

  const uploadAvatar = async (file: File) => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Upload to Supabase Storage directly
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Bucket avatars nie istnieje. Skontaktuj się z administratorem aby go utworzyć.')
        } else if (uploadError.message.includes('Policy')) {
          throw new Error('Brak uprawnień do przesyłania plików. Sprawdź ustawienia RLS w Supabase.')
        } else if (uploadError.message.includes('not found')) {
          throw new Error('Bucket avatars nie został znaleziony. Upewnij się, że istnieje w Supabase Storage.')
        }
        throw new Error(`Błąd przesyłania: ${uploadError.message}`)
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)

      if (updateError) {
        console.error('Profile update error:', updateError)
        // Try to clean up uploaded file
        await supabase.storage
          .from('avatars')
          .remove([filePath])
        throw new Error(`Błąd aktualizacji profilu: ${updateError.message}`)
      }

      // Delete old avatar if exists
      if (currentAvatarUrl && currentAvatarUrl.includes('supabase')) {
        try {
          // Extract filename from URL
          const urlParts = currentAvatarUrl.split('/')
          const oldFileName = urlParts[urlParts.length - 1]
          if (oldFileName && oldFileName !== fileName) {
            await supabase.storage
              .from('avatars')
              .remove([`avatars/${oldFileName}`])
          }
        } catch (error) {
          console.log('Could not delete old avatar (non-critical):', error)
        }
      }

      setAvatarUrl(publicUrl)
      setPreviewUrl(null)
      console.log('Avatar uploaded successfully, new URL:', publicUrl)

    } catch (error) {
      console.error('Error uploading avatar:', error)
      setError(error instanceof Error ? error.message : 'Wystąpił błąd podczas przesyłania zdjęcia')
      setPreviewUrl(null)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveAvatar = async () => {
    if (!avatarUrl) return

    // Store current avatar URL for cleanup
    const avatarUrlToDelete = avatarUrl

    // Immediately update UI state for instant feedback
    setAvatarUrl(null)
    setPreviewUrl(null)
    setError(null)
    console.log('Starting avatar removal...')

    setLoading(true)

    try {
      const supabase = createClient()

      // Remove from storage if it's a Supabase-hosted image
      if (avatarUrlToDelete.includes('supabase')) {
        try {
          const urlParts = avatarUrlToDelete.split('/')
          const fileName = urlParts[urlParts.length - 1]
          if (fileName) {
            await supabase.storage
              .from('avatars')
              .remove([`avatars/${fileName}`])
          }
        } catch (error) {
          console.log('Could not delete from storage (non-critical):', error)
        }
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId)

      if (updateError) {
        throw updateError
      }

      console.log('Avatar removed successfully')

    } catch (error) {
      console.error('Error removing avatar:', error)
      setError('Wystąpił błąd podczas usuwania zdjęcia')
    } finally {
      setLoading(false)
    }
  }

  const displayAvatarUrl = previewUrl || avatarUrl
  const initials = getInitials(userName)

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Avatar Display */}
      <div className="relative">
        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-muted">
          {displayAvatarUrl ? (
            <Image
              src={displayAvatarUrl}
              alt={userName}
              width={96}
              height={96}
              className="w-full h-full object-cover"
              onError={() => {
                console.log('Image failed to load, showing initials fallback')
                setPreviewUrl(null)
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-xl font-semibold">
              {initials || <User className="h-8 w-8" />}
            </div>
          )}
        </div>

        {/* Upload Button Overlay */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="absolute inset-0 flex items-center justify-center bg-foreground/50 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-200 text-white"
        >
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Camera className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {avatarUrl ? 'Zmień zdjęcie' : 'Dodaj zdjęcie'}
        </Button>

        {avatarUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveAvatar}
            disabled={loading}
            className="text-destructive hover:bg-destructive/5"
          >
            Usuń
          </Button>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Error Message */}
      {error && (
        <Alert variant="destructive" className="w-full max-w-sm">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload Tips */}
      <div className="text-center text-xs text-muted-foreground max-w-sm">
        <p>JPG, PNG lub GIF</p>
        <p>Maksymalny rozmiar: 5MB</p>
        {error && error.includes('administrator') && (
          <p className="text-destructive mt-2 font-medium">
            ⚠️ Wymagana konfiguracja storage przez administratora
          </p>
        )}
      </div>
    </div>
  )
} 