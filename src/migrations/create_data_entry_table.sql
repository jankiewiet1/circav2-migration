-- Create the data_entry table to store all cleaned carbon accounting data
CREATE TABLE IF NOT EXISTS public.data_entry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id),
    
    -- Basic data fields
    date DATE NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- e.g., invoice, utility bill, ERP, API, manual entry
    supplier_vendor VARCHAR(255),
    activity_description TEXT NOT NULL, -- e.g., "Diesel Fuel Purchase", "Electricity Usage"
    quantity NUMERIC NOT NULL,
    unit VARCHAR(50) NOT NULL, -- e.g., kWh, liters, km
    currency VARCHAR(10),
    cost NUMERIC,
    
    -- Categorization
    ghg_category VARCHAR(20) NOT NULL, -- Scope 1, 2, or 3
    emission_factor_reference VARCHAR(255), -- Optional reference to emission factor
    
    -- Metadata
    status VARCHAR(50) NOT NULL DEFAULT 'raw', -- raw, processed, validated, error
    custom_tags JSONB,
    notes TEXT,
    
    -- System fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- For AI processing tracking
    ai_processed BOOLEAN DEFAULT FALSE,
    ai_confidence NUMERIC,
    ai_notes TEXT,
    original_file_reference TEXT, -- Reference to the original file if uploaded
    
    -- Add indexes for common queries
    CONSTRAINT valid_ghg_category CHECK (ghg_category IN ('Scope 1', 'Scope 2', 'Scope 3'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_data_entry_company_id ON public.data_entry(company_id);
CREATE INDEX IF NOT EXISTS idx_data_entry_date ON public.data_entry(date);
CREATE INDEX IF NOT EXISTS idx_data_entry_ghg_category ON public.data_entry(ghg_category);
CREATE INDEX IF NOT EXISTS idx_data_entry_status ON public.data_entry(status);

-- Create a view to show data_entry with calculated emissions
CREATE OR REPLACE VIEW public.data_entry_with_emissions AS
SELECT 
    de.*,
    ec.total_emissions,
    ec.emissions_unit,
    ec.climatiq_activity_id,
    ec.climatiq_factor_name,
    ec.climatiq_source
FROM 
    public.data_entry de
LEFT JOIN 
    public.emission_calc_climatiq ec ON ec.entry_id = de.id;

-- Add a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_data_entry_modtime
BEFORE UPDATE ON public.data_entry
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

-- Create a function to copy data from emission_entries to data_entry
CREATE OR REPLACE FUNCTION migrate_emission_entries_to_data_entry()
RETURNS void AS $$
BEGIN
    INSERT INTO public.data_entry (
        company_id,
        date,
        source_type,
        supplier_vendor,
        activity_description,
        quantity,
        unit,
        ghg_category,
        status,
        notes
    )
    SELECT
        ee.company_id,
        ee.date,
        'manual entry' AS source_type,
        NULL AS supplier_vendor,
        ee.description AS activity_description,
        ee.quantity,
        ee.unit,
        CASE 
            WHEN ee.scope = 1 THEN 'Scope 1'
            WHEN ee.scope = 2 THEN 'Scope 2'
            WHEN ee.scope = 3 THEN 'Scope 3'
            ELSE 'Scope 3'
        END AS ghg_category,
        CASE
            WHEN ee.match_status = 'matched' THEN 'processed'
            WHEN ee.match_status = 'unmatched' THEN 'error'
            ELSE 'raw'
        END AS status,
        ee.notes
    FROM
        public.emission_entries ee
    WHERE
        NOT EXISTS (
            SELECT 1 FROM public.data_entry de
            WHERE de.activity_description = ee.description
            AND de.date = ee.date
            AND de.company_id = ee.company_id
            AND de.quantity = ee.quantity
        );
END;
$$ LANGUAGE plpgsql; 