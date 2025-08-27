#!/usr/bin/env npx tsx

/**
 * One-time script to initialize leave balances for existing workspace owners
 * who created their workspaces before the balance initialization fix.
 * 
 * This script:
 * 1. Finds all workspace owners (users with role='admin' who joined via 'created')
 * 2. Identifies those missing leave balances for balance-required leave types
 * 3. Creates the missing balances using the same logic as new workspace creation
 * 
 * Run with: npx tsx scripts/fix-existing-workspace-owners-balances.ts
 */

import { createAdminClient } from '../lib/supabase/server'

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

async function main() {
  console.log('🚀 Starting workspace owner balance initialization script...')
  
  const supabaseAdmin = createAdminClient()
  const currentYear = new Date().getFullYear()
  
  try {
    // 1. Find all workspace owners (users who created their organizations)
    console.log('📋 Finding workspace owners...')
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
      throw new Error(`Failed to fetch workspace owners: ${ownersError.message}`)
    }
    
    if (!workspaceOwners || workspaceOwners.length === 0) {
      console.log('✅ No workspace owners found that need balance initialization')
      return
    }
    
    console.log(`📊 Found ${workspaceOwners.length} workspace owners to check`)
    
    // Transform data to make TypeScript happy
    const owners: WorkspaceOwner[] = workspaceOwners.map((owner: any) => ({
      user_id: owner.user_id,
      organization_id: owner.organization_id,
      full_name: owner.profiles?.full_name || null,
      email: owner.profiles?.email || 'unknown',
      organization_name: owner.organizations?.name || 'Unknown Organization'
    }))
    
    let totalOwnersProcessed = 0
    let totalBalancesCreated = 0
    
    // Process each workspace owner
    for (const owner of owners) {
      console.log(`\n👤 Processing ${owner.full_name || owner.email} (${owner.organization_name})...`)
      
      // 2. Get leave types for this organization that require balance
      const { data: leaveTypes, error: leaveTypesError } = await supabaseAdmin
        .from('leave_types')
        .select('*')
        .eq('organization_id', owner.organization_id)
        .eq('requires_balance', true)
        .gt('days_per_year', 0)
      
      if (leaveTypesError) {
        console.error(`❌ Failed to fetch leave types for ${owner.organization_name}:`, leaveTypesError.message)
        continue
      }
      
      if (!leaveTypes || leaveTypes.length === 0) {
        console.log(`⚠️  No balance-required leave types found for ${owner.organization_name}`)
        continue
      }
      
      // Filter out child-specific leave types (same logic as workspace creation)
      const balanceRequiredTypes = leaveTypes.filter((lt: LeaveType) => 
        !['maternity', 'paternity', 'childcare'].includes(lt.leave_category)
      )
      
      if (balanceRequiredTypes.length === 0) {
        console.log(`📝 No eligible leave types for balance creation for ${owner.organization_name}`)
        continue
      }
      
      console.log(`🔍 Found ${balanceRequiredTypes.length} eligible leave types`)
      
      // 3. Check which balances already exist
      const { data: existingBalances, error: balancesError } = await supabaseAdmin
        .from('leave_balances')
        .select('user_id, leave_type_id, organization_id')
        .eq('user_id', owner.user_id)
        .eq('organization_id', owner.organization_id)
        .eq('year', currentYear)
      
      if (balancesError) {
        console.error(`❌ Failed to fetch existing balances for ${owner.email}:`, balancesError.message)
        continue
      }
      
      const existingBalanceKeys = new Set(
        (existingBalances || []).map((b: ExistingBalance) => `${b.user_id}-${b.leave_type_id}-${b.organization_id}`)
      )
      
      // 4. Create missing balances
      const missingBalances = balanceRequiredTypes.filter((leaveType: LeaveType) => 
        !existingBalanceKeys.has(`${owner.user_id}-${leaveType.id}-${owner.organization_id}`)
      )
      
      if (missingBalances.length === 0) {
        console.log(`✅ ${owner.full_name || owner.email} already has all required balances`)
        continue
      }
      
      console.log(`🔧 Creating ${missingBalances.length} missing balances for ${owner.full_name || owner.email}`)
      
      const balancesToCreate = missingBalances.map((leaveType: LeaveType) => ({
        user_id: owner.user_id,
        leave_type_id: leaveType.id,
        organization_id: owner.organization_id,
        year: currentYear,
        entitled_days: leaveType.days_per_year,
        used_days: 0
      }))
      
      const { error: insertError } = await supabaseAdmin
        .from('leave_balances')
        .insert(balancesToCreate)
      
      if (insertError) {
        console.error(`❌ Failed to create balances for ${owner.email}:`, insertError.message)
        continue
      }
      
      console.log(`✅ Successfully created ${missingBalances.length} balances for ${owner.full_name || owner.email}`)
      
      // Log details of what was created
      missingBalances.forEach((leaveType: LeaveType) => {
        console.log(`   • ${leaveType.name}: ${leaveType.days_per_year} days`)
      })
      
      totalOwnersProcessed++
      totalBalancesCreated += missingBalances.length
    }
    
    console.log('\n🎉 Migration completed successfully!')
    console.log(`📊 Summary:`)
    console.log(`   • Workspace owners processed: ${totalOwnersProcessed}`)
    console.log(`   • Total balances created: ${totalBalancesCreated}`)
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Unhandled error:', error)
    process.exit(1)
  })
}