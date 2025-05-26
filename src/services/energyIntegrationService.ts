import { supabase } from '@/integrations/supabase/client';
import ClimatiqEnergyService, { 
  ElectricityRequest, 
  FuelRequest, 
  HeatRequest,
  EnergyCalculationResult 
} from './climatiqEnergyService';

// ==================== TYPES ====================

export interface EmissionEntry {
  id: string;
  company_id: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  scope: number;
  date: string;
  match_status?: string;
}

export interface EnergyProcessingResult {
  entry_id: string;
  energy_type: 'electricity' | 'fuel' | 'heat_steam' | null;
  success: boolean;
  calculation_id?: string;
  total_emissions?: number;
  scope2_emissions?: number;
  scope3_emissions?: number;
  error?: string;
  notices?: string[];
}

export interface BatchProcessingResult {
  total_processed: number;
  successful: number;
  failed: number;
  results: EnergyProcessingResult[];
  summary: {
    electricity_count: number;
    fuel_count: number;
    heat_steam_count: number;
    unmatched_count: number;
  };
}

// ==================== ENERGY INTEGRATION SERVICE ====================

export class EnergyIntegrationService {
  
  /**
   * Process a single emission entry using the Energy API
   */
  static async processEmissionEntry(
    entry: EmissionEntry,
    region?: string,
    year?: number
  ): Promise<EnergyProcessingResult> {
    try {
      // Auto-detect energy type
      const energyType = ClimatiqEnergyService.detectEnergyType(
        entry.category, 
        entry.description, 
        entry.unit
      );

      if (!energyType) {
        return {
          entry_id: entry.id,
          energy_type: null,
          success: false,
          error: 'Could not determine energy type from entry data'
        };
      }

      // Use provided region or try to detect from company preferences
      const calculationRegion = region || await this.getCompanyRegion(entry.company_id) || 'GB';
      const calculationYear = year || new Date(entry.date).getFullYear();

      let calculationId: string;
      let totalEmissions: number;
      let scope2Emissions: number = 0;
      let scope3Emissions: number = 0;
      let notices: string[] = [];

      switch (energyType) {
        case 'electricity':
          const electricityResult = await this.processElectricityEntry(
            entry, calculationRegion, calculationYear
          );
          calculationId = electricityResult.calculationId;
          totalEmissions = electricityResult.totalEmissions;
          scope2Emissions = electricityResult.scope2Emissions;
          scope3Emissions = electricityResult.scope3Emissions;
          notices = electricityResult.notices;
          break;

        case 'fuel':
          const fuelResult = await this.processFuelEntry(
            entry, calculationRegion, calculationYear
          );
          calculationId = fuelResult.calculationId;
          totalEmissions = fuelResult.totalEmissions;
          scope2Emissions = fuelResult.scope1Emissions; // Fuel is Scope 1, but we track as scope2 for consistency
          scope3Emissions = fuelResult.scope3Emissions;
          notices = fuelResult.notices;
          break;

        case 'heat_steam':
          const heatResult = await this.processHeatEntry(
            entry, calculationRegion, calculationYear
          );
          calculationId = heatResult.calculationId;
          totalEmissions = heatResult.totalEmissions;
          scope2Emissions = heatResult.scope2Emissions;
          scope3Emissions = heatResult.scope3Emissions;
          notices = heatResult.notices;
          break;

        default:
          throw new Error(`Unsupported energy type: ${energyType}`);
      }

      // Update entry status
      await this.updateEntryStatus(entry.id, 'matched');

      return {
        entry_id: entry.id,
        energy_type: energyType,
        success: true,
        calculation_id: calculationId,
        total_emissions: totalEmissions,
        scope2_emissions: scope2Emissions,
        scope3_emissions: scope3Emissions,
        notices: notices
      };

    } catch (error: any) {
      console.error(`Error processing entry ${entry.id}:`, error);
      
      // Update entry status to indicate failure
      await this.updateEntryStatus(entry.id, 'calculation_failed');

      return {
        entry_id: entry.id,
        energy_type: ClimatiqEnergyService.detectEnergyType(entry.category, entry.description, entry.unit),
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process electricity entry
   */
  private static async processElectricityEntry(
    entry: EmissionEntry,
    region: string,
    year: number
  ) {
    const request: ElectricityRequest = {
      region,
      year,
      source_set: 'core',
      amount: {
        energy: entry.quantity,
        energy_unit: this.normalizeEnergyUnit(entry.unit)
      }
    };

    const response = await ClimatiqEnergyService.calculateElectricityEmissions(request);
    
    // Use location-based calculation by default
    const data = response.location;
    const calculationId = await ClimatiqEnergyService.saveElectricityCalculation(
      entry.company_id,
      entry.id,
      request,
      response,
      'location'
    );

    return {
      calculationId,
      totalEmissions: data.consumption.co2e + data.well_to_tank.co2e + 
                     data.transmission_and_distribution.co2e + data.well_to_tank_of_transmission_and_distribution.co2e,
      scope2Emissions: data.consumption.co2e,
      scope3Emissions: data.well_to_tank.co2e + data.transmission_and_distribution.co2e + 
                      data.well_to_tank_of_transmission_and_distribution.co2e,
      notices: response.notices.map(n => n.message)
    };
  }

  /**
   * Process fuel entry
   */
  private static async processFuelEntry(
    entry: EmissionEntry,
    region: string,
    year: number
  ) {
    // Map common fuel descriptions to Climatiq fuel types
    const fuelType = this.mapToClimatiqFuelType(entry.category, entry.description);
    
    const request: FuelRequest = {
      fuel_type: fuelType,
      region,
      year,
      amount: this.createFuelAmount(entry.quantity, entry.unit)
    };

    const response = await ClimatiqEnergyService.calculateFuelEmissions(request);
    
    const calculationId = await ClimatiqEnergyService.saveFuelCalculation(
      entry.company_id,
      entry.id,
      request,
      response
    );

    return {
      calculationId,
      totalEmissions: response.combustion.co2e + (response.well_to_tank.co2e || 0),
      scope1Emissions: response.combustion.co2e, // Fuel combustion is Scope 1
      scope3Emissions: response.well_to_tank.co2e || 0,
      notices: response.notices.map(n => n.message)
    };
  }

  /**
   * Process heat/steam entry
   */
  private static async processHeatEntry(
    entry: EmissionEntry,
    region: string,
    year: number
  ) {
    const request: HeatRequest = {
      region,
      year,
      components: [{
        amount: {
          energy: entry.quantity,
          energy_unit: this.normalizeEnergyUnit(entry.unit)
        }
      }]
    };

    const response = await ClimatiqEnergyService.calculateHeatEmissions(request);
    
    const data = response.estimates;
    const calculationId = await ClimatiqEnergyService.saveHeatCalculation(
      entry.company_id,
      entry.id,
      request,
      response
    );

    return {
      calculationId,
      totalEmissions: data.consumption.co2e + data.well_to_tank.co2e + 
                     data.transmission_and_distribution.co2e + data.well_to_tank_of_transmission_and_distribution.co2e,
      scope2Emissions: data.consumption.co2e,
      scope3Emissions: data.well_to_tank.co2e + data.transmission_and_distribution.co2e + 
                      data.well_to_tank_of_transmission_and_distribution.co2e,
      notices: response.notices.map(n => n.message)
    };
  }

  /**
   * Batch process emission entries for a company
   */
  static async batchProcessCompanyEntries(
    companyId: string,
    region?: string,
    year?: number,
    limit: number = 50
  ): Promise<BatchProcessingResult> {
    // Get unprocessed entries
    const { data: entries, error } = await supabase
      .from('emission_entries')
      .select('*')
      .eq('company_id', companyId)
      .or('match_status.is.null,match_status.eq.unmatched')
      .limit(limit)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch emission entries: ${error.message}`);
    }

    const results: EnergyProcessingResult[] = [];
    const summary = {
      electricity_count: 0,
      fuel_count: 0,
      heat_steam_count: 0,
      unmatched_count: 0
    };

    // Process each entry
    for (const entry of entries) {
      const result = await this.processEmissionEntry(entry, region, year);
      results.push(result);

      // Update summary
      if (result.energy_type === 'electricity') summary.electricity_count++;
      else if (result.energy_type === 'fuel') summary.fuel_count++;
      else if (result.energy_type === 'heat_steam') summary.heat_steam_count++;
      else summary.unmatched_count++;

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    return {
      total_processed: results.length,
      successful,
      failed,
      results,
      summary
    };
  }

  /**
   * Get company's preferred region from preferences
   */
  private static async getCompanyRegion(companyId: string): Promise<string | null> {
    // For now, we'll use a default region since preferred_region doesn't exist in company_preferences
    // In the future, this could be added to the company_preferences table
    const { data, error } = await supabase
      .from('companies')
      .select('country')
      .eq('id', companyId)
      .single();

    if (error || !data) {
      return null;
    }

    // Map country codes to Climatiq regions
    const countryToRegion: Record<string, string> = {
      'NL': 'NL',
      'GB': 'GB', 
      'UK': 'GB',
      'DE': 'DE',
      'FR': 'FR',
      'US': 'US',
      'CA': 'CA',
      'AU': 'AU',
      'BE': 'BE',
      'IT': 'IT',
      'ES': 'ES',
      'DK': 'DK',
      'SE': 'SE',
      'NO': 'NO',
      'FI': 'FI'
    };

    return countryToRegion[data.country] || 'GB'; // Default to GB if country not mapped
  }

  /**
   * Update emission entry status
   */
  private static async updateEntryStatus(entryId: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('emission_entries')
      .update({ match_status: status })
      .eq('id', entryId);

    if (error) {
      console.error(`Failed to update entry status for ${entryId}:`, error);
    }
  }

  /**
   * Normalize energy units to Climatiq format
   */
  private static normalizeEnergyUnit(unit: string): 'kWh' | 'MWh' | 'GWh' {
    const unitLower = unit.toLowerCase();
    
    if (unitLower.includes('mwh')) return 'MWh';
    if (unitLower.includes('gwh')) return 'GWh';
    return 'kWh'; // Default to kWh
  }

  /**
   * Create fuel amount object based on unit type
   */
  private static createFuelAmount(quantity: number, unit: string) {
    const unitLower = unit.toLowerCase();
    
    // Volume units
    if (unitLower.includes('litre') || unitLower.includes('liter') || unitLower === 'l') {
      return { volume: quantity, volume_unit: 'l' as const };
    }
    if (unitLower.includes('gallon') || unitLower === 'gal') {
      return { volume: quantity, volume_unit: 'gal' as const };
    }
    if (unitLower.includes('m3') || unitLower.includes('cubic')) {
      return { volume: quantity, volume_unit: 'm3' as const };
    }
    
    // Weight units
    if (unitLower.includes('kg') || unitLower.includes('kilogram')) {
      return { weight: quantity, weight_unit: 'kg' as const };
    }
    if (unitLower.includes('tonne') || unitLower === 't') {
      return { weight: quantity, weight_unit: 't' as const };
    }
    
    // Energy units (for some fuels)
    if (unitLower.includes('kwh')) {
      return { energy: quantity, energy_unit: 'kWh' as const };
    }
    
    // Default to volume in litres
    return { volume: quantity, volume_unit: 'l' as const };
  }

  /**
   * Map common fuel descriptions to Climatiq fuel types
   */
  private static mapToClimatiqFuelType(category: string, description: string): string {
    const text = `${category} ${description}`.toLowerCase();
    
    // Common fuel mappings
    if (text.includes('diesel')) return 'diesel_bio_0';
    if (text.includes('petrol') || text.includes('gasoline')) return 'petrol_bio_0';
    if (text.includes('natural gas') || text.includes('lng')) return 'natural_gas';
    if (text.includes('coal')) return 'coal_anthracite';
    if (text.includes('biomass') || text.includes('wood')) return 'wood_and_wood_residuals_bio_100';
    if (text.includes('biodiesel')) return 'biodiesel_bio_100';
    
    // Default to diesel if unclear
    return 'diesel_bio_0';
  }

  /**
   * Get energy calculation summary for a company
   */
  static async getCompanyEnergySummary(companyId: string): Promise<{
    total_calculations: number;
    by_energy_type: Record<string, number>;
    total_emissions: number;
    scope2_emissions: number;
    scope3_emissions: number;
  }> {
    const calculations = await ClimatiqEnergyService.getCompanyEnergyCalculations(companyId);
    
    const summary = {
      total_calculations: calculations.length,
      by_energy_type: {
        electricity: 0,
        fuel: 0,
        heat_steam: 0
      },
      total_emissions: 0,
      scope2_emissions: 0,
      scope3_emissions: 0
    };

    calculations.forEach(calc => {
      summary.by_energy_type[calc.energy_type]++;
      summary.total_emissions += calc.total_emissions;
      summary.scope2_emissions += calc.scope2_emissions;
      summary.scope3_emissions += calc.scope3_upstream_emissions + calc.scope3_td_emissions;
    });

    return summary;
  }
}

export default EnergyIntegrationService; 