import { useQuery } from '@tanstack/react-query'

// Query keys for cache management
export const organizationKeys = {
  all: ['organizations'] as const,
  details: () => [...organizationKeys.all, 'detail'] as const,
  detail: (id: string) => [...organizationKeys.details(), id] as const,
  members: (id: string) => [...organizationKeys.detail(id), 'members'] as const,
}

// Fetch organization details
export function useOrganization(organizationId: string) {
  return useQuery({
    queryKey: organizationKeys.detail(organizationId),
    queryFn: async () => {
      const response = await fetch(`/api/organizations/${organizationId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch organization')
      }
      return response.json()
    },
    staleTime: 1000 * 60 * 10, // 10 minutes (organizations rarely change)
    enabled: !!organizationId,
  })
}

// Fetch organization members
export function useOrganizationMembers(organizationId: string) {
  return useQuery({
    queryKey: organizationKeys.members(organizationId),
    queryFn: async () => {
      const response = await fetch(`/api/organizations/${organizationId}/members`)
      if (!response.ok) {
        throw new Error('Failed to fetch organization members')
      }
      return response.json()
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!organizationId,
  })
}
