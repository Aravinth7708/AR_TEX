-- Add salary tracking fields to labour_profiles table
ALTER TABLE public.labour_profiles 
ADD COLUMN IF NOT EXISTS weekly_salary numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS weekly_advance numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS advance_paid numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_updated_week timestamp with time zone;

-- Add comment
COMMENT ON COLUMN public.labour_profiles.weekly_salary IS 'Final salary for the current week';
COMMENT ON COLUMN public.labour_profiles.weekly_advance IS 'Total advance received in the week';
COMMENT ON COLUMN public.labour_profiles.advance_paid IS 'Total advance paid back';
COMMENT ON COLUMN public.labour_profiles.last_updated_week IS 'Last week when salary was updated';

-- Reload schema
NOTIFY pgrst, 'reload schema';
