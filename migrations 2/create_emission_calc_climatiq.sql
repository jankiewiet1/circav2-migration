-- Create emission_calc_climatiq table for storing Climatiq API emission calculations
CREATE TABLE IF NOT EXISTS emission_calc_climatiq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entry_id UUID REFERENCES emission_entries(id) ON DELETE CASCADE, -- Can be null for manual calculations
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_emissions FLOAT NOT NULL,
  emissions_unit VARCHAR NOT NULL DEFAULT 'kg',
  scope INTEGER, -- Can be null if scope is not defined
  
  -- Climatiq-specific fields
  climatiq_activity_id VARCHAR,
  climatiq_emissions_factor_id VARCHAR,
  climatiq_factor_name VARCHAR,
  climatiq_region VARCHAR,
  climatiq_category VARCHAR,
  climatiq_source VARCHAR,
  climatiq_year INTEGER,
  
  -- Gas breakdown
  co2_emissions FLOAT,
  ch4_emissions FLOAT,
  n2o_emissions FLOAT,
  
  -- Activity data - stored as JSONB to accommodate different structures
  activity_data JSONB,
  
  -- Original request parameters
  request_params JSONB,
  
  -- Additional metadata fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS emission_calc_climatiq_company_id_idx ON emission_calc_climatiq(company_id);
CREATE INDEX IF NOT EXISTS emission_calc_climatiq_entry_id_idx ON emission_calc_climatiq(entry_id);
CREATE INDEX IF NOT EXISTS emission_calc_climatiq_scope_idx ON emission_calc_climatiq(scope);
CREATE INDEX IF NOT EXISTS emission_calc_climatiq_calculated_at_idx ON emission_calc_climatiq(calculated_at);

-- Add a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_emission_calc_climatiq_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER emission_calc_climatiq_updated_at
BEFORE UPDATE ON emission_calc_climatiq
FOR EACH ROW
EXECUTE FUNCTION update_emission_calc_climatiq_updated_at(); 