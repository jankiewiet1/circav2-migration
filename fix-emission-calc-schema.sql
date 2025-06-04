-- Fix emission_calc table to include all necessary columns from original tables
-- This ensures compatibility with existing frontend code

-- Add missing columns from emission_calc_openai
ALTER TABLE emission_calc 
ADD COLUMN IF NOT EXISTS scope INTEGER,
ADD COLUMN IF NOT EXISTS emissions_factor_id VARCHAR,
ADD COLUMN IF NOT EXISTS region VARCHAR DEFAULT 'global',
ADD COLUMN IF NOT EXISTS category VARCHAR,
ADD COLUMN IF NOT EXISTS year_used INTEGER,
ADD COLUMN IF NOT EXISTS co2_emissions DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS ch4_emissions DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS n2o_emissions DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS request_params JSONB;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_emission_calc_scope ON emission_calc(scope);
CREATE INDEX IF NOT EXISTS idx_emission_calc_category ON emission_calc(category);
CREATE INDEX IF NOT EXISTS idx_emission_calc_region ON emission_calc(region);
CREATE INDEX IF NOT EXISTS idx_emission_calc_emissions_factor_id ON emission_calc(emissions_factor_id);

-- Update existing records to populate scope from activity_data if available
UPDATE emission_calc 
SET scope = CASE 
  WHEN activity_data->>'scope' IS NOT NULL THEN (activity_data->>'scope')::INTEGER
  ELSE 1 -- Default to scope 1 if not specified
END
WHERE scope IS NULL;

-- Update existing records to populate category from activity_data if available
UPDATE emission_calc 
SET category = activity_data->>'category'
WHERE category IS NULL AND activity_data->>'category' IS NOT NULL;

-- Update existing records to populate region from activity_data if available  
UPDATE emission_calc 
SET region = COALESCE(activity_data->>'region', 'global')
WHERE region IS NULL OR region = '';

-- Update existing records to populate emissions_factor_id from activity_data if available
UPDATE emission_calc 
SET emissions_factor_id = activity_data->>'emissions_factor_id'
WHERE emissions_factor_id IS NULL AND activity_data->>'emissions_factor_id' IS NOT NULL;

-- Update existing records to populate gas breakdowns from activity_data if available
UPDATE emission_calc 
SET 
  co2_emissions = CASE WHEN activity_data->>'co2_emissions' IS NOT NULL THEN (activity_data->>'co2_emissions')::DOUBLE PRECISION ELSE NULL END,
  ch4_emissions = CASE WHEN activity_data->>'ch4_emissions' IS NOT NULL THEN (activity_data->>'ch4_emissions')::DOUBLE PRECISION ELSE NULL END,
  n2o_emissions = CASE WHEN activity_data->>'n2o_emissions' IS NOT NULL THEN (activity_data->>'n2o_emissions')::DOUBLE PRECISION ELSE NULL END
WHERE co2_emissions IS NULL AND ch4_emissions IS NULL AND n2o_emissions IS NULL;

-- Verify the changes
SELECT 
  'emission_calc' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN scope IS NOT NULL THEN 1 END) as records_with_scope,
  COUNT(CASE WHEN category IS NOT NULL THEN 1 END) as records_with_category,
  COUNT(CASE WHEN calculation_method = 'RAG' THEN 1 END) as rag_calculations,
  COUNT(CASE WHEN calculation_method = 'OPENAI' THEN 1 END) as openai_calculations
FROM emission_calc;

-- Show sample of updated records
SELECT 
  id,
  calculation_method,
  scope,
  category,
  region,
  total_emissions,
  emissions_unit,
  calculated_at
FROM emission_calc 
ORDER BY calculated_at DESC 
LIMIT 5; 