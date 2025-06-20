-- Add invitation_code column to invitations table for admin-visible codes
-- This is separate from the secure token used for authentication

-- Add invitation_code column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'invitations' AND column_name = 'invitation_code') THEN
        ALTER TABLE invitations ADD COLUMN invitation_code VARCHAR(8);
    END IF;
END $$;

-- Create a function to generate invitation codes
CREATE OR REPLACE FUNCTION generate_invitation_code() RETURNS VARCHAR(8) AS $$
DECLARE
    code VARCHAR(8);
    exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 8-character alphanumeric code (easier to read/share)
        code := upper(substring(encode(gen_random_bytes(6), 'base64') from 1 for 8));
        -- Remove characters that could be confusing (0, O, I, 1, etc.)
        code := replace(replace(replace(replace(code, '0', '2'), 'O', '3'), 'I', '4'), '1', '5');
        code := replace(replace(replace(replace(code, 'l', '6'), 'L', '7'), '+', '8'), '/', '9');
        
        -- Check if this code already exists in pending invitations
        SELECT EXISTS(SELECT 1 FROM invitations WHERE invitation_code = code AND status = 'pending') INTO exists;
        
        -- If unique, exit loop
        EXIT WHEN NOT exists;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Generate codes for existing pending invitations that don't have them
UPDATE invitations 
SET invitation_code = generate_invitation_code()
WHERE invitation_code IS NULL AND status = 'pending';

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_invitations_invitation_code ON invitations(invitation_code);

-- Create trigger function to auto-generate invitation codes
CREATE OR REPLACE FUNCTION set_invitation_code() RETURNS TRIGGER AS $$
BEGIN
    -- Only set invitation_code if it's not already provided and status is pending
    IF NEW.invitation_code IS NULL AND NEW.status = 'pending' THEN
        NEW.invitation_code := generate_invitation_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_set_invitation_code ON invitations;
CREATE TRIGGER trigger_set_invitation_code
    BEFORE INSERT OR UPDATE ON invitations
    FOR EACH ROW
    EXECUTE FUNCTION set_invitation_code();

-- Add comment for documentation
COMMENT ON COLUMN invitations.invitation_code IS 'Human-readable 8-character code visible to admins for manual sharing'; 