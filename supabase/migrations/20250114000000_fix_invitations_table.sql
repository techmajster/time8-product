-- Add missing columns to invitations table if they don't exist

-- Add token column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'invitations' AND column_name = 'token') THEN
        ALTER TABLE invitations ADD COLUMN token TEXT;
    END IF;
END $$;

-- Add personal_message column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'invitations' AND column_name = 'personal_message') THEN
        ALTER TABLE invitations ADD COLUMN personal_message TEXT;
    END IF;
END $$;

-- Add expires_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'invitations' AND column_name = 'expires_at') THEN
        ALTER TABLE invitations ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Update existing invitations to have expiry dates if they don't have them
UPDATE invitations 
SET expires_at = created_at + INTERVAL '7 days'
WHERE expires_at IS NULL;

-- Make expires_at NOT NULL for future records
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'invitations' AND column_name = 'expires_at' AND is_nullable = 'YES') THEN
        ALTER TABLE invitations ALTER COLUMN expires_at SET NOT NULL;
    END IF;
END $$; 