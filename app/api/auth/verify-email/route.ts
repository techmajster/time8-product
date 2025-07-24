import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import jwt from 'jsonwebtoken'
import { redirect } from 'next/navigation'

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
      return NextResponse.redirect(new URL('/login?error=missing_token', request.url))
    }

    // Validate JWT secret exists
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.error('JWT_SECRET environment variable is not set')
      return NextResponse.redirect(new URL('/login?error=server_error', request.url))
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

    // Create or update user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: decoded.userId,
        email: decoded.email.toLowerCase(),
        full_name: decoded.full_name,
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

    // Sign in the user automatically using admin client
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: decoded.email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/onboarding`
      }
    })

    if (sessionError) {
      console.error('Failed to create session:', sessionError)
      // Redirect to login with success message
      return NextResponse.redirect(new URL('/login?verified=true', request.url))
    }

    // Redirect to the magic link URL which will auto-login and redirect to onboarding
    return NextResponse.redirect(sessionData.properties.action_link)

  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.redirect(new URL('/login?error=verification_failed', request.url))
  }
} 