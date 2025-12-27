-- Ensure labours table has proper permissions for API access
-- Run this in Supabase SQL Editor

-- Grant permissions to the authenticated and anon roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON public.labours TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Ensure the table owner is correct
ALTER TABLE public.labours OWNER TO postgres;

-- Enable Row Level Security (RLS) if needed - you can disable this for testing
ALTER TABLE public.labours ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow all operations (for testing - adjust as needed for production)
DROP POLICY IF EXISTS "Allow all operations on labours" ON public.labours;
CREATE POLICY "Allow all operations on labours" 
ON public.labours 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
