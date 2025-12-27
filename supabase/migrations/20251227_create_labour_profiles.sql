-- Create separate labour_profiles table for storing contact information
CREATE TABLE IF NOT EXISTS public.labour_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone_number text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT unique_labour_name UNIQUE (name)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_labour_profiles_name ON public.labour_profiles(name);

-- Enable RLS
ALTER TABLE public.labour_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for all operations
DROP POLICY IF EXISTS "Allow all operations on labour_profiles" ON public.labour_profiles;
CREATE POLICY "Allow all operations on labour_profiles" 
ON public.labour_profiles 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.labour_profiles TO anon, authenticated, service_role;

-- Create trigger for updated_at
CREATE OR REPLACE TRIGGER update_labour_profiles_updated_at
BEFORE UPDATE ON public.labour_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Reload schema
NOTIFY pgrst, 'reload schema';
