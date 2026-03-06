-- Tasks board table for JIRA-style Kanban (Inbox, No Response, No Interest, Meeting Scheduled)
-- Run this migration in your Supabase project; adjust RLS policies as needed.

CREATE TABLE IF NOT EXISTS public.tasks_board (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  state text NOT NULL CHECK (state IN ('inbox', 'no_response', 'no_interest', 'meeting_scheduled')),
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for listing by state
CREATE INDEX IF NOT EXISTS idx_tasks_board_state ON public.tasks_board(state);
CREATE INDEX IF NOT EXISTS idx_tasks_board_assigned_to ON public.tasks_board(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_board_due_date ON public.tasks_board(due_date);

-- Optional: trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION public.set_tasks_board_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_board_updated_at ON public.tasks_board;
CREATE TRIGGER tasks_board_updated_at
  BEFORE UPDATE ON public.tasks_board
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_tasks_board_updated_at();

-- Enable RLS (optional; add policies per your auth rules)
ALTER TABLE public.tasks_board ENABLE ROW LEVEL SECURITY;

-- Example policy: allow authenticated users to read/write (customize as needed)
-- CREATE POLICY "Allow authenticated read" ON public.tasks_board FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Allow authenticated insert" ON public.tasks_board FOR INSERT TO authenticated WITH CHECK (true);
-- CREATE POLICY "Allow authenticated update" ON public.tasks_board FOR UPDATE TO authenticated USING (true);
-- CREATE POLICY "Allow authenticated delete" ON public.tasks_board FOR DELETE TO authenticated USING (true);
