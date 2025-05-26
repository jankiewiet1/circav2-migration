import { climatiqClient } from './client';
import { Notice, SourceDataPoint } from './procurement';

/**
 * Emission factor selector
 * Can use ID directly or selection parameters
 */
export interface Selector {
  // When using activity_id
  activity_id?: string;
  data_version?: string;
  source?: string;
  source_dataset?: string;
  region?: string;
  region_fallback?: boolean;
  year_fallback?: boolean;
  year?: number;
  source_lca_activity?: string;
  calculation_method?: 'ar4' | 'ar5' | 'ar6';
  allowed_data_quality_flags?: string[];
  
  // When using ID
  id?: string;
}

/**
 * Basic estimate request parameters
 */
export interface EstimateRequest {
  emission_factor: Selector;
  parameters: Record<string, any>;
}

/**
 * Emission factor details
 */
export interface EmissionFactor {
  name: string;
  activity_id: string;
  id: string;
  access_type: string;
  source: string;
  source_dataset: string;
  year: number;
  region: string;
  category: string;
  source_lca_activity: string;
  data_quality_flags: string[];
}

/**
 * Constituent gases breakdown
 */
export interface ConstituentGases {
  co2e_total: number;
  co2e_other: number | null;
  co2: number | null;
  ch4: number | null;
  n2o: number | null;
}

/**
 * Activity data used in calculation
 */
export interface ActivityData {
  activity_value: number;
  activity_unit: string;
}

/**
 * Basic estimate response format
 */
export interface EstimateResponse {
  co2e: number;
  co2e_unit: string;
  co2e_calculation_method: string;
  co2e_calculation_origin: string;
  emission_factor: EmissionFactor | null;
  constituent_gases: ConstituentGases | null;
  activity_data: ActivityData;
  audit_trail: 'enabled' | 'disabled' | 'selector';
  notices: Notice[];
}

/**
 * Batch estimate response
 */
export interface EstimateBatchResponse {
  results: EstimateResponse[];
  errors: Array<{
    error: string;
    error_code: string;
    message: string;
    index: number;
  }>;
}

/**
 * Calculate emissions for a single activity
 * @param request The estimate request with emission factor and parameters
 * @returns Estimated emissions
 */
export async function estimate(request: EstimateRequest): Promise<EstimateResponse> {
  const response = await climatiqClient.post('/data/v1/estimate', request);
  return response.data;
}

/**
 * Calculate emissions for multiple activities in a single request
 * @param requests An array of estimate requests
 * @returns Batch response with results and any errors
 */
export async function estimateBatch(requests: EstimateRequest[]): Promise<EstimateBatchResponse> {
  const response = await climatiqClient.post('/data/v1/estimate/batch', requests);
  return response.data;
}

/**
 * Example usage of the estimate endpoint
 * 
 * @example
 * const result = await estimate({
 *   emission_factor: {
 *     activity_id: "electricity-supply_grid-source_residual_mix",
 *     data_version: "^21",
 *     region: "NL"
 *   },
 *   parameters: {
 *     energy: 1000,
 *     energy_unit: "kWh"
 *   }
 * });
 */ 