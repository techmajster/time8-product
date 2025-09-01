/**
 * Billing Authorization Middleware
 * 
 * Authorization checks for billing-related API endpoints.
 * Ensures users can only access their organization's billing data.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface AuthContext {
  user: {
    id: string;
    email: string;
  };
  organization: {
    id: string;
    role: 'admin' | 'member';
  };
}

export interface AuthError {
  error: string;
  status: number;
}

/**
 * Extract user session from request
 */
async function getUserSession(request: NextRequest): Promise<{ user: any; error: any }> {
  const supabase = createClient();
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  } catch (error) {
    return { user: null, error };
  }
}

/**
 * Get user's organization membership and role
 */
async function getUserOrganization(
  userId: string, 
  organizationId: string
): Promise<{ membership: any; error: any }> {
  const supabase = createClient();
  
  try {
    const { data: membership, error } = await supabase
      .from('organization_members')
      .select(`
        id,
        organization_id,
        role,
        status,
        organizations!inner(id, name)
      `)
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single();

    return { membership, error };
  } catch (error) {
    return { membership: null, error };
  }
}

/**
 * Authorize billing access for organization
 * Requires admin role for most billing operations
 */
export async function authorizeBillingAccess(
  request: NextRequest,
  organizationId: string,
  requireAdmin: boolean = true
): Promise<{ context: AuthContext | null; error: AuthError | null }> {
  
  // Get user session
  const { user, error: authError } = await getUserSession(request);
  
  if (authError || !user) {
    return {
      context: null,
      error: {
        error: 'Authentication required',
        status: 401
      }
    };
  }

  // Get user's organization membership
  const { membership, error: memberError } = await getUserOrganization(
    user.id, 
    organizationId
  );

  if (memberError || !membership) {
    return {
      context: null,
      error: {
        error: 'Organization access denied',
        status: 403
      }
    };
  }

  // Check admin requirement
  if (requireAdmin && membership.role !== 'admin') {
    return {
      context: null,
      error: {
        error: 'Admin access required for billing operations',
        status: 403
      }
    };
  }

  // Return auth context
  return {
    context: {
      user: {
        id: user.id,
        email: user.email
      },
      organization: {
        id: membership.organization_id,
        role: membership.role
      }
    },
    error: null
  };
}

/**
 * Authorize read-only billing access (members can view)
 */
export async function authorizeReadOnlyBillingAccess(
  request: NextRequest,
  organizationId: string
): Promise<{ context: AuthContext | null; error: AuthError | null }> {
  return authorizeBillingAccess(request, organizationId, false);
}

/**
 * Authorize admin billing access (admin required)
 */
export async function authorizeAdminBillingAccess(
  request: NextRequest,
  organizationId: string
): Promise<{ context: AuthContext | null; error: AuthError | null }> {
  return authorizeBillingAccess(request, organizationId, true);
}

/**
 * Extract organization ID from request (query params or body)
 */
export function extractOrganizationId(request: NextRequest): string | null {
  // Try query parameters first
  const { searchParams } = new URL(request.url);
  const orgFromQuery = searchParams.get('organization_id');
  
  if (orgFromQuery) {
    return orgFromQuery;
  }

  // For POST/PUT requests, we'll need to parse body
  // This is handled in the route handlers since body can only be read once
  return null;
}

/**
 * Validate organization exists and is active
 */
export async function validateOrganization(
  organizationId: string
): Promise<{ valid: boolean; organization: any }> {
  const supabase = createClient();
  
  try {
    const { data: organization, error } = await supabase
      .from('organizations')
      .select('id, name, status')
      .eq('id', organizationId)
      .eq('status', 'active')
      .single();

    if (error || !organization) {
      return { valid: false, organization: null };
    }

    return { valid: true, organization };
  } catch (error) {
    return { valid: false, organization: null };
  }
}

/**
 * Authorization wrapper for billing endpoints
 */
export function withBillingAuth(
  handler: (request: NextRequest, context: AuthContext) => Promise<Response>,
  requireAdmin: boolean = true
) {
  return async (request: NextRequest): Promise<Response> => {
    try {
      // Extract organization ID
      const organizationId = extractOrganizationId(request);
      
      if (!organizationId) {
        return Response.json(
          { error: 'Missing organization_id parameter' },
          { status: 400 }
        );
      }

      // Validate organization exists
      const { valid, organization } = await validateOrganization(organizationId);
      if (!valid) {
        return Response.json(
          { error: 'Organization not found or inactive' },
          { status: 404 }
        );
      }

      // Authorize access
      const { context, error } = requireAdmin 
        ? await authorizeAdminBillingAccess(request, organizationId)
        : await authorizeReadOnlyBillingAccess(request, organizationId);

      if (error) {
        return Response.json(
          { error: error.error },
          { status: error.status }
        );
      }

      if (!context) {
        return Response.json(
          { error: 'Authorization failed' },
          { status: 500 }
        );
      }

      // Call the actual handler with auth context
      return await handler(request, context);

    } catch (error) {
      console.error('Billing auth error:', error);
      return Response.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Check if user has billing management permissions
 */
export async function hasBillingPermissions(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const { membership } = await getUserOrganization(userId, organizationId);
  return membership?.role === 'admin';
}

/**
 * Audit log for billing operations
 */
export async function logBillingOperation(
  userId: string,
  organizationId: string,
  operation: string,
  details: any = {}
): Promise<void> {
  const supabase = createClient();
  
  try {
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        action: `billing.${operation}`,
        details,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log billing operation:', error);
    // Don't throw - logging failure shouldn't break the operation
  }
}