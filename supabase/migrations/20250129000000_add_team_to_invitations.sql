-- Add team_id column to invitations table for team assignment during invitation

-- Add team_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'invitations' AND column_name = 'team_id') THEN
        ALTER TABLE invitations ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_invitations_team_id ON invitations(team_id);

-- Add helpful comment
COMMENT ON COLUMN invitations.team_id IS 'Team assignment for the invited user - will be applied when invitation is accepted';

-- Note: This makes team assignment mandatory for all invitations going forward
-- The application will validate that team_id is provided when creating invitations 