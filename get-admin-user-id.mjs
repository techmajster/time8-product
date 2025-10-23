import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function getAdminUserId() {
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const admin = users.find(u => u.email === 'admin@bb8.pl')
  console.log('Admin user ID:', admin?.id)
}

getAdminUserId()
