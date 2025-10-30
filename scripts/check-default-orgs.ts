/**
 * Script to check which users have default organizations set
 * Run with: npx tsx scripts/check-default-orgs.ts
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

async function checkDefaultOrgs() {
  console.log('\n🔍 Checking default organization settings')
  console.log('─'.repeat(60))

  try {
    // Get all user_organizations
    const { data: userOrgs, error } = await supabase
      .from('user_organizations')
      .select(`
        *,
        profiles:user_id (
          full_name,
          email
        ),
        organizations:organization_id (
          name,
          slug
        )
      `)
      .order('user_id')

    if (error) {
      console.error('❌ Error:', error)
      return
    }

    if (!userOrgs || userOrgs.length === 0) {
      console.log('⚠️  No user_organizations found')
      return
    }

    console.log(`\n📊 Found ${userOrgs.length} user-organization relationships\n`)

    // Group by user
    const userGroups = new Map<string, any[]>()
    for (const userOrg of userOrgs) {
      const userId = userOrg.user_id
      if (!userGroups.has(userId)) {
        userGroups.set(userId, [])
      }
      userGroups.get(userId)!.push(userOrg)
    }

    // Check each user
    for (const [userId, orgs] of userGroups) {
      const profile = orgs[0].profiles as any
      const defaultOrg = orgs.find(o => o.is_default)

      console.log(`👤 ${profile?.full_name || 'Unknown'} (${profile?.email || 'No email'})`)
      console.log(`   User ID: ${userId}`)
      console.log(`   Organizations: ${orgs.length}`)

      if (defaultOrg) {
        const org = defaultOrg.organizations as any
        console.log(`   ✅ Default: ${org?.name || 'Unknown'} (${defaultOrg.organization_id})`)
      } else {
        console.log(`   ❌ NO DEFAULT SET`)
        if (orgs.length > 0) {
          console.log(`   Available organizations:`)
          orgs.forEach((o, idx) => {
            const org = o.organizations as any
            console.log(`      ${idx + 1}. ${org?.name || 'Unknown'}`)
          })
        }
      }
      console.log('')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkDefaultOrgs()
