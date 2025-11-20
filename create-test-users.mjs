import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestUsers() {
  // Get test_lemoniady organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('name', 'test_lemoniady')
    .single();

  if (orgError || !org) {
    console.error('Organization not found:', orgError);
    return;
  }

  console.log('🏢 Organization:', org.name, '(' + org.id + ')');

  // Get admin user (szymon.rajca@bb8.pl) to set as invited_by
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', 'szymon.rajca@bb8.pl')
    .single();

  if (!adminProfile) {
    console.error('Admin user not found');
    return;
  }

  // Test users to create
  const testUsers = [
    {
      email: 'test.user1@example.com',
      full_name: 'Test User 1',
      role: 'employee'
    },
    {
      email: 'test.user2@example.com',
      full_name: 'Test User 2',
      role: 'employee'
    },
    {
      email: 'test.user3@example.com',
      full_name: 'Test User 3',
      role: 'manager'
    },
    {
      email: 'test.user4@example.com',
      full_name: 'Test User 4',
      role: 'employee'
    }
  ];

  console.log('\n👥 Creating 4 test users...\n');

  for (const user of testUsers) {
    // 1. Check if auth user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === user.email);

    let authUserId;

    if (existingUser) {
      console.log(`ℹ️  Auth user already exists: ${user.email}`);
      authUserId = existingUser.id;
    } else {
      // Create auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: 'TestPassword123!',
        email_confirm: true,
        user_metadata: {
          full_name: user.full_name
        }
      });

      if (authError) {
        console.error(`❌ Failed to create auth user for ${user.email}:`, authError.message);
        continue;
      }

      console.log(`✅ Created auth user: ${user.email}`);
      authUserId = authUser.user.id;
    }

    // 2. Profile should exist by now
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for trigger

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', user.email)
      .single();

    if (profileError || !profile) {
      console.error(`❌ Profile not found for ${user.email}`);
      continue;
    }

    console.log(`✅ Profile found: ${profile.id}`);

    // 3. Create user_organizations record
    const { error: userOrgError } = await supabase
      .from('user_organizations')
      .insert({
        user_id: authUserId,
        organization_id: org.id,
        role: user.role,
        team_id: null,
        is_active: true,
        is_default: false,
        joined_via: 'invitation',
        employment_type: 'full_time',
        status: 'active'
      });

    if (userOrgError) {
      console.error(`❌ Failed to create user_organizations for ${user.email}:`, userOrgError.message);
      continue;
    }

    console.log(`✅ Added to organization as ${user.role}`);

    // 4. Create leave balances
    const { data: leaveTypes } = await supabase
      .from('leave_types')
      .select('*')
      .eq('organization_id', org.id)
      .gt('days_per_year', 0);

    if (leaveTypes && leaveTypes.length > 0) {
      const balanceRequiredTypes = leaveTypes.filter(lt =>
        (lt.requires_balance || lt.is_mandatory) &&
        !['maternity', 'paternity', 'childcare'].includes(lt.leave_category)
      );

      if (balanceRequiredTypes.length > 0) {
        const leaveBalances = balanceRequiredTypes.map(leaveType => ({
          user_id: authUserId,
          leave_type_id: leaveType.id,
          organization_id: org.id,
          year: new Date().getFullYear(),
          entitled_days: leaveType.days_per_year,
          used_days: 0
        }));

        const { error: balancesError } = await supabase
          .from('leave_balances')
          .insert(leaveBalances);

        if (balancesError) {
          console.error(`⚠️  Failed to create leave balances for ${user.email}`);
        } else {
          console.log(`✅ Created ${leaveBalances.length} leave balances`);
        }
      }
    }

    console.log('');
  }

  // Show final user count
  const { data: allUsers } = await supabase
    .from('user_organizations')
    .select('status, profiles!user_organizations_user_id_fkey(email, full_name)')
    .eq('organization_id', org.id);

  console.log('\n📊 All users in test_lemoniady:');
  allUsers?.forEach(u => {
    console.log(`  - ${u.profiles?.full_name} (${u.profiles?.email}) - ${u.status}`);
  });

  console.log('\n✅ Done! All test users created with password: TestPassword123!');
}

createTestUsers().catch(console.error);
