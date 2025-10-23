import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const orgId = 'a5b891a0-f314-498d-aa9d-fa9dcc13d0ce'

// Get member count
const { count: memberCount } = await supabase
  .from('user_organizations')
  .select('user_id', { count: 'exact' })
  .eq('organization_id', orgId)
  .eq('is_active', true)

// Get pending invitations
const { count: pendingCount } = await supabase
  .from('invitations')
  .select('id', { count: 'exact' })
  .eq('organization_id', orgId)
  .eq('status', 'pending')

console.log('Current members:', memberCount)
console.log('Pending invitations:', pendingCount)
console.log('Total used seats:', memberCount + pendingCount)
console.log('With 6 paid seats, total available:', 9)
console.log('Available seats:', 9 - (memberCount + pendingCount))
