-- Create labour_salary_history table for weekly salary tracking
CREATE TABLE IF NOT EXISTS public.labour_salary_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  labour_profile_id uuid NOT NULL REFERENCES public.labour_profiles(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  week_end_date date NOT NULL,
  weekly_salary numeric(10,2) DEFAULT 0,
  weekly_advance numeric(10,2) DEFAULT 0,
  advance_paid numeric(10,2) DEFAULT 0,
  net_balance numeric(10,2) GENERATED ALWAYS AS (weekly_salary - weekly_advance + advance_paid) STORED,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(labour_profile_id, week_start_date)
);

-- Add RLS policies
ALTER TABLE public.labour_salary_history ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON public.labour_salary_history
  FOR ALL USING (true) WITH CHECK (true);

-- Allow all operations for anon users (for development)
CREATE POLICY "Allow all operations for anon users" ON public.labour_salary_history
  FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_salary_history_labour_id ON public.labour_salary_history(labour_profile_id);
CREATE INDEX IF NOT EXISTS idx_salary_history_week_start ON public.labour_salary_history(week_start_date DESC);

-- Grant permissions
GRANT ALL ON public.labour_salary_history TO anon;
GRANT ALL ON public.labour_salary_history TO authenticated;
GRANT ALL ON public.labour_salary_history TO service_role;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.labour_salary_history
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add comments
COMMENT ON TABLE public.labour_salary_history IS 'Stores weekly salary and advance history for each labour';
COMMENT ON COLUMN public.labour_salary_history.week_start_date IS 'Start date of the week (Monday)';
COMMENT ON COLUMN public.labour_salary_history.week_end_date IS 'End date of the week (Sunday)';
COMMENT ON COLUMN public.labour_salary_history.net_balance IS 'Calculated as: weekly_salary - weekly_advance + advance_paid';

-- Reload schema
NOTIFY pgrst, 'reload schema';
