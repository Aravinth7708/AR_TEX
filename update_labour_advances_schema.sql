-- Add paid_amount and balance columns to labour_advances table
-- Run this in Supabase SQL Editor

ALTER TABLE public.labour_advances 
ADD COLUMN IF NOT EXISTS paid_amount numeric(10,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS balance numeric(10,2) GENERATED ALWAYS AS (advance_amount - paid_amount) STORED;

-- Update existing records to set paid_amount to 0 if NULL
UPDATE public.labour_advances 
SET paid_amount = 0 
WHERE paid_amount IS NULL;
