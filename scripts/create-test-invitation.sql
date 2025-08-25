-- Create a test invitation token for testing the onboarding flow

-- First, get or create a test organization
INSERT INTO organizations (id, name, slug, created_at) 
VALUES ('test-org-123', 'Test Company', 'test-company', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create a test invitation with the token
INSERT INTO invitations (
  id,
  email, 
  full_name,
  birth_date,
  role,
  organization_id,
  token,
  status,
  expires_at,
  created_at
) VALUES (
  'test-invitation-123',
  'test@example.com',
  'Test User',
  '1990-01-01',
  'employee',
  'test-org-123', 
  'a215ZDloendvbG1lazV0dWZz',
  'pending',
  (NOW() + INTERVAL '7 days'),
  NOW()
) ON CONFLICT (token) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  expires_at = EXCLUDED.expires_at,
  status = 'pending';

-- Verify the invitation was created
SELECT id, email, full_name, token, status, expires_at, organization_id 
FROM invitations 
WHERE token = 'a215ZDloendvbG1lazV0dWZz';