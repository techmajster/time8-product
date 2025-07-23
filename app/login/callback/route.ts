import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const invitationId = requestUrl.searchParams.get('invitation_id')
  const origin = requestUrl.origin

  console.log('🔐 Auth callback received:', { code: !!code, invitationId, origin })

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

      // Handle invitation acceptance if invitation_id is provided
      if (invitationId) {
        console.log('🔐 Processing invitation:', invitationId)
        
        // Get invitation details
        const { data: invitation, error: invitationError } = await supabase
          .from('invitations')
          .select('*')
          .eq('id', invitationId)
          .eq('status', 'pending')
          .single()

        if (invitation && !invitationError && user.email) {
          // Verify the email matches
          if (invitation.email.toLowerCase() === user.email.toLowerCase()) {
            // Update user profile with invitation data
            const { error: profileUpdateError } = await supabase
              .from('profiles')
              .update({
                organization_id: invitation.organization_id,
                role: invitation.role,
                team_id: invitation.team_id,
                full_name: invitation.full_name || user.user_metadata.full_name || user.email.split('@')[0],
                birth_date: invitation.birth_date,
              })
              .eq('id', user.id)

            if (!profileUpdateError) {
              // Mark invitation as accepted
              await supabase
                .from('invitations')
                .update({
                  status: 'accepted',
                  accepted_at: new Date().toISOString()
                })
                .eq('id', invitation.id)

              console.log('🔐 Invitation processed successfully')
              return NextResponse.redirect(`${origin}/dashboard`)
            } else {
              console.error('🔐 Profile update error:', profileUpdateError)
            }
          } else {
            console.log('🔐 Email mismatch for invitation')
          }
        } else {
          console.log('🔐 Invitation not found or invalid')
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