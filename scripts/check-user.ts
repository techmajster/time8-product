/**
 * Diagnostic script to check user status in Supabase
 * Run with: npx tsx scripts/check-user.ts <email>
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

async function checkUser(email: string) {
  console.log('\n🔍 Checking user status for:', email)
  console.log('─'.repeat(60))

  try {
    // Get user from auth.users table using admin API
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error('❌ Error fetching users:', listError)
      return
    }

    const user = users.find(u => u.email === email)

    if (!user) {
      console.log('❌ User NOT FOUND in database')
      console.log('   This user has never signed up or the account was deleted.')
      return
    }

    console.log('✅ User EXISTS in database')
    console.log('   User ID:', user.id)
    console.log('   Email:', user.email)
    console.log('   Created:', new Date(user.created_at).toLocaleString())
    console.log('   Last Sign In:', user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never')

    // Check email confirmation status
    console.log('\n📧 Email Verification Status:')
    if (user.email_confirmed_at) {
      console.log('   ✅ VERIFIED at:', new Date(user.email_confirmed_at).toLocaleString())
    } else {
      console.log('   ❌ NOT VERIFIED')
      console.log('   ⚠️  This is likely why login is failing!')
    }

    // Check if user is banned
    console.log('\n🔒 Account Status:')
    if (user.banned_until) {
      console.log('   ❌ BANNED until:', new Date(user.banned_until).toLocaleString())
    } else {
      console.log('   ✅ Active (not banned)')
    }

    // Check user metadata
    console.log('\n👤 User Metadata:')
    console.log('   Full Name:', user.user_metadata?.full_name || 'Not set')
    console.log('   Provider:', user.app_metadata?.provider || 'email')

    // Check profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    console.log('\n📝 Profile Record:')
    if (profileError) {
      console.log('   ❌ Profile NOT FOUND:', profileError.message)
    } else {
      console.log('   ✅ Profile exists')
      console.log('   Full Name:', profile.full_name)
      console.log('   Created:', new Date(profile.created_at).toLocaleString())
    }

    // Provide actionable advice
    console.log('\n💡 Recommendations:')
    if (!user.email_confirmed_at) {
      console.log('   1. Resend verification email')
      console.log('   2. Check spam folder for verification email')
      console.log('   3. OR manually verify using: npm run verify-email ' + email)
    } else {
      console.log('   1. User is verified - try resetting password')
      console.log('   2. Double-check password is correct')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Get email from command line
const email = process.argv[2]

if (!email) {
  console.error('❌ Please provide an email address')
  console.error('Usage: npx tsx scripts/check-user.ts <email>')
  process.exit(1)
}

checkUser(email)
