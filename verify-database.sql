-- Quick verification script to check the new emission_calc table
-- Run this AFTER the migration script

-- 1. Check table exists and structure
SELECT 'Table Structure' as check_type;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'emission_calc' 
ORDER BY ordinal_position;

-- 2. Check indexes
SELECT 'Indexes' as check_type;
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'emission_calc';

-- 3. Check RLS policies
SELECT 'RLS Policies' as check_type;
SELECT 
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE tablename = 'emission_calc';

-- 4. Check sample data
SELECT 'Sample Data' as check_type;
SELECT 
    id,
    calculation_method,
    total_emissions,
    emissions_unit,
    source,
    created_at
FROM emission_calc 
ORDER BY created_at DESC 
LIMIT 5;

-- 5. Check counts by method
SELECT 'Count by Method' as check_type;
SELECT 
    calculation_method,
    COUNT(*) as count,
    AVG(total_emissions) as avg_emissions
FROM emission_calc 
GROUP BY calculation_method;

-- 6. Test insertion (will be rolled back)
BEGIN;
    INSERT INTO emission_calc (
        company_id,
        calculation_method,
        total_emissions,
        source
    ) 
    SELECT 
        id as company_id,
        'OPENAI' as calculation_method,
        100.0 as total_emissions,
        'Test Insert' as source
    FROM companies 
    LIMIT 1;
    
    SELECT 'Test Insert Success' as status, COUNT(*) as new_count 
    FROM emission_calc 
    WHERE source = 'Test Insert';
ROLLBACK;

SELECT '✅ Database verification complete!' as final_status; 