-- Query to check current RLS policies on subjects and subject_categories
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('subjects', 'subject_categories') 
AND schemaname = 'public'
ORDER BY tablename, policyname;
