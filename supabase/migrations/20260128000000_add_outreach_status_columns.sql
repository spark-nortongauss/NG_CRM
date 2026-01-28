-- Add outreach status columns for LinkedIn, Cold Call, and Cold Email
-- Each has two possible values: 'Done' or 'Not Done' (default: 'Not Done')

-- Add linkedin_status column
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS linkedin_status text DEFAULT 'Not Done'
CHECK (linkedin_status IN ('Done', 'Not Done'));

-- Add cold_call_status column
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS cold_call_status text DEFAULT 'Not Done'
CHECK (cold_call_status IN ('Done', 'Not Done'));

-- Add cold_email_status column
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS cold_email_status text DEFAULT 'Not Done'
CHECK (cold_email_status IN ('Done', 'Not Done'));

-- Update existing rows to have the default value if they don't already
UPDATE public.contacts SET linkedin_status = 'Not Done' WHERE linkedin_status IS NULL;
UPDATE public.contacts SET cold_call_status = 'Not Done' WHERE cold_call_status IS NULL;
UPDATE public.contacts SET cold_email_status = 'Not Done' WHERE cold_email_status IS NULL;
