-- Add advance column to labours table
ALTER TABLE public.labours ADD COLUMN IF NOT EXISTS advance numeric(10,2) DEFAULT 0 NOT NULL;
