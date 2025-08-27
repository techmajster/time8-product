# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-08-26-admin-workspace-improvements/spec.md

> Created: 2025-08-26
> Version: 1.0.0

## Endpoints

### DELETE /api/workspaces/[id]

**Purpose:** Delete a workspace and all associated data
**Parameters:** 
- id: Workspace ID (path parameter)
**Authentication:** Required (workspace admin only)
**Response:** 
```json
{
  "success": true,
  "message": "Workspace deleted successfully"
}
```
**Errors:** 
- 401: Unauthorized (not workspace admin)
- 404: Workspace not found
- 500: Server error during deletion

### POST /api/workspaces (modification)

**Purpose:** Modify existing workspace creation to include balance initialization
**Parameters:** Existing workspace creation parameters
**Enhancement:** Automatically set creator's absence balance to default value
**Response:** Existing response format with balance initialization included
**Errors:** Existing error handling maintained

## Controllers

### Workspace Deletion Controller
**Action:** `deleteWorkspace`
**Business Logic:** 
- Verify user is workspace admin
- Cascade delete all related data (employees, absences, invitations, settings)
- Handle foreign key relationships properly
- Log deletion for audit trail
**Error Handling:** 
- Check permissions before deletion
- Handle database constraint violations
- Provide meaningful error messages

### Workspace Creation Enhancement
**Action:** Modify existing `createWorkspace` action
**Business Logic:** 
- After workspace creation, set creator's absence balance
- Use same default balance value as invited users (25 days)
- Ensure balance is set atomically with workspace creation
**Error Handling:** 
- Rollback workspace creation if balance setting fails
- Maintain transaction integrity