-- Fix scope assignments in emission_factor_db table
-- Based on GHG Protocol standards:
-- Scope 1: Direct emissions from owned/controlled sources
-- Scope 2: Indirect emissions from purchased energy  
-- Scope 3: All other indirect emissions

-- First, let's check current scope distribution
SELECT scope, COUNT(*) as count, 
       STRING_AGG(DISTINCT activity, ', ') as sample_activities
FROM emission_factor_db 
GROUP BY scope;

-- Fix electricity-related factors to Scope 2
UPDATE emission_factor_db 
SET scope = 'Scope 2'
WHERE LOWER(description) LIKE '%electric%' 
   OR LOWER(activity) LIKE '%electric%'
   OR LOWER(fuel) LIKE '%electric%'
   OR LOWER(description) LIKE '%grid%'
   OR LOWER(activity) LIKE '%grid%'
   OR LOWER(description) LIKE '%power%'
   OR LOWER(activity) LIKE '%power%'
   OR unit LIKE '%kWh%'
   OR unit LIKE '%MWh%';

-- Fix direct fuel combustion to Scope 1
UPDATE emission_factor_db 
SET scope = 'Scope 1'
WHERE (LOWER(description) LIKE '%combustion%' 
       OR LOWER(description) LIKE '%burning%'
       OR LOWER(description) LIKE '%fuel%burn%')
   AND LOWER(description) NOT LIKE '%electric%'
   AND LOWER(description) NOT LIKE '%grid%'
   AND (LOWER(fuel) IN ('diesel', 'petrol', 'gasoline', 'natural gas', 'lpg', 'heating oil', 'coal')
        OR LOWER(description) LIKE '%diesel%'
        OR LOWER(description) LIKE '%petrol%' 
        OR LOWER(description) LIKE '%gasoline%'
        OR LOWER(description) LIKE '%natural gas%'
        OR LOWER(description) LIKE '%lpg%'
        OR LOWER(description) LIKE '%heating oil%'
        OR LOWER(description) LIKE '%coal%');

-- Fix transport-related factors (most are Scope 3, except company-owned vehicles)
UPDATE emission_factor_db 
SET scope = 'Scope 3'
WHERE LOWER(description) LIKE '%transport%' 
   OR LOWER(description) LIKE '%travel%'
   OR LOWER(description) LIKE '%flight%'
   OR LOWER(description) LIKE '%vehicle%'
   OR LOWER(description) LIKE '%car%'
   OR LOWER(description) LIKE '%truck%'
   OR LOWER(description) LIKE '%bus%'
   OR LOWER(description) LIKE '%train%'
   OR LOWER(description) LIKE '%ship%'
   OR LOWER(activity) LIKE '%transport%'
   OR LOWER(activity) LIKE '%travel%'
   OR unit LIKE '%km%'
   OR unit LIKE '%passenger%km%'
   OR unit LIKE '%mile%';

-- Company-owned vehicle fuel could be Scope 1 (but this requires more specific identification)
-- For now, we'll leave transport as Scope 3 as it's more commonly business travel

-- Fix waste-related factors to Scope 3
UPDATE emission_factor_db 
SET scope = 'Scope 3'
WHERE LOWER(description) LIKE '%waste%'
   OR LOWER(description) LIKE '%recycl%'
   OR LOWER(description) LIKE '%landfill%'
   OR LOWER(activity) LIKE '%waste%'
   OR LOWER(activity) LIKE '%recycl%';

-- Fix heating/cooling from purchased energy to Scope 2
UPDATE emission_factor_db 
SET scope = 'Scope 2'
WHERE (LOWER(description) LIKE '%district heat%'
       OR LOWER(description) LIKE '%steam%'
       OR LOWER(description) LIKE '%chilled water%'
       OR LOWER(description) LIKE '%cooling%purchased%'
       OR LOWER(description) LIKE '%heating%purchased%')
   AND LOWER(description) NOT LIKE '%combustion%'
   AND LOWER(description) NOT LIKE '%fuel%';

-- Default any remaining NULL or unclear scopes to Scope 1 for direct activities
UPDATE emission_factor_db 
SET scope = 'Scope 1'
WHERE scope IS NULL 
   OR scope = ''
   OR scope NOT IN ('Scope 1', 'Scope 2', 'Scope 3');

-- Show the updated distribution
SELECT scope, COUNT(*) as count,
       STRING_AGG(DISTINCT activity, ', ') as sample_activities
FROM emission_factor_db 
GROUP BY scope
ORDER BY scope; 