-- Start transaction
BEGIN;

-- Enable RLS just in case it wasn't already
ALTER TABLE IF EXISTS public.tasks_board ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated read" ON public.tasks_board;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.tasks_board;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.tasks_board;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.tasks_board;

-- 1. Read Policy
CREATE POLICY "Allow authenticated read" 
ON public.tasks_board 
FOR SELECT 
TO authenticated 
USING (true);

-- 2. Insert Policy
CREATE POLICY "Allow authenticated insert" 
ON public.tasks_board 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 3. Update Policy
CREATE POLICY "Allow authenticated update" 
ON public.tasks_board 
FOR UPDATE 
TO authenticated 
USING (true);

-- 4. Delete Policy
CREATE POLICY "Allow authenticated delete" 
ON public.tasks_board 
FOR DELETE 
TO authenticated 
USING (true);

COMMIT;
