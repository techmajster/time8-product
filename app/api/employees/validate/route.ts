import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { authenticateAndGetOrgContext } from '@/lib/auth-utils-v2'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Validation endpoint called')
    
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Authenticate and get organization context
    const auth = await authenticateAndGetOrgContext()
    
    if (!auth.success) {
      return auth.error
    }

    const { context } = auth
    const { organization } = context
    const organizationId = organization.id

    // Get admin client for database operations
    const supabaseAdmin = createAdminClient()
    
    console.log(`🔍 Validating email: ${email} for organization: ${organizationId}`)

    const validationResult = {
      email,
      organizationId,
      organizationName: organization.name,
      checks: {
        emailFormat: true,
        domainValidation: { passed: true, required: false, message: '' },
        existingUser: { exists: false, message: '' },
        existingInvitation: { exists: false, message: '' }
      },
      canInvite: true,
      blockers: []
    }

    // 1. Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      validationResult.checks.emailFormat = false
      validationResult.canInvite = false
      validationResult.blockers.push('Invalid email format')
    }

    // 2. Check domain validation
    if (organization.require_google_domain && organization.google_domain) {
      const emailDomain = email.toLowerCase().split('@')[1]
      const requiredDomain = organization.google_domain.toLowerCase()
      
      validationResult.checks.domainValidation.required = true
      
      if (emailDomain !== requiredDomain) {
        validationResult.checks.domainValidation.passed = false
        validationResult.checks.domainValidation.message = `Email domain must be @${requiredDomain}`
        validationResult.canInvite = false
        validationResult.blockers.push(`Domain must be @${requiredDomain}`)
      } else {
        validationResult.checks.domainValidation.message = `Domain @${requiredDomain} is valid`
      }
    }

    // 3. Check if user already exists in this organization
    try {
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .single()

      if (existingProfile) {
        const { data: existingUser } = await supabaseAdmin
          .from('user_organizations')
          .select('user_id, role')
          .eq('organization_id', organizationId)
          .eq('user_id', existingProfile.id)
          .single()

        if (existingUser) {
          validationResult.checks.existingUser.exists = true
          validationResult.checks.existingUser.message = `User already exists in organization with role: ${existingUser.role}`
          validationResult.canInvite = false
          validationResult.blockers.push('User already exists in organization')
        }
      }
    } catch (error) {
      console.log('🔍 No existing user found (this is good)')
    }

    // 4. Check for existing pending invitation
    try {
      const { data: existingInvitation } = await supabaseAdmin
        .from('invitations')
        .select('id, status, created_at, expires_at')
        .eq('email', email.toLowerCase())
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .single()

      if (existingInvitation) {
        validationResult.checks.existingInvitation.exists = true
        validationResult.checks.existingInvitation.message = `Pending invitation exists (created: ${existingInvitation.created_at})`
        validationResult.canInvite = false
        validationResult.blockers.push('Pending invitation already exists')
      }
    } catch (error) {
      console.log('🔍 No existing invitation found (this is good)')
    }

    console.log('✅ Validation completed:', validationResult)

    return NextResponse.json(validationResult)

  } catch (error) {
    console.error('❌ Validation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}