-- Add phone_number column to labours table if it doesn't exist
-- Run this in Supabase SQL Editor

-- Add phone_number column
ALTER TABLE public.labours 
ADD COLUMN IF NOT EXISTS phone_number text;

-- Set proper permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON public.labours TO anon, authenticated, service_role;

-- Enable Row Level Security
ALTER TABLE public.labours ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow all operations (adjust for production security)
DROP POLICY IF EXISTS "Allow all operations on labours" ON public.labours;
CREATE POLICY "Allow all operations on labours" 
ON public.labours 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Reload PostgREST schema
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'labours' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
