-- Add job_title column to contacts table
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS job_title text NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.contacts.job_title IS 'Job title or position of the contact';
