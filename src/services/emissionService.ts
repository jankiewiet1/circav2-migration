import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculateEmissions, ClimatiqEstimateParams, ClimatiqResponse, searchEmissionFactors } from '../integrations/climatiq/client';
import { EmissionSource, Scope } from '../types/emissions';
import { unifiedCalculationService } from './unifiedCalculationService';

export interface EmissionCalculationResult {
  co2e: number;
  co2e_unit: string;
  source: string;
  category: string;
  calculatedAt: Date;
  scope: Scope;
  activityData: {
    value: number;
    unit: string;
  };
}

// Check emission factor status
export const checkEmissionFactorStatus = async (companyId: string) => {
  try {
    // Get unique category/unit combinations from emission entries
    const { data: entriesData, error: entriesError } = await supabase
      .from('emission_entries')
      .select('category, unit, scope')
      .eq('company_id', companyId)
      .order('category', { ascending: true });
      
    if (entriesError) throw entriesError;
    
    if (!entriesData || entriesData.length === 0) {
      return { data: [], preferredSource: 'DEFRA', error: null };
    }
    
    // Get company preferences
    const { data: preferences } = await supabase
      .from('company_preferences')
      .select('preferred_emission_source')
      .eq('company_id', companyId)
      .maybeSingle();
      
    const preferredSource = preferences?.preferred_emission_source || 'DEFRA';
    
    // Get unique combinations
    const uniqueCombinations = entriesData.reduce((acc: any[], entry) => {
      const existingEntry = acc.find(e => 
        e.category === entry.category && e.unit === entry.unit
      );
      
      if (!existingEntry) {
        acc.push({
          category: entry.category,
          unit: entry.unit,
          scope: entry.scope
        });
      }
      
      return acc;
    }, []);
    
    // Check each combination for available emission factors
    const statusData = await Promise.all(uniqueCombinations.map(async (combination) => {
      // Search for emission factors matching this combination
      const availableSources = await getAvailableFactorSources(combination.category, combination.unit);
      
      return {
        category: combination.category,
        unit: combination.unit,
        availableSources
      };
    }));
    
    return { 
      data: statusData,
      preferredSource,
      error: null 
    };
  } catch (error: any) {
    console.error("Error checking emission factor status:", error);
    toast.error("Failed to check emission factor status");
    return { data: [], preferredSource: 'DEFRA', error };
  }
};

// Get available emission factor sources for a category/unit combination
const getAvailableFactorSources = async (category: string, unit: string) => {
  const sources = ['DEFRA', 'EPA', 'IPCC', 'GHG Protocol', 'ADEME'];
  
  // Since emission_factors table doesn't exist, return mock data
  const result = sources.map(source => ({
    source,
    hasData: true // Mock - assume all sources have data
  }));
  
  return result;
};

// Run diagnostics on emission calculation setup
export const runEmissionDiagnostics = async (companyId: string) => {
  try {
    // Get emission entries without calculations
    const { data: entriesWithoutCalcs, error: entriesError } = await supabase
      .from('emission_entries')
      .select('id, category, unit')
      .eq('company_id', companyId)
      .eq('match_status', 'unmatched')
      .limit(10);

    if (entriesError) throw entriesError;

    // Count total entries without calculations
    const { count: missingCount, error: countError } = await supabase
      .from('emission_entries')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('match_status', 'unmatched');

    if (countError) throw countError;

    // Format logs
    const logs = (entriesWithoutCalcs || []).map(entry => ({
      log_type: 'warning',
      log_message: `Entry with category "${entry.category}" and unit "${entry.unit}" has no matching emission factor`
    }));

    return {
      logs,
      missingCalculations: missingCount || 0
    };
  } catch (error: any) {
    console.error("Error running emission diagnostics:", error);
    toast.error("Failed to analyze emission calculation setup");
    return {
      logs: [{
        log_type: 'error',
        log_message: 'Error analyzing emission calculations: ' + error.message
      }],
      missingCalculations: 0
    };
  }
};

// Recalculate all emissions for a company using unified service
export const recalculateCompanyEmissions = async (companyId: string) => {
  try {
    console.log('🔄 Using unified calculation service for recalculation...');
    
    const result = await unifiedCalculationService.calculateCompanyEmissions(
      companyId,
      undefined, // No progress callback
      true // Include already matched entries
    );
    
    toast.success(`Recalculation completed! ${result.successful_calculations} entries calculated, ${result.failed_calculations} failed.`);
    return result;
  } catch (error: any) {
    console.error("Error recalculating emissions:", error);
    toast.error("Failed to recalculate emissions");
    throw error;
  }
};

/**
 * Handle OpenAI API-based emission calculations
 * This service is now mostly deprecated in favor of the unified calculation service
 */
export const ClimatiqEmissionService = {
  /**
   * Calculate emissions for electricity consumption
   */
  async calculateElectricityEmissions(
    kwh: number, 
    region?: string
  ): Promise<EmissionCalculationResult> {
    const params: ClimatiqEstimateParams = {
      emission_factor: {
        activity_id: "electricity-supply_grid-source_residual_mix",
        data_version: "^21",
        ...(region && { region })
      },
      parameters: {
        energy: kwh,
        energy_unit: "kWh"
      }
    };

    const result = await calculateEmissions(params);
    
    return this.mapToEmissionResult(result, EmissionSource.ELECTRICITY, Scope.SCOPE_2);
  },

  /**
   * Calculate emissions for transportation
   */
  async calculateTransportEmissions(
    distance: number,
    mode: string,
    unit: 'km' | 'mi' = 'km'
  ): Promise<EmissionCalculationResult> {
    // Map common transportation modes to Climatiq activity IDs
    const modeMap: Record<string, string> = {
      car: 'passenger_vehicle-vehicle_type_car-fuel_source_na-engine_size_na-vehicle_age_na-vehicle_weight_na',
      train: 'passenger_train-route_type_commuter_rail-fuel_source_na',
      plane: 'passenger_flight-route_type_domestic-aircraft_type_na-distance_na-class_na',
      bus: 'passenger_vehicle-vehicle_type_bus-fuel_source_na-distance_na',
    };

    const activityId = modeMap[mode.toLowerCase()] || 'passenger_vehicle-vehicle_type_car-fuel_source_na-engine_size_na-vehicle_age_na-vehicle_weight_na';
    
    const params: ClimatiqEstimateParams = {
      emission_factor: {
        activity_id: activityId,
        data_version: "^21"
      },
      parameters: {
        distance: distance,
        distance_unit: unit
      }
    };

    const result = await calculateEmissions(params);
    
    return this.mapToEmissionResult(result, EmissionSource.TRANSPORT, Scope.SCOPE_1);
  },

  /**
   * Calculate emissions for fuel consumption
   */
  async calculateFuelEmissions(
    quantity: number,
    fuelType: string,
    unit: 'L' | 'gal' = 'L'
  ): Promise<EmissionCalculationResult> {
    // Map fuel types to Climatiq activity IDs
    const fuelMap: Record<string, string> = {
      diesel: 'fuel-type_diesel-fuel_use_na',
      petrol: 'fuel-type_petrol-fuel_use_na',
      naturalGas: 'fuel-type_natural_gas-fuel_use_na',
    };

    const activityId = fuelMap[fuelType.toLowerCase()] || 'fuel-type_diesel-fuel_use_na';
    
    const params: ClimatiqEstimateParams = {
      emission_factor: {
        activity_id: activityId,
        data_version: "^21"
      },
      parameters: {
        volume: quantity,
        volume_unit: unit
      }
    };

    const result = await calculateEmissions(params);
    
    return this.mapToEmissionResult(result, EmissionSource.FUEL, Scope.SCOPE_1);
  },

  /**
   * @deprecated Use unifiedCalculationService instead
   */
  async calculateFromEmissionEntries(
    companyId: string,
    entryIds?: string[],
    batchSize?: number
  ): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    details: Array<{ entryId: string; success: boolean; message?: string }>;
  }> {
    console.warn('⚠️ ClimatiqEmissionService.calculateFromEmissionEntries is deprecated. Use unifiedCalculationService instead.');
    
    try {
      let result;
      if (entryIds && entryIds.length > 0) {
        // For specific entries, fetch them and use unified service
        const { data: entries, error } = await supabase
          .from('emission_entries')
          .select('*')
          .eq('company_id', companyId)
          .in('id', entryIds);

        if (error) throw error;
        if (!entries) throw new Error('No entries found');

        result = await unifiedCalculationService.calculateBatchEntries(entries);
      } else {
        // For all unmatched entries
        result = await unifiedCalculationService.calculateCompanyEmissions(companyId);
      }

      return {
        processed: result.total_entries,
        succeeded: result.successful_calculations,
        failed: result.failed_calculations,
        details: result.errors.map(e => ({
          entryId: e.entry_id,
          success: false,
          message: e.error
        }))
      };
    } catch (error) {
      console.error('Error in calculateFromEmissionEntries:', error);
      throw error;
    }
  },

  /**
   * Find an appropriate Climatiq activity ID based on category and unit
   */
  async findClimatiqActivityId(
    category: string,
    unit: string,
    preferredSource: string
  ): Promise<string | null> {
    try {
      // Build a search query based on category and unit
      let searchQuery = `${category} ${unit}`;
      
      // Add preferred source to search query if it's not DEFRA (which is the default)
      if (preferredSource !== 'DEFRA') {
        searchQuery += ` ${preferredSource}`;
      }
      
      // Search for emission factors
      const searchResults = await searchEmissionFactors(searchQuery);
      
      if (!searchResults?.results || searchResults.results.length === 0) {
        // If no results, try a more generic search
        const genericQuery = category;
        const genericResults = await searchEmissionFactors(genericQuery);
        
        if (!genericResults?.results || genericResults.results.length === 0) {
          return null;
        }
        
        // Return the first generic result
        return genericResults.results[0].activity_id;
      }
      
      // Return the most relevant result
      return searchResults.results[0].activity_id;
    } catch (error) {
      console.error('Error finding Climatiq activity ID:', error);
      return null;
    }
  },

  /**
   * Map emission entry data to Climatiq parameters
   */
  mapEntryToParameters(entry: any): Record<string, any> {
    // Basic mapping for common units
    const quantity = parseFloat(entry.quantity);
    
    // Handle different unit types
    if (entry.unit.toLowerCase().includes('kwh') || entry.unit.toLowerCase().includes('kw') || entry.unit.toLowerCase().includes('wh')) {
      return {
        energy: quantity,
        energy_unit: 'kWh'
      };
    }
    
    if (entry.unit.toLowerCase().includes('km') || entry.unit.toLowerCase().includes('mi')) {
      return {
        distance: quantity,
        distance_unit: entry.unit.toLowerCase().includes('km') ? 'km' : 'mi'
      };
    }
    
    if (entry.unit.toLowerCase().includes('l') || entry.unit.toLowerCase().includes('gal')) {
      return {
        volume: quantity,
        volume_unit: entry.unit.toLowerCase().includes('l') ? 'L' : 'gal'
      };
    }
    
    if (entry.unit.toLowerCase().includes('kg') || entry.unit.toLowerCase().includes('t')) {
      return {
        mass: quantity,
        mass_unit: entry.unit.toLowerCase().includes('kg') ? 'kg' : 't'
      };
    }
    
    // Default to weight/mass if unit can't be determined
    return {
      mass: quantity,
      mass_unit: entry.unit || 'kg'
    };
  },
  
  /**
   * Save OpenAI calculation result to the unified database
   */
  async saveOpenAICalculation(
    companyId: string,
    entryId: string,
    result: ClimatiqResponse,
    params: ClimatiqEstimateParams,
    scope?: number
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('emission_calc')
        .insert({
          company_id: companyId,
          entry_id: entryId,
          calculation_method: 'OPENAI',
          total_emissions: result.co2e,
          emissions_unit: result.co2e_unit,
          activity_id: params.emission_factor.activity_id,
          factor_name: result.emission_factor.name,
          source: result.emission_factor.source,
          activity_data: {
            scope: scope?.toString(),
            emissions_factor_id: result.emission_factor.id,
            region: result.emission_factor.region,
            category: result.emission_factor.category,
            year_used: result.emission_factor.year,
            co2_emissions: result.constituent_gases.co2 || 0,
            ch4_emissions: result.constituent_gases.ch4 || 0,
            n2o_emissions: result.constituent_gases.n2o || 0,
            activity_data: result.activity_data,
            request_params: params
          },
          calculated_at: new Date().toISOString()
        });
      
      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('Error saving OpenAI calculation:', error);
      throw new Error(`Failed to save OpenAI calculation: ${error.message}`);
    }
  },
  
  /**
   * Map Climatiq API response to our internal format
   */
  mapToEmissionResult(
    response: ClimatiqResponse, 
    source: EmissionSource,
    scope: Scope
  ): EmissionCalculationResult {
    return {
      co2e: response.co2e,
      co2e_unit: response.co2e_unit,
      source: source,
      category: response.emission_factor.category,
      calculatedAt: new Date(),
      scope: scope,
      activityData: {
        value: response.activity_data.activity_value,
        unit: response.activity_data.activity_unit
      }
    };
  },

  /**
   * Save emission calculation to database
   */
  async saveEmissionData(data: EmissionCalculationResult, companyId: string) {
    try {
      const { error } = await supabase
        .from('emission_calc')
        .insert({
          company_id: companyId,
          entry_id: null, // Manual calculation, no entry_id
          calculation_method: 'MANUAL',
          total_emissions: data.co2e,
          emissions_unit: data.co2e_unit,
          source: data.source,
          activity_data: {
            category: data.category,
            scope: data.scope.toString(),
            activity_data: data.activityData
          },
          calculated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      return true;
    } catch (error: any) {
      console.error('Error saving emission data:', error);
      throw new Error(`Failed to save emission data: ${error.message}`);
    }
  }
};

// Calculate emissions using the dynamic-emissions Edge Function
export const calculateDynamicEmissions = async (companyId: string, entryIds?: string[]) => {
  console.warn('⚠️ calculateDynamicEmissions is deprecated. Use unifiedCalculationService instead.');
  
  try {
    let result;
    if (entryIds && entryIds.length > 0) {
      // For specific entries, fetch them first
      const { data: entries, error } = await supabase
        .from('emission_entries')
        .select('*')
        .eq('company_id', companyId)
        .in('id', entryIds);

      if (error) throw error;
      if (!entries) throw new Error('No entries found');

      result = await unifiedCalculationService.calculateBatchEntries(entries);
    } else {
      result = await unifiedCalculationService.calculateCompanyEmissions(companyId);
    }

    return {
      success: true,
      processed: result.total_entries,
      calculated: result.successful_calculations,
      results: [],
      message: `Processed ${result.total_entries} entries, calculated ${result.successful_calculations} emissions.`
    };
  } catch (error) {
    console.error("Error in calculateDynamicEmissions:", error);
    return {
      success: false,
      processed: 0,
      calculated: 0,
      results: [],
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * @deprecated Use unifiedCalculationService instead
 */
export const processSingleEmissionEntry = async (entryId: string): Promise<{
  success: boolean;
  message: string;
  result?: any;
}> => {
  console.warn('⚠️ processSingleEmissionEntry is deprecated. Use unifiedCalculationService instead.');
  
  try {
    // Fetch the entry
    const { data: entry, error: entryError } = await supabase
      .from('emission_entries')
      .select('*')
      .eq('id', entryId)
      .single();

    if (entryError || !entry) {
      return {
        success: false,
        message: `Error fetching entry: ${entryError?.message || 'Entry not found'}`
      };
    }

    // Use unified service for single entry calculation
    const result = await unifiedCalculationService.calculateSingleEntry(entry);
    
    return {
      success: result.success,
      message: result.success 
        ? `Entry processed successfully using ${result.method_used}` 
        : `Entry processing failed: ${result.error}`,
      result: result
    };
    
  } catch (error) {
    console.error('Error in processSingleEmissionEntry:', error);
    return {
      success: false,
      message: `Unexpected error: ${error?.message || String(error)}`
    };
  }
};
