'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Building2, CheckCircle, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { createOrganizationSchema, type CreateOrganizationFormData } from '@/lib/validations/onboarding'

export default function CreateWorkspacePage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const t = useTranslations('onboarding')

  const form = useForm<CreateOrganizationFormData>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: '',
      slug: '',
      google_domain: null,
      require_google_domain: false,
      country_code: 'PL'
    }
  })

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push('/login')
        return
      }

      setUser(user)

      // If Google user, suggest their domain
      if (user.app_metadata.provider === 'google' && user.email) {
        const domain = user.email.split('@')[1]
        if (domain && !['gmail.com', 'googlemail.com'].includes(domain.toLowerCase())) {
          form.setValue('google_domain', domain)
        }
      }
    }

    getUser()
  }, [form, router])

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    form.setValue('name', name)
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50)
    form.setValue('slug', slug)
  }

  const onSubmit = async (data: CreateOrganizationFormData) => {
    try {
      setIsSubmitting(true)
      setError(null)

      // Use existing organization creation API
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create organization')
      }

      // Success! Redirect to dashboard
      router.push('/dashboard')
      
    } catch (error: any) {
      console.error('Organization creation error:', error)
      setError(error.message || 'Failed to create workspace. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-gray-600 hover:text-gray-900"
        >
          <Link href="/onboarding/welcome">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('createWorkspace.back')}
          </Link>
        </Button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('createWorkspace.title')}
          </h1>
          <p className="text-sm text-gray-600">
            {t('createWorkspace.subtitle')}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form Card */}
        <Card className="border-0 shadow-xl bg-white/95 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg">
              {t('createWorkspace.form.title')}
            </CardTitle>
            <CardDescription>
              {t('createWorkspace.form.description')}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Organization Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  {t('createWorkspace.form.name.label')}
                </Label>
                <Input
                  id="name"
                  placeholder={t('createWorkspace.form.name.placeholder')}
                  {...form.register('name')}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="h-11"
                  disabled={isSubmitting}
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-red-600">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              {/* Organization Slug */}
              <div className="space-y-2">
                <Label htmlFor="slug" className="text-sm font-medium text-gray-700">
                  {t('createWorkspace.form.slug.label')}
                </Label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500 bg-gray-50 border border-r-0 rounded-l-md px-3 py-2.5">
                    time8.io/
                  </span>
                  <Input
                    id="slug"
                    placeholder="my-company"
                    {...form.register('slug')}
                    className="h-11 rounded-l-none"
                    disabled={isSubmitting}
                  />
                </div>
                {form.formState.errors.slug && (
                  <p className="text-xs text-red-600">
                    {form.formState.errors.slug.message}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  {t('createWorkspace.form.slug.help')}
                </p>
              </div>

              {/* Google Domain (Optional) */}
              {form.watch('google_domain') && (
                <div className="space-y-2">
                  <Label htmlFor="google_domain" className="text-sm font-medium text-gray-700">
                    {t('createWorkspace.form.domain.label')}
                  </Label>
                  <Input
                    id="google_domain"
                    placeholder="company.com"
                    {...form.register('google_domain')}
                    className="h-11"
                    disabled={isSubmitting}
                  />
                  {form.formState.errors.google_domain && (
                    <p className="text-xs text-red-600">
                      {form.formState.errors.google_domain.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    {t('createWorkspace.form.domain.help')}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-medium bg-primary hover:bg-primary/90 transition-colors"
                disabled={isSubmitting || !form.formState.isValid}
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('createWorkspace.form.submitting')}
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {t('createWorkspace.form.submit')}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-xs text-center text-gray-500">
          {t('createWorkspace.footer')}
        </p>
      </div>
    </div>
  )
}