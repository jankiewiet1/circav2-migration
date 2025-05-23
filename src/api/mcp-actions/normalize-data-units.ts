/**
 * MCP Action: Normalize Data Units
 * 
 * This API endpoint implements the normalizeDataUnits action
 * following the Model Context Protocol (MCP) specification.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { MCPActionType, MCPActionInputs, MCPActionOutputs } from '@/types/mcp';

/**
 * Main handler for the /api/mcp-actions/normalize-data-units endpoint
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
    // Parse action input parameters
    const actionInput = req.body as MCPActionInputs[MCPActionType.NORMALIZE_DATA_UNITS];
    
    if (!actionInput || !actionInput.sourceUnit || !actionInput.targetUnit || actionInput.value === undefined) {
      return res.status(400).json({ error: 'Invalid input parameters. sourceUnit, targetUnit, and value are required.' });
    }
    
    // Perform unit normalization
    const result = normalizeUnits(
      actionInput.value,
      actionInput.sourceUnit,
      actionInput.targetUnit
    );
    
    // Return the normalization result
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error normalizing data units:', error);
    return res.status(500).json({ error: 'Failed to normalize data units' });
  }
}

/**
 * Normalize units from source to target
 */
function normalizeUnits(
  value: number,
  sourceUnit: string,
  targetUnit: string
): MCPActionOutputs[MCPActionType.NORMALIZE_DATA_UNITS] {
  // Get conversion factor
  const conversionFactor = getConversionFactor(sourceUnit, targetUnit);
  
  if (conversionFactor === null) {
    throw new Error(`No conversion available from ${sourceUnit} to ${targetUnit}`);
  }
  
  const convertedValue = value * conversionFactor;
  
  return {
    originalValue: value,
    originalUnit: sourceUnit,
    convertedValue: convertedValue,
    convertedUnit: targetUnit,
    conversionFactor: conversionFactor
  };
}

/**
 * Get conversion factor between two units
 */
function getConversionFactor(fromUnit: string, toUnit: string): number | null {
  // Normalize unit names (case insensitive)
  const from = fromUnit.toLowerCase().trim();
  const to = toUnit.toLowerCase().trim();
  
  // Same unit - no conversion needed
  if (from === to) {
    return 1;
  }
  
  // Energy conversions (to kWh as base)
  const energyConversions: Record<string, number> = {
    'kwh': 1,
    'mwh': 1000,
    'gwh': 1000000,
    'wh': 0.001,
    'j': 2.77778e-7,
    'kj': 0.000277778,
    'mj': 0.277778,
    'gj': 277.778,
    'btu': 0.000293071,
    'therm': 29.3071
  };
  
  // Volume conversions (to liters as base)
  const volumeConversions: Record<string, number> = {
    'l': 1,
    'liters': 1,
    'ml': 0.001,
    'm3': 1000,
    'cm3': 0.001,
    'gallon': 3.78541,
    'gallons': 3.78541,
    'gal': 3.78541,
    'ft3': 28.3168,
    'barrel': 158.987,
    'bbl': 158.987
  };
  
  // Weight conversions (to kg as base)
  const weightConversions: Record<string, number> = {
    'kg': 1,
    'g': 0.001,
    'tonnes': 1000,
    'ton': 1000,
    't': 1000,
    'lb': 0.453592,
    'lbs': 0.453592,
    'pounds': 0.453592,
    'oz': 0.0283495,
    'stone': 6.35029
  };
  
  // Distance conversions (to km as base)
  const distanceConversions: Record<string, number> = {
    'km': 1,
    'm': 0.001,
    'cm': 0.00001,
    'mm': 0.000001,
    'miles': 1.60934,
    'mi': 1.60934,
    'ft': 0.0003048,
    'in': 0.0000254,
    'yd': 0.0009144
  };
  
  // Try energy conversion
  if (energyConversions[from] && energyConversions[to]) {
    return energyConversions[from] / energyConversions[to];
  }
  
  // Try volume conversion
  if (volumeConversions[from] && volumeConversions[to]) {
    return volumeConversions[from] / volumeConversions[to];
  }
  
  // Try weight conversion
  if (weightConversions[from] && weightConversions[to]) {
    return weightConversions[from] / weightConversions[to];
  }
  
  // Try distance conversion
  if (distanceConversions[from] && distanceConversions[to]) {
    return distanceConversions[from] / distanceConversions[to];
  }
  
  // No conversion found
  return null;
} 