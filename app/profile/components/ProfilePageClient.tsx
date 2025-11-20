'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Calendar } from 'lucide-react'
import { ProfileAvatar } from './ProfileAvatar'
import { ProfileEditSheet } from './ProfileEditSheet'

interface ProfilePageClientProps {
  user: {
    id: string
    email: string | null
  }
  profile: {
    id: string
    full_name: string | null
    birth_date: string | null
    avatar_url: string | null
  }
}

export function ProfilePageClient({ user, profile }: ProfilePageClientProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Format birth date for display (DD.MM.YYYY)
  const formatBirthDate = (dateString: string | null) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    return date.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Card 1: Dane osobowe */}
        <Card className="border-0 shadow-none p-0">
          <CardHeader className="p-0">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <CardTitle className="text-xl">Dane osobowe</CardTitle>
                <CardDescription>
                  Podstawowe informacje o użytkowniku
                </CardDescription>
              </div>
              <div>
                <Button 
                  variant="outline" 
                  className="h-9"
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  Edytuj dane
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-4 w-[400px]">
              {/* Name */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Imię i Nazwisko lub Nick
                </Label>
                <div className="h-9 px-3 py-1 flex items-center bg-background border border-input rounded-md">
                  <p className="text-sm text-foreground">
                    {profile.full_name || '—'}
                  </p>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Adres e-mail
                </Label>
                <div className="h-9 px-3 py-1 flex items-center bg-background border border-input rounded-md opacity-50">
                  <p className="text-sm text-muted-foreground">
                    {user.email || '—'}
                  </p>
                </div>
              </div>

              {/* Birth Date */}
              <div className="space-y-2 w-[140px]">
                <Label className="text-sm font-medium">
                  Data urodzenia
                </Label>
                <div className="h-9 px-4 py-2 flex items-center gap-2 bg-background border border-input rounded-md">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <p className="text-sm text-foreground">
                    {formatBirthDate(profile.birth_date)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Card 2: Zdjęcie profilu */}
        <Card className="border-0 shadow-none p-0">
          <CardHeader className="p-0">
            <div className="space-y-1.5">
              <CardTitle className="text-xl">Zdjęcie profilu</CardTitle>
              <CardDescription>
                Podstawowe informacje o przestrzeni roboczej
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ProfileAvatar
              userId={user.id}
              currentAvatarUrl={profile.avatar_url}
              userName={profile.full_name || user.email || ''}
            />
          </CardContent>
        </Card>
      </div>

      {/* Edit Sheet */}
      <ProfileEditSheet
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        profile={{
          id: profile.id,
          full_name: profile.full_name,
          email: user.email || '',
          birth_date: profile.birth_date
        }}
      />
    </>
  )
}

