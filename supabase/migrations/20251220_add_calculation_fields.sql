-- Add new calculation fields to labours table
ALTER TABLE public.labours 
ADD COLUMN esi_bf_amount numeric(10,2) DEFAULT 0,
ADD COLUMN last_week_balance numeric(10,2) DEFAULT 0,
ADD COLUMN extra_amount numeric(10,2) DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.labours.esi_bf_amount IS 'ESI/BF amount to be deducted from salary';
COMMENT ON COLUMN public.labours.last_week_balance IS 'Last week balance to be added to salary';
COMMENT ON COLUMN public.labours.extra_amount IS 'Extra amount to be added to salary';
