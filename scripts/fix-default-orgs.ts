/**
 * Script to set default organizations for all users
 * Run with: npx tsx scripts/fix-default-orgs.ts
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

async function fixDefaultOrgs() {
  console.log('\n🔧 Setting default organizations for users')
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

    // Group by user
    const userGroups = new Map<string, any[]>()
    for (const userOrg of userOrgs) {
      const userId = userOrg.user_id
      if (!userGroups.has(userId)) {
        userGroups.set(userId, [])
      }
      userGroups.get(userId)!.push(userOrg)
    }

    let fixedCount = 0

    // For each user, set their first (oldest) organization as default if no default exists
    for (const [userId, orgs] of userGroups) {
      const profile = orgs[0].profiles as any
      const defaultOrg = orgs.find(o => o.is_default)

      if (!defaultOrg) {
        // Set the first organization as default
        const firstOrg = orgs[0]

        console.log(`📝 Setting default for ${profile?.full_name || 'Unknown'}`)
        console.log(`   Organization ID: ${firstOrg.organization_id}`)

        const { error: updateError } = await supabase
          .from('user_organizations')
          .update({ is_default: true })
          .eq('user_id', userId)
          .eq('organization_id', firstOrg.organization_id)

        if (updateError) {
          console.error(`   ❌ Failed:`, updateError.message)
        } else {
          console.log(`   ✅ Success`)
          fixedCount++
        }
      } else {
        console.log(`✓ ${profile?.full_name || 'Unknown'} already has default set`)
      }
    }

    console.log(`\n🎉 Done! Fixed ${fixedCount} user(s)`)

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

fixDefaultOrgs()
