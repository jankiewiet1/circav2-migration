-- Create the data_entry table for AI-powered carbon data management

-- Create the enum types
CREATE TYPE data_entry_source_type AS ENUM (
  'invoice', 
  'utility bill', 
  'ERP', 
  'API', 
  'manual entry',
  'email',
  'pdf',
  'csv',
  'excel',
  'image'
);

CREATE TYPE data_entry_status AS ENUM (
  'raw',       -- Initial state, just uploaded/entered
  'processed', -- AI has processed but not validated by user
  'validated', -- User has confirmed the mapping
  'error'      -- Error in processing
);

CREATE TYPE ghg_category AS ENUM (
  'Scope 1',
  'Scope 2',
  'Scope 3'
);

-- Create the data_entry table
CREATE TABLE data_entry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Basic data fields
  date DATE NOT NULL,
  source_type data_entry_source_type NOT NULL,
  supplier_vendor TEXT,
  activity_description TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  currency TEXT,
  cost NUMERIC,
  
  -- Categorization
  ghg_category ghg_category NOT NULL,
  emission_factor_reference TEXT,
  
  -- Metadata
  status data_entry_status NOT NULL DEFAULT 'raw',
  custom_tags JSONB,
  notes TEXT,
  
  -- System fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- AI processing tracking
  ai_processed BOOLEAN NOT NULL DEFAULT FALSE,
  ai_confidence FLOAT,
  ai_notes TEXT,
  original_file_reference TEXT
);

-- Create indexes
CREATE INDEX idx_data_entry_company_id ON data_entry(company_id);
CREATE INDEX idx_data_entry_date ON data_entry(date);
CREATE INDEX idx_data_entry_status ON data_entry(status);
CREATE INDEX idx_data_entry_ghg_category ON data_entry(ghg_category);

-- Add Row Level Security (RLS)
ALTER TABLE data_entry ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their company's data entries"
  ON data_entry
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM company_users WHERE company_id = data_entry.company_id
    )
  );

CREATE POLICY "Users can insert data entries for their company"
  ON data_entry
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM company_users WHERE company_id = data_entry.company_id
    )
  );

CREATE POLICY "Users can update their company's data entries"
  ON data_entry
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM company_users WHERE company_id = data_entry.company_id
    )
  );

CREATE POLICY "Users can delete their company's data entries"
  ON data_entry
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM company_users WHERE company_id = data_entry.company_id
    )
  );

-- Create a view that joins data_entry with emission calculations
CREATE VIEW data_entry_with_emissions AS
SELECT 
  de.*,
  ec.total_emissions,
  ec.emissions_unit,
  ec.climatiq_activity_id,
  ec.climatiq_factor_name,
  ec.climatiq_source
FROM 
  data_entry de
LEFT JOIN 
  emission_calc_climatiq ec ON de.id = ec.entry_id;

-- Create a function to migrate data from emission_entries to data_entry
CREATE OR REPLACE FUNCTION migrate_emission_entries_to_data_entry()
RETURNS TABLE (
  migrated_count INT,
  message TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
  migration_count INT := 0;
BEGIN
  -- Insert data from emission_entries to data_entry
  INSERT INTO data_entry (
    company_id,
    date,
    source_type,
    activity_description,
    quantity,
    unit,
    ghg_category,
    status,
    notes,
    created_at,
    updated_at
  )
  SELECT
    company_id,
    date::DATE,
    'manual entry'::data_entry_source_type AS source_type,
    description AS activity_description,
    quantity,
    unit,
    CASE 
      WHEN scope = 1 THEN 'Scope 1'::ghg_category
      WHEN scope = 2 THEN 'Scope 2'::ghg_category
      ELSE 'Scope 3'::ghg_category
    END AS ghg_category,
    'validated'::data_entry_status AS status,
    notes,
    created_at,
    updated_at
  FROM emission_entries
  ON CONFLICT DO NOTHING;

  -- Get count of migrated entries
  GET DIAGNOSTICS migration_count = ROW_COUNT;
  
  RETURN QUERY SELECT 
    migration_count AS migrated_count,
    'Successfully migrated ' || migration_count || ' entries' AS message;
END;
$$; 