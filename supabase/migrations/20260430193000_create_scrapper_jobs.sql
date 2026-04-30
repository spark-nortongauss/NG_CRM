-- Migration: Create scrapper_jobs table
-- Created: 2026-04-30
-- Description: Durable background jobs for Google Search scraping (super_admin only).

CREATE TABLE IF NOT EXISTS public.scrapper_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  cancelled BOOLEAN NOT NULL DEFAULT false,

  -- user-provided params + filtering rules (queries, countries, etc.)
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- progress cursor + counters (which query index, totals, etc.)
  progress JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Supabase Storage location for output Excel
  result_storage_bucket TEXT,
  result_storage_path TEXT,

  error_message TEXT
);

CREATE INDEX IF NOT EXISTS scrapper_jobs_status_idx ON public.scrapper_jobs(status);
CREATE INDEX IF NOT EXISTS scrapper_jobs_created_at_idx ON public.scrapper_jobs(created_at DESC);

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scrapper_jobs_updated_at ON public.scrapper_jobs;
CREATE TRIGGER trg_scrapper_jobs_updated_at
  BEFORE UPDATE ON public.scrapper_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.scrapper_jobs ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all scrapper jobs
DROP POLICY IF EXISTS "Super admins can select scrapper_jobs" ON public.scrapper_jobs;
CREATE POLICY "Super admins can select scrapper_jobs"
  ON public.scrapper_jobs
  FOR SELECT
  USING (public.get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Super admins can insert scrapper_jobs" ON public.scrapper_jobs;
CREATE POLICY "Super admins can insert scrapper_jobs"
  ON public.scrapper_jobs
  FOR INSERT
  WITH CHECK (public.get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Super admins can update scrapper_jobs" ON public.scrapper_jobs;
CREATE POLICY "Super admins can update scrapper_jobs"
  ON public.scrapper_jobs
  FOR UPDATE
  USING (public.get_user_role() = 'super_admin');

