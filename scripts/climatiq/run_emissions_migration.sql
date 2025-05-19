-- Run the migration to create the emission_calc_climatiq table
\i migrations/create_emission_calc_climatiq.sql

-- Verify the table was created
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'emission_calc_climatiq'
) as "Table Exists";

-- If we want to transfer any existing data from old calculation tables, we can add that here
-- This is just an example to show how we might migrate data:
/*
INSERT INTO emission_calc_climatiq (
    company_id,
    entry_id,
    total_emissions,
    emissions_unit,
    scope,
    climatiq_category,
    calculated_at
)
SELECT 
    company_id,
    entry_id,
    total_emissions,
    'kg' as emissions_unit, -- Assuming the old table used kg as default
    CASE 
        WHEN category_name ILIKE '%scope 1%' THEN 1
        WHEN category_name ILIKE '%scope 2%' THEN 2
        WHEN category_name ILIKE '%scope 3%' THEN 3
        ELSE NULL
    END as scope,
    category_name as climatiq_category,
    calculated_at
FROM emission_calculations
WHERE total_emissions > 0;
*/

-- Show a sample of the new table schema
\d emission_calc_climatiq 