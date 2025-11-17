#!/usr/bin/env node

/**
 * Diagnostic Script: Check for hardcoded customer names in database
 * Purpose: Investigate why "Paweł Chróściak" appears in LemonSqueezy checkouts
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function diagnose() {
  console.log('🔍 DIAGNOSTIC REPORT: LemonSqueezy Customer Names\n')
  console.log('=' .repeat(60))

  // Test 1: Check organizations table for test names
  console.log('\n📊 TEST 1: Organizations with potential test data')
  console.log('-'.repeat(60))

  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('id, name, slug, created_at')
    .or('name.ilike.%paweł%,name.ilike.%chrościak%,name.ilike.%test%')
    .order('created_at', { ascending: false })
    .limit(20)

  if (orgsError) {
    console.error('❌ Error:', orgsError.message)
  } else if (orgs && orgs.length > 0) {
    console.log(`\n⚠️  Found ${orgs.length} organizations with test-like names:\n`)
    orgs.forEach(org => {
      console.log(`  • ${org.name}`)
      console.log(`    ID: ${org.id}`)
      console.log(`    Slug: ${org.slug}`)
      console.log(`    Created: ${new Date(org.created_at).toLocaleString()}`)
      console.log('')
    })
  } else {
    console.log('✅ No organizations found with test data patterns')
  }

  // Test 2: Check all organizations
  console.log('\n📊 TEST 2: All Organizations (Recent 10)')
  console.log('-'.repeat(60))

  const { data: allOrgs, error: allOrgsError } = await supabase
    .from('organizations')
    .select('id, name, slug, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  if (allOrgsError) {
    console.error('❌ Error:', allOrgsError.message)
  } else if (allOrgs) {
    console.log(`\nRecent ${allOrgs.length} organizations:\n`)
    allOrgs.forEach(org => {
      console.log(`  • ${org.name}`)
      console.log(`    ID: ${org.id}`)
      console.log(`    Created: ${new Date(org.created_at).toLocaleString()}`)
      console.log('')
    })
  }

  // Test 3: Check profiles table
  console.log('\n📊 TEST 3: User Profiles')
  console.log('-'.repeat(60))

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, email, created_at')
    .or('full_name.ilike.%paweł%,full_name.ilike.%chrościak%')
    .limit(20)

  if (profilesError) {
    console.error('❌ Error:', profilesError.message)
  } else if (profiles && profiles.length > 0) {
    console.log(`\n⚠️  Found ${profiles.length} profiles with matching names:\n`)
    profiles.forEach(profile => {
      console.log(`  • ${profile.full_name || 'No name'}`)
      console.log(`    Email: ${profile.email}`)
      console.log(`    ID: ${profile.id}`)
      console.log(`    Created: ${new Date(profile.created_at).toLocaleString()}`)
      console.log('')
    })
  } else {
    console.log('✅ No profiles found with "Paweł Chróściak"')
  }

  // Test 4: Check subscriptions
  console.log('\n📊 TEST 4: Recent Subscriptions')
  console.log('-'.repeat(60))

  const { data: subs, error: subsError } = await supabase
    .from('subscriptions')
    .select(`
      id,
      organization_id,
      lemonsqueezy_customer_id,
      status,
      created_at,
      organizations (
        name
      )
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  if (subsError) {
    console.error('❌ Error:', subsError.message)
  } else if (subs) {
    console.log(`\nRecent ${subs.length} subscriptions:\n`)
    subs.forEach(sub => {
      console.log(`  • Organization: ${sub.organizations?.name || 'N/A'}`)
      console.log(`    Org ID: ${sub.organization_id}`)
      console.log(`    Customer ID: ${sub.lemonsqueezy_customer_id}`)
      console.log(`    Status: ${sub.status}`)
      console.log(`    Created: ${new Date(sub.created_at).toLocaleString()}`)
      console.log('')
    })
  }

  // Test 5: Check user_organizations mapping
  console.log('\n📊 TEST 5: User-Organization Mappings (Recent)')
  console.log('-'.repeat(60))

  const { data: userOrgs, error: userOrgsError } = await supabase
    .from('user_organizations')
    .select(`
      user_id,
      organization_id,
      role,
      organizations (
        name
      ),
      profiles (
        full_name,
        email
      )
    `)
    .order('created_at', { ascending: false })
    .limit(15)

  if (userOrgsError) {
    console.error('❌ Error:', userOrgsError.message)
  } else if (userOrgs) {
    console.log(`\nRecent ${userOrgs.length} user-organization relationships:\n`)
    userOrgs.forEach(uo => {
      console.log(`  • User: ${uo.profiles?.full_name || 'No name'} (${uo.profiles?.email})`)
      console.log(`    Organization: ${uo.organizations?.name}`)
      console.log(`    Role: ${uo.role}`)
      console.log('')
    })
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📋 SUMMARY & RECOMMENDATIONS')
  console.log('='.repeat(60))

  if (orgs && orgs.length > 0) {
    console.log('\n⚠️  ACTION REQUIRED:')
    console.log(`   Found ${orgs.length} organizations with test-like names.`)
    console.log('   These may be causing the hardcoded name issue in LemonSqueezy.')
    console.log('\n   Next steps:')
    console.log('   1. Review the organizations listed in TEST 1')
    console.log('   2. Check if these are actual test records or real customers')
    console.log('   3. If test data, consider cleaning up or marking as test accounts')
  } else {
    console.log('\n✅ Database appears clean of obvious test data.')
    console.log('\n   Possible causes:')
    console.log('   1. Browser sessionStorage pollution')
    console.log('   2. LemonSqueezy API response contains the name')
    console.log('   3. User profile (not organization) has test name')
    console.log('\n   Next steps:')
    console.log('   1. Add logging to checkout API route')
    console.log('   2. Inspect browser sessionStorage for "pending_organization"')
    console.log('   3. Check actual LemonSqueezy dashboard for customer records')
  }

  console.log('\n')
}

diagnose().catch(console.error)
