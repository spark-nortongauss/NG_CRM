-- Add linkedin_url column to contacts table
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN contacts.linkedin_url IS 'LinkedIn profile URL for the contact';
