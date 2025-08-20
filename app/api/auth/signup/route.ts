import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmailVerification } from '@/lib/email'
import jwt from 'jsonwebtoken'
import type { User } from '@supabase/supabase-js'

interface SignupRequest {
  email: string
  password: string
  full_name: string
}

export async function POST(request: NextRequest) {
  console.log('🚀 Signup API called')
  try {
    const { email, password, full_name }: SignupRequest = await request.json()
    console.log('📝 Signup request for:', email)

    // Validate input
    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // First, check if there's a pending invitation for this email
    console.log('🎫 Checking for pending invitations for:', email)
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select('id, token, email, status, expires_at')
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .single()

    // If user has pending invitation, we'll create account and accept invitation automatically
    // (they already provided name, email, password - no need to redirect to invitation page)

    // Check if user already exists using admin client
    const { data: existingUsers, error: checkError } = await supabase.auth.admin.listUsers()
    
    if (checkError) {
      console.error('Error checking existing users:', checkError)
      return NextResponse.json(
        { error: 'Failed to validate user' },
        { status: 500 }
      )
    }

    console.log('🔍 Checking for existing user:', email)
    console.log('📝 Found users:', existingUsers.users.map(u => u.email))

    const existingUser = existingUsers.users.find((user: User) => 
      user.email?.toLowerCase() === email.toLowerCase()
    )

    console.log('🎯 Existing user found:', existingUser ? 'YES' : 'NO')

    if (existingUser) {
      if (existingUser.email_confirmed_at) {
        return NextResponse.json(
          { error: 'Account with this email already exists' },
          { status: 400 }
        )
      } else {
        return NextResponse.json(
          { error: 'Account exists but email not confirmed. Please check your email for verification link.' },
          { status: 400 }
        )
      }
    }

    console.log('🔐 Creating new user:', { email, full_name })

    // Create user with Supabase (email_confirmed_at will be null by default)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      user_metadata: {
        full_name
      },
      email_confirm: false // Don't send Supabase's confirmation email
    })

    if (authError) {
      console.error('Supabase user creation error:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    console.log('✅ User created successfully:', authData.user.id)

    // Validate JWT secret exists
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.error('JWT_SECRET environment variable is not set')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Create verification token (JWT with 24h expiration)
    const verificationToken = jwt.sign(
      {
        userId: authData.user.id,
        email: email.toLowerCase(),
        full_name,
        type: 'email_verification'
      },
      jwtSecret,
      { expiresIn: '24h' }
    )

    // Send custom verification email
    console.log('📧 Sending verification email to:', email)
    const emailResult = await sendEmailVerification({
      to: email.toLowerCase(),
      full_name,
      verification_token: verificationToken
    })

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error)
      // Don't fail the whole process - user is created, just log the email issue
      // In production, you might want to queue this for retry
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please check your email to verify your account.',
      user_id: authData.user.id,
      email_sent: emailResult.success,
      email_message_id: emailResult.messageId
    })

  } catch (error) {
    console.error('❌ Signup error:', error)
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack available')
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 