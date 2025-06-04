-- Check current state of emission_factor_db after reload
SELECT 
    COUNT(*) as total_records,
    COUNT(embedding) as records_with_embedding,
    COUNT(scope) as records_with_scope,
    COUNT(description) as records_with_description,
    COUNT(*) - COUNT(embedding) as missing_embeddings,
    COUNT(*) - COUNT(scope) as missing_scopes
FROM emission_factor_db;

-- Check sample of data structure
SELECT 
    "Activity", 
    "Fuel", 
    "Country", 
    "GHG", 
    "EF_Value", 
    "Unit", 
    "Source",
    description,
    scope,
    CASE WHEN embedding IS NULL THEN 'MISSING' ELSE 'PRESENT' END as embedding_status
FROM emission_factor_db 
LIMIT 10;

-- Check unique sources to verify data quality
SELECT "Source", COUNT(*) as count 
FROM emission_factor_db 
GROUP BY "Source" 
ORDER BY count DESC 
LIMIT 10;

-- Update missing scopes based on activity patterns
UPDATE emission_factor_db 
SET scope = CASE 
    -- Scope 1: Direct emissions from owned/controlled sources
    WHEN LOWER("Activity") LIKE '%combustion%' 
      OR LOWER("Activity") LIKE '%fuel%'
      OR LOWER("Activity") LIKE '%gas%'
      OR LOWER("Activity") LIKE '%diesel%'
      OR LOWER("Activity") LIKE '%petrol%'
      OR LOWER("Activity") LIKE '%gasoline%'
      OR LOWER("Fuel") LIKE '%natural gas%'
      OR LOWER("Fuel") LIKE '%diesel%'
      OR LOWER("Fuel") LIKE '%petrol%'
      OR LOWER("Fuel") LIKE '%gasoline%'
      OR LOWER("Fuel") LIKE '%lpg%'
    THEN 'Scope 1'
    
    -- Scope 2: Indirect emissions from purchased electricity
    WHEN LOWER("Activity") LIKE '%electricity%'
      OR LOWER("Activity") LIKE '%grid%'
      OR LOWER("Activity") LIKE '%power%'
      OR LOWER("Activity") LIKE '%electric%'
    THEN 'Scope 2'
    
    -- Scope 3: All other indirect emissions
    ELSE 'Scope 3'
END
WHERE scope IS NULL OR scope = '';

-- Update missing descriptions
UPDATE emission_factor_db 
SET description = CONCAT(
    "Activity",
    CASE WHEN "Fuel" IS NOT NULL AND "Fuel" != '' THEN CONCAT(' - ', "Fuel") ELSE '' END,
    CASE WHEN "Country" IS NOT NULL AND "Country" != '' AND "Country" != 'Global' THEN CONCAT(' - ', "Country") ELSE '' END
)
WHERE description IS NULL OR description = '';

-- Check results after updates
SELECT 
    COUNT(*) as total_records,
    COUNT(embedding) as records_with_embedding,
    COUNT(scope) as records_with_scope,
    COUNT(description) as records_with_description,
    COUNT(*) - COUNT(embedding) as missing_embeddings,
    COUNT(*) - COUNT(scope) as missing_scopes
FROM emission_factor_db; 