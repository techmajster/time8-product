#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase configuration. Please check your .env.local file.');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSqlScript() {
  try {
    console.log('🔍 Checking current user profile...');
    
    // First, check current user data
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('email', 'szymon.rajca@bb8.pl');
    
    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      return;
    }
    
    if (!profiles || profiles.length === 0) {
      console.error('❌ User with email szymon.rajca@bb8.pl not found');
      return;
    }
    
    const user = profiles[0];
    console.log('✅ Current user profile:', user);
    
    // Check user organizations
    console.log('\n🏢 Checking user organizations...');
    const { data: userOrgs, error: orgError } = await supabase
      .from('user_organizations')
      .select(`
        user_id, organization_id, role, joined_via, is_active,
        organizations!inner(name)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true);
    
    if (orgError) {
      console.error('❌ Error fetching organizations:', orgError);
      return;
    }
    
    console.log('✅ User organizations:', userOrgs);
    
    if (!userOrgs || userOrgs.length === 0) {
      console.error('❌ No active organizations found for user');
      return;
    }
    
    const adminOrg = userOrgs.find(org => org.role === 'admin');
    if (!adminOrg) {
      console.error('❌ User is not an admin in any organization');
      return;
    }
    
    console.log('✅ Admin organization found:', adminOrg);
    
    // Check current leave balances
    console.log('\n📊 Checking current leave balances...');
    const currentYear = new Date().getFullYear();
    const { data: currentBalances, error: balanceError } = await supabase
      .from('leave_balances')
      .select(`
        *,
        leave_types!inner(name, days_per_year)
      `)
      .eq('user_id', user.id)
      .eq('year', currentYear);
    
    if (balanceError) {
      console.error('❌ Error fetching current balances:', balanceError);
    } else {
      console.log('✅ Current leave balances:', currentBalances);
    }
    
    // Get available leave types for the organization
    console.log('\n📝 Checking available leave types...');
    const { data: leaveTypes, error: leaveTypeError } = await supabase
      .from('leave_types')
      .select('id, name, days_per_year, requires_balance, leave_category')
      .eq('organization_id', adminOrg.organization_id)
      .eq('requires_balance', true)
      .gt('days_per_year', 0)
      .not('leave_category', 'in', '(maternity,paternity,childcare)')
      .order('name');
    
    if (leaveTypeError) {
      console.error('❌ Error fetching leave types:', leaveTypeError);
      return;
    }
    
    console.log('✅ Available leave types:', leaveTypes);
    
    if (!leaveTypes || leaveTypes.length === 0) {
      console.log('ℹ️  No eligible leave types found');
      return;
    }
    
    // Create missing balances
    console.log('\n🔧 Creating missing leave balances...');
    let balancesCreated = 0;
    
    for (const leaveType of leaveTypes) {
      // Check if balance already exists
      const { data: existingBalance } = await supabase
        .from('leave_balances')
        .select('id')
        .eq('user_id', user.id)
        .eq('leave_type_id', leaveType.id)
        .eq('organization_id', adminOrg.organization_id)
        .eq('year', currentYear)
        .single();
      
      if (existingBalance) {
        console.log(`⏭️  Balance already exists for ${leaveType.name}`);
        continue;
      }
      
      // Create new balance (don't include remaining_days as it's a computed column)
      const { data: newBalance, error: insertError } = await supabase
        .from('leave_balances')
        .insert({
          user_id: user.id,
          leave_type_id: leaveType.id,
          organization_id: adminOrg.organization_id,
          year: currentYear,
          entitled_days: leaveType.days_per_year,
          used_days: 0
        })
        .select();
      
      if (insertError) {
        console.error(`❌ Error creating balance for ${leaveType.name}:`, insertError);
      } else {
        console.log(`✅ Created balance for ${leaveType.name}: ${leaveType.days_per_year} days`);
        balancesCreated++;
      }
    }
    
    console.log(`\n🎉 Total balances created: ${balancesCreated}`);
    
    // Verify final balances
    console.log('\n✅ Final verification - all balances:');
    const { data: finalBalances, error: finalError } = await supabase
      .from('leave_balances')
      .select(`
        entitled_days, used_days, remaining_days,
        leave_types!inner(name)
      `)
      .eq('user_id', user.id)
      .eq('year', currentYear)
      .order('leave_types(name)');
    
    if (finalError) {
      console.error('❌ Error fetching final balances:', finalError);
    } else {
      console.table(finalBalances.map(b => ({
        'Leave Type': b.leave_types.name,
        'Entitled': b.entitled_days,
        'Used': b.used_days,
        'Remaining': b.remaining_days
      })));
    }
    
    console.log('\n🎯 Script completed successfully!');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  }
}

// Execute the script
executeSqlScript();