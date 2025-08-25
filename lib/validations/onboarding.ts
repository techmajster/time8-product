import { z } from 'zod'

// Schema for creating a new organization (matches existing API)
export const createOrganizationSchema = z.object({
  name: z.string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-._&()]+$/, 'Organization name contains invalid characters'),
  
  slug: z.string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .refine(slug => !slug.startsWith('-') && !slug.endsWith('-'), 'Slug cannot start or end with a hyphen'),
  
  google_domain: z.string()
    .min(3, 'Domain must be at least 3 characters')
    .regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Please enter a valid domain')
    .optional()
    .nullable(),
  
  require_google_domain: z.boolean().optional().default(false),
  
  country_code: z.string()
    .length(2, 'Country code must be 2 characters')
    .regex(/^[A-Z]{2}$/, 'Country code must be uppercase letters')
    .optional()
    .default('PL')
})

// Schema for accepting an invitation
export const acceptInvitationSchema = z.object({
  invitation_id: z.string()
    .uuid('Invalid invitation ID format')
})

// Schema for organization status response validation
export const organizationStatusResponseSchema = z.object({
  scenario: z.enum(['has_organizations', 'has_invitations', 'no_invitations']),
  hasOrganizations: z.boolean(),
  organizations: z.array(z.object({
    organization_id: z.string().uuid(),
    role: z.string(),
    is_default: z.boolean(),
    is_active: z.boolean(),
    organizations: z.object({
      name: z.string(),
      slug: z.string().optional()
    })
  })).optional(),
  defaultOrganization: z.object({
    id: z.string().uuid(),
    name: z.string(),
    role: z.string()
  }).optional(),
  pendingInvitations: z.array(z.object({
    id: z.string().uuid(),
    organization_id: z.string().uuid(),
    role: z.string(),
    team_id: z.string().uuid().nullable().optional(),
    organizations: z.object({
      name: z.string()
    }),
    teams: z.object({
      name: z.string()
    }).nullable().optional()
  })).optional()
})

// Type exports
export type CreateOrganizationFormData = z.infer<typeof createOrganizationSchema>
export type AcceptInvitationFormData = z.infer<typeof acceptInvitationSchema>
export type OrganizationStatusData = z.infer<typeof organizationStatusResponseSchema>