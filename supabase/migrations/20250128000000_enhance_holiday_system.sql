-- Enhance holiday system with better type support and user-defined holidays
-- This migration improves the company_holidays table structure

-- First, let's ensure the company_holidays table exists with all necessary columns
CREATE TABLE IF NOT EXISTS company_holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'company',
  description TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  country_code VARCHAR(2),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update the type column to support more holiday types
-- Change type constraint to include new types
ALTER TABLE company_holidays 
DROP CONSTRAINT IF EXISTS company_holidays_type_check;

ALTER TABLE company_holidays 
ADD CONSTRAINT company_holidays_type_check 
CHECK (type IN ('national', 'company', 'custom', 'religious', 'regional'));

-- Add created_by column if it doesn't exist (for tracking who added custom holidays)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'company_holidays' AND column_name = 'created_by') THEN
        ALTER TABLE company_holidays ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'company_holidays' AND column_name = 'updated_at') THEN
        ALTER TABLE company_holidays ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_holidays_organization_id ON company_holidays(organization_id);
CREATE INDEX IF NOT EXISTS idx_company_holidays_date ON company_holidays(date);
CREATE INDEX IF NOT EXISTS idx_company_holidays_type ON company_holidays(type);
CREATE INDEX IF NOT EXISTS idx_company_holidays_country_code ON company_holidays(country_code);
CREATE INDEX IF NOT EXISTS idx_company_holidays_year ON company_holidays(EXTRACT(YEAR FROM date));

-- Add RLS policies if they don't exist
ALTER TABLE company_holidays ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view organization holidays" ON company_holidays;
DROP POLICY IF EXISTS "Admins can manage holidays" ON company_holidays;
DROP POLICY IF EXISTS "Users can view national holidays" ON company_holidays;

-- Users can view holidays in their organization and national holidays for their country
CREATE POLICY "Users can view holidays" ON company_holidays
  FOR SELECT USING (
    -- National holidays (visible to everyone from that country)
    (type = 'national' AND organization_id IS NULL)
    OR
    -- Organization-specific holidays (visible to organization members)
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = company_holidays.organization_id
    ))
  );

-- Admins can manage all types of holidays for their organization
CREATE POLICY "Admins can manage holidays" ON company_holidays
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = company_holidays.organization_id
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = company_holidays.organization_id
      AND profiles.role = 'admin'
    )
  );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_company_holidays_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_company_holidays_updated_at ON company_holidays;
CREATE TRIGGER trigger_update_company_holidays_updated_at
  BEFORE UPDATE ON company_holidays
  FOR EACH ROW
  EXECUTE FUNCTION update_company_holidays_updated_at();

-- Add helpful comments
COMMENT ON TABLE company_holidays IS 'Holidays including national holidays and organization-specific holidays';
COMMENT ON COLUMN company_holidays.type IS 'Type of holiday: national (system), company (organization), custom (user-defined), religious, regional';
COMMENT ON COLUMN company_holidays.organization_id IS 'NULL for national holidays, organization ID for company/custom holidays';
COMMENT ON COLUMN company_holidays.country_code IS 'Country code for national holidays (e.g., PL, IE, US)';
COMMENT ON COLUMN company_holidays.created_by IS 'User who created the holiday (for tracking custom holidays)';

-- Insert some example custom holidays for existing organizations (optional)
-- This adds a sample company holiday to demonstrate the feature
INSERT INTO company_holidays (name, date, type, description, organization_id, created_by)
SELECT 
  'Dzień Firmy' as name,
  (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '6 months')::DATE as date,
  'company' as type,
  'Roczny dzień wolny dla całej firmy' as description,
  o.id as organization_id,
  p.id as created_by
FROM organizations o
JOIN profiles p ON p.organization_id = o.id AND p.role = 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM company_holidays h 
  WHERE h.organization_id = o.id 
  AND h.name = 'Dzień Firmy'
)
LIMIT 1; -- Only add to one organization as an example 