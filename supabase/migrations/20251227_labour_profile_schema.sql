-- Update labours table to ensure all required columns for labour profiles exist
-- This migration ensures the table has phone_number and proper structure

-- Ensure phone_number column exists
ALTER TABLE public.labours 
ADD COLUMN IF NOT EXISTS phone_number text;

-- Update type for better data integrity
ALTER TABLE public.labours
ALTER COLUMN rate_per_piece SET NOT NULL,
ALTER COLUMN rate_per_piece SET DEFAULT 0;

-- Add comment to document the columns
COMMENT ON COLUMN public.labours.phone_number IS 'Contact phone number for the labour (10 digits)';
COMMENT ON COLUMN public.labours.rate_per_piece IS 'Salary rate per piece for this labour';
COMMENT ON COLUMN public.labours.total_salary IS 'Calculated total salary based on pieces completed';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_labours_phone_number ON public.labours(phone_number);
CREATE INDEX IF NOT EXISTS idx_labours_name ON public.labours(name);
