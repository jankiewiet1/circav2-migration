-- Test script to verify unified emission_calc table is receiving new calculations
-- Run this after performing some calculations in the app

-- 1. Check total calculations in unified table
SELECT 'Total calculations in unified table' as check_type;
SELECT 
    calculation_method,
    COUNT(*) as count,
    MAX(calculated_at) as latest_calculation,
    MIN(calculated_at) as earliest_calculation
FROM emission_calc 
GROUP BY calculation_method
ORDER BY calculation_method;

-- 2. Check recent calculations (last 24 hours)
SELECT 'Recent calculations (last 24 hours)' as check_type;
SELECT 
    id,
    calculation_method,
    total_emissions,
    emissions_unit,
    source,
    calculated_at
FROM emission_calc 
WHERE calculated_at >= NOW() - INTERVAL '24 hours'
ORDER BY calculated_at DESC
LIMIT 10;

-- 3. Check calculations by entry status
SELECT 'Entry status breakdown' as check_type;
SELECT 
    ee.match_status,
    COUNT(DISTINCT ee.id) as total_entries,
    COUNT(DISTINCT ec.entry_id) as calculated_entries,
    ROUND(
        (COUNT(DISTINCT ec.entry_id)::DECIMAL / NULLIF(COUNT(DISTINCT ee.id), 0)) * 100, 
        2
    ) as calculation_percentage
FROM emission_entries ee
LEFT JOIN emission_calc ec ON ee.id = ec.entry_id
GROUP BY ee.match_status
ORDER BY ee.match_status;

-- 4. Check for any lingering calculations in old tables
SELECT 'Old table check' as check_type;
SELECT 
    'emission_calc_openai' as table_name,
    COUNT(*) as remaining_count
FROM emission_calc_openai
UNION ALL
SELECT 
    'emission_calc_rag' as table_name,
    COUNT(*) as remaining_count
FROM emission_calc_rag;

-- 5. Sample of recent unified calculations with details
SELECT 'Sample recent calculations' as check_type;
SELECT 
    ec.calculation_method,
    ec.total_emissions,
    ec.source,
    ee.category,
    ee.description,
    ee.quantity,
    ee.unit,
    ec.calculated_at
FROM emission_calc ec
JOIN emission_entries ee ON ec.entry_id = ee.id
ORDER BY ec.calculated_at DESC
LIMIT 5;

-- 6. Validation: Check for proper data structure
SELECT 'Data validation' as check_type;
SELECT 
    CASE 
        WHEN calculation_method IN ('RAG', 'OPENAI') THEN 'Valid method'
        ELSE 'Invalid method: ' || calculation_method
    END as method_validation,
    COUNT(*) as count
FROM emission_calc
GROUP BY calculation_method
ORDER BY calculation_method; 