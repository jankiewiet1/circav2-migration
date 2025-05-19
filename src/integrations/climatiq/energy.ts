import { climatiqClient } from './client';
import { Notice, SourceDataPoint } from './procurement';

/**
 * Energy amount object for specifying energy units
 */
export interface EnergyAmount {
  energy: number;
  energy_unit: string;
}

/**
 * Volume amount object for specifying volume units
 */
export interface VolumeAmount {
  volume: number;
  volume_unit: string;
}

/**
 * Weight amount object for specifying weight units
 */
export interface WeightAmount {
  weight: number;
  weight_unit: string;
}

/**
 * Energy component for electricity
 */
export interface ElectricityComponent {
  amount: EnergyAmount;
  connection_type: 'grid' | 'direct';
  supplier?: string;
  loss_factor?: number;
  energy_source?: string;
}

/**
 * Electricity request parameters
 */
export interface ElectricityRequest {
  region: string;
  year?: number;
  amount?: EnergyAmount;
  recs?: EnergyAmount;
  source_set?: 'core' | 'iea';
  components?: ElectricityComponent[];
  allow_iea_provisional?: boolean;
}

/**
 * Energy estimate details
 */
export interface EnergyEstimate {
  co2e: number;
  co2e_unit: string;
  co2e_calculation_method: string;
  source_trail: SourceDataPoint[];
  co2_biogenic: number | null;
  constituent_gases: {
    co2: number | null;
    ch4: number | null;
    n2o: number | null;
  };
}

/**
 * Energy reporting quad structure
 */
export interface EnergyReportingQuad {
  consumption: EnergyEstimate;
  well_to_tank: EnergyEstimate;
  transmission_and_distribution: EnergyEstimate;
  well_to_tank_of_transmission_and_distribution: EnergyEstimate;
}

/**
 * Electricity response format
 */
export interface ElectricityResponse {
  location: EnergyReportingQuad;
  market: EnergyReportingQuad;
  notices: Notice[];
}

/**
 * Heat/steam component
 */
export interface HeatComponent {
  amount: EnergyAmount;
  co2e_kg_per_kwh?: number;
  energy_source?: string;
  loss_factor?: number | 'low' | 'medium' | 'high';
}

/**
 * Heat/steam request parameters
 */
export interface HeatRequest {
  region: string;
  year?: number;
  components: HeatComponent[];
}

/**
 * Heat/steam response format
 */
export interface HeatResponse {
  estimates: EnergyReportingQuad;
  notices: Notice[];
}

/**
 * Fuel request parameters
 */
export interface FuelRequest {
  fuel_type: string;
  amount: EnergyAmount | VolumeAmount | WeightAmount;
  region?: string;
  year?: number;
}

/**
 * Fuel response format
 */
export interface FuelResponse {
  combustion: EnergyEstimate;
  well_to_tank: EnergyEstimate;
  notices: Notice[];
}

/**
 * Calculate emissions for electricity use
 * @param request The electricity consumption details
 * @returns Estimated emissions for market and location-based methods
 */
export async function estimateElectricity(request: ElectricityRequest): Promise<ElectricityResponse> {
  const response = await climatiqClient.post('/energy/v1/electricity', request);
  return response.data;
}

/**
 * Calculate emissions for heat and steam use
 * @param request The heat and steam consumption details
 * @returns Estimated emissions
 */
export async function estimateHeatAndSteam(request: HeatRequest): Promise<HeatResponse> {
  const response = await climatiqClient.post('/energy/v1/heat', request);
  return response.data;
}

/**
 * Calculate emissions for fuel combustion
 * @param request The fuel consumption details
 * @returns Estimated emissions for combustion and well-to-tank
 */
export async function estimateFuel(request: FuelRequest): Promise<FuelResponse> {
  const response = await climatiqClient.post('/energy/v1/fuel', request);
  return response.data;
}

/**
 * Example usage of the electricity endpoint
 * 
 * @example
 * const result = await estimateElectricity({
 *   region: "GB",
 *   year: 2023,
 *   amount: {
 *     energy: 5000,
 *     energy_unit: "kWh"
 *   },
 *   components: [
 *     {
 *       amount: {
 *         energy: 1000,
 *         energy_unit: "kWh"
 *       },
 *       connection_type: "grid",
 *       supplier: "british_gas"
 *     }
 *   ]
 * });
 */ 