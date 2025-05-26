import { supabase } from '@/integrations/supabase/client';

// ==================== TYPES & INTERFACES ====================

export interface EnergyAmount {
  energy?: number;
  energy_unit?: 'kWh' | 'MWh' | 'GWh' | 'J' | 'kJ' | 'MJ' | 'GJ' | 'TJ';
  volume?: number;
  volume_unit?: 'l' | 'gal' | 'm3' | 'ft3';
  weight?: number;
  weight_unit?: 'kg' | 'g' | 't' | 'lb' | 'oz';
}

export interface ElectricityComponent {
  amount: EnergyAmount;
  connection_type?: 'grid' | 'direct';
  supplier?: string;
  loss_factor?: number | 'low' | 'medium' | 'high';
  energy_source?: string;
}

export interface HeatComponent {
  amount: EnergyAmount;
  co2e_kg_per_kwh?: number;
  energy_source?: 'renewable' | 'natural_gas' | 'coal' | 'biomass';
  loss_factor?: number | 'low' | 'medium' | 'high';
}

export interface EnergyEstimate {
  co2e: number;
  co2e_unit: string;
  co2e_calculation_method: string;
  source_trail: SourceDataPoint[];
  co2_biogenic?: number;
  constituent_gases: {
    co2?: number;
    ch4?: number;
    n2o?: number;
  };
}

export interface EnergyReportingQuad {
  consumption: EnergyEstimate;
  well_to_tank: EnergyEstimate;
  transmission_and_distribution: EnergyEstimate;
  well_to_tank_of_transmission_and_distribution: EnergyEstimate;
}

export interface SourceDataPoint {
  data_category: string;
  name: string;
  source: string;
  source_dataset: string;
  year: string;
  region: string;
  region_name: string;
}

export interface Notice {
  severity: 'info' | 'warning';
  code: string;
  message: string;
}

// API Request Interfaces
export interface ElectricityRequest {
  region: string;
  year?: number;
  amount?: EnergyAmount;
  recs?: EnergyAmount;
  source_set?: 'core' | 'iea';
  components?: ElectricityComponent[];
  allow_iea_provisional?: boolean;
}

export interface HeatRequest {
  region: string;
  year?: number;
  components: HeatComponent[];
}

export interface FuelRequest {
  fuel_type: string;
  amount: EnergyAmount;
  region?: string;
  year?: number;
}

// API Response Interfaces
export interface ElectricityResponse {
  location: EnergyReportingQuad;
  market: EnergyReportingQuad;
  notices: Notice[];
}

export interface HeatResponse {
  estimates: EnergyReportingQuad;
  notices: Notice[];
}

export interface FuelResponse {
  combustion: EnergyEstimate;
  well_to_tank: EnergyEstimate;
  notices: Notice[];
}

export interface EnergyCalculationResult {
  id: string;
  energy_type: 'electricity' | 'fuel' | 'heat_steam';
  calculation_method?: 'location' | 'market';
  scope2_emissions: number;
  scope3_upstream_emissions: number;
  scope3_td_emissions: number;
  total_emissions: number;
  unit: string;
  source_trail: SourceDataPoint[];
  notices: Notice[];
  calculated_at: Date;
}

// ==================== CLIMATIQ ENERGY SERVICE ====================

export class ClimatiqEnergyService {
  private static readonly BASE_URL = 'https://api.climatiq.io/energy/v1';
  private static readonly API_KEY = import.meta.env.VITE_CLIMATIQ_API_KEY || '';

  private static async makeRequest<T>(endpoint: string, data: any): Promise<T> {
    if (!this.API_KEY) {
      throw new Error('Climatiq API key is not configured. Please set VITE_CLIMATIQ_API_KEY environment variable.');
    }

    const response = await fetch(`${this.BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Climatiq API error: ${response.status} - ${errorData.message || response.statusText}`);
    }

    return response.json();
  }

  // ==================== ELECTRICITY CALCULATIONS ====================

  /**
   * Calculate emissions for electricity consumption
   */
  static async calculateElectricityEmissions(
    request: ElectricityRequest
  ): Promise<ElectricityResponse> {
    return this.makeRequest<ElectricityResponse>('/electricity', request);
  }

  /**
   * Simplified electricity calculation for basic usage
   */
  static async calculateBasicElectricity(
    kwh: number,
    region: string,
    year?: number,
    sourceSet: 'core' | 'iea' = 'core'
  ): Promise<ElectricityResponse> {
    const request: ElectricityRequest = {
      region,
      year,
      source_set: sourceSet,
      amount: {
        energy: kwh,
        energy_unit: 'kWh'
      }
    };

    return this.calculateElectricityEmissions(request);
  }

  // ==================== FUEL CALCULATIONS ====================

  /**
   * Calculate emissions for fuel combustion
   */
  static async calculateFuelEmissions(
    request: FuelRequest
  ): Promise<FuelResponse> {
    return this.makeRequest<FuelResponse>('/fuel', request);
  }

  /**
   * Get available fuel types for a region
   */
  static async getAvailableFuelTypes(region?: string): Promise<string[]> {
    try {
      const request: FuelRequest = {
        fuel_type: '', // Empty to trigger error with valid values
        amount: { weight: 0, weight_unit: 'kg' },
        ...(region && { region })
      };

      await this.makeRequest<FuelResponse>('/fuel', request);
      return []; // Should not reach here
    } catch (error: any) {
      // Parse the error response to extract valid fuel types
      if (error.message.includes('valid_values')) {
        try {
          const match = error.message.match(/valid_values.*fuel_type.*?\[(.*?)\]/s);
          if (match) {
            return match[1].split(',').map((s: string) => s.trim().replace(/"/g, ''));
          }
        } catch (parseError) {
          console.warn('Could not parse fuel types from error response');
        }
      }
      throw error;
    }
  }

  // ==================== HEAT & STEAM CALCULATIONS ====================

  /**
   * Calculate emissions for heat and steam consumption
   */
  static async calculateHeatEmissions(
    request: HeatRequest
  ): Promise<HeatResponse> {
    return this.makeRequest<HeatResponse>('/heat', request);
  }

  // ==================== DATABASE OPERATIONS ====================

  /**
   * Save electricity calculation to database
   */
  static async saveElectricityCalculation(
    companyId: string,
    entryId: string | null,
    request: ElectricityRequest,
    response: ElectricityResponse,
    calculationMethod: 'location' | 'market' = 'location'
  ): Promise<string> {
    const data = calculationMethod === 'location' ? response.location : response.market;
    
    const { data: result, error } = await supabase
      .from('emission_calc_climatiq')
      .insert({
        company_id: companyId,
        entry_id: entryId,
        total_emissions: data.consumption.co2e + data.well_to_tank.co2e + 
                        data.transmission_and_distribution.co2e + data.well_to_tank_of_transmission_and_distribution.co2e,
        emissions_unit: data.consumption.co2e_unit,
        scope: 2, // Electricity is primarily Scope 2
        
        // Store the calculation details in activity_data as JSON
        activity_data: JSON.parse(JSON.stringify({
          energy_type: 'electricity',
          calculation_method: calculationMethod,
          region: request.region,
          year_used: request.year,
          consumption: data.consumption,
          well_to_tank: data.well_to_tank,
          transmission_and_distribution: data.transmission_and_distribution,
          well_to_tank_of_transmission_and_distribution: data.well_to_tank_of_transmission_and_distribution,
          components: request.components,
          recs: request.recs
        })),
        
        // Store request parameters
        request_params: JSON.parse(JSON.stringify(request)),
        
        // Gas breakdown from consumption
        co2_emissions: data.consumption.constituent_gases.co2,
        ch4_emissions: data.consumption.constituent_gases.ch4,
        n2o_emissions: data.consumption.constituent_gases.n2o,
        
        // Climatiq metadata
        climatiq_region: request.region,
        climatiq_source: data.consumption.source_trail[0]?.source || 'Climatiq Energy API',
        climatiq_year: request.year || new Date().getFullYear(),
        
        calculated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to save electricity calculation: ${error.message}`);
    }

    return result.id;
  }

  /**
   * Save fuel calculation to database
   */
  static async saveFuelCalculation(
    companyId: string,
    entryId: string | null,
    request: FuelRequest,
    response: FuelResponse
  ): Promise<string> {
    const { data: result, error } = await supabase
      .from('emission_calc_climatiq')
      .insert({
        company_id: companyId,
        entry_id: entryId,
        total_emissions: response.combustion.co2e + (response.well_to_tank.co2e || 0),
        emissions_unit: response.combustion.co2e_unit,
        scope: 1, // Fuel combustion is Scope 1
        
        // Store the calculation details in activity_data as JSON
        activity_data: JSON.parse(JSON.stringify({
          energy_type: 'fuel',
          fuel_type: request.fuel_type,
          region: request.region,
          year_used: request.year,
          combustion: response.combustion,
          well_to_tank: response.well_to_tank,
          amount: request.amount
        })),
        
        // Store request parameters
        request_params: JSON.parse(JSON.stringify(request)),
        
        // Gas breakdown from combustion
        co2_emissions: response.combustion.constituent_gases.co2,
        ch4_emissions: response.combustion.constituent_gases.ch4,
        n2o_emissions: response.combustion.constituent_gases.n2o,
        
        // Climatiq metadata
        climatiq_region: request.region,
        climatiq_source: response.combustion.source_trail[0]?.source || 'Climatiq Energy API',
        climatiq_year: request.year || new Date().getFullYear(),
        
        calculated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to save fuel calculation: ${error.message}`);
    }

    return result.id;
  }

  /**
   * Save heat/steam calculation to database
   */
  static async saveHeatCalculation(
    companyId: string,
    entryId: string | null,
    request: HeatRequest,
    response: HeatResponse
  ): Promise<string> {
    const data = response.estimates;
    
    const { data: result, error } = await supabase
      .from('emission_calc_climatiq')
      .insert({
        company_id: companyId,
        entry_id: entryId,
        total_emissions: data.consumption.co2e + data.well_to_tank.co2e + 
                        data.transmission_and_distribution.co2e + data.well_to_tank_of_transmission_and_distribution.co2e,
        emissions_unit: data.consumption.co2e_unit,
        scope: 2, // Heat/Steam is typically Scope 2
        
        // Store the calculation details in activity_data as JSON
        activity_data: JSON.parse(JSON.stringify({
          energy_type: 'heat_steam',
          region: request.region,
          year_used: request.year,
          consumption: data.consumption,
          well_to_tank: data.well_to_tank,
          transmission_and_distribution: data.transmission_and_distribution,
          well_to_tank_of_transmission_and_distribution: data.well_to_tank_of_transmission_and_distribution,
          components: request.components
        })),
        
        // Store request parameters
        request_params: JSON.parse(JSON.stringify(request)),
        
        // Gas breakdown from consumption
        co2_emissions: data.consumption.constituent_gases.co2,
        ch4_emissions: data.consumption.constituent_gases.ch4,
        n2o_emissions: data.consumption.constituent_gases.n2o,
        
        // Climatiq metadata
        climatiq_region: request.region,
        climatiq_source: data.consumption.source_trail[0]?.source || 'Climatiq Energy API',
        climatiq_year: request.year || new Date().getFullYear(),
        
        calculated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to save heat calculation: ${error.message}`);
    }

    return result.id;
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get available regions for energy calculations
   */
  static async getAvailableRegions(): Promise<string[]> {
    try {
      const request: ElectricityRequest = {
        region: '', // Empty to trigger error with valid values
        source_set: 'core'
      };

      await this.makeRequest<ElectricityResponse>('/electricity', request);
      return []; // Should not reach here
    } catch (error: any) {
      // Parse the error response to extract valid regions
      if (error.message.includes('valid_values')) {
        try {
          const match = error.message.match(/valid_values.*region.*?\[(.*?)\]/s);
          if (match) {
            return match[1].split(',').map((s: string) => s.trim().replace(/"/g, ''));
          }
        } catch (parseError) {
          console.warn('Could not parse regions from error response');
        }
      }
      throw error;
    }
  }

  /**
   * Auto-detect energy type from emission entry data
   */
  static detectEnergyType(category: string, description: string, unit: string): 'electricity' | 'fuel' | 'heat_steam' | null {
    const categoryLower = category.toLowerCase();
    const descriptionLower = description.toLowerCase();
    const unitLower = unit.toLowerCase();

    // Electricity indicators
    if (categoryLower.includes('electricity') || categoryLower.includes('electric') ||
        unitLower.includes('kwh') || unitLower.includes('mwh') || unitLower.includes('gwh')) {
      return 'electricity';
    }

    // Fuel indicators
    if (categoryLower.includes('fuel') || categoryLower.includes('diesel') || 
        categoryLower.includes('petrol') || categoryLower.includes('gasoline') ||
        categoryLower.includes('natural gas') || categoryLower.includes('lng') ||
        unitLower.includes('litre') || unitLower.includes('gallon') || unitLower.includes('m3')) {
      return 'fuel';
    }

    // Heat/Steam indicators
    if (categoryLower.includes('heat') || categoryLower.includes('steam') ||
        categoryLower.includes('district heating') || categoryLower.includes('thermal')) {
      return 'heat_steam';
    }

    return null;
  }

  /**
   * Get energy calculations for a company
   */
  static async getCompanyEnergyCalculations(
    companyId: string,
    energyType?: 'electricity' | 'fuel' | 'heat_steam'
  ): Promise<EnergyCalculationResult[]> {
    let query = supabase
      .from('emission_calc_climatiq')
      .select('*')
      .eq('company_id', companyId)
      .not('activity_data', 'is', null)
      .order('calculated_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch energy calculations: ${error.message}`);
    }

    return data
      .filter(calc => {
        const activityData = calc.activity_data as any;
        if (!activityData || !activityData.energy_type) return false;
        if (energyType && activityData.energy_type !== energyType) return false;
        return true;
      })
      .map(calc => {
        const activityData = calc.activity_data as any;
        
        // Calculate scope-specific emissions based on energy type
        let scope2_emissions = 0;
        let scope3_upstream_emissions = 0;
        let scope3_td_emissions = 0;

        if (activityData.energy_type === 'electricity' || activityData.energy_type === 'heat_steam') {
          scope2_emissions = activityData.consumption?.co2e || 0;
          scope3_upstream_emissions = (activityData.well_to_tank?.co2e || 0);
          scope3_td_emissions = (activityData.transmission_and_distribution?.co2e || 0) + 
                               (activityData.well_to_tank_of_transmission_and_distribution?.co2e || 0);
        } else if (activityData.energy_type === 'fuel') {
          // Fuel combustion is Scope 1, but we'll put it in scope2_emissions for consistency
          scope2_emissions = activityData.combustion?.co2e || 0;
          scope3_upstream_emissions = activityData.well_to_tank?.co2e || 0;
        }

        return {
          id: calc.id,
          energy_type: activityData.energy_type,
          calculation_method: activityData.calculation_method,
          scope2_emissions,
          scope3_upstream_emissions,
          scope3_td_emissions,
          total_emissions: calc.total_emissions || 0,
          unit: calc.emissions_unit || 'kg',
          source_trail: activityData.consumption?.source_trail || activityData.combustion?.source_trail || [],
          notices: activityData.notices || [],
          calculated_at: new Date(calc.calculated_at)
        };
      });
  }
}

export default ClimatiqEnergyService; 