import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeMultiWorkspaceScenario() {
  console.log('=== MULTI-WORKSPACE SCENARIO ANALYSIS ===\n');
  console.log('Scenario: User has multiple workspaces with different roles');
  console.log('- Workspace A: admin');
  console.log('- Workspace B: admin');
  console.log('- Workspace C: employee\n');

  // Simulate this with Szymon's account
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find(u => u.email === 'szymon.rajca@bb8.pl');

  const { data: userOrgs } = await supabase
    .from('user_organizations')
    .select('role, is_active, is_default, organization_id, organizations(name)')
    .eq('user_id', user.id)
    .eq('is_active', true);

  console.log('CURRENT STATE:');
  userOrgs.forEach((org, i) => {
    console.log(`${i + 1}. ${org.organizations?.name}`);
    console.log(`   Role: ${org.role}`);
    console.log(`   Default: ${org.is_default}`);
    console.log(`   Org ID: ${org.organization_id}`);
  });

  console.log('\n=== PROBLEM SCENARIOS ===\n');

  console.log('1. INITIAL LOGIN (no cookie):');
  const defaultOrg = userOrgs.find(o => o.is_default);
  if (defaultOrg) {
    console.log(`   ✅ Uses: ${defaultOrg.organizations?.name} (role: ${defaultOrg.role})`);
    console.log(`   Navigation shows: ${defaultOrg.role} menus`);
  } else {
    console.log('   ❌ ERROR: No default org - access denied!');
  }

  console.log('\n2. WORKSPACE SWITCHING:');
  console.log('   User switches to different workspace via WorkspaceSwitcher');
  console.log('   Cookie set: active-organization-id = <new-org-id>');
  console.log('   Issue: Navigation menu shows items based on NEW workspace role');
  console.log('   Example: Switch from "admin" workspace to "employee" workspace');
  console.log('            → Admin menu items should disappear');
  console.log('            → Manager menu items should disappear');
  console.log('            → Only employee menu items remain');

  console.log('\n3. PERMISSION CHECK FLOW:');
  console.log('   Step 1: App reads active-organization-id cookie');
  console.log('   Step 2: Query user_organizations for that org_id');
  console.log('   Step 3: Get role for that specific org');
  console.log('   Step 4: Apply permissions based on that role');
  console.log('   Step 5: UserRoleContext provides role to components');

  console.log('\n4. POTENTIAL ISSUES:');
  console.log('   ❌ Issue A: Navigation menu cached with wrong role');
  console.log('   ❌ Issue B: Role not updating when switching workspaces');
  console.log('   ❌ Issue C: Middleware using old role after switch');
  console.log('   ❌ Issue D: Multiple tabs with different active workspaces');

  console.log('\n=== HOW CURRENT IMPLEMENTATION HANDLES THIS ===\n');

  console.log('MIDDLEWARE (middleware.ts):');
  console.log('  1. Reads active-organization-id cookie');
  console.log('  2. Queries user_organizations for that org');
  console.log('  3. Gets role from query result');
  console.log('  4. Checks permissions based on that role');
  console.log('  ✅ This SHOULD work correctly per-workspace');

  console.log('\nPAGES (e.g., dashboard/page.tsx):');
  console.log('  1. Reads active-organization-id cookie');
  console.log('  2. Queries user_organizations');
  console.log('  3. Sets profile.role = userOrg.role');
  console.log('  4. Passes userRole to AppLayoutClient');
  console.log('  ✅ This SHOULD work correctly per-workspace');

  console.log('\nCLIENT COMPONENTS (AppLayoutClient):');
  console.log('  1. Receives userRole as prop from server');
  console.log('  2. Provides it via UserRoleContext');
  console.log('  3. AppSidebar filters navigation based on role');
  console.log('  ⚠️  POTENTIAL ISSUE: Role is from initial page load');
  console.log('  ⚠️  If user switches workspace client-side, role may be stale');

  console.log('\n=== TESTING THE ACTUAL FLOW ===\n');

  // Test what happens when we simulate switching
  console.log('TEST: Simulate workspace switch');

  const konturyOrg = userOrgs.find(o => o.organizations?.name === 'Kontury');
  const bb8Org = userOrgs.find(o => o.organizations?.name === 'BB8 Studio');

  console.log(`\nScenario A: Active workspace = Kontury (${konturyOrg?.role})`);
  console.log('  Expected navigation: admin menus');
  console.log('  Can access /admin: YES');
  console.log('  Can access /team: YES');

  console.log(`\nScenario B: Active workspace = BB8 Studio (${bb8Org?.role})`);
  console.log('  Expected navigation: admin menus');
  console.log('  Can access /admin: YES');
  console.log('  Can access /team: YES');

  console.log('\nScenario C: User switches workspace in UI');
  console.log('  1. WorkspaceSwitcher sets cookie: active-organization-id');
  console.log('  2. WorkspaceSwitcher does: router.refresh()');
  console.log('  3. Page re-renders on server');
  console.log('  4. Server reads new cookie value');
  console.log('  5. Server fetches new role for new org');
  console.log('  6. Server passes new role to client');
  console.log('  7. Navigation updates with new role permissions');
  console.log('  ✅ THIS SHOULD WORK if router.refresh() is called');
}

analyzeMultiWorkspaceScenario().catch(console.error);
