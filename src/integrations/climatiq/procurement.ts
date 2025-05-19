import { climatiqClient } from './client';

/**
 * Activity Description for Procurement (Scope 3.1)
 * Can use classification code or activity ID
 */
export type ActivityDescription = 
  | { classification_code: string; classification_type: ClassificationType }
  | { activity_id: string };

/**
 * Classification types supported by Climatiq
 */
export type ClassificationType = 'nace2' | 'isic4' | 'naics2017' | 'mcc' | 'unspsc';

/**
 * Procurement request parameters
 */
export interface ProcurementRequest {
  activity: ActivityDescription;
  spend_year: number;
  spend_region: string;
  money: number;
  money_unit: string;
  tax_margin?: number;
  trade_margin?: number;
  transport_margin?: number;
}

/**
 * Margin calculation details
 */
export interface CalculationDetails {
  tax_margin: number;
  trade_margin: number;
  transport_margin: number;
  inflation_applied: number;
}

/**
 * Notice object for any warnings or information
 */
export interface Notice {
  severity: 'warning' | 'info';
  message: string;
  code: string;
}

/**
 * Source data point for audit trail
 */
export interface SourceDataPoint {
  data_category: string | null;
  name: string;
  source: string;
  source_dataset: string | null;
  year: string | null;
  region: string;
  region_name: string;
}

/**
 * Procurement response format
 */
export interface ProcurementResponse {
  estimate: {
    co2e: number;
    co2e_unit: string;
    co2e_calculation_method: string;
    co2e_calculation_origin: string;
    emission_factor: {
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
    };
    constituent_gases: {
      co2e_total: number;
      co2e_other: number | null;
      co2: number | null;
      ch4: number | null;
      n2o: number | null;
    };
    activity_data: {
      activity_value: number;
      activity_unit: string;
    };
    audit_trail: string;
  };
  calculation_details: CalculationDetails | null;
  notices: Notice[];
  source_trail: SourceDataPoint[];
}

/**
 * Batch procurement response
 */
export interface ProcurementBatchResponse {
  results: ProcurementResponse[];
  errors: Array<{
    error: string;
    error_code: string;
    message: string;
    index: number;
  }>;
}

/**
 * Calculate emissions for a purchase using spend-based method
 * @param request The procurement request with spend details
 * @returns Estimated emissions and calculation details
 */
export async function estimateProcurement(request: ProcurementRequest): Promise<ProcurementResponse> {
  const response = await climatiqClient.post('/procurement/v1/spend', request);
  return response.data;
}

/**
 * Calculate emissions for multiple purchases in a single request
 * @param requests An array of procurement requests
 * @returns Batch response with results and any errors
 */
export async function estimateProcurementBatch(requests: ProcurementRequest[]): Promise<ProcurementBatchResponse> {
  const response = await climatiqClient.post('/procurement/v1/spend/batch', requests);
  return response.data;
}

/**
 * Example usage of the procurement endpoint
 * 
 * @example
 * const result = await estimateProcurement({
 *   activity: {
 *     classification_code: "25",
 *     classification_type: "isic4"
 *   },
 *   spend_year: 2022,
 *   spend_region: "DE",
 *   money: 100,
 *   money_unit: "eur",
 *   tax_margin: 0.2
 * });
 */ 