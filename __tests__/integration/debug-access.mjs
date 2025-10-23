import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugAccess() {
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find(u => u.email === 'szymon.rajca@bb8.pl');

  console.log('=== CHECKING ACCESS FOR szymon.rajca@bb8.pl ===\n');

  const { data: userOrgs } = await supabase
    .from('user_organizations')
    .select('role, is_active, is_default, organization_id, organizations(name)')
    .eq('user_id', user.id)
    .eq('is_active', true);

  console.log('ALL ACTIVE ORGANIZATIONS:');
  userOrgs.forEach((org, i) => {
    console.log(`${i + 1}. ${org.organizations?.name}`);
    console.log(`   - Organization ID: ${org.organization_id}`);
    console.log(`   - Role: ${org.role}`);
    console.log(`   - Is Default: ${org.is_default}`);
  });

  console.log('\n=== DEFAULT ORGANIZATION (used when no cookie) ===');
  const defaultOrg = userOrgs.find(o => o.is_default);
  if (defaultOrg) {
    console.log('Organization:', defaultOrg.organizations?.name);
    console.log('Role:', defaultOrg.role);
    console.log('Has admin access:', defaultOrg.role === 'admin');
    console.log('Has manager access:', defaultOrg.role === 'manager' || defaultOrg.role === 'admin');
  } else {
    console.log('❌ NO DEFAULT ORGANIZATION SET!');
    console.log('This could cause access issues!');
  }

  console.log('\n=== PERMISSION CHECK ===');
  const role = defaultOrg?.role;
  console.log('Current role:', role);
  console.log('Can access /team:', role === 'manager' || role === 'admin');
  console.log('Can access /admin:', role === 'admin');
  console.log('Can access /settings:', role === 'admin');

  // Check the old profiles table too
  console.log('\n=== CHECKING OLD PROFILES TABLE ===');
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single();

  if (profile) {
    console.log('Profile role (deprecated):', profile.role);
    console.log('Profile organization_id:', profile.organization_id);
  }
}

debugAccess().catch(console.error);
