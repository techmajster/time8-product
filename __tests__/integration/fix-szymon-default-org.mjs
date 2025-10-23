import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixDefaultOrg() {
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find(u => u.email === 'szymon.rajca@bb8.pl');

  console.log('Fixing default organization for szymon.rajca@bb8.pl...\n');

  // Get his organizations
  const { data: userOrgs } = await supabase
    .from('user_organizations')
    .select('organization_id, organizations(name)')
    .eq('user_id', user.id)
    .eq('is_active', true);

  console.log('Available organizations:');
  userOrgs.forEach((org, i) => {
    console.log(`${i + 1}. ${org.organizations?.name} (${org.organization_id})`);
  });

  // Set BB8 Studio as default (second one)
  const bb8StudioOrgId = userOrgs.find(o => o.organizations?.name === 'BB8 Studio')?.organization_id;

  if (!bb8StudioOrgId) {
    console.log('Error: BB8 Studio not found');
    return;
  }

  console.log('\nSetting BB8 Studio as default organization...');

  const { error } = await supabase
    .from('user_organizations')
    .update({ is_default: true })
    .eq('user_id', user.id)
    .eq('organization_id', bb8StudioOrgId);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('✅ Successfully set BB8 Studio as default organization!');
    console.log('\nVerifying...');

    const { data: verification } = await supabase
      .from('user_organizations')
      .select('role, is_default, organizations(name)')
      .eq('user_id', user.id);

    verification.forEach(org => {
      console.log(`- ${org.organizations?.name}: role=${org.role}, default=${org.is_default}`);
    });
  }
}

fixDefaultOrg().catch(console.error);
