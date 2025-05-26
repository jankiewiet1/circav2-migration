-- Migration to safely enhance emission_calc_climatiq table for Climatiq Energy API
-- This handles existing policies and tables gracefully

-- Drop existing conflicting policies if they exist
DO $$ 
BEGIN
    -- Drop leads table policies if they exist
    DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.leads;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.leads;
    DROP POLICY IF EXISTS "Enable update for users based on email" ON public.leads;
EXCEPTION
    WHEN undefined_table THEN
        -- Table doesn't exist, continue
        NULL;
END $$;

-- Add new columns for Energy API specific data to emission_calc_climatiq
DO $$ 
BEGIN
    -- Add energy type and calculation method
    ALTER TABLE emission_calc_climatiq 
    ADD COLUMN IF NOT EXISTS energy_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS calculation_method VARCHAR(50),
    ADD COLUMN IF NOT EXISTS region_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS year_used INTEGER;
    
    -- Energy reporting quad structure (for electricity and heat/steam)
    ALTER TABLE emission_calc_climatiq 
    ADD COLUMN IF NOT EXISTS consumption_co2e FLOAT,
    ADD COLUMN IF NOT EXISTS consumption_co2e_unit VARCHAR(20),
    ADD COLUMN IF NOT EXISTS consumption_method VARCHAR(50),
    ADD COLUMN IF NOT EXISTS consumption_co2_biogenic FLOAT;
    
    ALTER TABLE emission_calc_climatiq 
    ADD COLUMN IF NOT EXISTS well_to_tank_co2e FLOAT,
    ADD COLUMN IF NOT EXISTS well_to_tank_co2e_unit VARCHAR(20),
    ADD COLUMN IF NOT EXISTS well_to_tank_method VARCHAR(50);
    
    ALTER TABLE emission_calc_climatiq 
    ADD COLUMN IF NOT EXISTS transmission_distribution_co2e FLOAT,
    ADD COLUMN IF NOT EXISTS transmission_distribution_co2e_unit VARCHAR(20),
    ADD COLUMN IF NOT EXISTS transmission_distribution_method VARCHAR(50);
    
    ALTER TABLE emission_calc_climatiq 
    ADD COLUMN IF NOT EXISTS wtt_transmission_distribution_co2e FLOAT,
    ADD COLUMN IF NOT EXISTS wtt_transmission_distribution_co2e_unit VARCHAR(20),
    ADD COLUMN IF NOT EXISTS wtt_transmission_distribution_method VARCHAR(50);
    
    -- Market-based calculations (for electricity)
    ALTER TABLE emission_calc_climatiq 
    ADD COLUMN IF NOT EXISTS market_consumption_co2e FLOAT,
    ADD COLUMN IF NOT EXISTS market_consumption_co2e_unit VARCHAR(20),
    ADD COLUMN IF NOT EXISTS market_consumption_method VARCHAR(50),
    ADD COLUMN IF NOT EXISTS market_consumption_co2_biogenic FLOAT;
    
    ALTER TABLE emission_calc_climatiq 
    ADD COLUMN IF NOT EXISTS market_well_to_tank_co2e FLOAT,
    ADD COLUMN IF NOT EXISTS market_well_to_tank_co2e_unit VARCHAR(20),
    ADD COLUMN IF NOT EXISTS market_well_to_tank_method VARCHAR(50);
    
    ALTER TABLE emission_calc_climatiq 
    ADD COLUMN IF NOT EXISTS market_transmission_distribution_co2e FLOAT,
    ADD COLUMN IF NOT EXISTS market_transmission_distribution_co2e_unit VARCHAR(20),
    ADD COLUMN IF NOT EXISTS market_transmission_distribution_method VARCHAR(50);
    
    ALTER TABLE emission_calc_climatiq 
    ADD COLUMN IF NOT EXISTS market_wtt_transmission_distribution_co2e FLOAT,
    ADD COLUMN IF NOT EXISTS market_wtt_transmission_distribution_co2e_unit VARCHAR(20),
    ADD COLUMN IF NOT EXISTS market_wtt_transmission_distribution_method VARCHAR(50);
    
    -- Fuel combustion specific (for fuel endpoint)
    ALTER TABLE emission_calc_climatiq 
    ADD COLUMN IF NOT EXISTS combustion_co2e FLOAT,
    ADD COLUMN IF NOT EXISTS combustion_co2e_unit VARCHAR(20),
    ADD COLUMN IF NOT EXISTS combustion_method VARCHAR(50),
    ADD COLUMN IF NOT EXISTS combustion_co2_biogenic FLOAT;
    
    -- Source trail and notices
    ALTER TABLE emission_calc_climatiq 
    ADD COLUMN IF NOT EXISTS source_trail JSONB,
    ADD COLUMN IF NOT EXISTS notices JSONB;
    
    -- Energy components (for complex electricity calculations)
    ALTER TABLE emission_calc_climatiq 
    ADD COLUMN IF NOT EXISTS energy_components JSONB,
    ADD COLUMN IF NOT EXISTS recs_applied JSONB;
    
    -- Additional metadata
    ALTER TABLE emission_calc_climatiq 
    ADD COLUMN IF NOT EXISTS supplier VARCHAR(255),
    ADD COLUMN IF NOT EXISTS connection_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS energy_source VARCHAR(100),
    ADD COLUMN IF NOT EXISTS loss_factor FLOAT,
    ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(100);

EXCEPTION
    WHEN duplicate_column THEN
        -- Columns already exist, continue
        NULL;
END $$;

-- Create indexes for new columns (only if they don't exist)
DO $$ 
BEGIN
    CREATE INDEX IF NOT EXISTS idx_emission_calc_climatiq_energy_type ON emission_calc_climatiq(energy_type);
    CREATE INDEX IF NOT EXISTS idx_emission_calc_climatiq_calculation_method ON emission_calc_climatiq(calculation_method);
    CREATE INDEX IF NOT EXISTS idx_emission_calc_climatiq_region_year ON emission_calc_climatiq(climatiq_region, year_used);
    CREATE INDEX IF NOT EXISTS idx_emission_calc_climatiq_fuel_type ON emission_calc_climatiq(fuel_type);
EXCEPTION
    WHEN others THEN
        -- Indexes might already exist, continue
        NULL;
END $$;

-- Add comments for documentation
DO $$ 
BEGIN
    COMMENT ON COLUMN emission_calc_climatiq.energy_type IS 'Type of energy calculation: electricity, fuel, heat_steam';
    COMMENT ON COLUMN emission_calc_climatiq.calculation_method IS 'For electricity: location or market based calculation';
    COMMENT ON COLUMN emission_calc_climatiq.consumption_co2e IS 'Scope 2 emissions from energy consumption';
    COMMENT ON COLUMN emission_calc_climatiq.well_to_tank_co2e IS 'Scope 3.3 upstream emissions';
    COMMENT ON COLUMN emission_calc_climatiq.transmission_distribution_co2e IS 'Scope 3.3 T&D losses emissions';
    COMMENT ON COLUMN emission_calc_climatiq.source_trail IS 'Array of data sources used in calculation';
    COMMENT ON COLUMN emission_calc_climatiq.notices IS 'Warnings and info messages from Climatiq API';
    COMMENT ON COLUMN emission_calc_climatiq.energy_components IS 'Detailed breakdown of energy components';
EXCEPTION
    WHEN others THEN
        -- Comments might fail, continue
        NULL;
END $$;

-- Create or replace the energy calculations view
CREATE OR REPLACE VIEW v_energy_calculations AS
SELECT 
    id,
    company_id,
    entry_id,
    energy_type,
    calculation_method,
    climatiq_region,
    region_name,
    year_used,
    
    -- Scope 2 (consumption)
    COALESCE(consumption_co2e, market_consumption_co2e, combustion_co2e, total_emissions) as scope2_emissions,
    COALESCE(consumption_co2e_unit, market_consumption_co2e_unit, combustion_co2e_unit, emissions_unit) as scope2_unit,
    
    -- Scope 3.3 (upstream)
    (COALESCE(well_to_tank_co2e, 0) + COALESCE(market_well_to_tank_co2e, 0)) as scope3_upstream_emissions,
    COALESCE(well_to_tank_co2e_unit, market_well_to_tank_co2e_unit) as scope3_upstream_unit,
    
    -- Scope 3.3 (T&D losses)
    (COALESCE(transmission_distribution_co2e, 0) + COALESCE(market_transmission_distribution_co2e, 0) + 
     COALESCE(wtt_transmission_distribution_co2e, 0) + COALESCE(market_wtt_transmission_distribution_co2e, 0)) as scope3_td_emissions,
    COALESCE(transmission_distribution_co2e_unit, market_transmission_distribution_co2e_unit) as scope3_td_unit,
    
    -- Total emissions
    (COALESCE(consumption_co2e, market_consumption_co2e, combustion_co2e, total_emissions, 0) +
     COALESCE(well_to_tank_co2e, 0) + COALESCE(market_well_to_tank_co2e, 0) +
     COALESCE(transmission_distribution_co2e, 0) + COALESCE(market_transmission_distribution_co2e, 0) +
     COALESCE(wtt_transmission_distribution_co2e, 0) + COALESCE(market_wtt_transmission_distribution_co2e, 0)) as total_co2e,
    
    source_trail,
    notices,
    calculated_at,
    created_at,
    updated_at
FROM emission_calc_climatiq
WHERE energy_type IS NOT NULL;

-- Grant permissions
GRANT SELECT ON v_energy_calculations TO authenticated;

-- Recreate leads table policies safely
DO $$ 
BEGIN
    -- Only create policies if the leads table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'leads' AND table_schema = 'public') THEN
        -- Create policies only if they don't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Enable read access for all authenticated users') THEN
            CREATE POLICY "Enable read access for all authenticated users"
            ON public.leads FOR SELECT
            TO authenticated USING (true);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Enable insert for authenticated users only') THEN
            CREATE POLICY "Enable insert for authenticated users only"
            ON public.leads FOR INSERT
            TO authenticated WITH CHECK (true);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Enable update for users based on email') THEN
            CREATE POLICY "Enable update for users based on email"
            ON public.leads FOR UPDATE
            TO authenticated USING (true);
        END IF;
    END IF;
EXCEPTION
    WHEN others THEN
        -- Policies might already exist or table might not exist, continue
        NULL;
END $$; 