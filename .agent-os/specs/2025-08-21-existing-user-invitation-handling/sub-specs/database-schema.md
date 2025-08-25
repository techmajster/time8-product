# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-08-21-existing-user-invitation-handling/spec.md

## Database Changes

### Invitations Table Enhancement

```sql
-- Add invitation type enum
ALTER TABLE invitations 
ADD COLUMN invitation_type VARCHAR(50) DEFAULT 'new_user' 
CHECK (invitation_type IN ('new_user', 'cross_organization', 'internal_transfer'));

-- Add existing user reference for cross-organization invitations
ALTER TABLE invitations 
ADD COLUMN existing_user_id UUID REFERENCES profiles(id);

-- Add index for better query performance
CREATE INDEX idx_invitations_existing_user_id ON invitations(existing_user_id);
CREATE INDEX idx_invitations_type_status ON invitations(invitation_type, status);
```

### Migration Script

```sql
-- Migration: 20250821000000_enhance_invitation_system.sql

-- Add new columns to invitations table
ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS invitation_type VARCHAR(50) DEFAULT 'new_user' 
CHECK (invitation_type IN ('new_user', 'cross_organization', 'internal_transfer'));

ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS existing_user_id UUID REFERENCES profiles(id);

-- Update existing invitations to have default type
UPDATE invitations 
SET invitation_type = 'new_user' 
WHERE invitation_type IS NULL;

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_invitations_existing_user_id ON invitations(existing_user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_type_status ON invitations(invitation_type, status);
CREATE INDEX IF NOT EXISTS idx_invitations_org_email ON invitations(organization_id, email);

-- Update RLS policies to handle new invitation types
DROP POLICY IF EXISTS "Users can view invitations for their organization" ON invitations;
CREATE POLICY "Users can view invitations for their organization" ON invitations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );
```

## Rationale

### Invitation Type Field

The `invitation_type` enum distinguishes between:
- `new_user`: Traditional invitation for users who don't exist in the system
- `cross_organization`: Invitation for existing users to join additional organizations  
- `internal_transfer`: Future use for moving users between organizations

### Existing User Reference

The `existing_user_id` field creates a direct link between cross-organization invitations and existing user profiles, enabling:
- Faster lookup during invitation acceptance
- Audit trail of cross-organization invitations
- Prevention of duplicate user creation

### Performance Considerations

New indexes optimize common query patterns:
- Looking up invitations by existing user
- Filtering invitations by type and status
- Organization-specific invitation queries

### Data Integrity

Foreign key constraints ensure referential integrity while CHECK constraints maintain data quality for the invitation type field.