-- Add linkedin_url column to organizations table
-- This column stores the LinkedIn profile URL for the organization

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Add a comment for documentation
COMMENT ON COLUMN public.organizations.linkedin_url IS 'LinkedIn company page URL';
