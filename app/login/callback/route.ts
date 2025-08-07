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
        
        // MULTI-ORG UPDATE: Check organization_domains instead of organizations.google_domain
        let matchingDomains: any[] = []
        if (emailDomain) {
          const { data: domainMatches } = await supabase
            .from('organization_domains')
            .select(`
              id,
              organization_id,
              domain,
              domain_type,
              auto_join_enabled,
              default_role,
              default_team_id,
              organization:organizations(id, name, slug)
            `)
            .eq('domain', emailDomain)
            .eq('is_verified', true)
            .eq('auto_join_enabled', true)
          
          if (domainMatches && domainMatches.length > 0) {
            matchingDomains = domainMatches
            console.log('🔐 Found matching domains for auto-join:', matchingDomains.length)
          }
        }
        
        console.log('🔐 Creating new profile:', { 
          userId: user.id, 
          email: user.email, 
          matchingDomains: matchingDomains.length
        })
        
        // MULTI-ORG UPDATE: Create profile without organization_id assignment
        const { error: insertError } = await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata.full_name || user.email.split('@')[0],
          auth_provider: authProvider,
          // REMOVED: organization_id and role assignment (now handled by user_organizations)
        })

        if (insertError) {
          console.error('🔐 Profile creation error:', insertError)
        } else {
          // MULTI-ORG UPDATE: Create user_organizations entries for auto-join domains
          for (const [index, domain] of matchingDomains.entries()) {
            const isDefault = index === 0 // First match becomes default
            
            const { error: userOrgError } = await supabase
              .from('user_organizations')
              .insert({
                user_id: user.id,
                organization_id: domain.organization_id,
                role: domain.default_role || 'employee',
                team_id: domain.default_team_id,
                is_active: true,
                is_default: isDefault,
                joined_via: isGoogleUser ? 'google_domain' : 'invitation',
                employment_type: 'full_time' // Default for auto-join
              })
            
            if (userOrgError) {
              console.error('🔐 User organization creation error:', userOrgError)
            } else {
              console.log(`🔐 Created user_organizations entry (default: ${isDefault})`)
            }
          }
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
            // MULTI-ORG UPDATE: Create user_organizations entry instead of updating profile
            const { error: userOrgError } = await supabase
              .from('user_organizations')
              .upsert({
                user_id: user.id,
                organization_id: invitation.organization_id,
                role: invitation.role,
                team_id: invitation.team_id,
                is_active: true,
                is_default: true, // Invited organizations become default
                joined_via: 'invitation',
                employment_type: 'full_time' // Default for invitations
              }, {
                onConflict: 'user_id,organization_id'
              })

            // Also update profile with additional invitation data if needed
            const profileUpdateData: any = {}
            if (invitation.full_name && invitation.full_name !== user.user_metadata.full_name) {
              profileUpdateData.full_name = invitation.full_name
            }
            if (invitation.birth_date) {
              profileUpdateData.birth_date = invitation.birth_date
            }
            
            if (Object.keys(profileUpdateData).length > 0) {
              await supabase
                .from('profiles')
                .update(profileUpdateData)
              .eq('id', user.id)
            }

            if (!userOrgError) {
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
              console.error('🔐 User organization creation error:', userOrgError)
            }
          } else {
            console.log('🔐 Email mismatch for invitation')
          }
        } else {
          console.log('🔐 Invitation not found or invalid')
        }
      }

      // MULTI-ORG UPDATE: Check if user has any organization memberships
      else if (profile && user.email) {
        const { data: userOrgs } = await supabase
          .from('user_organizations')
          .select('organization_id, is_default')
          .eq('user_id', user.id)
          .eq('is_active', true)

        // If no organization memberships, check for auto-join opportunities
        if (!userOrgs || userOrgs.length === 0) {
        const authProvider = user.app_metadata.provider || 'email'
        const emailDomain = user.email.split('@')[1]
        const isGoogleUser = authProvider === 'google'
        
          if (emailDomain) {
            const { data: domainMatches } = await supabase
              .from('organization_domains')
              .select(`
                id,
                organization_id,
                domain,
                domain_type,
                auto_join_enabled,
                default_role,
                default_team_id,
                organization:organizations(id, name, slug)
              `)
              .eq('domain', emailDomain)
              .eq('is_verified', true)
              .eq('auto_join_enabled', true)
          
            if (domainMatches && domainMatches.length > 0) {
              // Create user_organizations entries for auto-join
              for (const [index, domain] of domainMatches.entries()) {
                const isDefault = index === 0 // First match becomes default
                
            await supabase
                  .from('user_organizations')
                  .insert({
                    user_id: user.id,
                    organization_id: domain.organization_id,
                    role: domain.default_role || 'employee',
                    team_id: domain.default_team_id,
                    is_active: true,
                    is_default: isDefault,
                    joined_via: isGoogleUser ? 'google_domain' : 'invitation',
                    employment_type: 'full_time'
              })
                 
                 console.log(`🔐 Auto-joined user to organization (default: ${isDefault})`)
              }
            }
          }
        }
      }

      // MULTI-ORG UPDATE: Determine redirect based on user_organizations instead of profile.organization_id
      const { data: userOrgs } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)

      const hasOrganization = userOrgs && userOrgs.length > 0
      const finalRedirect = hasOrganization ? '/dashboard' : '/onboarding'
      console.log('🔐 Redirecting to:', finalRedirect, 'hasOrganization:', hasOrganization)
      
      return NextResponse.redirect(`${origin}${finalRedirect}`)
    } else {
      console.error('🔐 Auth exchange failed:', error)
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }
  }

  console.log('🔐 No code provided, redirecting to login')
  return NextResponse.redirect(`${origin}/login?error=no_code`)
} 