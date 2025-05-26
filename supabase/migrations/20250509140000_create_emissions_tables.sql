-- Create emission_entries table
CREATE TABLE IF NOT EXISTS public.emission_entries (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    quantity NUMERIC NOT NULL,
    unit TEXT,
    scope TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create emission_calc_climatiq table to store Climatiq calculation results
CREATE TABLE IF NOT EXISTS public.emission_calc_climatiq (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL,
    entry_id BIGINT NOT NULL REFERENCES public.emission_entries(id),
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    total_emissions NUMERIC,
    emissions_unit TEXT,
    scope TEXT,
    climatiq_activity_id TEXT,
    climatiq_emissions_factor_id TEXT,
    climatiq_factor_name TEXT,
    climatiq_region TEXT,
    climatiq_category TEXT,
    climatiq_source TEXT,
    climatiq_year INTEGER,
    co2_emissions NUMERIC,
    ch4_emissions NUMERIC,
    n2o_emissions NUMERIC,
    activity_data JSONB,
    request_params JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index on entry_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_emission_calc_climatiq_entry_id ON public.emission_calc_climatiq(entry_id);

-- Create index on company_id for both tables
CREATE INDEX IF NOT EXISTS idx_emission_entries_company_id ON public.emission_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_emission_calc_climatiq_company_id ON public.emission_calc_climatiq(company_id);

-- Add example data for testing
INSERT INTO public.emission_entries (company_id, category, description, quantity, unit, scope)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'electricity', 'Office electricity consumption', 1000, 'kWh', 'scope_2'),
    ('00000000-0000-0000-0000-000000000001', 'natural_gas', 'Office heating', 500, 'm3', 'scope_1'),
    ('00000000-0000-0000-0000-000000000001', 'train_travel', 'Business travel by train', 350, 'km', 'scope_3'),
    ('00000000-0000-0000-0000-000000000001', 'flight', 'Business travel by plane', 2000, 'km', 'scope_3'),
    ('00000000-0000-0000-0000-000000000001', 'diesel', 'Company vehicles', 200, 'liters', 'scope_1'); 