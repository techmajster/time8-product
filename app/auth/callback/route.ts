import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && user) {
      // Check if profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select()
        .eq('id', user.id)
        .single()

      // Create profile if it doesn't exist (for Google auth users)
      if (!profile && user.email) {
        const authProvider = user.app_metadata.provider || 'email'
        
        await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata.full_name || user.email.split('@')[0],
          auth_provider: authProvider,
          // Organization will be set during onboarding
        })
      }
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}