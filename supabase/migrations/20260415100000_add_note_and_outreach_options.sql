-- Migration: Add note column to contacts and extend outreach status constraints
-- Date: 2026-04-15

-- 1. Add note column for rich-text notes per contact
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS note text NULL;

-- 2. Extend cold_call_status constraint to include 'Number not valid'
--    First drop the existing check constraint, then recreate with new values
ALTER TABLE public.contacts
DROP CONSTRAINT IF EXISTS contacts_cold_call_status_check;

ALTER TABLE public.contacts
ADD CONSTRAINT contacts_cold_call_status_check
CHECK (cold_call_status IN ('Done', 'Not Done', 'Number not valid'));

-- 3. Extend cold_email_status constraint to include 'Email not valid'
--    First drop the existing check constraint, then recreate with new values
ALTER TABLE public.contacts
DROP CONSTRAINT IF EXISTS contacts_cold_email_status_check;

ALTER TABLE public.contacts
ADD CONSTRAINT contacts_cold_email_status_check
CHECK (cold_email_status IN ('Done', 'Not Done', 'Email not valid'));
