import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // SECURITY: Debug endpoint - only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Debug endpoints are disabled in production' },
        { status: 403 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get cookies
    const cookieStore = await cookies()
    const activeOrgId = cookieStore.get('active-organization-id')?.value

    // Get all user organizations
    const { data: allOrgs } = await supabase
      .from('user_organizations')
      .select('role, is_active, is_default, organization_id, organizations(name)')
      .eq('user_id', user.id)

    // Get the active organization
    let activeOrgQuery = supabase
      .from('user_organizations')
      .select('role, organization_id, organizations(name)')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (activeOrgId) {
      activeOrgQuery = activeOrgQuery.eq('organization_id', activeOrgId)
    } else {
      activeOrgQuery = activeOrgQuery.eq('is_default', true)
    }

    const { data: activeOrg } = await activeOrgQuery.single()

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
      cookies: {
        activeOrganizationId: activeOrgId || null
      },
      allOrganizations: allOrgs,
      activeOrganization: activeOrg,
      permissions: {
        role: activeOrg?.role || null,
        canAccessTeam: activeOrg?.role === 'manager' || activeOrg?.role === 'admin',
        canAccessAdmin: activeOrg?.role === 'admin',
        canAccessSettings: activeOrg?.role === 'admin'
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
