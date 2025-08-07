import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import jwt from 'jsonwebtoken'
import { redirect } from 'next/navigation'
import { getAppUrl } from '@/lib/utils'

interface VerificationTokenPayload {
  userId: string
  email: string
  full_name: string
  type: string
}

export async function GET(request: NextRequest) {
  console.log('🚀 Verification endpoint called!', request.url)
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    console.log('🎫 Token received:', token ? 'YES' : 'NO')

    if (!token) {
      return NextResponse.redirect(new URL('/login?error=missing_token&mode=signup', request.url))
    }

    // Validate JWT secret exists
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.error('JWT_SECRET environment variable is not set')
      return NextResponse.redirect(new URL('/login?error=server_error&mode=signup', request.url))
    }

    // Verify and decode the token
    let decoded: VerificationTokenPayload
    try {
      decoded = jwt.verify(token, jwtSecret) as VerificationTokenPayload
    } catch (error) {
      console.error('Invalid or expired token:', error)
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url))
    }

    // Validate token type
    if (decoded.type !== 'email_verification') {
      console.error('Invalid token type:', decoded.type)
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url))
    }

    console.log('✅ Token verified for user:', decoded.userId, decoded.email)

    const supabase = createAdminClient()

    // First, let's check if the user exists and get their current state
    const { data: userData, error: getUserError } = await supabase.auth.admin.getUserById(decoded.userId)
    
    if (getUserError || !userData.user) {
      console.error('User not found during verification:', getUserError)
      return NextResponse.redirect(new URL('/login?error=user_not_found', request.url))
    }

    console.log('📋 User found:', userData.user.email, 'confirmed:', userData.user.email_confirmed_at)

    // Update the user's email_confirmed_at timestamp
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      decoded.userId,
      {
        email_confirm: true
      }
    )

    if (updateError) {
      console.error('Failed to confirm user email:', updateError)
      return NextResponse.redirect(new URL('/login?error=confirmation_failed', request.url))
    }

    console.log('✅ Email confirmed for user:', decoded.userId)
    console.log('📋 Update result:', updateData)

    // Double-check the user's confirmation status
    const { data: verifiedUserData, error: verifyError } = await supabase.auth.admin.getUserById(decoded.userId)
    if (verifiedUserData?.user) {
      console.log('🔍 User confirmation status after update:', {
        email: verifiedUserData.user.email,
        email_confirmed_at: verifiedUserData.user.email_confirmed_at,
        confirmed: !!verifiedUserData.user.email_confirmed_at
      })
    }

    // MULTI-ORG UPDATE: Create profile without organization assignment
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: decoded.userId,
        email: decoded.email.toLowerCase(),
        full_name: decoded.full_name,
        // REMOVED: role assignment (now handled by user_organizations)
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      console.error('Failed to create/update profile:', profileError)
      // Don't fail the verification - profile can be created later
    } else {
      console.log('✅ Profile created/updated for user:', decoded.userId)
    }

    // MULTI-ORG UPDATE: Check for pending invitations or domain matches after email verification
    const emailDomain = decoded.email.split('@')[1]
    
    // 1. Check for pending invitations first (highest priority)
    const { data: pendingInvitations } = await supabase
      .from('invitations')
      .select(`
        id,
        organization_id,
        role,
        team_id,
        status,
        expires_at,
        organization:organizations(id, name, slug)
      `)
      .eq('email', decoded.email.toLowerCase())
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())

    if (pendingInvitations && pendingInvitations.length > 0) {
      console.log('📧 Found pending invitations for verified user:', pendingInvitations.length)
      
      // Auto-accept the first valid invitation
      const invitation = pendingInvitations[0]
      
      // Create user_organizations entry
      const { error: userOrgError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: decoded.userId,
          organization_id: invitation.organization_id,
          role: invitation.role,
          team_id: invitation.team_id,
          is_active: true,
          is_default: true, // First organization becomes default
          joined_via: 'invitation',
          employment_type: 'full_time'
        })

      if (!userOrgError) {
        // Mark invitation as accepted
        await supabase
          .from('invitations')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString()
          })
          .eq('id', invitation.id)

        console.log('✅ Auto-accepted invitation after email verification')
      } else {
        console.error('❌ Failed to create user organization from invitation:', userOrgError)
      }
    }

    // 2. If no invitations, check for domain-based auto-join
    else if (emailDomain) {
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
        console.log('🏢 Found domain matches for auto-join:', domainMatches.length)
        
        // Create user_organizations entries for all matching domains
        for (const [index, domain] of domainMatches.entries()) {
          const isDefault = index === 0 // First match becomes default
          
          const { error: userOrgError } = await supabase
            .from('user_organizations')
            .insert({
              user_id: decoded.userId,
              organization_id: domain.organization_id,
              role: domain.default_role || 'employee',
              team_id: domain.default_team_id,
              is_active: true,
              is_default: isDefault,
              joined_via: 'google_domain',
              employment_type: 'full_time'
            })

          if (!userOrgError) {
            console.log(`✅ Auto-joined to organization (default: ${isDefault})`)
          } else {
            console.error('❌ Failed to create domain-based organization membership:', userOrgError)
          }
        }
      } else {
        console.log('ℹ️ No domain matches found for auto-join')
      }
    }

    // Redirect to login with verification success
    const baseUrl = getAppUrl(request)
    const redirectUrl = `${baseUrl}/login?verified=true&email=${encodeURIComponent(decoded.email)}`
    
    console.log('🔗 Redirecting to login with verification success:', redirectUrl)
    
    // Set a cookie to indicate email was just verified
    const response = NextResponse.redirect(redirectUrl)
    response.cookies.set('email_verified', 'true', {
      httpOnly: false, // Allow client-side access
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300 // 5 minutes
    })
    response.cookies.set('verified_email', decoded.email, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300 // 5 minutes
    })
    
    console.log('🔗 Redirecting to login with verification cookies set')
    return response

  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.redirect(new URL('/login?error=verification_failed&mode=signup', request.url))
  }
} 