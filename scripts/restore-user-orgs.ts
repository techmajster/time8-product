/**
 * Script to restore user_organizations records
 * Run with: npx tsx scripts/restore-user-orgs.ts <email>
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function restoreUserOrganizations(email: string) {
  console.log('\n🔧 Restoring user_organizations for:', email)
  console.log('─'.repeat(60))

  try {
    // 1. Get user from auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error('❌ Error fetching users:', listError)
      return
    }

    const user = users.find(u => u.email === email)

    if (!user) {
      console.log('❌ User NOT FOUND')
      return
    }

    console.log('✅ Found user:', user.id)

    // 2. Get all organizations (workspaces)
    const { data: organizations, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .order('created_at', { ascending: true })

    if (orgsError) {
      console.error('❌ Error fetching organizations:', orgsError)
      return
    }

    if (!organizations || organizations.length === 0) {
      console.log('⚠️  No organizations found in database')
      return
    }

    console.log(`\n📋 Found ${organizations.length} organization(s):`)
    organizations.forEach((org, index) => {
      console.log(`   ${index + 1}. ${org.name} (${org.slug})`)
    })

    // 3. Check existing user_organizations records
    const { data: existingOrgs, error: existingError } = await supabase
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', user.id)

    if (existingError) {
      console.error('❌ Error checking existing records:', existingError)
      return
    }

    console.log(`\n📊 Current user_organizations: ${existingOrgs?.length || 0} record(s)`)

    // 4. Get the first team from each organization
    const recordsToInsert = []

    for (const org of organizations) {
      // Check if record already exists
      const existingRecord = existingOrgs?.find(eo => eo.organization_id === org.id)

      if (existingRecord) {
        console.log(`   ℹ️  Already connected to: ${org.name} (role: ${existingRecord.role})`)
        continue
      }

      // Get first team for this organization
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('organization_id', org.id)
        .order('created_at', { ascending: true })
        .limit(1)

      if (teamsError) {
        console.error(`   ⚠️  Error fetching teams for ${org.name}:`, teamsError)
        continue
      }

      const team = teams?.[0]

      if (!team) {
        console.log(`   ⚠️  No team found for ${org.name}, skipping...`)
        continue
      }

      recordsToInsert.push({
        user_id: user.id,
        organization_id: org.id,
        team_id: team.id,
        role: 'admin', // Restore as admin to regain access
        is_active: true,
        is_default: recordsToInsert.length === 0, // Set first organization as default
        joined_via: 'created' // Restore as if they created/owned the workspace
      })
    }

    if (recordsToInsert.length === 0) {
      console.log('\n✅ No new records to insert')
      return
    }

    console.log(`\n🔄 Inserting ${recordsToInsert.length} user_organizations record(s)...`)

    // 5. Insert the records
    const { data: insertedRecords, error: insertError } = await supabase
      .from('user_organizations')
      .insert(recordsToInsert)
      .select()

    if (insertError) {
      console.error('❌ Error inserting records:', insertError)
      return
    }

    console.log('✅ Successfully restored user_organizations!')
    console.log('\n📝 Restored records:')
    insertedRecords?.forEach((record, index) => {
      const org = organizations.find(o => o.organization_id === record.organization_id)
      console.log(`   ${index + 1}. ${org?.name || 'Unknown'} - Role: ${record.role}`)
    })

    console.log('\n🎉 Done! You should now have access to your workspaces.')
    console.log('   Try logging in again.')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Get email from command line
const email = process.argv[2]

if (!email) {
  console.error('❌ Please provide an email address')
  console.error('Usage: npx tsx scripts/restore-user-orgs.ts <email>')
  process.exit(1)
}

restoreUserOrganizations(email)
