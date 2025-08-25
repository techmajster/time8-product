#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixAdminRole() {
  try {
    console.log('Starting admin role fix...')
    
    // Find Szymon's user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', 'szymon.rajca@bb8.pl')
      .single()
    
    if (profileError || !profile) {
      console.error('Could not find user szymon.rajca@bb8.pl:', profileError)
      return
    }
    
    console.log('Found user:', profile)
    
    // Get the organization ID
    const { data: userOrg, error: orgError } = await supabase
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', profile.id)
      .eq('is_active', true)
      .single()
    
    if (orgError || !userOrg) {
      console.error('Could not find organization for user:', orgError)
      return
    }
    
    console.log('Current role:', userOrg.role)
    console.log('Organization ID:', userOrg.organization_id)
    
    // Update to admin role
    const { error: updateError } = await supabase
      .from('user_organizations')
      .update({ role: 'admin' })
      .eq('user_id', profile.id)
      .eq('organization_id', userOrg.organization_id)
    
    if (updateError) {
      console.error('Error updating role:', updateError)
      return
    }
    
    console.log('Successfully updated szymon.rajca@bb8.pl to admin role!')
    
    // Verify the update
    const { data: updatedOrg, error: verifyError } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', profile.id)
      .eq('organization_id', userOrg.organization_id)
      .single()
    
    if (verifyError || !updatedOrg) {
      console.error('Error verifying update:', verifyError)
      return
    }
    
    console.log('Verified new role:', updatedOrg.role)
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

fixAdminRole()