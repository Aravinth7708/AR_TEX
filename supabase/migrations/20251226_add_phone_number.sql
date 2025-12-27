-- Add phone number field to labours table
ALTER TABLE public.labours 
ADD COLUMN IF NOT EXISTS phone_number text;

-- Add index for faster lookup
CREATE INDEX IF NOT EXISTS idx_labours_phone_number ON public.labours(phone_number);
