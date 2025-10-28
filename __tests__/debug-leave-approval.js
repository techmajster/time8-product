/**
 * Debug script to test leave request approval permissions
 * Run with: node __tests__/debug-leave-approval.js
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testLeaveApproval() {
  console.log('========================================')
  console.log('🔍 Testing Leave Request Approval')
  console.log('========================================\n')

  try {
    // 1. Find a pending leave request
    console.log('1️⃣ Finding pending leave requests...')
    const { data: pendingRequests, error: fetchError } = await supabase
      .from('leave_requests')
      .select(`
        id,
        user_id,
        status,
        organization_id,
        start_date,
        end_date,
        profiles!leave_requests_user_id_fkey (
          full_name,
          email
        )
      `)
      .eq('status', 'pending')
      .limit(5)

    if (fetchError) {
      console.error('❌ Error fetching leave requests:', fetchError)
      return
    }

    if (!pendingRequests || pendingRequests.length === 0) {
      console.log('ℹ️  No pending leave requests found')
      return
    }

    console.log(`✅ Found ${pendingRequests.length} pending request(s):\n`)
    pendingRequests.forEach((req, idx) => {
      console.log(`   ${idx + 1}. ID: ${req.id}`)
      console.log(`      User: ${req.profiles?.full_name} (${req.profiles?.email})`)
      console.log(`      Dates: ${req.start_date} to ${req.end_date}`)
      console.log(`      Org ID: ${req.organization_id}`)
      console.log('')
    })

    // 2. Check RLS policies on leave_requests table
    console.log('2️⃣ Checking RLS policies for leave_requests...')
    const { data: policies, error: policyError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT
          policyname,
          cmd,
          permissive,
          roles
        FROM pg_policies
        WHERE tablename = 'leave_requests'
        AND schemaname = 'public'
        ORDER BY policyname;
      `
    }).single()

    if (policyError) {
      console.log('⚠️  Could not fetch policies (expected - need custom function)')
    }

    // 3. Find an admin user
    console.log('3️⃣ Finding admin users...')
    const { data: adminUsers, error: adminError } = await supabase
      .from('user_organizations')
      .select(`
        user_id,
        organization_id,
        role,
        is_active,
        profiles!user_organizations_user_id_fkey (
          full_name,
          email
        )
      `)
      .eq('role', 'admin')
      .eq('is_active', true)
      .limit(3)

    if (adminError) {
      console.error('❌ Error fetching admin users:', adminError)
      return
    }

    if (!adminUsers || adminUsers.length === 0) {
      console.log('⚠️  No admin users found')
      return
    }

    console.log(`✅ Found ${adminUsers.length} admin user(s):\n`)
    adminUsers.forEach((admin, idx) => {
      console.log(`   ${idx + 1}. ${admin.profiles?.full_name} (${admin.profiles?.email})`)
      console.log(`      User ID: ${admin.user_id}`)
      console.log(`      Org ID: ${admin.organization_id}`)
      console.log('')
    })

    // 4. Try to update a leave request using admin client
    if (pendingRequests.length > 0) {
      const testRequest = pendingRequests[0]
      console.log('4️⃣ Testing update with admin client (service role)...')
      console.log(`   Request ID: ${testRequest.id}`)
      console.log(`   Current status: ${testRequest.status}`)

      const { data: updateResult, error: updateError } = await supabase
        .from('leave_requests')
        .update({
          // Don't actually change status, just test with a harmless field
          review_comment: 'TEST - checking permissions'
        })
        .eq('id', testRequest.id)
        .select()

      if (updateError) {
        console.error('❌ UPDATE FAILED:', updateError)
        console.error('   Message:', updateError.message)
        console.error('   Code:', updateError.code)
        console.error('   Details:', updateError.details)
      } else {
        console.log('✅ UPDATE SUCCEEDED')
        console.log('   Updated record:', updateResult)
      }

      // Clean up the test
      if (!updateError) {
        await supabase
          .from('leave_requests')
          .update({ review_comment: null })
          .eq('id', testRequest.id)
        console.log('✅ Cleaned up test comment')
      }
    }

    console.log('\n========================================')
    console.log('Test Complete')
    console.log('========================================')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testLeaveApproval()
