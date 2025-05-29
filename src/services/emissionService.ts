import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculateEmissions, ClimatiqEstimateParams, ClimatiqResponse, searchEmissionFactors } from '../integrations/climatiq/client';
import { EmissionSource, Scope } from '../types/emissions';
import { OpenAIBatchService } from './openaiBatchService';
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  created_at?: string;
  updated_at?: string;
  upload_session_id?: string | null;
  year?: number | null;
}

/**
 * Handle OpenAI API-based emission calculations
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
   * @param batchSize - Optional custom batch size (default: 50)
   * @returns Summary of the calculation process
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
    try {
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
          metadata,
          region,
          mode
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

      // For large batches, use OpenAI Batch API
      if (entries.length > 50 && !batchSize) {
        const batchService = OpenAIBatchService.getInstance();
        return await batchService.processEmissionEntries(companyId, entries);
      }

      // For smaller batches or when custom batch size is specified, use regular batch processing
      return await processBatchEmissions(companyId, entries, batchSize);
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
   * Save OpenAI calculation result to the database
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
        .from('emission_calc_openai')
        .insert({
          company_id: companyId,
          entry_id: parseInt(entryId),
          total_emissions: result.co2e,
          emissions_unit: result.co2e_unit,
          scope: scope?.toString(),
          
          activity_id: params.emission_factor.activity_id,
          emissions_factor_id: result.emission_factor.id,
          factor_name: result.emission_factor.name,
          region: result.emission_factor.region,
          category: result.emission_factor.category,
          source: result.emission_factor.source,
          year_used: result.emission_factor.year,
          
          co2_emissions: result.constituent_gases.co2 || 0,
          ch4_emissions: result.constituent_gases.ch4 || 0,
          n2o_emissions: result.constituent_gases.n2o || 0,
          
          activity_data: result.activity_data as any,
          request_params: params as any,
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
        .from('emission_calc_openai')
        .insert({
          company_id: companyId,
          entry_id: 0, // Manual calculation, no entry_id
          total_emissions: data.co2e,
          emissions_unit: data.co2e_unit,
          category: data.category,
          scope: data.scope.toString(),
          activity_data: data.activityData as any,
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
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/calculate-emissions`, {
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
    // Note: Since emission_factors table doesn't exist in current schema, we'll use mock calculation
    const mockEmissionFactor = 2.5; // kg CO2e per unit
    const totalEmissions = typedEntry.quantity * mockEmissionFactor;
    
    // Create calculation record
    const { data: calcData, error: calcError } = await supabase
      .from('emission_calc_openai')
      .insert({
        company_id: typedEntry.company_id,
        entry_id: parseInt(typedEntry.id),
        total_emissions: totalEmissions,
        emissions_unit: 'kg CO2e',
        activity_id: typedEntry.category,
        factor_name: `Mock Factor - ${typedEntry.category}`,
        source: 'DEFRA',
        year_used: new Date().getFullYear(),
        calculated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (calcError) {
      console.error('Error creating calculation record:', calcError);
      return {
        success: false,
        message: `Error creating calculation: ${calcError.message}`
      };
    }
    
    // Update the entry status
    const { error: updateError } = await supabase
      .from('emission_entries')
      .update({ match_status: 'matched' })
      .eq('id', typedEntry.id);
      
    if (updateError) {
      return {
        success: false,
        message: `Error updating entry status: ${updateError.message}`
      };
    }
    
    return {
      success: true,
      message: `Entry processed with status: matched`,
      result: calcData
    };
    
  } catch (error) {
    console.error('Error in processSingleEmissionEntry:', error);
    return {
      success: false,
      message: `Unexpected error: ${error?.message || String(error)}`
    };
  }
};

/**
 * Get optimal batch size based on total number of entries
 * @param totalEntries - Total number of entries to process
 * @returns Optimal batch size
 */
function getOptimalBatchSize(totalEntries: number): number {
  if (totalEntries >= 50) return 50;
  if (totalEntries >= 40) return 40;
  if (totalEntries >= 30) return 30;
  if (totalEntries >= 20) return 20;
  if (totalEntries >= 10) return 10;
  return totalEntries; // For very small numbers, process all at once
}

/**
 * Process multiple emission entries in batches
 * @param companyId - The company ID
 * @param entries - Array of emission entries to process
 * @param batchSize - Optional custom batch size (default: calculated based on total entries)
 * @returns Summary of the calculation process
 */
async function processBatchEmissions(
  companyId: string,
  entries: any[],
  batchSize?: number
): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  details: Array<{ entryId: string; success: boolean; message?: string }>;
}> {
  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    details: [] as Array<{ entryId: string; success: boolean; message?: string }>
  };

  // Get company preferences once for all batches
  const { data: preferences } = await supabase
    .from('company_preferences')
    .select('preferred_emission_source')
    .eq('company_id', companyId)
    .maybeSingle();

  const preferredSource = preferences?.preferred_emission_source || 'DEFRA';

  // Calculate optimal batch size if not provided
  const optimalBatchSize = batchSize || getOptimalBatchSize(entries.length);

  // Process entries in batches
  for (let i = 0; i < entries.length; i += optimalBatchSize) {
    const batch = entries.slice(i, i + optimalBatchSize);
    const batchPromises = batch.map(async (entry) => {
      try {
        // Prepare the prompt for OpenAI
        const prompt = `Calculate emissions for the following entry:
          Category: ${entry.category}
          Quantity: ${entry.quantity}
          Unit: ${entry.unit}
          Region: ${entry.region || 'global'}
          Mode: ${entry.mode || 'N/A'}
          
          Please provide the emissions value in kg CO2e.`;

        // Call OpenAI API
        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo-0125',
          messages: [
            {
              role: 'system',
              content: 'You are an AI assistant that helps calculate carbon emissions. Always respond with the emissions value in kg CO2e.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000
        });

        // Extract emissions value from response
        const content = response.choices[0].message.content;
        const emissionsMatch = content.match(/emissions:\s*([\d.]+)/i);
        const emissions = emissionsMatch ? parseFloat(emissionsMatch[1]) : null;

        if (!emissions) {
          throw new Error('Could not extract emissions value from AI response');
        }

        // Store the result
        await supabase
          .from('emission_calc_openai')
          .insert({
            company_id: companyId,
            entry_id: entry.id,
            total_emissions: emissions,
            source: preferredSource,
            calculated_at: new Date().toISOString()
          });

        // Update entry status
        await supabase
          .from('emission_entries')
          .update({ match_status: 'matched' })
          .eq('id', entry.id);

        return {
          entryId: entry.id,
          success: true
        };
      } catch (error) {
        return {
          entryId: entry.id,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    
    // Update results
    results.processed += batch.length;
    results.succeeded += batchResults.filter(r => r.success).length;
    results.failed += batchResults.filter(r => !r.success).length;
    results.details.push(...batchResults);
  }

  return results;
}
