/**
 * Script to manually verify a user's email
 * Run with: npx tsx scripts/verify-email.ts <email>
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

async function verifyEmail(email: string) {
  console.log('\n🔧 Manually verifying email for:', email)
  console.log('─'.repeat(60))

  try {
    // First, check if user exists
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error('❌ Error fetching users:', listError)
      return
    }

    const user = users.find(u => u.email === email)

    if (!user) {
      console.log('❌ User NOT FOUND')
      console.log('   Cannot verify email for a user that does not exist.')
      return
    }

    if (user.email_confirmed_at) {
      console.log('ℹ️  User email is ALREADY VERIFIED')
      console.log('   Verified at:', new Date(user.email_confirmed_at).toLocaleString())
      return
    }

    // Update user to mark email as confirmed
    const { data, error } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        email_confirm: true
      }
    )

    if (error) {
      console.error('❌ Error verifying email:', error)
      return
    }

    console.log('✅ Email SUCCESSFULLY VERIFIED!')
    console.log('   User can now log in with their password.')
    console.log('\n📋 Updated User Info:')
    console.log('   User ID:', data.user.id)
    console.log('   Email:', data.user.email)
    console.log('   Verified at:', new Date(data.user.email_confirmed_at!).toLocaleString())

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Get email from command line
const email = process.argv[2]

if (!email) {
  console.error('❌ Please provide an email address')
  console.error('Usage: npx tsx scripts/verify-email.ts <email>')
  process.exit(1)
}

verifyEmail(email)
