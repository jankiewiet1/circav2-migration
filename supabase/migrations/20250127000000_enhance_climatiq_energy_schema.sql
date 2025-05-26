-- Migration to enhance emission_calc_climatiq table for Climatiq Energy API
-- This adds support for the comprehensive energy calculation data structure

-- Add new columns for Energy API specific data
ALTER TABLE emission_calc_climatiq 
ADD COLUMN IF NOT EXISTS energy_type VARCHAR(50), -- 'electricity', 'fuel', 'heat_steam'
ADD COLUMN IF NOT EXISTS calculation_method VARCHAR(50), -- 'location', 'market' for electricity
ADD COLUMN IF NOT EXISTS region_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS year_used INTEGER,

-- Energy reporting quad structure (for electricity and heat/steam)
ADD COLUMN IF NOT EXISTS consumption_co2e FLOAT,
ADD COLUMN IF NOT EXISTS consumption_co2e_unit VARCHAR(20),
ADD COLUMN IF NOT EXISTS consumption_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS consumption_co2_biogenic FLOAT,

ADD COLUMN IF NOT EXISTS well_to_tank_co2e FLOAT,
ADD COLUMN IF NOT EXISTS well_to_tank_co2e_unit VARCHAR(20),
ADD COLUMN IF NOT EXISTS well_to_tank_method VARCHAR(50),

ADD COLUMN IF NOT EXISTS transmission_distribution_co2e FLOAT,
ADD COLUMN IF NOT EXISTS transmission_distribution_co2e_unit VARCHAR(20),
ADD COLUMN IF NOT EXISTS transmission_distribution_method VARCHAR(50),

ADD COLUMN IF NOT EXISTS wtt_transmission_distribution_co2e FLOAT,
ADD COLUMN IF NOT EXISTS wtt_transmission_distribution_co2e_unit VARCHAR(20),
ADD COLUMN IF NOT EXISTS wtt_transmission_distribution_method VARCHAR(50),

-- Market-based calculations (for electricity)
ADD COLUMN IF NOT EXISTS market_consumption_co2e FLOAT,
ADD COLUMN IF NOT EXISTS market_consumption_co2e_unit VARCHAR(20),
ADD COLUMN IF NOT EXISTS market_consumption_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS market_consumption_co2_biogenic FLOAT,

ADD COLUMN IF NOT EXISTS market_well_to_tank_co2e FLOAT,
ADD COLUMN IF NOT EXISTS market_well_to_tank_co2e_unit VARCHAR(20),
ADD COLUMN IF NOT EXISTS market_well_to_tank_method VARCHAR(50),

ADD COLUMN IF NOT EXISTS market_transmission_distribution_co2e FLOAT,
ADD COLUMN IF NOT EXISTS market_transmission_distribution_co2e_unit VARCHAR(20),
ADD COLUMN IF NOT EXISTS market_transmission_distribution_method VARCHAR(50),

ADD COLUMN IF NOT EXISTS market_wtt_transmission_distribution_co2e FLOAT,
ADD COLUMN IF NOT EXISTS market_wtt_transmission_distribution_co2e_unit VARCHAR(20),
ADD COLUMN IF NOT EXISTS market_wtt_transmission_distribution_method VARCHAR(50),

-- Fuel combustion specific (for fuel endpoint)
ADD COLUMN IF NOT EXISTS combustion_co2e FLOAT,
ADD COLUMN IF NOT EXISTS combustion_co2e_unit VARCHAR(20),
ADD COLUMN IF NOT EXISTS combustion_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS combustion_co2_biogenic FLOAT,

-- Source trail and notices
ADD COLUMN IF NOT EXISTS source_trail JSONB,
ADD COLUMN IF NOT EXISTS notices JSONB,

-- Energy components (for complex electricity calculations)
ADD COLUMN IF NOT EXISTS energy_components JSONB,
ADD COLUMN IF NOT EXISTS recs_applied JSONB,

-- Additional metadata
ADD COLUMN IF NOT EXISTS supplier VARCHAR(255),
ADD COLUMN IF NOT EXISTS connection_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS energy_source VARCHAR(100),
ADD COLUMN IF NOT EXISTS loss_factor FLOAT,
ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(100);

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_emission_calc_climatiq_energy_type ON emission_calc_climatiq(energy_type);
CREATE INDEX IF NOT EXISTS idx_emission_calc_climatiq_calculation_method ON emission_calc_climatiq(calculation_method);
CREATE INDEX IF NOT EXISTS idx_emission_calc_climatiq_region_year ON emission_calc_climatiq(climatiq_region, year_used);
CREATE INDEX IF NOT EXISTS idx_emission_calc_climatiq_fuel_type ON emission_calc_climatiq(fuel_type);

-- Add comments for documentation
COMMENT ON COLUMN emission_calc_climatiq.energy_type IS 'Type of energy calculation: electricity, fuel, heat_steam';
COMMENT ON COLUMN emission_calc_climatiq.calculation_method IS 'For electricity: location or market based calculation';
COMMENT ON COLUMN emission_calc_climatiq.consumption_co2e IS 'Scope 2 emissions from energy consumption';
COMMENT ON COLUMN emission_calc_climatiq.well_to_tank_co2e IS 'Scope 3.3 upstream emissions';
COMMENT ON COLUMN emission_calc_climatiq.transmission_distribution_co2e IS 'Scope 3.3 T&D losses emissions';
COMMENT ON COLUMN emission_calc_climatiq.source_trail IS 'Array of data sources used in calculation';
COMMENT ON COLUMN emission_calc_climatiq.notices IS 'Warnings and info messages from Climatiq API';
COMMENT ON COLUMN emission_calc_climatiq.energy_components IS 'Detailed breakdown of energy components';

-- Create a view for easy access to energy calculations with proper scope mapping
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
GRANT ALL ON emission_calc_climatiq TO authenticated; 