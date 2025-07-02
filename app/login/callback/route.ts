import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  console.log('🔐 Auth callback received:', { code: !!code, origin })

  if (code) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    console.log('🔐 Exchange code result:', { 
      user: user ? { id: user.id, email: user.email } : null, 
      error: error?.message 
    })
    
    if (!error && user) {
      // Check if profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, organization_id')
        .eq('id', user.id)
        .single()

      console.log('🔐 Profile check:', { profile })

      // Create profile if it doesn't exist (for Google auth users)
      if (!profile && user.email) {
        const authProvider = user.app_metadata.provider || 'email'
        const emailDomain = user.email.split('@')[1]
        const isGoogleUser = authProvider === 'google'
        
        let organizationId = null
        
        // Check if this is a Google user and their domain has an existing organization
        if (isGoogleUser && emailDomain) {
          const { data: existingOrg } = await supabase
            .from('organizations')
            .select('id')
            .eq('google_domain', emailDomain)
            .single()
          
          if (existingOrg) {
            organizationId = existingOrg.id
          }
        }
        
        console.log('🔐 Creating new profile:', { 
          userId: user.id, 
          email: user.email, 
          organizationId 
        })
        
        const { error: insertError } = await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata.full_name || user.email.split('@')[0],
          auth_provider: authProvider,
          organization_id: organizationId, // Auto-join if domain matches
          role: organizationId ? 'employee' : null, // Set default role if auto-joining
        })

        if (insertError) {
          console.error('🔐 Profile creation error:', insertError)
        }
      }
      // If profile exists but has no organization, check for auto-join
      else if (profile && !profile.organization_id && user.email) {
        const authProvider = user.app_metadata.provider || 'email'
        const emailDomain = user.email.split('@')[1]
        const isGoogleUser = authProvider === 'google'
        
        // Check if this is a Google user and their domain has an existing organization
        if (isGoogleUser && emailDomain) {
          const { data: existingOrg } = await supabase
            .from('organizations')
            .select('id')
            .eq('google_domain', emailDomain)
            .single()
          
          if (existingOrg) {
            // Update profile to join the organization
            await supabase
              .from('profiles')
              .update({
                organization_id: existingOrg.id,
                role: 'employee'
              })
              .eq('id', user.id)
          }
        }
      }

      // Decide where to redirect based on profile status
      const finalRedirect = profile?.organization_id ? '/dashboard' : '/onboarding'
      console.log('🔐 Redirecting to:', finalRedirect)
      
      return NextResponse.redirect(`${origin}${finalRedirect}`)
    } else {
      console.error('🔐 Auth exchange failed:', error)
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }
  }

  console.log('🔐 No code provided, redirecting to login')
  return NextResponse.redirect(`${origin}/login?error=no_code`)
} 