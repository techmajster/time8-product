import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { DEFAULT_LEAVE_TYPES } from '@/types/leave'
import { authenticateAndGetOrgContext } from '@/lib/auth-utils-v2'

export async function POST() {
  try {
    const supabase = await createClient()
    
    // Use optimized auth utility
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) return auth.error
    const { context } = auth
    const { organization, role } = context
    const organizationId = organization.id

    // Check if user is admin
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Check if default leave types already exist
    const { data: existingTypes, error: checkError } = await supabase
      .from('leave_types')
      .select('id, name')
      .eq('organization_id', organizationId)

    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 400 })
    }

    // Instead of failing if types exist, check which ones are missing
    const existingNames = existingTypes?.map(t => t.name) || []
    const missingTypes = DEFAULT_LEAVE_TYPES.filter(defaultType => 
      !existingNames.includes(defaultType.name)
    )

    if (missingTypes.length === 0) {
      return NextResponse.json({ 
        message: 'All default leave types already exist for this organization.',
        existing: existingNames
      })
    }

    // Create only the missing leave types
    const { data: createdTypes, error: createError } = await supabase
      .from('leave_types')
      .insert(
        missingTypes.map(type => ({
          organization_id: organizationId,
          name: type.name,
          days_per_year: type.days_per_year,
          color: type.color,
          requires_approval: type.requires_approval,
          requires_balance: type.requires_balance,
          leave_category: type.leave_category
        }))
      )
      .select()

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    // Create leave balances for all users for leave types that require balance tracking
    // Exclude child-specific leave types that should be manually assigned
    const balanceRequiredTypes = createdTypes?.filter(lt => 
      lt.requires_balance && 
      lt.days_per_year > 0 && 
      !['maternity', 'paternity', 'childcare'].includes(lt.leave_category)
    ) || []
    
    if (balanceRequiredTypes.length > 0) {
      // Get all users in the organization via user_organizations (multi-org approach)
      const { data: userOrgs, error: usersError } = await supabase
        .from('user_organizations')
        .select('user_id')
        .eq('organization_id', organizationId)
        .eq('is_active', true)

      if (usersError) {
        console.warn('Could not fetch users for balance creation:', usersError)
      } else if (userOrgs && userOrgs.length > 0) {
        // Create leave balances for all users
        const leaveBalances = userOrgs.flatMap(userOrg => 
          balanceRequiredTypes.map(leaveType => ({
            user_id: userOrg.user_id,
            leave_type_id: leaveType.id,
            organization_id: organizationId,
            year: new Date().getFullYear(),
            entitled_days: leaveType.days_per_year,
            used_days: 0
          }))
        )

        console.log('💰 Creating leave balances for existing users:', {
          userCount: userOrgs.length,
          leaveTypeCount: balanceRequiredTypes.length,
          totalBalances: leaveBalances.length
        })

        const { error: balancesError } = await supabase
          .from('leave_balances')
          .insert(leaveBalances)

        if (balancesError) {
          console.warn('Could not create leave balances:', balancesError)
          // Don't fail the request, just log the warning
        } else {
          console.log('✅ Leave balances created for existing users')
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Created ${createdTypes?.length || 0} missing leave types: ${missingTypes.map(t => t.name).join(', ')}`,
      created: createdTypes?.map(t => t.name),
      data: createdTypes 
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 