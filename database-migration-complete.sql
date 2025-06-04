-- =======================================================
-- COMPREHENSIVE DATABASE MIGRATION SCRIPT
-- Converting to unified emission_calc table
-- =======================================================

-- Step 1: Check current table structure
DO $$
BEGIN
    RAISE NOTICE '=== CHECKING CURRENT DATABASE STATE ===';
    
    -- Check if emission_calc_openai exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'emission_calc_openai') THEN
        RAISE NOTICE '✓ emission_calc_openai table exists';
    ELSE
        RAISE NOTICE '✗ emission_calc_openai table does not exist';
    END IF;
    
    -- Check if emission_calc_rag exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'emission_calc_rag') THEN
        RAISE NOTICE '✓ emission_calc_rag table exists';
    ELSE
        RAISE NOTICE '✗ emission_calc_rag table does not exist';
    END IF;
    
    -- Check if unified emission_calc exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'emission_calc') THEN
        RAISE NOTICE '⚠ emission_calc table already exists - will skip creation';
    ELSE
        RAISE NOTICE '○ emission_calc table does not exist - will create';
    END IF;
END
$$;

-- Step 2: Create the unified emission_calc table
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

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_emission_calc_company_id ON emission_calc(company_id);
CREATE INDEX IF NOT EXISTS idx_emission_calc_entry_id ON emission_calc(entry_id);
CREATE INDEX IF NOT EXISTS idx_emission_calc_method ON emission_calc(calculation_method);
CREATE INDEX IF NOT EXISTS idx_emission_calc_calculated_at ON emission_calc(calculated_at DESC);

-- Step 4: Enable RLS (Row Level Security)
ALTER TABLE emission_calc ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop existing policy if it exists and create new one
DROP POLICY IF EXISTS "Users can access their company's calculations" ON emission_calc;
CREATE POLICY "Users can access their company's calculations" ON emission_calc
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid()
    )
  );

-- Step 6: Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 7: Create trigger for updated_at
DROP TRIGGER IF EXISTS update_emission_calc_updated_at ON emission_calc;
CREATE TRIGGER update_emission_calc_updated_at 
  BEFORE UPDATE ON emission_calc 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Insert sample test data to verify functionality
DO $$
DECLARE
    test_company_id UUID;
    test_entry_id UUID;
BEGIN
    -- Get a company ID from existing companies
    SELECT id INTO test_company_id FROM companies LIMIT 1;
    
    -- Get an entry ID from existing emission entries
    SELECT id INTO test_entry_id FROM emission_entries WHERE company_id = test_company_id LIMIT 1;
    
    IF test_company_id IS NOT NULL AND test_entry_id IS NOT NULL THEN
        -- Insert test OpenAI calculation
        INSERT INTO emission_calc (
          company_id, 
          entry_id, 
          calculation_method, 
          total_emissions, 
          emissions_unit,
          activity_id,
          factor_name,
          source,
          activity_data
        ) VALUES (
          test_company_id,
          test_entry_id, 
          'OPENAI',
          150.75,
          'kg CO2e',
          'assistant_calculated',
          'Test Transportation Factor',
          'OpenAI Assistant',
          '{"emission_factor": 0.21, "confidence": 0.95, "calculation_notes": "Test calculation"}'::jsonb
        ) ON CONFLICT DO NOTHING;
        
        -- Insert test RAG calculation
        INSERT INTO emission_calc (
          company_id, 
          entry_id, 
          calculation_method, 
          total_emissions, 
          emissions_unit,
          similarity_score,
          processing_time_ms,
          raw_input,
          source
        ) VALUES (
          test_company_id,
          test_entry_id, 
          'RAG',
          89.42,
          'kg CO2e',
          0.87,
          245,
          'Test raw input for RAG calculation',
          'RAG Database'
        ) ON CONFLICT DO NOTHING;
        
        RAISE NOTICE '✓ Sample test data inserted successfully';
    ELSE
        RAISE NOTICE '⚠ Could not insert test data - no company or entry found';
    END IF;
END
$$;

-- Step 9: Verification queries
DO $$
DECLARE
    table_count INTEGER;
    calc_count INTEGER;
    rag_count INTEGER;
    openai_count INTEGER;
BEGIN
    RAISE NOTICE '=== VERIFICATION ===';
    
    -- Check table exists
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_name = 'emission_calc';
    
    IF table_count > 0 THEN
        RAISE NOTICE '✓ emission_calc table created successfully';
        
        -- Check data counts
        SELECT COUNT(*) INTO calc_count FROM emission_calc;
        SELECT COUNT(*) INTO rag_count FROM emission_calc WHERE calculation_method = 'RAG';
        SELECT COUNT(*) INTO openai_count FROM emission_calc WHERE calculation_method = 'OPENAI';
        
        RAISE NOTICE '✓ Total calculations: %', calc_count;
        RAISE NOTICE '✓ RAG calculations: %', rag_count;
        RAISE NOTICE '✓ OpenAI calculations: %', openai_count;
    ELSE
        RAISE NOTICE '✗ emission_calc table was not created';
    END IF;
END
$$;

-- Step 10: Show table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'emission_calc' 
ORDER BY ordinal_position;

-- Step 11: Show indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'emission_calc';

-- Step 12: Show policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'emission_calc';

-- Step 13: Final completion notice
DO $$
BEGIN
    RAISE NOTICE '=== MIGRATION COMPLETE ===';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Verify the table structure in Supabase UI';
    RAISE NOTICE '2. Test your application with the new unified table';
    RAISE NOTICE '3. Update Supabase types: supabase gen types typescript';
END
$$; 