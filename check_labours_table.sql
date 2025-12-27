-- Check if labours table exists and its structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'labours'
ORDER BY ordinal_position;

-- Check table permissions
SELECT 
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'labours';

-- Test select from labours
SELECT COUNT(*) as total_labours FROM public.labours;
