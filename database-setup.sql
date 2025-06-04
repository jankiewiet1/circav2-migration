-- Create unified emission_calc table
-- This consolidates emission_calc_openai and emission_calc_rag into one table
-- with a calculation_method column to track the source

CREATE TABLE IF NOT EXISTS emission_calc (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entry_id UUID REFERENCES emission_entries(id) ON DELETE CASCADE,
  calculation_method TEXT NOT NULL CHECK (calculation_method IN ('RAG', 'OPENAI')),
  total_emissions NUMERIC NOT NULL DEFAULT 0,
  emissions_unit TEXT DEFAULT 'kg CO2e',
  activity_id TEXT,
  factor_name TEXT,
  source TEXT,
  activity_data JSONB DEFAULT '{}',
  
  -- RAG-specific fields
  similarity_score NUMERIC,
  processing_time_ms INTEGER,
  raw_input TEXT,
  matched_factor_id UUID,
  
  -- Common fields
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_emission_calc_company_id ON emission_calc(company_id);
CREATE INDEX IF NOT EXISTS idx_emission_calc_entry_id ON emission_calc(entry_id);
CREATE INDEX IF NOT EXISTS idx_emission_calc_method ON emission_calc(calculation_method);
CREATE INDEX IF NOT EXISTS idx_emission_calc_calculated_at ON emission_calc(calculated_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE emission_calc ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to ensure users can only access their company's calculations
CREATE POLICY "Users can access their company's calculations" ON emission_calc
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid()
    )
  );

-- Optional: Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_emission_calc_updated_at 
  BEFORE UPDATE ON emission_calc 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data insertion (for testing)
-- INSERT INTO emission_calc (
--   company_id, 
--   entry_id, 
--   calculation_method, 
--   total_emissions, 
--   emissions_unit,
--   activity_id,
--   factor_name,
--   source,
--   activity_data
-- ) VALUES (
--   'your-company-id-here',
--   'your-entry-id-here', 
--   'OPENAI',
--   100.5,
--   'kg CO2e',
--   'assistant_calculated',
--   'Transportation - Car',
--   'OpenAI Assistant',
--   '{"emission_factor": 0.21, "confidence": 0.95}'::jsonb
-- ); 