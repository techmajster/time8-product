const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function auditRLSPolicies() {
  console.log('🔍 Starting RLS Policy Audit for Multi-Organization Support\n')
  
  try {
    // Get all tables using raw SQL query
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_public_tables', {})
      
    // If the RPC doesn't exist, create it first
    if (tablesError && tablesError.code === '42883') {
      await supabase.rpc('query', { 
        query_text: `
          CREATE OR REPLACE FUNCTION get_public_tables()
          RETURNS TABLE(table_name text) AS $$
          BEGIN
            RETURN QUERY
            SELECT tablename::text
            FROM pg_tables
            WHERE schemaname = 'public'
              AND tablename NOT LIKE '\\_%'
              AND tablename != 'schema_migrations'
            ORDER BY tablename;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
      }).catch(() => {})
      
      // Try again
      const retry = await supabase.rpc('get_public_tables', {})
      if (retry.data) {
        tables = retry.data
      }
    }
    
    // Fallback: use direct query
    if (!tables) {
      const { data, error } = await supabase
        .from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'public')
        .not('tablename', 'like', '\\_%')
        .neq('tablename', 'schema_migrations')
        .order('tablename')
      
      if (error) throw error
      tables = data.map(t => ({ table_name: t.tablename }))
    }

    if (tablesError) throw tablesError

    console.log(`📊 Found ${tables.length} tables to audit\n`)

    const auditResults = {
      compliant: [],
      nonCompliant: [],
      noRLS: [],
      authOnly: [],
      needsReview: []
    }

    // Check each table
    for (const { table_name } of tables) {
      // Skip Supabase internal tables
      if (table_name.startsWith('_') || table_name === 'schema_migrations') {
        continue
      }

      console.log(`\n🔍 Checking table: ${table_name}`)

      // Check if RLS is enabled
      const { data: rlsEnabled, error: rlsError } = await supabase
        .rpc('get_table_rls_status', { table_name })
        .single()

      if (rlsError) {
        // Try alternative method
        const { data: tableInfo } = await supabase
          .from('pg_tables')
          .select('rowsecurity')
          .eq('schemaname', 'public')
          .eq('tablename', table_name)
          .single()

        if (!tableInfo?.rowsecurity) {
          console.log(`  ❌ RLS is DISABLED`)
          auditResults.noRLS.push(table_name)
          continue
        }
      }

      // Get policies for this table
      const { data: policies, error: policiesError } = await supabase
        .rpc('get_table_policies', { table_name })

      if (policiesError) {
        console.log(`  ⚠️  Could not fetch policies: ${policiesError.message}`)
        auditResults.needsReview.push({ table: table_name, reason: 'Could not fetch policies' })
        continue
      }

      if (!policies || policies.length === 0) {
        console.log(`  ⚠️  No policies found (RLS enabled but no policies)`)
        auditResults.needsReview.push({ table: table_name, reason: 'No policies defined' })
        continue
      }

      console.log(`  ✓ Found ${policies.length} policies`)

      // Analyze policies for multi-org compliance
      const hasOrgCheck = policies.some(p => 
        p.definition?.includes('organization_id') || 
        p.definition?.includes('user_organizations')
      )
      
      const hasAuthCheck = policies.some(p => 
        p.definition?.includes('auth.uid()') || 
        p.definition?.includes('auth.role()')
      )

      // Categorize table based on its purpose
      const orgRelatedTables = [
        'organizations', 'teams', 'invitations', 'user_organizations',
        'leave_requests', 'leave_balances', 'leave_types', 'company_holidays',
        'working_hours', 'working_schedules', 'working_days'
      ]

      const userOnlyTables = ['profiles', 'user_preferences']
      const publicTables = ['email_domains']

      if (orgRelatedTables.includes(table_name)) {
        if (hasOrgCheck) {
          console.log(`  ✅ Has organization-based access control`)
          auditResults.compliant.push({ 
            table: table_name, 
            policies: policies.length,
            hasOrgCheck: true 
          })
        } else {
          console.log(`  ❌ Missing organization-based access control`)
          auditResults.nonCompliant.push({ 
            table: table_name, 
            policies: policies.length,
            issue: 'No organization_id check found' 
          })
        }
      } else if (userOnlyTables.includes(table_name)) {
        if (hasAuthCheck) {
          console.log(`  ✅ Has user-based access control`)
          auditResults.authOnly.push({ 
            table: table_name, 
            policies: policies.length 
          })
        } else {
          console.log(`  ❌ Missing auth checks`)
          auditResults.nonCompliant.push({ 
            table: table_name, 
            policies: policies.length,
            issue: 'No auth.uid() check found' 
          })
        }
      } else if (publicTables.includes(table_name)) {
        console.log(`  ℹ️  Public table (may not need strict RLS)`)
        auditResults.authOnly.push({ 
          table: table_name, 
          policies: policies.length,
          note: 'Public data table' 
        })
      } else {
        console.log(`  ⚠️  Unknown table category - needs manual review`)
        auditResults.needsReview.push({ 
          table: table_name, 
          reason: 'Unknown table purpose',
          policies: policies.length 
        })
      }

      // Show policy names
      policies.forEach(p => {
        console.log(`    - Policy: ${p.policyname} (${p.permissive ? 'PERMISSIVE' : 'RESTRICTIVE'})`)
      })
    }

    // Generate report
    console.log('\n' + '='.repeat(80))
    console.log('📋 RLS POLICY AUDIT REPORT')
    console.log('='.repeat(80) + '\n')

    console.log('✅ COMPLIANT TABLES (Have proper multi-org RLS):')
    auditResults.compliant.forEach(t => {
      console.log(`  - ${t.table} (${t.policies} policies)`)
    })

    console.log(`\n❌ NON-COMPLIANT TABLES (Missing proper RLS):`)
    auditResults.nonCompliant.forEach(t => {
      console.log(`  - ${t.table}: ${t.issue}`)
    })

    console.log(`\n⛔ TABLES WITHOUT RLS ENABLED:`)
    auditResults.noRLS.forEach(t => {
      console.log(`  - ${t}`)
    })

    console.log(`\n📌 USER-ONLY TABLES (Auth-based access):`)
    auditResults.authOnly.forEach(t => {
      console.log(`  - ${t.table} (${t.policies} policies)${t.note ? ' - ' + t.note : ''}`)
    })

    console.log(`\n⚠️  NEEDS MANUAL REVIEW:`)
    auditResults.needsReview.forEach(t => {
      console.log(`  - ${t.table}: ${t.reason}`)
    })

    // Summary
    console.log('\n' + '='.repeat(80))
    console.log('📊 SUMMARY:')
    console.log(`  - Total tables audited: ${tables.length}`)
    console.log(`  - Compliant: ${auditResults.compliant.length}`)
    console.log(`  - Non-compliant: ${auditResults.nonCompliant.length}`)
    console.log(`  - No RLS: ${auditResults.noRLS.length}`)
    console.log(`  - Auth-only: ${auditResults.authOnly.length}`)
    console.log(`  - Needs review: ${auditResults.needsReview.length}`)

    // Generate SQL fixes for non-compliant tables
    if (auditResults.nonCompliant.length > 0 || auditResults.noRLS.length > 0) {
      console.log('\n' + '='.repeat(80))
      console.log('🔧 SUGGESTED FIXES:')
      console.log('='.repeat(80) + '\n')

      // Enable RLS for tables that don't have it
      auditResults.noRLS.forEach(table => {
        console.log(`-- Enable RLS for ${table}`)
        console.log(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;\n`)
      })

      // Add organization-based policies for non-compliant tables
      auditResults.nonCompliant.forEach(({ table, issue }) => {
        if (issue.includes('organization_id')) {
          console.log(`-- Add organization-based policy for ${table}`)
          console.log(`-- First, check if table has organization_id column:`)
          console.log(`-- SELECT column_name FROM information_schema.columns WHERE table_name = '${table}' AND column_name = 'organization_id';`)
          console.log(`\n-- If yes, add policy:`)
          console.log(`CREATE POLICY "${table}_org_isolation" ON public.${table}`)
          console.log(`  FOR ALL USING (`)
          console.log(`    organization_id IN (`)
          console.log(`      SELECT organization_id FROM public.user_organizations`)
          console.log(`      WHERE user_id = auth.uid() AND is_active = true`)
          console.log(`    )`)
          console.log(`  );\n`)
        }
      })
    }

    // Save report to file
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTables: tables.length,
        compliant: auditResults.compliant.length,
        nonCompliant: auditResults.nonCompliant.length,
        noRLS: auditResults.noRLS.length,
        authOnly: auditResults.authOnly.length,
        needsReview: auditResults.needsReview.length
      },
      details: auditResults
    }

    require('fs').writeFileSync(
      'rls-audit-report.json',
      JSON.stringify(report, null, 2)
    )

    console.log('\n✅ Full report saved to: rls-audit-report.json')

  } catch (error) {
    console.error('❌ Audit failed:', error)
  }
}

// Helper function to get table RLS status (if RPC doesn't exist)
async function createHelperFunctions() {
  try {
    // Create helper function to check RLS status
    await supabase.rpc('create_function', {
      function_sql: `
        CREATE OR REPLACE FUNCTION get_table_rls_status(table_name text)
        RETURNS boolean AS $$
        BEGIN
          RETURN (
            SELECT rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = table_name
          );
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    })

    // Create helper function to get policies
    await supabase.rpc('create_function', {
      function_sql: `
        CREATE OR REPLACE FUNCTION get_table_policies(table_name text)
        RETURNS TABLE(
          policyname name,
          permissive text,
          roles name[],
          cmd text,
          qual text,
          with_check text,
          definition text
        ) AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            pol.polname as policyname,
            CASE pol.polpermissive 
              WHEN true THEN 'PERMISSIVE'
              ELSE 'RESTRICTIVE'
            END as permissive,
            pol.polroles::regrole[] as roles,
            pol.polcmd as cmd,
            pg_get_expr(pol.polqual, pol.polrelid) as qual,
            pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check,
            pg_get_expr(pol.polqual, pol.polrelid) as definition
          FROM pg_policy pol
          JOIN pg_class cls ON pol.polrelid = cls.oid
          JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
          WHERE nsp.nspname = 'public'
          AND cls.relname = table_name;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    })

    console.log('✅ Helper functions created')
  } catch (error) {
    console.log('ℹ️  Helper functions might already exist or require manual creation')
  }
}

// Run the audit
console.log('🚀 Starting RLS Policy Audit...\n')
auditRLSPolicies()