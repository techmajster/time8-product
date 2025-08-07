const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Tables we know exist in the system
const knownTables = [
  // User & Organization tables
  'profiles',
  'organizations', 
  'user_organizations',
  'teams',
  'invitations',
  
  // Leave management tables  
  'leave_requests',
  'leave_balances',
  'leave_types',
  'company_holidays',
  
  // Working time tables
  'working_hours',
  'working_days',
  'working_schedules',
  
  // Other tables
  'email_domains',
  'user_preferences'
]

async function checkTableRLS() {
  console.log('🔍 RLS Policy Audit for Multi-Organization Support\n')
  console.log('Checking known tables...\n')

  const results = {
    withRLS: [],
    withoutRLS: [],
    withOrgCheck: [],
    withoutOrgCheck: [],
    errors: []
  }

  for (const table of knownTables) {
    try {
      // Try to select from the table with a limit to check if it exists and RLS
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)

      if (error) {
        // Check if it's an RLS error
        if (error.message.includes('row-level security') || error.code === '42501') {
          console.log(`✅ ${table}: RLS is ENABLED`)
          results.withRLS.push(table)
          
          // For critical tables, check if they need org isolation
          const orgTables = ['teams', 'invitations', 'leave_requests', 'leave_balances', 
                           'leave_types', 'company_holidays', 'working_schedules']
          
          if (orgTables.includes(table)) {
            console.log(`   ⚠️  Needs organization-based policy check`)
            results.withoutOrgCheck.push(table)
          }
        } else {
          console.log(`❓ ${table}: Error - ${error.message}`)
          results.errors.push({ table, error: error.message })
        }
      } else {
        // If we can read without error as service role, RLS might be disabled
        console.log(`❌ ${table}: RLS appears to be DISABLED (readable by service role)`)
        results.withoutRLS.push(table)
      }
    } catch (err) {
      console.log(`❓ ${table}: Unexpected error - ${err.message}`)
      results.errors.push({ table, error: err.message })
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📋 SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Tables with RLS enabled: ${results.withRLS.length}`)
  console.log(`❌ Tables without RLS: ${results.withoutRLS.length}`)
  console.log(`⚠️  Tables needing org check: ${results.withoutOrgCheck.length}`)
  console.log(`❓ Errors encountered: ${results.errors.length}`)

  if (results.withoutRLS.length > 0) {
    console.log('\n❌ TABLES WITHOUT RLS:')
    results.withoutRLS.forEach(t => console.log(`  - ${t}`))
  }

  if (results.withoutOrgCheck.length > 0) {
    console.log('\n⚠️  CRITICAL TABLES NEEDING ORG ISOLATION CHECK:')
    results.withoutOrgCheck.forEach(t => console.log(`  - ${t}`))
  }

  // Generate SQL to enable RLS
  if (results.withoutRLS.length > 0) {
    console.log('\n🔧 SQL TO ENABLE RLS:')
    console.log('-- Run these commands in Supabase SQL editor:\n')
    results.withoutRLS.forEach(table => {
      console.log(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`)
    })
  }

  // Check specific tables for organization_id column
  console.log('\n\n📊 CHECKING FOR ORGANIZATION_ID COLUMNS...\n')
  
  for (const table of results.withRLS) {
    try {
      // Get one row to check columns (will fail with RLS but that's ok)
      const { error } = await supabase
        .from(table)
        .select('organization_id')
        .limit(1)
      
      // If error mentions column doesn't exist
      if (error && error.message.includes('column') && error.message.includes('does not exist')) {
        console.log(`  ${table}: No organization_id column`)
      } else {
        console.log(`  ${table}: ✅ Has organization_id column`)
      }
    } catch (err) {
      // Ignore
    }
  }

  // Save results
  require('fs').writeFileSync(
    'simple-rls-audit-results.json',
    JSON.stringify(results, null, 2)
  )
  
  console.log('\n✅ Results saved to: simple-rls-audit-results.json')
}

// Run the audit
checkTableRLS().catch(console.error)