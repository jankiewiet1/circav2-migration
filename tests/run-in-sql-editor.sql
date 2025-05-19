-- Run this directly in the Supabase SQL Editor to test your Climatiq integration

-- 1. Find a company ID and emission entry to test with
SELECT id, name FROM companies LIMIT 1;

-- Replace 'COMPANY_ID_HERE' with the actual ID from the query above
SELECT id, category, unit, quantity, match_status 
FROM emission_entries
WHERE company_id = 'COMPANY_ID_HERE'
AND match_status = 'unmatched'
LIMIT 5;

-- 2. Insert a test calculation for an unmatched entry
-- Replace COMPANY_ID_HERE and ENTRY_ID_HERE with real values
INSERT INTO emission_calc_climatiq
(company_id, entry_id, total_emissions, emissions_unit, climatiq_category, climatiq_activity_id, scope)
VALUES
('COMPANY_ID_HERE', 'ENTRY_ID_HERE', 100.5, 'kg', 'Test Category', 'manual-test-calculation', 1)
RETURNING *;

-- 3. Update the emission entry to 'matched'
-- Replace ENTRY_ID_HERE with the real value
UPDATE emission_entries
SET match_status = 'matched'
WHERE id = 'ENTRY_ID_HERE'
RETURNING id, category, unit, quantity, match_status;

-- 4. Verify the calculation exists
-- Replace ENTRY_ID_HERE with the real value
SELECT * FROM emission_calc_climatiq
WHERE entry_id = 'ENTRY_ID_HERE';

-- 5. Check RLS policies on the table
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    roles, 
    cmd, 
    qual
FROM pg_policies
WHERE tablename = 'emission_calc_climatiq';

-- 6. If done testing, you can delete the test calculation
-- Replace CALCULATION_ID_HERE with the id from the calculation
DELETE FROM emission_calc_climatiq
WHERE id = 'CALCULATION_ID_HERE'
RETURNING *; 