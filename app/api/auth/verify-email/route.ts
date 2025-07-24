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

    // Create or update user profile using admin client
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: decoded.userId,
        email: decoded.email.toLowerCase(),
        full_name: decoded.full_name,
        role: 'employee', // Default role
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