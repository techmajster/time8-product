import { AppLayout } from '@/components/app-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function MyLeavePage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      *,
      organizations (
        id,
        name
      )
    `)
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    redirect('/onboarding')
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">Moje urlopy</h1>
          <div className="bg-white rounded-lg shadow border p-6">
            <p className="text-gray-600">Ta strona będzie wkrótce dostępna.</p>
            <p className="text-sm text-gray-500 mt-2">
              Tutaj będziesz mógł zarządzać swoimi urlopami i sprawdzać ich status.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
} 