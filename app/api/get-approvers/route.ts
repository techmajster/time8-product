import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const employeeId = searchParams.get('employeeId') // Optional: to get specific employee's approver

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Verify user is authenticated and in this organization
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user belongs to this organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()

    if (!userOrg) {
      return NextResponse.json(
        { error: 'User does not belong to this organization' },
        { status: 403 }
      )
    }

    // Use admin client to fetch all approvers (bypassing RLS)
    const supabaseAdmin = createAdminClient()

    const { data: approvers, error } = await supabaseAdmin
      .from('user_organizations')
      .select(`
        user_id,
        role,
        profiles!user_organizations_user_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .in('role', ['manager', 'admin'])

    if (error) {
      console.error('Error fetching approvers:', error)
      return NextResponse.json(
        { error: 'Failed to fetch approvers' },
        { status: 500 }
      )
    }

    // Transform to expected format
    const transformedApprovers = (approvers || []).map((item: any) => ({
      id: item.profiles.id,
      full_name: item.profiles.full_name,
      email: item.profiles.email
    }))

    // If employeeId is provided, also fetch that employee's current approver
    let employeeApproverId = null
    if (employeeId) {
      const { data: employeeOrg } = await supabaseAdmin
        .from('user_organizations')
        .select('approver_id')
        .eq('user_id', employeeId)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single()

      employeeApproverId = employeeOrg?.approver_id || null
    }

    return NextResponse.json({
      approvers: transformedApprovers,
      employeeApproverId
    })
  } catch (error) {
    console.error('Unexpected error in get-approvers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
