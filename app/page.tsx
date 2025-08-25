import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If user is authenticated, redirect to dashboard (middleware will handle proper routing)
  if (user) {
    redirect('/dashboard')
  }

  // If not authenticated, redirect to login
  redirect('/login')
}