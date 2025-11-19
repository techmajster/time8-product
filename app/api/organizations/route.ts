import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { setActiveOrganization } from '@/lib/auth-utils-v2'

export async function POST(request: NextRequest) {
  console.log('🚀 Organization API called')
  try {
    console.log('📝 Parsing request body...')
    const body = await request.json()
    const { name, country_code } = body
    console.log('📝 Request data:', { name, country_code })

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

    // Create organization with admin client (bypasses RLS)
    // NOTE: Any authenticated user can create an organization and become its admin.
    // This is intentional - organization creation is open to all users.
    console.log('🏢 Creating organization...')
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name,
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

    // Create ONLY the 2 mandatory leave types for new workspaces
    // (Urlop wypoczynkowy and Urlop bezpłatny)
    // Other Polish law templates (11 more types) can be added via "Create default leave types" button
    const { DEFAULT_LEAVE_TYPES } = await import('@/types/leave')

    // Filter for ONLY the 2 mandatory types based on spec criteria
    const mandatoryTypes = DEFAULT_LEAVE_TYPES.filter(type =>
      (type.leave_category === 'annual' && type.name.includes('wypoczynkowy')) ||
      (type.leave_category === 'unpaid' && type.name.includes('bezpłatny'))
    )

    const { data: createdLeaveTypes, error: leaveTypesError } = await supabaseAdmin
      .from('leave_types')
      .insert(
        mandatoryTypes.map(type => ({
          organization_id: org.id,
          name: type.name,
          days_per_year: type.days_per_year,
          color: type.color,
          requires_approval: type.requires_approval,
          requires_balance: type.requires_balance,
          is_paid: type.is_paid,  // Include whether the leave type is paid
          leave_category: type.leave_category,
          is_mandatory: true  // Mark as mandatory so they cannot be deleted
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