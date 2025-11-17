import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
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
    const { user, organization, role, userOrganization } = context
    const organizationId = organization.id
    console.log('Authenticated user:', { userId: user.id, organizationId, role })

    // Check if user is admin
    if (role !== 'admin') {
      console.error('User is not admin:', role)
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }
    
    console.log('=== ADMIN CHECK PASSED ===')

    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

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

    const { name, ownerId, countryCode, locale } = body
    console.log('Extracted fields:', { name, ownerId, countryCode, locale })

    // Validate required fields
    if (!name) {
      console.error('Missing required field: name')
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Note: ownerId is optional - only required if changing ownership
    // If not provided, organization settings are updated without ownership change

    console.log('=== VALIDATION PASSED ===')

    // Update organization
    const updateData: any = {
      name,
      country_code: countryCode,
      locale
    }

    // Only process ownership changes if ownerId is provided
    if (ownerId) {
      // Determine current ownership status
      const isCurrentOwner = Boolean(userOrganization?.is_owner)

      const { data: currentOwnerRow, error: currentOwnerError} = await supabaseAdmin
        .from('user_organizations')
        .select('user_id')
        .eq('organization_id', organizationId)
        .eq('is_owner', true)
        .maybeSingle()

      if (currentOwnerError && currentOwnerError.code !== 'PGRST116') {
        console.error('Failed to fetch current owner:', currentOwnerError)
        return NextResponse.json({ error: 'Failed to verify current owner' }, { status: 500 })
      }

      const currentOwnerId = currentOwnerRow?.user_id || null
      const isOwnershipChange = ownerId !== currentOwnerId
      const canTransferOwnership = isCurrentOwner || !currentOwnerId

      if (isOwnershipChange && !canTransferOwnership) {
        console.error('Ownership transfer blocked: user is not current owner')
        return NextResponse.json({ error: 'Only the current workspace owner can transfer ownership' }, { status: 403 })
      }

      if (isOwnershipChange) {
        console.log('Fetching target owner info:', ownerId)
        const { data: targetOwner, error: targetOwnerError } = await supabaseAdmin
          .from('user_organizations')
          .select('user_id, role, is_owner')
          .eq('user_id', ownerId)
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .single()

        if (targetOwnerError || !targetOwner) {
          console.error('Owner not found in organization:', ownerId, targetOwnerError)
          return NextResponse.json({ error: 'Selected owner not found in organization' }, { status: 400 })
        }

        if (targetOwner.role !== 'admin') {
          console.log('Promoting selected owner to admin role')
          const { error: promoteError } = await supabaseAdmin
            .from('user_organizations')
            .update({ role: 'admin' })
            .eq('user_id', ownerId)
            .eq('organization_id', organizationId)

          if (promoteError) {
            console.error('Failed to promote owner to admin:', promoteError)
            return NextResponse.json({ error: 'Failed to promote owner to admin role' }, { status: 500 })
          }
        }

        console.log('Transferring ownership to user:', ownerId)

        const { error: clearOwnerError } = await supabaseAdmin
          .from('user_organizations')
          .update({ is_owner: false })
          .eq('organization_id', organizationId)
          .eq('is_owner', true)

        if (clearOwnerError) {
          console.error('Failed to clear existing owner:', clearOwnerError)
          return NextResponse.json({ error: 'Failed to clear existing owner' }, { status: 500 })
        }

        const { error: setOwnerError } = await supabaseAdmin
          .from('user_organizations')
          .update({ is_owner: true, role: 'admin' })
          .eq('user_id', ownerId)
          .eq('organization_id', organizationId)

        if (setOwnerError) {
          console.error('Failed to assign new owner:', setOwnerError)
          return NextResponse.json({ error: 'Failed to assign new owner' }, { status: 500 })
        }

        console.log('Ownership transferred successfully')
      } else {
        console.log('Selected user is already the owner, skipping transfer')
      }
    } else {
      console.log('No ownerId provided, skipping ownership transfer')
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