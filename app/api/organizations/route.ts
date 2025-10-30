import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { setActiveOrganization } from '@/lib/auth-utils-v2'

export async function POST(request: NextRequest) {
  console.log('🚀 Organization API called')
  try {
    console.log('📝 Parsing request body...')
    const body = await request.json()
    const { name, slug, google_domain, require_google_domain, country_code } = body
    console.log('📝 Request data:', { name, slug, google_domain, require_google_domain, country_code })

    // Get current user from session
    console.log('🔐 Getting user from session...')
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('API: Authentication error:', userError)
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    console.log('API: Creating organization for user:', user.id)
    console.log('API: User email:', user.email)

    // Verify user has a profile (should exist after verification)
    const { data: profile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileCheckError || !profile) {
      console.error('API: User profile not found:', profileCheckError)
      return NextResponse.json({ 
        error: 'User profile not found. Please contact support.',
        user_id: user.id 
      }, { status: 400 })
    }

    console.log('API: User profile found:', profile.full_name, profile.role)

    // SECURITY: Validate slug is unique (prevent conflicts)
    // Check if organization with this slug already exists
    const { data: existingOrg, error: slugCheckError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', slug)
      .maybeSingle()

    if (slugCheckError) {
      console.error('API: Error checking slug:', slugCheckError)
      return NextResponse.json({
        error: 'Failed to validate organization slug'
      }, { status: 500 })
    }

    if (existingOrg) {
      // Check if this user is already a member of this organization
      const { data: userOrg, error: userOrgCheckError } = await supabaseAdmin
        .from('user_organizations')
        .select('organization_id, role')
        .eq('organization_id', existingOrg.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (userOrg) {
        // Organization exists and user is already a member - return existing org (idempotent)
        console.log('✅ Organization already exists for this user, returning existing org')
        return NextResponse.json({
          success: true,
          organization: existingOrg,
          message: 'Organization already exists',
          existing: true
        })
      } else {
        // Organization exists but user is not a member - slug is taken
        console.error('API: Slug already taken by another user:', slug)
        return NextResponse.json({
          error: 'Organization slug is already taken. Please choose a different slug.'
        }, { status: 409 })
      }
    }

    // Create organization with admin client (bypasses RLS)
    // NOTE: Any authenticated user can create an organization and become its admin.
    // This is intentional - organization creation is open to all users.
    console.log('🏢 Creating organization...')
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name,
        slug,
        google_domain: google_domain || null,
        require_google_domain: require_google_domain || false,
        country_code: country_code || 'PL',
      })
      .select()
      .single()

    console.log('🏢 Organization creation result:', { org, orgError })

    if (orgError) {
      console.error('API: Organization creation error:', orgError)
      return NextResponse.json({ error: orgError.message }, { status: 400 })
    }

    console.log('API: Organization created:', org)

    // MULTI-ORG UPDATE: First set all existing organizations as non-default
    const { error: updateDefaultError } = await supabaseAdmin
      .from('user_organizations')
      .update({ is_default: false })
      .eq('user_id', user.id)

    if (updateDefaultError) {
      console.error('API: Error updating existing default organizations:', updateDefaultError)
      return NextResponse.json({ error: updateDefaultError.message }, { status: 400 })
    }

    // Create user_organizations entry with new organization as default
    const { error: userOrgError } = await supabaseAdmin
      .from('user_organizations')
      .insert({
        user_id: user.id,
        organization_id: org.id,
        role: 'admin',
        is_active: true,
        is_default: true,
        joined_via: 'created',
        employment_type: 'full_time'
      })

    if (userOrgError) {
      console.error('API: User organization creation error:', userOrgError)
      return NextResponse.json({ error: userOrgError.message }, { status: 400 })
    }

    // MULTI-ORG UPDATE: Create organization_domains entry if Google domain is provided
    if (google_domain) {
      const { error: domainError } = await supabaseAdmin
        .from('organization_domains')
        .insert({
          organization_id: org.id,
          domain: google_domain,
          domain_type: 'google',
          is_verified: true,
          auto_join_enabled: true,
          default_role: 'employee'
        })

      if (domainError) {
        console.error('API: Organization domain creation error:', domainError)
        // Don't fail - organization is already created
      } else {
        console.log('API: Organization domain created for:', google_domain)
      }
    }

    // Create default leave types
    const { DEFAULT_LEAVE_TYPES } = await import('@/types/leave')
    
    const { data: createdLeaveTypes, error: leaveTypesError } = await supabase
      .from('leave_types')
      .insert(
        DEFAULT_LEAVE_TYPES.map(type => ({
          organization_id: org.id,
          name: type.name,
          days_per_year: type.days_per_year,
          color: type.color,
          requires_approval: type.requires_approval,
          requires_balance: type.requires_balance,
          leave_category: type.leave_category
        }))
      )
      .select()

    if (leaveTypesError) {
      console.error('API: Leave types error:', leaveTypesError)
      // Don't fail - organization is already created
    } else if (createdLeaveTypes && createdLeaveTypes.length > 0) {
      // Create leave balances for the workspace creator
      console.log('💰 Creating leave balances for workspace creator...')
      try {
        // Filter leave types that require balance and have days_per_year > 0
        const balanceRequiredTypes = createdLeaveTypes.filter(lt => 
          lt.requires_balance && 
          lt.days_per_year > 0 &&
          !['maternity', 'paternity', 'childcare'].includes(lt.leave_category)
        )

        if (balanceRequiredTypes.length > 0) {
          const leaveBalances = balanceRequiredTypes.map(leaveType => ({
            user_id: user.id,
            leave_type_id: leaveType.id,
            organization_id: org.id,
            year: new Date().getFullYear(),
            entitled_days: leaveType.days_per_year,
            used_days: 0
          }))

          const { error: balancesError } = await supabaseAdmin
            .from('leave_balances')
            .insert(leaveBalances)

          if (balancesError) {
            console.error('⚠️ Leave balances creation error:', balancesError)
            // Don't fail the process - organization is already created
          } else {
            console.log('✅ Leave balances created for workspace creator')
          }
        } else {
          console.log('📝 No leave types require balance initialization')
        }
      } catch (error) {
        console.error('⚠️ Leave balances setup error:', error)
        // Don't fail the process - organization is already created
      }
    }

    // Set the newly created organization as active
    console.log('🍪 Setting active organization cookie:', org.id)
    await setActiveOrganization(org.id)

    return NextResponse.json({ 
      success: true, 
      organization: org,
      message: 'Organization created successfully'
    })

  } catch (error) {
    console.error('API: Fatal error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 