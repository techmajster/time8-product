'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Building2 } from 'lucide-react'
import Link from 'next/link'

export default function CreateOrganizationPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    googleDomain: '',
    requireGoogleDomain: false,
  })
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Get user email for Google domain suggestion
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
        // If Google user, suggest their domain
        if (user.app_metadata.provider === 'google') {
          const domain = user.email.split('@')[1]
          setFormData(prev => ({ ...prev, googleDomain: domain }))
        }
      }
    }
    getUser()
  }, [supabase])

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw new Error('Authentication error: ' + userError.message)
      if (!user) throw new Error('Not authenticated')

      console.log('Creating organization for user:', user.id)

      // First, ensure profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!existingProfile) {
        console.log('Creating profile first...')
        const { error: profileCreateError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata.full_name || user.email!.split('@')[0],
            auth_provider: user.app_metadata.provider || 'email',
          })

        if (profileCreateError) {
          console.error('Profile creation error:', profileCreateError)
          throw new Error('Failed to create profile: ' + profileCreateError.message)
        }
      }

      // Create organization
      console.log('Creating organization...')
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: formData.name,
          slug: formData.slug,
          google_domain: formData.googleDomain || null,
          require_google_domain: formData.requireGoogleDomain,
        })
        .select()
        .single()

      if (orgError) {
        console.error('Organization creation error:', orgError)
        throw new Error('Failed to create organization: ' + orgError.message)
      }

      console.log('Organization created:', org)

      // Update user profile with organization and admin role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          organization_id: org.id,
          role: 'admin',
        })
        .eq('id', user.id)

      if (profileError) {
        console.error('Profile update error:', profileError)
        throw new Error('Failed to update profile: ' + profileError.message)
      }

      // Create default leave types
      console.log('Creating default leave types...')
          const defaultLeaveTypes = [
      { name: 'Urlop wypoczynkowy', days_per_year: 21, color: 'hsl(var(--info))' },
      { name: 'Zwolnienie lekarskie', days_per_year: 10, color: 'hsl(var(--destructive))' },
      { name: 'Urlop okolicznościowy', days_per_year: 3, color: 'hsl(var(--success))' },
    ]

      const { error: leaveTypesError } = await supabase
        .from('leave_types')
        .insert(
          defaultLeaveTypes.map(type => ({
            ...type,
            organization_id: org.id,
          }))
        )

      if (leaveTypesError) {
        console.error('Leave types error:', leaveTypesError)
        // Don't throw here, organization is created successfully
      }

      // Success! Redirect to completion page
      console.log('All done, redirecting...')
      router.push('/onboarding/complete')
      
    } catch (err) {
      console.error('Error in handleSubmit:', err)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link 
        href="/onboarding" 
        className="inline-flex items-center text-sm text-muted-foreground hover:text-gray-900"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back
      </Link>

      <Card>
        <CardHeader>
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Create Your Organization</CardTitle>
          <CardDescription>
            Set up your company details. You can always change these later.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                placeholder="Acme Corporation"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Organization URL *</Label>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">app.saasleave.com/</span>
                <Input
                  id="slug"
                  placeholder="acme-corp"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  pattern="[a-z0-9-]+"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Letters, numbers, and hyphens only
              </p>
            </div>

            <div className="rounded-lg border bg-muted p-4 space-y-4">
              <h3 className="font-medium">Google Workspace Settings (Optional)</h3>
              
              <div className="space-y-2">
                <Label htmlFor="googleDomain">Company Email Domain</Label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">@</span>
                  <Input
                    id="googleDomain"
                    placeholder="example.com"
                    value={formData.googleDomain}
                    onChange={(e) => setFormData({ ...formData, googleDomain: e.target.value })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Employees with this email domain can automatically join
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="requireDomain"
                  checked={formData.requireGoogleDomain}
                  onChange={(e) => setFormData({ ...formData, requireGoogleDomain: e.target.checked })}
                  disabled={!formData.googleDomain}
                  className="rounded border-input"
                />
                <Label htmlFor="requireDomain" className="text-sm font-normal cursor-pointer">
                  Only allow users with this email domain to join
                </Label>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          
          <CardContent>
            <Button type="submit" className="w-full " disabled={loading}>
              {loading ? 'Creating organization...' : 'Create Organization'}
            </Button>
          </CardContent>
        </form>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        By creating an organization, you agree to our Terms of Service and Privacy Policy
      </div>
    </div>
  )
}