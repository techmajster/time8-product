# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-01-15-admin-settings-figma-redesign/spec.md

## Modified Endpoints

### PUT /api/admin/settings/organization

**Purpose:** Update organization settings (workspace name, administrator, holiday calendar, language)

**File:** `app/api/admin/settings/organization/route.ts`

**Request Body (Updated):**
```typescript
{
  name: string,              // Required: Organization name
  adminId?: string,          // Optional: New administrator user ID
  countryCode: string,       // Required: ISO country code for holiday calendar
  locale: string            // Required: Primary language locale (e.g., 'pl', 'en')
}
```

**Removed Fields (no longer accepted):**
```typescript
// These fields should be rejected with 400 error
slug?: string,                    // REMOVED
googleDomain?: string,            // REMOVED
requireGoogleDomain?: boolean,    // REMOVED
logoUrl?: string                  // REMOVED
```

**Validation Updates:**
```typescript
// Add validation to reject deprecated fields
if ('slug' in body || 'googleDomain' in body ||
    'requireGoogleDomain' in body || 'logoUrl' in body) {
  return NextResponse.json(
    {
      error: 'Deprecated fields are no longer supported',
      deprecatedFields: ['slug', 'googleDomain', 'requireGoogleDomain', 'logoUrl']
    },
    { status: 400 }
  )
}

// Existing validations remain:
- name: required, min 1 char, max 100 chars
- adminId: optional, must be valid user ID in organization
- countryCode: required, must be valid ISO country code
- locale: required, must be in supported locales list
```

**Response (200 OK):**
```typescript
{
  success: true,
  organization: {
    id: string,
    name: string,
    country_code: string,
    locale: string,
    created_at: string,
    updated_at: string,
    // Deprecated fields removed from response
  }
}
```

**Response (400 Bad Request) - New:**
```typescript
{
  error: string,
  deprecatedFields?: string[]
}
```

**Implementation Changes:**

1. **Remove Slug Uniqueness Check:**
```typescript
// REMOVE THIS CODE:
// const { data: existingOrg } = await supabase
//   .from('organizations')
//   .select('id')
//   .eq('slug', slug)
//   .neq('id', organizationId)
//   .single()
```

2. **Update Database Query:**
```typescript
// Before:
const { data, error } = await supabase
  .from('organizations')
  .update({
    name,
    slug,           // REMOVE
    google_domain,  // REMOVE
    require_google_domain,  // REMOVE
    country_code: countryCode,
    locale
  })
  .eq('id', organizationId)

// After:
const { data, error } = await supabase
  .from('organizations')
  .update({
    name,
    country_code: countryCode,
    locale,
    updated_at: new Date().toISOString()
  })
  .eq('id', organizationId)
```

3. **Update Admin Reassignment Logic (Keep Unchanged):**
```typescript
// This logic remains the same:
if (adminId) {
  // 1. Verify new admin exists in organization
  // 2. Update new user to admin role
  // 3. Demote current user to employee role
}
```

**Error Handling:**
```typescript
// Add new error case
if (deprecatedFieldsProvided) {
  return NextResponse.json(
    {
      error: 'The following fields are deprecated and no longer supported: ' +
             deprecatedFields.join(', '),
      deprecatedFields
    },
    { status: 400 }
  )
}

// Existing error cases remain:
// - 401: Unauthorized (no user)
// - 403: Forbidden (not admin)
// - 400: Invalid input (validation errors)
// - 404: Organization not found
// - 500: Server error
```

## Unchanged Endpoints

The following endpoints require NO changes:

### PUT /api/admin/settings/calendar-restriction
- Keep existing implementation
- No longer visible in UI but functionality preserved

### POST /api/admin/settings/work-mode
- Keep existing implementation
- Will be used when backend functionality is added

### GET /api/billing/subscription
- Keep existing implementation
- Used by Rozliczenia tab (unchanged)

### DELETE /api/workspaces/{orgId}
- Keep existing implementation
- No longer accessible from UI but preserved for potential future use

### POST /api/admin/cancel-removal/{userId}
- Keep existing implementation
- Used by Rozliczenia tab (unchanged)

### POST /api/admin/reactivate-user/{userId}
- Keep existing implementation
- Used by Rozliczenia tab (unchanged)

## TypeScript Type Updates

**Update:** `types/organization.ts` (or wherever Organization type is defined)

```typescript
// Before:
export interface Organization {
  id: string
  name: string
  slug: string                      // REMOVE
  google_domain?: string            // REMOVE
  require_google_domain: boolean    // REMOVE
  logo_url?: string                 // REMOVE
  country_code: string
  locale: string
  work_mode?: string
  working_days?: string[]
  work_start_time?: string          // ADD (for future use)
  work_end_time?: string            // ADD (for future use)
  created_at: string
  updated_at: string
}

// After:
export interface Organization {
  id: string
  name: string
  country_code: string
  locale: string
  work_mode?: string
  working_days?: string[]
  work_start_time?: string | null   // New field (nullable)
  work_end_time?: string | null     // New field (nullable)
  created_at: string
  updated_at: string
}
```

## API Testing Updates

### Update Tests for Organization Endpoint

**File:** `app/api/admin/settings/organization/route.test.ts` (if exists)

**New Test Cases:**

1. **Test Deprecated Fields Rejection:**
```typescript
it('should reject request with deprecated slug field', async () => {
  const response = await PUT('/api/admin/settings/organization', {
    name: 'Test Org',
    slug: 'test-org',  // Deprecated
    countryCode: 'PL',
    locale: 'pl'
  })

  expect(response.status).toBe(400)
  expect(response.body.deprecatedFields).toContain('slug')
})
```

2. **Test Valid Request Without Deprecated Fields:**
```typescript
it('should update organization without deprecated fields', async () => {
  const response = await PUT('/api/admin/settings/organization', {
    name: 'Updated Name',
    countryCode: 'PL',
    locale: 'pl'
  })

  expect(response.status).toBe(200)
  expect(response.body.organization.name).toBe('Updated Name')
  expect(response.body.organization).not.toHaveProperty('slug')
})
```

**Remove Test Cases:**
- Tests for slug uniqueness validation
- Tests for Google domain validation
- Tests for logo URL upload

## API Documentation Updates

Update API documentation (if exists) to:
- Mark `slug`, `googleDomain`, `requireGoogleDomain`, `logoUrl` as deprecated/removed
- Update request/response examples
- Add note about migration from old format
- Document new error responses for deprecated fields

## Rate Limiting

No changes to rate limiting:
- Existing rate limits remain unchanged
- Same endpoint security rules apply
- No additional rate limiting needed

## Backwards Compatibility

**Breaking Change Notice:**
- This is a breaking change for any external consumers of the API
- Frontend will be updated simultaneously with backend
- Add deprecation notice period if external API consumers exist
- Consider API versioning if needed (e.g., `/api/v2/admin/settings/organization`)

**Migration Path for Clients:**
1. Remove deprecated fields from requests
2. Update type definitions
3. Handle new error responses
4. Test integration thoroughly before deployment
