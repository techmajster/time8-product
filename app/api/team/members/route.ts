import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getBasicAuth, isManagerOrAdmin } from '@/lib/auth-utils'
import { invalidateOrganizationCache } from '@/lib/cache-utils'

export async function PUT(request: NextRequest) {
  try {
    const { memberId, newRole } = await request.json()

    if (!memberId || !newRole) {
      return NextResponse.json(
        { error: 'Member ID and new role are required' },
        { status: 400 }
      )
    }

    if (!['admin', 'manager', 'employee'].includes(newRole)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, manager, or employee' },
        { status: 400 }
      )
    }

    // Use optimized auth utility
    const auth = await getBasicAuth()
    if (!auth.success) return auth.error
    const { user, organizationId, role } = auth

    // Check if user has permission to change roles
    if (!isManagerOrAdmin(role)) {
      return NextResponse.json(
        { error: 'You do not have permission to change member roles' },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    // Get the member to verify they're in the same organization
    const { data: member, error: memberError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, organization_id')
      .eq('id', memberId)
      .single()

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Verify the member belongs to the user's organization
    if (member.organization_id !== organizationId) {
      return NextResponse.json(
        { error: 'You can only manage members from your organization' },
        { status: 403 }
      )
    }

    // Prevent users from changing their own role
    if (member.id === user.id) {
      return NextResponse.json(
        { error: 'You cannot change your own role' },
        { status: 400 }
      )
    }

    // Only admins can promote to admin role
    if (newRole === 'admin' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can promote members to admin role' },
        { status: 403 }
      )
    }

    // Update the member's role 
    console.log(`🔄 Attempting to update role for user ${memberId} from ${member.role} to ${newRole}`)
    
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', memberId)
      .select()

    console.log('📋 Update result:', { updateData, updateError })

    if (updateError) {
      console.error('❌ Error updating member role:', updateError)
      return NextResponse.json(
        { error: 'Failed to update member role: ' + updateError.message },
        { status: 500 }
      )
    }

    if (!updateData || updateData.length === 0) {
      console.error('⚠️ No rows updated - check if user exists and permissions are correct')
      return NextResponse.json(
        { error: 'No rows were updated. User may not exist or you may not have permission.' },
        { status: 404 }
      )
    }

    // Verify the update by querying the user again
    const { data: verifyUser, error: verifyError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', memberId)
      .single()

    console.log('✅ Verification query result:', { verifyUser, verifyError })

    // Invalidate organization cache
    invalidateOrganizationCache(organizationId)

    return NextResponse.json({
      success: true,
      message: `Member role updated to ${newRole}`,
      member: {
        id: member.id,
        email: member.email,
        full_name: member.full_name,
        role: newRole
      },
      // Add verification data for debugging
      verification: verifyUser
    })

  } catch (error) {
    console.error('API Error updating member role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const memberId = url.searchParams.get('memberId')

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      )
    }

    // Use optimized auth utility
    const auth = await getBasicAuth()
    if (!auth.success) return auth.error
    const { user, organizationId, role } = auth

    // Check if user has permission to remove members
    if (!isManagerOrAdmin(role)) {
      return NextResponse.json(
        { error: 'You do not have permission to remove team members' },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    // Get the member to verify they're in the same organization
    const { data: member, error: memberError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, organization_id')
      .eq('id', memberId)
      .single()

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Verify the member belongs to the user's organization
    if (member.organization_id !== organizationId) {
      return NextResponse.json(
        { error: 'You can only remove members from your organization' },
        { status: 403 }
      )
    }

    // Prevent users from removing themselves
    if (member.id === user.id) {
      return NextResponse.json(
        { error: 'You cannot remove yourself from the team' },
        { status: 400 }
      )
    }

    // Only admins can remove other admins
    if (member.role === 'admin' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can remove other administrators' },
        { status: 403 }
      )
    }

    // Remove the member from the organization by setting organization_id to null
    // This preserves their profile but removes them from the organization
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        organization_id: null,
        role: 'employee' // Reset role when removing from organization
      })
      .eq('id', memberId)

    if (updateError) {
      console.error('Error removing member:', updateError)
      return NextResponse.json(
        { error: 'Failed to remove member from organization' },
        { status: 500 }
      )
    }

    // Also remove any pending invitations for this email if they exist
    await supabase
      .from('invitations')
      .delete()
      .eq('email', member.email)
      .eq('organization_id', organizationId)

    // Invalidate organization cache
    invalidateOrganizationCache(organizationId)

    return NextResponse.json({
      success: true,
      message: `${member.full_name || member.email} has been removed from the organization`,
      removedMember: {
        id: member.id,
        email: member.email,
        full_name: member.full_name
      }
    })

  } catch (error) {
    console.error('API Error removing member:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 