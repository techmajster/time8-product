'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { User, Loader2, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

interface ProfileAvatarProps {
  userId: string
  currentAvatarUrl?: string | null
  userName: string
}

export function ProfileAvatar({ userId, currentAvatarUrl, userName }: ProfileAvatarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl || null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Proszę wybrać plik obrazu')
      return
    }

    // Validate file size (max 500KB)
    if (file.size > 500 * 1024) {
      setError('Plik jest za duży. Maksymalny rozmiar to 500KB')
      return
    }

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

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Bucket avatars nie istnieje. Skontaktuj się z administratorem.')
        } else if (uploadError.message.includes('Policy')) {
          throw new Error('Brak uprawnień do przesyłania plików.')
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
        // Try to clean up uploaded file
        await supabase.storage
          .from('avatars')
          .remove([filePath])
        throw new Error(`Błąd aktualizacji profilu: ${updateError.message}`)
      }

      // Delete old avatar if exists
      if (currentAvatarUrl && currentAvatarUrl.includes('supabase')) {
        try {
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

    } catch (error) {
      console.error('Error uploading avatar:', error)
      setError(error instanceof Error ? error.message : 'Wystąpił błąd podczas przesyłania zdjęcia')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-4 items-start w-[400px]">
      {/* Avatar - 96x96 square */}
      <div className="w-24 h-24 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={userName}
            width={96}
            height={96}
            className="w-full h-full object-cover"
            onError={() => {
              console.log('Image failed to load')
              setAvatarUrl(null)
            }}
          />
        ) : (
          <User className="h-8 w-8 text-muted-foreground" />
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-4 w-72">
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="h-9 w-[145px]"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Przesyłanie...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              {avatarUrl ? 'Zmień zdjęcie' : 'Dodaj zdjęcie'}
            </>
          )}
        </Button>

        <div className="text-sm text-muted-foreground">
          <p>JPG, PNG lub GIF</p>
          <p>Maksymalny rozmiar: 500KB</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
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
    </div>
  )
}

