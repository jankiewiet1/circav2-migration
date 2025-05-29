/**
 * MCP Action: Calculate Carbon Footprint
 * 
 * This API endpoint implements the calculateCarbonFootprint action
 * following the Model Context Protocol (MCP) specification.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/integrations/supabase/client';
import { MCPActionType, MCPActionInputs, MCPActionOutputs } from '@/types/mcp';
import { EmissionSource, Scope } from '@/types/emissions';

/**
 * Main handler for the /api/mcp-actions/calculate-carbon-footprint endpoint
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user ID from auth session
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Parse action input parameters
    const actionInput = req.body as MCPActionInputs[MCPActionType.CALCULATE_CARBON_FOOTPRINT];
    
    if (!actionInput || !actionInput.dataEntryIds || actionInput.dataEntryIds.length === 0) {
      return res.status(400).json({ error: 'Invalid input parameters. dataEntryIds are required.' });
    }
    
    // Perform carbon footprint calculation
    const result = await calculateCarbonFootprint(
      actionInput.dataEntryIds,
      actionInput.includeIndirect || false,
      actionInput.emissionFactorSource
    );
    
    // Return the calculation result
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error calculating carbon footprint:', error);
    return res.status(500).json({ error: 'Failed to calculate carbon footprint' });
  }
}

/**
 * Calculate carbon footprint for the given data entries
 */
async function calculateCarbonFootprint(
  dataEntryIds: string[],
  includeIndirect: boolean,
  emissionFactorSource?: string
): Promise<MCPActionOutputs[MCPActionType.CALCULATE_CARBON_FOOTPRINT]> {
  // Fetch data entries
  const { data: dataEntries, error: entriesError } = await supabase
    .from('data_entry')
    .select('*, emission_calc_openai(*)')
    .in('id', dataEntryIds);

  if (entriesError) {
    throw new Error(`Failed to fetch data entries: ${entriesError.message}`);
  }

  // Fetch emission factors (if not already included in data entries)
  const { data: emissionFactors, error: factorsError } = await supabase
    .from('emission_factors_legacy')
    .select('*')
    .eq('source', emissionFactorSource || 'defra');

  if (factorsError) {
    throw new Error(`Failed to fetch emission factors: ${factorsError.message}`);
  }

  // Initialize calculation results
  const result: MCPActionOutputs[MCPActionType.CALCULATE_CARBON_FOOTPRINT] = {
    totalEmissions: 0,
    unit: 'kgCO2e',
    breakdown: {
      scope1: 0,
      scope2: 0,
      scope3: 0,
    },
    calculationDetails: [],
  };

  // Calculate emissions for each data entry
  for (const entry of dataEntries) {
    // Find matching emission factor
    const matchingFactor = findMatchingEmissionFactor(entry, emissionFactors, emissionFactorSource);
    
    if (!matchingFactor) {
      console.warn(`No matching emission factor found for entry ${entry.id}`);
      continue;
    }
    
    // Calculate emissions
    const entryEmissions = calculateEntryEmissions(entry, matchingFactor);
    
    // Add to total and breakdown
    result.totalEmissions += entryEmissions;
    
    // Map GHG category to scope
    const scope = mapGHGCategoryToScope(entry.ghg_category);
    if (scope === 1) {
      result.breakdown.scope1 += entryEmissions;
    } else if (scope === 2) {
      result.breakdown.scope2 += entryEmissions;
    } else if (scope === 3) {
      result.breakdown.scope3 += entryEmissions;
    }
    
    // Add calculation details
    result.calculationDetails.push({
      dataEntryId: entry.id,
      emissions: entryEmissions,
      emissionFactor: matchingFactor,
    });
  }

  return result;
}

/**
 * Find matching emission factor for a data entry
 */
function findMatchingEmissionFactor(dataEntry: any, factors: any[], preferredSource?: string) {
  // Try to find an exact match first
  const exactMatch = factors.find(factor => 
    factor.category === mapActivityToCategory(dataEntry.activity_description) &&
    factor.region === (dataEntry.region || 'global') &&
    (!preferredSource || factor.source === preferredSource)
  );
  
  if (exactMatch) return exactMatch;
  
  // If no exact match, find the closest match
  return factors.find(factor => 
    factor.category === mapActivityToCategory(dataEntry.activity_description)
  ) || factors[0]; // Fallback to first factor if no match
}

/**
 * Calculate emissions for a single data entry
 */
function calculateEntryEmissions(entry: any, factor: any): number {
  // Convert units if necessary
  const convertedQuantity = convertUnits(entry.quantity, entry.unit, factor.unit);
  
  // Apply emission factor
  const emissions = convertedQuantity * factor.value;
  
  return emissions;
}

/**
 * Convert quantity between different units
 */
function convertUnits(value: number, fromUnit: string, toUnit: string): number {
  // Implement unit conversion logic for common units
  if (fromUnit === toUnit) {
    return value;
  }
  
  // Energy conversions
  if (fromUnit === 'kWh' && toUnit === 'MWh') {
    return value / 1000;
  }
  if (fromUnit === 'MWh' && toUnit === 'kWh') {
    return value * 1000;
  }
  
  // Volume conversions
  if (fromUnit === 'liters' && toUnit === 'm3') {
    return value / 1000;
  }
  if (fromUnit === 'm3' && toUnit === 'liters') {
    return value * 1000;
  }
  
  // Weight conversions
  if (fromUnit === 'kg' && toUnit === 'tonnes') {
    return value / 1000;
  }
  if (fromUnit === 'tonnes' && toUnit === 'kg') {
    return value * 1000;
  }
  
  // Default: no conversion
  console.warn(`No conversion available from ${fromUnit} to ${toUnit}`);
  return value;
}

/**
 * Map GHG category string to numeric scope
 */
function mapGHGCategoryToScope(category: string): Scope {
  if (category === 'Scope 1') return Scope.SCOPE_1;
  if (category === 'Scope 2') return Scope.SCOPE_2;
  if (category === 'Scope 3') return Scope.SCOPE_3;
  return Scope.SCOPE_3; // Default
}

/**
 * Map activity description to emission category
 */
function mapActivityToCategory(activity: string): string {
  const activityLower = activity.toLowerCase();
  
  if (activityLower.includes('electricity')) {
    return 'purchased_electricity';
  }
  if (activityLower.includes('natural gas') || activityLower.includes('heating')) {
    return 'stationary_combustion';
  }
  if (activityLower.includes('vehicle') || activityLower.includes('transport')) {
    return 'mobile_combustion';
  }
  if (activityLower.includes('flight') || activityLower.includes('air travel')) {
    return 'business_travel';
  }
  if (activityLower.includes('waste')) {
    return 'waste_disposal';
  }
  if (activityLower.includes('water')) {
    return 'water_supply';
  }
  
  return 'other';
} 