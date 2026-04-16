-- Add per-phone call status columns for contacts
-- Stored directly on public.contacts to keep updates simple/efficient.

ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS mobile_1_call_status text DEFAULT 'Pending';

ALTER TABLE public.contacts
DROP CONSTRAINT IF EXISTS contacts_mobile_1_call_status_check;

ALTER TABLE public.contacts
ADD CONSTRAINT contacts_mobile_1_call_status_check
CHECK (mobile_1_call_status IN (
  'Pending',
  'NoResponse',
  'Busy',
  'Voicemail',
  'VoicemailFull',
  'Unreachable',
  'InvalidNumber',
  'CallbackScheduled',
  'DoNotCall'
));

ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS mobile_2_call_status text DEFAULT 'Pending';

ALTER TABLE public.contacts
DROP CONSTRAINT IF EXISTS contacts_mobile_2_call_status_check;

ALTER TABLE public.contacts
ADD CONSTRAINT contacts_mobile_2_call_status_check
CHECK (mobile_2_call_status IN (
  'Pending',
  'NoResponse',
  'Busy',
  'Voicemail',
  'VoicemailFull',
  'Unreachable',
  'InvalidNumber',
  'CallbackScheduled',
  'DoNotCall'
));

ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS mobile_3_call_status text DEFAULT 'Pending';

ALTER TABLE public.contacts
DROP CONSTRAINT IF EXISTS contacts_mobile_3_call_status_check;

ALTER TABLE public.contacts
ADD CONSTRAINT contacts_mobile_3_call_status_check
CHECK (mobile_3_call_status IN (
  'Pending',
  'NoResponse',
  'Busy',
  'Voicemail',
  'VoicemailFull',
  'Unreachable',
  'InvalidNumber',
  'CallbackScheduled',
  'DoNotCall'
));

ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS fixed_number_call_status text DEFAULT 'Pending';

ALTER TABLE public.contacts
DROP CONSTRAINT IF EXISTS contacts_fixed_number_call_status_check;

ALTER TABLE public.contacts
ADD CONSTRAINT contacts_fixed_number_call_status_check
CHECK (fixed_number_call_status IN (
  'Pending',
  'NoResponse',
  'Busy',
  'Voicemail',
  'VoicemailFull',
  'Unreachable',
  'InvalidNumber',
  'CallbackScheduled',
  'DoNotCall'
));

-- Backfill any existing rows that predate these columns.
UPDATE public.contacts
SET mobile_1_call_status = 'Pending'
WHERE mobile_1_call_status IS NULL;

UPDATE public.contacts
SET mobile_2_call_status = 'Pending'
WHERE mobile_2_call_status IS NULL;

UPDATE public.contacts
SET mobile_3_call_status = 'Pending'
WHERE mobile_3_call_status IS NULL;

UPDATE public.contacts
SET fixed_number_call_status = 'Pending'
WHERE fixed_number_call_status IS NULL;

