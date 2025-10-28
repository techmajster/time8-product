/**
 * Check if there's an organization mismatch preventing approval
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function checkOrgMismatch() {
  console.log('========================================')
  console.log('🔍 Checking Organization Mismatch')
  console.log('========================================\n')

  // Get the pending leave request
  const { data: leaveRequest } = await supabase
    .from('leave_requests')
    .select('id, user_id, organization_id, profiles!leave_requests_user_id_fkey(full_name, email)')
    .eq('status', 'pending')
    .limit(1)
    .single()

  if (!leaveRequest) {
    console.log('No pending leave requests found')
    return
  }

  console.log('📋 Pending Leave Request:')
  console.log(`   ID: ${leaveRequest.id}`)
  console.log(`   Org ID: ${leaveRequest.organization_id}`)
  console.log(`   User: ${leaveRequest.profiles.full_name} (${leaveRequest.profiles.email})`)
  console.log('')

  // Get all admins
  const { data: admins } = await supabase
    .from('user_organizations')
    .select('user_id, organization_id, role, is_active, profiles!user_organizations_user_id_fkey(full_name, email)')
    .eq('role', 'admin')
    .eq('is_active', true)

  console.log('👑 Admin Users:')
  admins?.forEach(admin => {
    const canApprove = admin.organization_id === leaveRequest.organization_id
    console.log(`   ${admin.profiles.full_name} (${admin.profiles.email})`)
    console.log(`      Org ID: ${admin.organization_id}`)
    console.log(`      Can approve this request: ${canApprove ? '✅ YES' : '❌ NO'}`)
    console.log('')
  })
}

checkOrgMismatch()
