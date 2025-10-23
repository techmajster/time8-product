import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { authenticateAndGetOrgContext, requireRole } from '@/lib/auth-utils-v2'

interface WorkspaceOwner {
  user_id: string
  organization_id: string
  full_name: string | null
  email: string
  organization_name: string
}

interface LeaveType {
  id: string
  name: string
  days_per_year: number
  requires_balance: boolean
  leave_category: string
  organization_id: string
}

interface ExistingBalance {
  user_id: string
  leave_type_id: string
  organization_id: string
}

export async function POST(request: NextRequest) {
  console.log('🚀 Workspace owner balance fix API called')

  try {
    // SECURITY FIX: Use proper multi-workspace authentication with admin check
    const auth = await authenticateAndGetOrgContext()
    if (!auth.success) {
      return auth.error
    }

    const { context } = auth
    const { role, organization } = context

    // Only admins can run this utility
    const roleCheck = requireRole(context, ['admin'])
    if (roleCheck) {
      return roleCheck
    }

    console.log(`✅ Admin ${context.user.email} running balance fix for organization: ${organization.name}`)

    const supabaseAdmin = createAdminClient()
    const currentYear = new Date().getFullYear()

    // Parse request body for options
    const body = await request.json().catch(() => ({}))
    const { dryRun = true } = body

    console.log('📋 Finding workspace owners...')
    
    // 1. Find all workspace owners (users who created their organizations)
    const { data: workspaceOwners, error: ownersError } = await supabaseAdmin
      .from('user_organizations')
      .select(`
        user_id,
        organization_id,
        profiles!inner(full_name, email),
        organizations!inner(name)
      `)
      .eq('role', 'admin')
      .eq('joined_via', 'created')
      .eq('is_active', true)
    
    if (ownersError) {
      console.error('Failed to fetch workspace owners:', ownersError)
      return NextResponse.json({ error: ownersError.message }, { status: 500 })
    }
    
    if (!workspaceOwners || workspaceOwners.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'No workspace owners found that need balance initialization',
        results: {
          ownersProcessed: 0,
          balancesCreated: 0,
          details: []
        }
      })
    }
    
    console.log(`📊 Found ${workspaceOwners.length} workspace owners to check`)
    
    // Transform data for processing
    const owners: WorkspaceOwner[] = workspaceOwners.map((owner: any) => ({
      user_id: owner.user_id,
      organization_id: owner.organization_id,
      full_name: owner.profiles?.full_name || null,
      email: owner.profiles?.email || 'unknown',
      organization_name: owner.organizations?.name || 'Unknown Organization'
    }))
    
    let totalOwnersProcessed = 0
    let totalBalancesCreated = 0
    const results = []
    
    // Process each workspace owner
    for (const owner of owners) {
      console.log(`\n👤 Processing ${owner.full_name || owner.email} (${owner.organization_name})...`)
      
      const ownerResult = {
        owner_name: owner.full_name || owner.email,
        owner_email: owner.email,
        organization_name: owner.organization_name,
        balances_created: [],
        already_had_balances: [],
        errors: []
      }
      
      try {
        // 2. Get leave types for this organization that require balance
        const { data: leaveTypes, error: leaveTypesError } = await supabaseAdmin
          .from('leave_types')
          .select('*')
          .eq('organization_id', owner.organization_id)
          .eq('requires_balance', true)
          .gt('days_per_year', 0)
        
        if (leaveTypesError) {
          ownerResult.errors.push(`Failed to fetch leave types: ${leaveTypesError.message}`)
          results.push(ownerResult)
          continue
        }
        
        if (!leaveTypes || leaveTypes.length === 0) {
          ownerResult.errors.push('No balance-required leave types found')
          results.push(ownerResult)
          continue
        }
        
        // Filter out child-specific leave types (same logic as workspace creation)
        const balanceRequiredTypes = leaveTypes.filter((lt: LeaveType) => 
          !['maternity', 'paternity', 'childcare'].includes(lt.leave_category)
        )
        
        if (balanceRequiredTypes.length === 0) {
          ownerResult.errors.push('No eligible leave types for balance creation')
          results.push(ownerResult)
          continue
        }
        
        console.log(`🔍 Found ${balanceRequiredTypes.length} eligible leave types`)
        
        // 3. Check which balances already exist
        const { data: existingBalances, error: balancesError } = await supabaseAdmin
          .from('leave_balances')
          .select('user_id, leave_type_id, organization_id, leave_types!inner(name)')
          .eq('user_id', owner.user_id)
          .eq('organization_id', owner.organization_id)
          .eq('year', currentYear)
        
        if (balancesError) {
          ownerResult.errors.push(`Failed to fetch existing balances: ${balancesError.message}`)
          results.push(ownerResult)
          continue
        }
        
        const existingBalanceKeys = new Set(
          (existingBalances || []).map((b: any) => `${b.user_id}-${b.leave_type_id}-${b.organization_id}`)
        )
        
        // Track existing balances
        (existingBalances || []).forEach((balance: any) => {
          ownerResult.already_had_balances.push({
            leave_type_name: balance.leave_types?.name || 'Unknown',
            leave_type_id: balance.leave_type_id
          })
        })
        
        // 4. Create missing balances
        const missingBalances = balanceRequiredTypes.filter((leaveType: LeaveType) => 
          !existingBalanceKeys.has(`${owner.user_id}-${leaveType.id}-${owner.organization_id}`)
        )
        
        if (missingBalances.length === 0) {
          console.log(`✅ ${owner.full_name || owner.email} already has all required balances`)
          results.push(ownerResult)
          continue
        }
        
        console.log(`🔧 ${dryRun ? 'Would create' : 'Creating'} ${missingBalances.length} missing balances for ${owner.full_name || owner.email}`)
        
        const balancesToCreate = missingBalances.map((leaveType: LeaveType) => ({
          user_id: owner.user_id,
          leave_type_id: leaveType.id,
          organization_id: owner.organization_id,
          year: currentYear,
          entitled_days: leaveType.days_per_year,
          used_days: 0
        }))
        
        // Track what would be/was created
        missingBalances.forEach((leaveType: LeaveType) => {
          ownerResult.balances_created.push({
            leave_type_name: leaveType.name,
            days_per_year: leaveType.days_per_year
          })
        })
        
        if (!dryRun) {
          const { error: insertError } = await supabaseAdmin
            .from('leave_balances')
            .insert(balancesToCreate)
          
          if (insertError) {
            ownerResult.errors.push(`Failed to create balances: ${insertError.message}`)
            results.push(ownerResult)
            continue
          }
          
          console.log(`✅ Successfully created ${missingBalances.length} balances for ${owner.full_name || owner.email}`)
        }
        
        totalOwnersProcessed++
        totalBalancesCreated += missingBalances.length
        
      } catch (error) {
        ownerResult.errors.push(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      
      results.push(ownerResult)
    }
    
    console.log('\n🎉 Migration completed successfully!')
    console.log(`📊 Summary:`)
    console.log(`   • Workspace owners processed: ${totalOwnersProcessed}`)
    console.log(`   • Total balances ${dryRun ? 'that would be ' : ''}created: ${totalBalancesCreated}`)
    
    return NextResponse.json({
      success: true,
      message: `${dryRun ? 'Dry run completed' : 'Migration completed'} successfully`,
      results: {
        dryRun,
        ownersProcessed: totalOwnersProcessed,
        balancesCreated: totalBalancesCreated,
        totalOwnersFound: owners.length,
        details: results
      }
    })
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}