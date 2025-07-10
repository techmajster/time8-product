-- Create teams table for organizing employees within organizations
CREATE TABLE teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  color VARCHAR(7) DEFAULT '#6366f1', -- Hex color for team identification
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure team names are unique within an organization
  CONSTRAINT teams_org_name_unique UNIQUE (organization_id, name)
);

-- Add team_id to profiles table (nullable, as teams are optional)
ALTER TABLE profiles 
ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_teams_organization_id ON teams(organization_id);
CREATE INDEX idx_teams_manager_id ON teams(manager_id);
CREATE INDEX idx_teams_name ON teams(name);
CREATE INDEX idx_profiles_team_id ON profiles(team_id);

-- Add RLS policies for teams table
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Users can view teams in their organization
CREATE POLICY "Users can view organization teams" ON teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = teams.organization_id
    )
  );

-- Managers and admins can create teams
CREATE POLICY "Managers can create teams" ON teams
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = teams.organization_id
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Managers can update teams they manage or admins can update any team
CREATE POLICY "Managers can update teams" ON teams
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = teams.organization_id
      AND (
        profiles.role = 'admin' 
        OR (profiles.role = 'manager' AND teams.manager_id = profiles.id)
      )
    )
  );

-- Only admins and team managers can delete teams
CREATE POLICY "Managers can delete teams" ON teams
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = teams.organization_id
      AND (
        profiles.role = 'admin' 
        OR (profiles.role = 'manager' AND teams.manager_id = profiles.id)
      )
    )
  );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_teams_updated_at();

-- Add helpful comments
COMMENT ON TABLE teams IS 'Teams within organizations for better employee organization and management';
COMMENT ON COLUMN teams.manager_id IS 'Manager responsible for this team - can be null if managed by admin';
COMMENT ON COLUMN teams.color IS 'Hex color code for team identification in UI';
COMMENT ON COLUMN profiles.team_id IS 'Optional team assignment for employees';

-- Insert some example teams for existing organizations (optional)
-- This will only run if there are existing organizations without causing errors
INSERT INTO teams (organization_id, name, description, color)
SELECT 
  id as organization_id,
  'Zespół główny' as name,
  'Główny zespół organizacji' as description,
  '#6366f1' as color
FROM organizations
WHERE EXISTS (SELECT 1 FROM profiles WHERE profiles.organization_id = organizations.id)
ON CONFLICT (organization_id, name) DO NOTHING; 