import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBasicAuth } from '@/lib/auth-utils'

export async function PUT(request: NextRequest) {
  try {
    // Use optimized auth utility
    const auth = await getBasicAuth()
    if (!auth.success) return auth.error
    const { user, organizationId, role } = auth

    // Check if user is admin
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const supabase = await createClient()

    // Get request body
    const body = await request.json()
    const { googleDomain, requireGoogleDomain } = body

    // Update organization with Google Workspace settings
    const updateData: any = {
      google_domain: googleDomain || null,
      require_google_domain: requireGoogleDomain || false
    }

    const { data: updatedOrg, error: updateError } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating Google Workspace settings:', updateError)
      return NextResponse.json({ error: 'Failed to update Google Workspace settings' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      organization: updatedOrg 
    })

  } catch (error) {
    console.error('Error in Google Workspace update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 