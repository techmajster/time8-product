import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authenticateAndGetOrgContext } from '@/lib/auth-utils-v2'

export async function PUT(request: NextRequest) {
  try {
    console.log('=== API START ===')
    console.log('Request headers:', {
      'x-organization-id': request.headers.get('x-organization-id'),
      'content-type': request.headers.get('content-type')
    })
    
    // Use optimized auth utility
    const auth = await authenticateAndGetOrgContext()
    console.log('Auth result:', { success: auth.success, role: auth.success ? auth.context.role : 'N/A' })
    
    if (!auth.success) {
      console.error('Auth failed:', auth.error)
      return auth.error
    }
    
    console.log('=== AUTH SUCCESS ===')
    
    const { context } = auth
    const { user, organization, role } = context
    const organizationId = organization.id
    console.log('Authenticated user:', { userId: user.id, organizationId, role })

    // Check if user is admin
    if (role !== 'admin') {
      console.error('User is not admin:', role)
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }
    
    console.log('=== ADMIN CHECK PASSED ===')

    const supabase = await createClient()

    // Get request body
    const body = await request.json()
    console.log('Received request body:', body)
    console.log('Request headers:', Object.fromEntries(request.headers.entries()))

    // Check for deprecated fields and reject them
    const deprecatedFields = ['slug', 'logo', 'logoUrl', 'googleDomain', 'requireGoogleDomain']
    const foundDeprecatedFields = deprecatedFields.filter(field => field in body)

    if (foundDeprecatedFields.length > 0) {
      console.error('Deprecated fields found in request:', foundDeprecatedFields)
      return NextResponse.json({
        error: 'The following fields are no longer supported and have been removed',
        deprecatedFields: foundDeprecatedFields
      }, { status: 400 })
    }

    const { name, adminId, countryCode, locale } = body
    console.log('Extracted fields:', { name, adminId, countryCode, locale })

    // Validate required fields
    if (!name) {
      console.error('Missing required field: name')
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    console.log('=== VALIDATION PASSED ===')

    // Update organization
    const updateData: any = {
      name,
      country_code: countryCode,
      locale
    }

    // Process admin change if adminId is provided and it's different from current user
    if (adminId && adminId !== user.id) {
      console.log('Processing admin change from', user.id, 'to:', adminId)
      
      // Verify the new admin exists in the organization
      const { data: newAdminOrg, error: newAdminError } = await supabase
        .from('user_organizations')
        .select(`
          user_id,
          role,
          profiles!inner (
            id,
            email,
            full_name
          )
        `)
        .eq('user_id', adminId)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single()

      if (newAdminError || !newAdminOrg) {
        console.error('New admin not found in organization:', adminId, newAdminError)
        return NextResponse.json({ error: 'Selected user not found in organization' }, { status: 400 })
      }

      console.log('New admin found:', (newAdminOrg.profiles as any).email, 'current role:', newAdminOrg.role)

      // Check current admins in the organization
      const { data: currentAdmins, error: currentAdminError } = await supabase
        .from('user_organizations')
        .select(`
          user_id,
          profiles!inner (
            email
          )
        `)
        .eq('organization_id', organizationId)
        .eq('role', 'admin')
        .eq('is_active', true)

      if (currentAdminError) {
        console.error('Error checking current admins:', currentAdminError)
        return NextResponse.json({ error: 'Failed to check current admins' }, { status: 500 })
      }

      console.log('Current admins:', currentAdmins)

      // Allow admin change - the safety check was preventing legitimate transfers
      console.log('Proceeding with admin change')

      // Set the new admin as admin FIRST
      const { error: setError } = await supabase
        .from('user_organizations')
        .update({ role: 'admin' })
        .eq('user_id', adminId)
        .eq('organization_id', organizationId)

      if (setError) {
        console.error('Error setting new admin:', setError)
        return NextResponse.json({ error: 'Failed to set new admin' }, { status: 500 })
      }
      console.log('Admin role set successfully for:', (newAdminOrg.profiles as any).email)

      // Then remove admin from current user
      const { error: removeError } = await supabase
        .from('user_organizations')
        .update({ role: 'employee' })
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)

      if (removeError) {
        console.error('Error removing current user admin role:', removeError)
        return NextResponse.json({ error: 'Failed to remove current user admin role' }, { status: 500 })
      }
      console.log('Removed admin role from current user')

      console.log('Admin changed successfully to:', (newAdminOrg.profiles as any).email)
    } else if (adminId === user.id) {
      console.log('Admin not changing - same user selected, keeping current admin')
    }

    console.log('=== REACHING ORGANIZATION UPDATE ===')
    console.log('Updating organization with data:', updateData)
    console.log('Organization ID:', organizationId)
    
    const { data: updatedOrg, error: updateError } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)
      .select()

    if (updateError) {
      console.error('Error updating organization:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update organization', 
        details: updateError.message,
        code: updateError.code
      }, { status: 500 })
    }

    console.log('=== API SUCCESS ===')

    return NextResponse.json({ 
      success: true, 
      organization: updatedOrg?.[0] || null,
      message: 'Organization updated successfully'
    })

  } catch (error) {
    console.error('=== API ERROR ===')
    console.error('Error in organization update:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
} 