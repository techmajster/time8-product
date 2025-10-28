import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRole() {
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find(u => u.email === 'szymon.rajca@bb8.pl');

  if (!user) {
    console.log('USER NOT FOUND');
    process.exit(1);
  }

  const { data: userOrgs } = await supabase
    .from('user_organizations')
    .select('role, is_active, organizations(name)')
    .eq('user_id', user.id);

  console.log('EMAIL: szymon.rajca@bb8.pl');
  console.log('USER ID:', user.id);
  if (userOrgs && userOrgs.length > 0) {
    userOrgs.forEach(org => {
      console.log('ORGANIZATION:', org.organizations?.name);
      console.log('ROLE:', org.role);
      console.log('ACTIVE:', org.is_active);
    });
  } else {
    console.log('NO ORGANIZATIONS FOUND');
  }
}

checkRole().catch(console.error);
