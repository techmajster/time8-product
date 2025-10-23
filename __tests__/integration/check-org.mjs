import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { data, error } = await supabase
  .from('organizations')
  .select('id, name, subscription_tier, paid_seats')
  .ilike('name', '%BB8%')

if (error) {
  console.error('Error:', error)
} else {
  console.log('Organizations:', JSON.stringify(data, null, 2))
}
