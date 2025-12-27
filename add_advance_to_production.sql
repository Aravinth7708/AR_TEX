-- ========================================
-- IMPORTANT: Run this SQL to enable advance feature
-- ========================================
-- Go to: https://supabase.com/dashboard/project/zvbyqwqibmbsbdqrobuw/editor
-- Paste this SQL and click "Run"
-- ========================================

-- Step 1: Add the advance column to labours table
ALTER TABLE public.labours 
ADD COLUMN IF NOT EXISTS advance numeric(10,2) DEFAULT 0 NOT NULL;

-- Step 2: Update existing records to have 0 advance (in case column was partially added)
UPDATE public.labours 
SET advance = 0 
WHERE advance IS NULL;

-- Step 3: Verify the column was added (optional - shows table structure)
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'labours' 
ORDER BY ordinal_position;
