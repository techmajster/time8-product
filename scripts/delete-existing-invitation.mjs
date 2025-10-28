import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function deleteExistingInvitation() {
  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('email', 'admin@bb8.pl')
    .eq('organization_id', 'a5b891a0-f314-498d-aa9d-fa9dcc13d0ce')

  if (error) {
    console.error('❌ Failed to delete:', error)
  } else {
    console.log('✅ Deleted existing invitations')
  }
}

deleteExistingInvitation()
