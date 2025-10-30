/**
 * Script to list all users in the system
 * Run with: npx tsx scripts/list-users.ts
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

async function listUsers() {
  console.log('\n👥 Listing all users in the system')
  console.log('─'.repeat(60))

  try {
    // Get all users from auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error('❌ Error fetching users:', listError)
      return
    }

    if (!users || users.length === 0) {
      console.log('⚠️  No users found')
      return
    }

    console.log(`\n📋 Found ${users.length} user(s):\n`)

    for (const user of users) {
      console.log(`📧 ${user.email}`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Name: ${user.user_metadata?.full_name || 'Not set'}`)
      console.log(`   Email Verified: ${user.email_confirmed_at ? '✅' : '❌'}`)

      // Check user_organizations
      const { data: userOrgs, error: orgsError } = await supabase
        .from('user_organizations')
        .select('organization_id, role')
        .eq('user_id', user.id)

      if (!orgsError && userOrgs && userOrgs.length > 0) {
        console.log(`   Workspaces: ${userOrgs.length} workspace(s)`)
      } else {
        console.log(`   Workspaces: ⚠️  NO WORKSPACES`)
      }

      console.log('')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

listUsers()
