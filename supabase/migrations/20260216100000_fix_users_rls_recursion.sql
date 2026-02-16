-- Migration: Fix infinite recursion in users RLS policies
-- Created: 2026-02-16
-- Description: The previous migration created RLS policies on public.users that
--              queried public.users itself, causing infinite recursion.
--              This fix uses a SECURITY DEFINER function that reads from auth.users
--              metadata instead, avoiding the recursion entirely.

-- Step 1: Drop the broken recursive policies
DROP POLICY IF EXISTS "Super admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Super admins can update all users" ON public.users;

-- Step 2: Create a SECURITY DEFINER helper function
-- Reads role from auth.users metadata (not public.users), so no RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()),
    'user'
  );
$$;

-- Step 3: Recreate the policies using the safe helper function
CREATE POLICY "Super admins can view all users"
  ON public.users
  FOR SELECT
  USING (public.get_user_role() = 'super_admin');

CREATE POLICY "Super admins can update all users"
  ON public.users
  FOR UPDATE
  USING (public.get_user_role() = 'super_admin');
