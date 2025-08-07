import { NextResponse } from 'next/server'
import { authenticateAndGetOrgContext } from '@/lib/auth-utils-v2'

/**
 * ✅ OPTIMIZATION: Combined dashboard data API endpoint
 * Reduces multiple frontend API calls into single optimized request
 * Provides all dashboard data needed in one response
 */
export async function GET() {
  const authResult = await authenticateAndGetOrgContext()
  if (!authResult.success) {
    return authResult.error
  }

  const { context } = authResult
  const organizationId = context.organization.id

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // ✅ OPTIMIZATION: Fetch all dashboard data in parallel for better performance
    const [
      teamMembersResult,
      pendingRequestsResult,
      recentLeavesResult,
      leaveTypesResult,
      upcomingHolidaysResult
    ] = await Promise.all([
      // Team members with essential info only (via user_organizations)
      supabase
        .from('user_organizations')
        .select(`
          role,
          profiles!inner(id, email, full_name, avatar_url)
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('profiles(full_name)'),

      // Pending leave requests count (via user_organizations)
      supabase
        .from('leave_requests')
        .select(`
          id, created_at,
          profiles!inner(
            full_name, 
            email,
            user_organizations!inner(organization_id)
          )
        `)
        .eq('profiles.user_organizations.organization_id', organizationId)
        .eq('profiles.user_organizations.is_active', true)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10),

      // Recent approved leaves for timeline (via user_organizations)
      supabase
        .from('leave_requests')
        .select(`
          id, start_date, end_date, status,
          leave_types(name, color),
          profiles!inner(
            full_name, 
            email,
            user_organizations!inner(organization_id)
          )
        `)
        .eq('profiles.user_organizations.organization_id', organizationId)
        .eq('profiles.user_organizations.is_active', true)
        .in('status', ['approved', 'pending'])
        .gte('start_date', new Date().toISOString().split('T')[0])
        .order('start_date')
        .limit(20),

      // Leave types for dropdowns
      supabase
        .from('leave_types')
        .select('id, name, color, leave_category, requires_balance')
        .eq('organization_id', organizationId)
        .order('name'),

      // Upcoming holidays
      supabase
        .from('company_holidays')
        .select('id, name, date, type')
        .eq('organization_id', organizationId)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date')
        .limit(5)
    ])

    // Check for errors
    if (teamMembersResult.error) throw teamMembersResult.error
    if (pendingRequestsResult.error) throw pendingRequestsResult.error
    if (recentLeavesResult.error) throw recentLeavesResult.error
    if (leaveTypesResult.error) throw leaveTypesResult.error
    if (upcomingHolidaysResult.error) throw upcomingHolidaysResult.error

    // Calculate summary stats
    const stats = {
      totalTeamMembers: teamMembersResult.data?.length || 0,
      pendingRequests: pendingRequestsResult.data?.length || 0,
      upcomingLeaves: recentLeavesResult.data?.filter(leave => 
        leave.status === 'approved' && 
        new Date(leave.start_date) > new Date()
      ).length || 0,
      peopleOnLeaveToday: recentLeavesResult.data?.filter(leave => {
        const today = new Date().toISOString().split('T')[0]
        return leave.status === 'approved' && 
               leave.start_date <= today && 
               leave.end_date >= today
      }).length || 0
    }

    // Transform data to match expected frontend format
    const teamMembers = teamMembersResult.data?.map(item => ({
      ...item.profiles,
      role: item.role
    })) || []

    return NextResponse.json({
      success: true,
      data: {
        teamMembers,
        pendingRequests: pendingRequestsResult.data || [],
        recentLeaves: recentLeavesResult.data || [],
        leaveTypes: leaveTypesResult.data || [],
        upcomingHolidays: upcomingHolidaysResult.data || [],
        stats
      }
    })

  } catch (error) {
    console.error('Dashboard data fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
} 