-- Add locale support to organizations table
ALTER TABLE organizations 
ADD COLUMN default_locale VARCHAR(5) DEFAULT 'pl' CHECK (default_locale IN ('pl', 'en'));

-- Add locale support to user_settings table  
ALTER TABLE user_settings 
ADD COLUMN locale VARCHAR(5) CHECK (locale IN ('pl', 'en'));

-- Add index for performance
CREATE INDEX idx_organizations_default_locale ON organizations(default_locale);
CREATE INDEX idx_user_settings_locale ON user_settings(locale);

-- Update RLS policies to ensure locale access
-- Organizations table policies already exist and don't need locale-specific restrictions

-- User settings policies already exist and don't need locale-specific restrictions

-- Add helpful comments
COMMENT ON COLUMN organizations.default_locale IS 'Default locale for the organization (pl=Polish, en=English)';
COMMENT ON COLUMN user_settings.locale IS 'User preferred locale (pl=Polish, en=English), overrides organization default'; 