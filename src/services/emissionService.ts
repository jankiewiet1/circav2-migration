import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculateEmissions, ClimatiqEstimateParams, ClimatiqResponse, searchEmissionFactors } from '../integrations/climatiq/client';
import { EmissionSource, Scope } from '../types/emissions';

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
  
  const result = await Promise.all(sources.map(async (source) => {
    const { count } = await supabase
      .from('emission_factors')
      .select('*', { count: 'exact', head: true })
      .eq('Source', source)
      .ilike('category_1', `%${category}%`);
      
    return {
      source,
      hasData: count ? count > 0 : false
    };
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

// Recalculate all emissions for a company
export const recalculateCompanyEmissions = async (companyId: string) => {
  try {
    // Call Supabase edge function to recalculate (if deployed)
    try {
      const { data, error } = await supabase.functions.invoke('recalculate-emissions', {
        body: { company_id: companyId }
      });

      if (error) throw error;
      
      toast.success("Emissions are being recalculated. This may take a few minutes.");
      return data;
    } catch (fnError) {
      console.warn("Edge function not available:", fnError);
      
      // Fallback - direct database operation if allowed
      // Update match status to trigger recalculation on next view
      const { error } = await supabase
        .from('emission_entries')
        .update({ match_status: null })
        .eq('company_id', companyId);

      if (error) throw error;
      
      toast.success("Emissions will be recalculated on next view");
    }
  } catch (error: any) {
    console.error("Error recalculating emissions:", error);
    toast.error("Failed to recalculate emissions");
    throw error;
  }
};

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

// Define the emission entry type
interface EmissionEntry {
  id: string;
  company_id: string;
  date: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  scope: number;
  notes?: string | null;
  match_status?: string | null;
  embedding?: string | null;
  created_at?: string;
  updated_at?: string;
  upload_session_id?: string | null;
  year?: number | null;
}

/**
 * Handle Climatiq API-based emission calculations
 */
export const ClimatiqEmissionService = {
  /**
   * Calculate emissions for electricity consumption
   * @param kwh - Kilowatt hours consumed
   * @param region - Optional region code (default: global average)
   * @returns Emission calculation result
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
   * @param distance - Distance traveled
   * @param mode - Transportation mode (car, train, plane, etc.)
   * @param unit - Distance unit (km, miles)
   * @returns Emission calculation result
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
      // Add more modes as needed
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
   * @param quantity - Amount of fuel consumed
   * @param fuelType - Type of fuel (diesel, petrol, etc.)
   * @param unit - Fuel unit (L, gal)
   * @returns Emission calculation result
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
      // Add more fuel types as needed
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
   * Calculate emissions for emission entries using company preferences
   * @param companyId - The company ID
   * @param entryIds - Optional array of specific entry IDs to calculate (if not provided, all unmatched entries will be processed)
   * @returns Summary of the calculation process
   */
  async calculateFromEmissionEntries(
    companyId: string,
    entryIds?: string[]
  ): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    details: Array<{ entryId: string; success: boolean; message?: string }>;
  }> {
    try {
      // Get company preferences for emission factors
      const { data: preferences } = await supabase
        .from('company_preferences')
        .select('preferred_emission_source')
        .eq('company_id', companyId)
        .maybeSingle();

      const preferredSource = preferences?.preferred_emission_source || 'DEFRA';
      console.log(`Using preferred emission source: ${preferredSource}`);

      // Fetch emission entries
      let query = supabase
        .from('emission_entries')
        .select(`
          id,
          category,
          quantity,
          unit,
          date,
          scope,
          metadata
        `)
        .eq('company_id', companyId);

      // Filter by specific entry IDs if provided
      if (entryIds && entryIds.length > 0) {
        query = query.in('id', entryIds);
      } else {
        // Otherwise, only process unmatched entries
        query = query.eq('match_status', 'unmatched');
      }

      const { data: entries, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch emission entries: ${error.message}`);
      }

      if (!entries || entries.length === 0) {
        return {
          processed: 0,
          succeeded: 0,
          failed: 0,
          details: []
        };
      }

      // Process each entry
      const results = await Promise.all(
        entries.map(async (entry) => {
          try {
            // Find appropriate Climatiq emission factor based on category and unit
            const activityId = await this.findClimatiqActivityId(entry.category, entry.unit, preferredSource);
            
            if (!activityId) {
              return {
                entryId: entry.id,
                success: false,
                message: `No matching Climatiq emission factor found for category: ${entry.category}, unit: ${entry.unit}`
              };
            }

            // Prepare parameters based on the entry data
            const params: ClimatiqEstimateParams = {
              emission_factor: {
                activity_id: activityId,
                data_version: "^21"
              },
              parameters: this.mapEntryToParameters(entry)
            };

            // Call Climatiq API
            const result = await calculateEmissions(params);

            // Save the calculation result
            await this.saveClimatiqCalculation(companyId, entry.id, result, params, entry.scope);

            // Update the entry match status
            await supabase
              .from('emission_entries')
              .update({
                match_status: 'matched'
              })
              .eq('id', entry.id);

            return {
              entryId: entry.id,
              success: true
            };
          } catch (err: any) {
            console.error(`Error calculating emissions for entry ${entry.id}:`, err);
            return {
              entryId: entry.id,
              success: false,
              message: err.message
            };
          }
        })
      );

      // Count successes and failures
      const succeeded = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      return {
        processed: results.length,
        succeeded,
        failed,
        details: results
      };
    } catch (error: any) {
      console.error('Error calculating emissions from entries:', error);
      throw new Error(`Failed to calculate emissions: ${error.message}`);
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
   * Save Climatiq calculation result to the database
   */
  async saveClimatiqCalculation(
    companyId: string,
    entryId: string,
    result: ClimatiqResponse,
    params: ClimatiqEstimateParams,
    scope?: number
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('emission_calc_climatiq')
        .insert({
          company_id: companyId,
          entry_id: entryId,
          total_emissions: result.co2e,
          emissions_unit: result.co2e_unit,
          scope: scope,
          
          climatiq_activity_id: params.emission_factor.activity_id,
          climatiq_emissions_factor_id: result.emission_factor.id,
          climatiq_factor_name: result.emission_factor.name,
          climatiq_region: result.emission_factor.region,
          climatiq_category: result.emission_factor.category,
          climatiq_source: result.emission_factor.source,
          climatiq_year: result.emission_factor.year,
          
          co2_emissions: result.constituent_gases.co2 || 0,
          ch4_emissions: result.constituent_gases.ch4 || 0,
          n2o_emissions: result.constituent_gases.n2o || 0,
          
          activity_data: result.activity_data,
          request_params: params,
          calculated_at: new Date().toISOString()
        });
      
      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('Error saving Climatiq calculation:', error);
      throw new Error(`Failed to save Climatiq calculation: ${error.message}`);
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
        .from('emission_calc_climatiq')
        .insert({
          company_id: companyId,
          entry_id: null, // Manual calculation, no entry_id
          total_emissions: data.co2e,
          emissions_unit: data.co2e_unit,
          climatiq_category: data.category,
          scope: data.scope,
          activity_data: data.activityData,
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
  try {
    // Direct fetch to bypass CORS issues
    const SUPABASE_URL = "https://vfdbyvnjhimmnbyhxyun.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZGJ5dm5qaGltbW5ieWh4eXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Mzk2MTQsImV4cCI6MjA2MDIxNTYxNH0.DC5NE2wi8_i24-jx1Uignlem0HL2h4ocZ8OsJD_qeiU";
    
    // Calculate batch size based on if entry IDs are provided
    const batchSize = entryIds ? Math.min(entryIds.length, 5) : 5;
    
    // Prepare request body
    const requestBody = {
      company_id: companyId,
      ...(entryIds && { entry_ids: entryIds })
    };
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/calculate-dynamic-emissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'x-client-info': 'circav2'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Edge Function error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      processed: data.processed || 0,
      calculated: data.calculated || 0,
      results: data.results || [],
      message: data.message || `Processed ${data.processed || 0} entries, calculated ${data.calculated || 0} emissions.`
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
 * Process a single emission entry
 * This function will be used as a workaround for the missing database function
 * @param entryId The UUID of the emission entry to process
 */
export const processSingleEmissionEntry = async (entryId: string): Promise<{
  success: boolean;
  message: string;
  result?: any;
}> => {
  try {
    // 1. Fetch the entry
    const { data: entry, error: entryError } = await supabase
      .from('emission_entries')
      .select('*')
      .eq('id', entryId)
      .single();

    if (entryError) {
      return {
        success: false,
        message: `Error fetching entry: ${entryError.message}`
      };
    }

    if (!entry) {
      return {
        success: false,
        message: 'Entry not found'
      };
    }

    // Typecast the entry to ensure type safety
    const typedEntry = entry as EmissionEntry;

    // 2. Calculate emissions based on simple category matching
    // This is a simplified version of what would happen in the database function
    const { data: factors, error: factorsError } = await supabase
      .from('emission_factors')
      .select('*')
      .eq('category_1', typedEntry.category)
      .order('id', { ascending: false })
      .limit(1);

    if (factorsError) {
      return {
        success: false,
        message: `Error fetching emission factors: ${factorsError.message}`
      };
    }

    // 3. Update the entry status
    let matchStatus = 'pending';
    let result = null;
    
    if (factors && factors.length > 0) {
      const factor = factors[0];
      const conversionFactor = factor['GHG Conversion Factor'] || 1;
      const totalEmissions = typedEntry.quantity * conversionFactor;
      
      // Create calculation record
      const { data: calcData, error: calcError } = await supabase
        .from('emission_calc_climatiq')
        .insert({
          company_id: typedEntry.company_id,
          entry_id: typedEntry.id,
          total_emissions: totalEmissions,
          emissions_unit: 'kg CO2e',
          climatiq_activity_id: factor.category_1,
          climatiq_factor_name: `${factor.category_1} - ${factor.category_2 || ''} - ${factor.category_3 || ''}`,
          climatiq_source: factor.Source || 'DEFRA',
          climatiq_year: new Date().getFullYear(),
          calculated_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (calcError) {
        console.error('Error creating calculation record:', calcError);
      } else {
        result = calcData;
        matchStatus = 'matched';
      }
    } else {
      matchStatus = 'factor_not_found';
    }
    
    // Update the entry status
    const { error: updateError } = await supabase
      .from('emission_entries')
      .update({ match_status: matchStatus })
      .eq('id', typedEntry.id);
      
    if (updateError) {
      return {
        success: false,
        message: `Error updating entry status: ${updateError.message}`
      };
    }
    
    return {
      success: true,
      message: `Entry processed with status: ${matchStatus}`,
      result
    };
    
  } catch (error) {
    console.error('Error in processSingleEmissionEntry:', error);
    return {
      success: false,
      message: `Unexpected error: ${error?.message || String(error)}`
    };
  }
};
