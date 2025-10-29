'use client'

import React, { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ChevronDown, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { getCountryFlag, getLanguageFlag, COUNTRY_FLAGS, LANGUAGE_FLAGS } from '@/lib/flag-utils'
// import { useOrganization } from '@/components/app-layout-client'

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

interface User {
  id: string
  email: string
  full_name: string | null
  role: string
  avatar_url?: string | null
}

interface EditOrganizationSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organization: Organization | null
  users: User[]
  onSave: (data: any) => void
}

export function EditOrganizationSheet({
  open,
  onOpenChange,
  organization,
  users,
  onSave
}: EditOrganizationSheetProps) {
  // const { updateOrganization } = useOrganization()
  
  const [formData, setFormData] = useState({
    name: organization?.name || '',
    slug: organization?.slug || '',
    logo: null as File | null,
    adminId: '', // Will store selected admin user ID
    countryCode: organization?.country_code || 'PL',
    locale: organization?.locale || 'pl'
  })

  const [logoFileName, setLogoFileName] = useState('Nie wybrano pliku')

  const allUsers = users // Show all users, not just admins

  // Sync form data when organization changes
  useEffect(() => {
    if (organization) {
      // Find current admin user
      const currentAdmin = users.find(u => u.role === 'admin')
      
      setFormData({
        name: organization.name || '',
        slug: organization.slug || '',
        logo: null,
        adminId: currentAdmin?.id || '', // Set current admin ID
        countryCode: organization.country_code || 'PL',
        locale: organization.locale || 'pl'
      })
    }
  }, [organization, users])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setFormData(prev => ({ ...prev, logo: file }))
      setLogoFileName(file.name)
    }
  }

  const handleSave = async () => {
    try {
      console.log('Sending form data:', formData)
      console.log('Available users:', users.map(u => ({ id: u.id, email: u.email, role: u.role })))
      
      // Get organization ID from the current organization being edited
      const organizationId = organization?.id
      
      const response = await fetch('/api/admin/settings/organization', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-ID': organizationId || '', // Pass organization context
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        let errorData = {}
        try {
          errorData = await response.json()
        } catch (e) {
          console.error('Failed to parse error response:', e)
          errorData = { error: 'Failed to parse error response' }
        }
        
        console.error('API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          url: response.url
        })
        
        const errorMessage = (errorData as any).error || 'Failed to save organization settings'
        const errorDetails = (errorData as any).details || (errorData as any).stack || 'No additional details'
        
        console.error('Error message:', errorMessage)
        console.error('Error details:', errorDetails)
        
        throw new Error(`${errorMessage} - ${errorDetails}`)
      }

      let result
      try {
        result = await response.json()
        console.log('API Success Response:', result)
      } catch (e) {
        console.error('Failed to parse success response:', e)
        throw new Error('Failed to parse API response')
      }
      
      // Update the organization context with the new data
      // TODO: Re-enable when useOrganization import is fixed
      // if (result.organization) {
      //   updateOrganization({
      //     name: result.organization.name,
      //     brand_color: result.organization.brand_color,
      //     logo_url: result.organization.logo_url,
      //     locale: result.organization.locale
      //   })
      // }
      
      onSave(result.organization)
      toast.success('Zmiany zostały zapisane')
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving organization settings:', error)
      toast.error('Błąd podczas zapisywania zmian')
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    // Reset form data
    setFormData({
      name: organization?.name || '',
      slug: organization?.slug || '',
      logo: null,
      adminId: '',
      countryCode: organization?.country_code || 'PL',
      locale: organization?.locale || 'pl'
    })
    setLogoFileName('Nie wybrano pliku')
  }

  const getUserInitials = (user: User) => {
    if (user.full_name) {
      return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return user.email.slice(0, 2).toUpperCase()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="lg" className="overflow-y-auto">
        <div className="bg-background relative rounded-lg h-full">
          <div className="flex flex-col h-full">
            <div className="flex flex-col gap-6 p-6 flex-1 overflow-y-auto">
              <div className="flex flex-col gap-1.5 w-full">
                <SheetTitle className="text-xl font-semibold text-foreground">Edycja organizacji</SheetTitle>
                <SheetDescription className="text-sm text-muted-foreground">
                  Zmień podstawowe informacje o organizacji
                </SheetDescription>
              </div>

              {/* Separator */}
              <div className="w-full h-px bg-neutral-200" />

              {/* Form */}
              <div className="space-y-6 flex-1">

          <div className="space-y-4">
            {/* Organization Name */}
            <div className="space-y-2">
              <Label htmlFor="org-name">Nazwa organizacji</Label>
              <Input
                id="org-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="BB8"
              />
            </div>

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Logo organizacji</Label>
              <div className="relative">
                <Input
                  value={logoFileName}
                  readOnly
                  className="pl-[100px] cursor-pointer"
                  onClick={() => document.getElementById('logo-upload')?.click()}
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-auto p-1.5 text-sm font-medium"
                    onClick={() => document.getElementById('logo-upload')?.click()}
                  >
                    Wybierz plik
                  </Button>
                </div>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {/* Organization Slug */}
            <div className="space-y-2">
              <Label htmlFor="org-slug">Slug organizacji</Label>
              <Input
                id="org-slug"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="bb8"
              />
              <p className="text-sm text-muted-foreground">
                Unikalny identyfikator (tylko małe litery, cyfry i myślniki)
              </p>
            </div>

                        {/* Admin Selector */}
            <div className="space-y-2">
              <Label>Wybierz administratora</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between h-auto min-h-9 px-3 py-2"
                  >
                    {formData.adminId ? (
                      (() => {
                        const selectedUser = allUsers.find(u => u.id === formData.adminId)
                        return selectedUser ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={selectedUser.avatar_url || undefined} />
                              <AvatarFallback className="text-sm">
                                {getUserInitials(selectedUser)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start">
                              <span className="font-medium text-sm">{selectedUser.full_name || selectedUser.email}</span>
                              <span className="text-xs text-muted-foreground">{selectedUser.email}</span>
                            </div>
                          </div>
                        ) : null
                      })()
                    ) : (
                      <span className="text-muted-foreground">Wybierz administratora</span>
                    )}
                    <ChevronDown className="size-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  {allUsers.map((user, index, array) => (
                    <React.Fragment key={user.id}>
                      <DropdownMenuItem
                        onClick={() => {
                          console.log('Setting admin to:', user.id, user.full_name || user.email)
                          setFormData(prev => ({ ...prev, adminId: user.id }))
                        }}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="text-sm">
                              {getUserInitials(user)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{user.full_name || user.email}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </div>
                      </DropdownMenuItem>
                      {index < array.length - 1 && <DropdownMenuSeparator />}
                    </React.Fragment>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            {/* Holiday Calendar */}
            <div className="space-y-2">
              <Label>Kalendarz świąt</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between h-auto min-h-9 px-3 py-2"
                  >
                    {formData.countryCode ? (
                      <div className="flex items-center gap-2">
                        {(() => {
                          const flagData = getCountryFlag(formData.countryCode)
                          return flagData ? (
                            <>
                              <span className="text-lg">{flagData.flag}</span>
                              <span className="font-medium text-sm">{flagData.name}</span>
                            </>
                          ) : null
                        })()}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Wybierz kraj</span>
                    )}
                    <ChevronDown className="size-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  {COUNTRY_FLAGS.map((flag) => (
                    <DropdownMenuItem
                      key={flag.code}
                      onClick={() => {
                        console.log('Setting country code to:', flag.code)
                        setFormData(prev => ({ ...prev, countryCode: flag.code }))
                      }}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{flag.flag}</span>
                        <span className="font-medium text-sm">{flag.name}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Primary Language */}
            <div className="space-y-2">
              <Label>Język podstawowy</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between h-auto min-h-9 px-3 py-2"
                  >
                    {formData.locale ? (
                      <div className="flex items-center gap-2">
                        {(() => {
                          const flagData = getLanguageFlag(formData.locale)
                          return flagData ? (
                            <>
                              <span className="text-lg">{flagData.flag}</span>
                              <span className="font-medium text-sm">{flagData.name}</span>
                            </>
                          ) : null
                        })()}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Wybierz język</span>
                    )}
                    <ChevronDown className="size-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  {LANGUAGE_FLAGS.map((flag) => (
                    <DropdownMenuItem
                      key={flag.code}
                      onClick={() => {
                        console.log('Setting locale to:', flag.code)
                        setFormData(prev => ({ ...prev, locale: flag.code }))
                      }}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{flag.flag}</span>
                        <span className="font-medium text-sm">{flag.name}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
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