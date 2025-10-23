import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTestInvitation() {
  console.log('🔍 Creating test invitation for admin@bb8.pl...')

  // First, get BB8 Studio organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('name', 'BB8 Studio')
    .single()

  if (orgError || !org) {
    console.error('❌ Organization not found:', orgError)
    return
  }

  console.log('✅ Found organization:', org)

  // Create invitation
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

  const timestamp = Date.now()
  const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase()

  const invitationData = {
    email: 'admin@bb8.pl',
    full_name: 'Admin User',
    role: 'admin',
    organization_id: org.id,
    invited_by: '0e85cab7-1ef3-4161-96cc-249c982d0af4', // admin@bb8.pl user ID
    status: 'pending',
    expires_at: expiresAt.toISOString(),
    token: `test-token-${timestamp}`
  }

  const { data: invitation, error: invError } = await supabase
    .from('invitations')
    .insert(invitationData)
    .select()
    .single()

  if (invError) {
    console.error('❌ Failed to create invitation:', invError)
    return
  }

  console.log('✅ Invitation created successfully!')
  console.log('📧 Email:', invitation.email)
  console.log('🎫 Token:', invitation.token)
  console.log('🔗 Invitation Link:', `http://localhost:3000/onboarding/join?token=${invitation.token}`)
}

createTestInvitation()
