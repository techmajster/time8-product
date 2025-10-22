-- Create installer table for managing application installation and onboarding
CREATE TABLE IF NOT EXISTS public.installer (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  step VARCHAR(50) NOT NULL DEFAULT 'initial',
  completed_steps JSONB DEFAULT '[]'::jsonb,
  configuration JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(organization_id)
);

-- Enable RLS on installer table
ALTER TABLE public.installer ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for installer table
-- Allow users to view installer for their organization
CREATE POLICY "Users can view their organization's installer"
  ON public.installer
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.organization_id = installer.organization_id
      AND employees.user_id = auth.uid()
    )
  );

-- Allow admin users to update installer for their organization  
CREATE POLICY "Admins can update their organization's installer"
  ON public.installer
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.organization_id = installer.organization_id
      AND employees.user_id = auth.uid()
      AND employees.role IN ('admin', 'workspace_owner')
    )
  );

-- Allow admin users to insert installer for their organization
CREATE POLICY "Admins can create installer for their organization"
  ON public.installer
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.organization_id = installer.organization_id
      AND employees.user_id = auth.uid()
      AND employees.role IN ('admin', 'workspace_owner')
    )
  );

-- Create indexes for performance
CREATE INDEX idx_installer_organization_id ON public.installer(organization_id);
CREATE INDEX idx_installer_step ON public.installer(step);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_installer_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_installer_updated_at_trigger
  BEFORE UPDATE ON public.installer
  FOR EACH ROW
  EXECUTE FUNCTION public.update_installer_updated_at();

-- Add comment for documentation
COMMENT ON TABLE public.installer IS 'Tracks the installation and onboarding progress for each organization';
COMMENT ON COLUMN public.installer.step IS 'Current step in the installation process';
COMMENT ON COLUMN public.installer.completed_steps IS 'Array of completed step identifiers';
COMMENT ON COLUMN public.installer.configuration IS 'JSON object storing configuration choices made during installation';
COMMENT ON COLUMN public.installer.completed_at IS 'Timestamp when installation was completed';