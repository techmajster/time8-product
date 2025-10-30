/**
 * Script to restore missing profile record
 * Run with: npx tsx scripts/restore-profile.ts <email>
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

async function restoreProfile(email: string) {
  console.log('\n🔧 Restoring profile for:', email)
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
    console.log('   Email:', user.email)
    console.log('   Full Name:', user.user_metadata?.full_name || 'Not set')

    // 2. Check if profile exists
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (existingProfile) {
      console.log('\n✅ Profile already exists - no action needed')
      return
    }

    console.log('\n⚠️  Profile NOT FOUND - creating...')

    // 3. Create profile
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        full_name: user.user_metadata?.full_name || email.split('@')[0],
        email: user.email
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Error creating profile:', insertError)
      return
    }

    console.log('✅ Profile created successfully!')
    console.log('   ID:', newProfile.id)
    console.log('   Full Name:', newProfile.full_name)
    console.log('   Email:', newProfile.email)

    console.log('\n🎉 Done! You can now restore user_organizations for this user.')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Get email from command line
const email = process.argv[2]

if (!email) {
  console.error('❌ Please provide an email address')
  console.error('Usage: npx tsx scripts/restore-profile.ts <email>')
  process.exit(1)
}

restoreProfile(email)
