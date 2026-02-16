-- Seed: Create demo users with RBAC roles
-- Created: 2026-02-16
-- Description: Creates three users for the CRM system with role-based access

-- ============================================
-- USER 1: Tayroni (Super Admin)
-- ============================================

-- Delete existing user if exists
DELETE FROM auth.users WHERE email = 'thenrikson@nortongauss.com';

-- Create auth user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  email_change_token_current,
  is_sso_user,
  is_anonymous
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'thenrikson@nortongauss.com',
  crypt('tayroni1234#@', gen_salt('bf')),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Tayroni","role":"super_admin"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  '',
  '',
  false,
  false
);

-- Create identity record for Tayroni
INSERT INTO auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT 
  u.id::text,
  u.id,
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  now(),
  now(),
  now()
FROM auth.users u
WHERE u.email = 'thenrikson@nortongauss.com'
AND NOT EXISTS (
  SELECT 1 FROM auth.identities i 
  WHERE i.user_id = u.id AND i.provider = 'email'
);

-- ============================================
-- USER 2: Rizwan (User)
-- ============================================

-- Delete existing user if exists
DELETE FROM auth.users WHERE email = 'r.akib@nortongauss.com';

-- Create auth user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  email_change_token_current,
  is_sso_user,
  is_anonymous
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'r.akib@nortongauss.com',
  crypt('r.akib@321', gen_salt('bf')),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Rizwan","role":"user"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  '',
  '',
  false,
  false
);

-- Create identity record for Rizwan
INSERT INTO auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT 
  u.id::text,
  u.id,
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  now(),
  now(),
  now()
FROM auth.users u
WHERE u.email = 'r.akib@nortongauss.com'
AND NOT EXISTS (
  SELECT 1 FROM auth.identities i 
  WHERE i.user_id = u.id AND i.provider = 'email'
);

-- ============================================
-- USER 3: Shovon (Super Admin)
-- ============================================

-- Delete existing user if exists
DELETE FROM auth.users WHERE email = 'shovon@nortongauss.com';

-- Create auth user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  email_change_token_current,
  is_sso_user,
  is_anonymous
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'shovon@nortongauss.com',
  crypt('Shovon1234', gen_salt('bf')),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Shovon","role":"super_admin"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  '',
  '',
  false,
  false
);

-- Create identity record for Shovon
INSERT INTO auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT 
  u.id::text,
  u.id,
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  now(),
  now(),
  now()
FROM auth.users u
WHERE u.email = 'shovon@nortongauss.com'
AND NOT EXISTS (
  SELECT 1 FROM auth.identities i 
  WHERE i.user_id = u.id AND i.provider = 'email'
);

-- Note: The public.users records (including roles) will be created automatically by the trigger
