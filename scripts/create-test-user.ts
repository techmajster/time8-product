/**
 * Create Test User Script
 *
 * Creates a test user with admin access to an organization
 * Usage: npx tsx scripts/create-test-user.ts <email> <password> <org-id>
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTestUser(email: string, password: string, organizationId: string) {
  console.log('\n🔧 Creating test user...')
  console.log(`📧 Email: ${email}`)
  console.log(`🏢 Organization ID: ${organizationId}`)

  // Create user in auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: 'Test User'
    }
  })

  if (authError) {
    console.error('❌ Error creating user:', authError)
    process.exit(1)
  }

  console.log(`✅ User created with ID: ${authData.user.id}`)

  // Add user to organization as admin
  const { error: orgError } = await supabase
    .from('user_organizations')
    .insert({
      user_id: authData.user.id,
      organization_id: organizationId,
      role: 'admin'
    })

  if (orgError) {
    console.error('❌ Error adding user to organization:', orgError)
    process.exit(1)
  }

  console.log('\n✅ Test user created successfully!')
  console.log('\n📋 Login credentials:')
  console.log(`Email: ${email}`)
  console.log(`Password: ${password}`)
  console.log('\n🔗 Login at: http://localhost:3000/login')
  console.log('Then go to: Admin Settings > Billing\n')
}

const args = process.argv.slice(2)
const email = args[0]
const password = args[1]
const organizationId = args[2]

if (!email || !password || !organizationId) {
  console.error('❌ Missing required arguments')
  console.log('\nUsage:')
  console.log('  npx tsx scripts/create-test-user.ts <email> <password> <org-id>')
  console.log('\nExample:')
  console.log('  npx tsx scripts/create-test-user.ts test@example.com password123 1bbccc20-f91f-4705-9bc6-f7534eea32a4')
  console.log('\n💡 First, list organizations:')
  console.log('  npx tsx scripts/test-subscription-status.ts list')
  process.exit(1)
}

createTestUser(email, password, organizationId)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Unexpected error:', err)
    process.exit(1)
  })
