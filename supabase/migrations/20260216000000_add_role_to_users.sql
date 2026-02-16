-- Migration: Add role column to users table
-- Created: 2026-02-16
-- Description: Adds a role column to public.users for Role-Based Access Control (RBAC)
--              Supported roles: 'super_admin', 'user'

-- Add role column with default value of 'user'
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('super_admin', 'user'));

-- Update existing users to default role
UPDATE public.users SET role = 'user' WHERE role IS NULL;

-- Update the trigger function to also sync role from auth user metadata
CREATE OR REPLACE FUNCTION public.handle_auth_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) 
  DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    role = COALESCE(EXCLUDED.role, public.users.role),
    updated_at = timezone('utc'::text, now());
  
  RETURN NEW;
END;
$$;

-- Allow super_admins to view all users
CREATE POLICY "Super admins can view all users"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  );

-- Allow super_admins to update all users
CREATE POLICY "Super admins can update all users"
  ON public.users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'super_admin'
    )
  );
