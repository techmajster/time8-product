-- Disable Supabase's default email confirmations
-- We're using our custom email verification system with Resend

-- Note: This migration documents the configuration change needed.
-- The actual email confirmation settings are typically configured in:
-- 1. Supabase Dashboard > Authentication > Settings > Email Templates
-- 2. Environment variables for self-hosted instances
-- 3. Or via the Supabase Management API

-- For Supabase Cloud projects, you need to:
-- 1. Go to Dashboard > Authentication > Settings
-- 2. Disable "Enable email confirmations" 
-- 3. Keep "Enable sign ups" enabled

-- For reference, the auth.config approach (commented out as it may not work in all Supabase versions):
/*
INSERT INTO auth.config (parameter, value) 
VALUES 
  ('enable_confirmations', 'false'),
  ('enable_signup', 'true')
ON CONFLICT (parameter) 
DO UPDATE SET value = EXCLUDED.value;
*/

-- Instead, we'll create a documentation table to track this configuration
CREATE TABLE IF NOT EXISTS public.system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document our email configuration
INSERT INTO public.system_config (config_key, config_value, description)
VALUES 
  ('email_verification_system', 'custom_resend', 'Using custom email verification with Resend instead of Supabase default'),
  ('supabase_email_confirmations', 'disabled', 'Supabase email confirmations should be disabled in dashboard to prevent conflicts'),
  ('custom_signup_flow', 'enabled', 'Custom signup flow with email verification implemented')
ON CONFLICT (config_key) 
DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Add RLS for system_config table
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Only admins can read system config
CREATE POLICY "Admins can read system config" ON public.system_config
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
    ); 