// Export client
export { climatiqClient } from './client';

// Export procurement service
export * from './procurement';

// Export basic estimate service
export * from './estimate';

// Export energy service
export * from './energy';

// Add more services as they are implemented 

// Climatiq API Integration
// Documentation: https://docs.climatiq.io/

// API Configuration
const CLIMATIQ_API_URL = 'https://beta3.api.climatiq.io';
const CLIMATIQ_API_KEY = process.env.NEXT_PUBLIC_CLIMATIQ_API_KEY || '';

// Error Handling
export class ClimatiqError extends Error {
  status?: number;
  data?: any;
  
  constructor(message: string, status?: number, data?: any) {
    super(message);
    this.name = 'ClimatiqError';
    this.status = status;
    this.data = data;
  }
}

// Common Types
export interface ConstituentsGases {
  co2: number | null;
  ch4: number | null;
  n2o: number | null;
}

export interface EmissionFactor {
  activity_id?: string;
  data_version?: string;
  name?: string;
  category?: string;
  source?: string;
  source_version?: string;
  year?: number;
  region?: string;
  calculation_method?: 'ar4' | 'ar5' | 'ar6';
}

export interface Notice {
  severity: 'warning' | 'info';
  message: string;
}

// API Client
async function climatiqRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'POST',
  data?: any
): Promise<T> {
  try {
    if (!CLIMATIQ_API_KEY) {
      throw new ClimatiqError('Climatiq API key is not configured');
    }

    const response = await fetch(`${CLIMATIQ_API_URL}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${CLIMATIQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new ClimatiqError(
        responseData.error || 'Unknown error occurred',
        response.status,
        responseData
      );
    }

    return responseData as T;
  } catch (error) {
    if (error instanceof ClimatiqError) {
      throw error;
    }
    throw new ClimatiqError(error instanceof Error ? error.message : 'Unknown error occurred');
  }
}

// Basic Estimate API
export interface EstimateRequest {
  emission_factor: {
    activity_id: string;
    data_version?: string;
    region?: string;
    year?: number;
    calculation_method?: 'ar4' | 'ar5' | 'ar6';
  };
  parameters: Record<string, any>;
}

export interface EstimateResponse {
  co2e: number;
  co2e_unit: string;
  co2e_calculation_method: string;
  emission_factor: EmissionFactor;
  constituent_gases: ConstituentsGases;
  activity_data: {
    activity_value: number;
    activity_unit: string;
  };
  notices: Notice[];
}

export async function estimate(request: EstimateRequest): Promise<EstimateResponse> {
  return climatiqRequest<EstimateResponse>('/estimate', 'POST', request);
}

// Procurement API
export interface ProcurementItemRequest {
  money: number;
  money_unit: string;
  category: string;
  sector?: string;
  region: string;
  data_version: string;
  year?: number;
  name?: string;
  description?: string;
}

export interface ProcurementRequest {
  items: ProcurementItemRequest[];
}

export interface ProcurementItemResponse {
  co2e: number;
  co2e_unit: string;
  co2e_calculation_method: string;
  emission_factor?: EmissionFactor;
  constituent_gases?: ConstituentsGases;
  notices: Notice[];
}

export interface ProcurementResponse {
  items: ProcurementItemResponse[];
  total: {
    co2e: number;
    co2e_unit: string;
  };
  notices: Notice[];
}

export async function estimateProcurement(request: ProcurementRequest): Promise<ProcurementResponse> {
  return climatiqRequest<ProcurementResponse>('/procurement', 'POST', request);
}

// Electricity API
export interface EnergyAmount {
  energy: number;
  energy_unit: string;
}

export interface ElectricityComponent {
  amount: EnergyAmount;
  connection_type: 'grid' | 'direct';
  supplier?: string;  // Only for grid connection
  energy_source?: string;  // Only for direct connection
  loss_factor?: number;  // Only for direct connection
}

export interface ElectricityRequest {
  region: string;
  year: number;
  amount: EnergyAmount;
  recs?: EnergyAmount;
  source_set: 'core' | 'iea';
  components: ElectricityComponent[];
  allow_iea_provisional?: boolean;
}

export interface EmissionResult {
  co2e: number;
  co2e_unit: string;
}

export interface ElectricityBaseResponse {
  consumption: EmissionResult;
  transmission_and_distribution: EmissionResult;
  well_to_tank: EmissionResult;
  well_to_tank_of_transmission_and_distribution: EmissionResult;
}

export interface ElectricityResponse {
  location: ElectricityBaseResponse;
  market: ElectricityBaseResponse;
  notices: Notice[];
}

export async function estimateElectricity(request: ElectricityRequest): Promise<ElectricityResponse> {
  return climatiqRequest<ElectricityResponse>('/calculation/electricity', 'POST', request);
}

// Fuel Combustion API
export interface FuelCombustionRequest {
  emission_factor: {
    activity_id: string;
    data_version?: string;
    region?: string;
    year?: number;
  };
  fuel_amount: {
    type: 'energy' | 'volume' | 'mass';
    value: number;
    unit: string;
  };
  include_wtt?: boolean;
}

export interface FuelCombustionResponse {
  co2e: number;
  co2e_unit: string;
  co2e_calculation_method: string;
  emission_factor: EmissionFactor;
  constituent_gases: ConstituentsGases;
  fuel_amount: {
    type: 'energy' | 'volume' | 'mass';
    value: number;
    unit: string;
  };
  wtt?: {
    co2e: number;
    co2e_unit: string;
  };
  notices: Notice[];
}

export async function estimateFuelCombustion(request: FuelCombustionRequest): Promise<FuelCombustionResponse> {
  return climatiqRequest<FuelCombustionResponse>('/calculation/fuel_combustion', 'POST', request);
}

// Vehicles API
export interface VehicleRequest {
  emission_factor: {
    activity_id: string;
    data_version?: string;
    region?: string;
    year?: number;
  };
  parameters: {
    distance: number;
    distance_unit: string;
    passengers?: number;
    weight?: number;
    weight_unit?: string;
  };
  include_wtt?: boolean;
}

export interface VehicleResponse {
  co2e: number;
  co2e_unit: string;
  co2e_calculation_method: string;
  emission_factor: EmissionFactor;
  constituent_gases: ConstituentsGases;
  parameters: {
    distance: number;
    distance_unit: string;
    passengers?: number;
    weight?: number;
    weight_unit?: string;
  };
  wtt?: {
    co2e: number;
    co2e_unit: string;
  };
  notices: Notice[];
}

export async function estimateVehicleEmissions(request: VehicleRequest): Promise<VehicleResponse> {
  return climatiqRequest<VehicleResponse>('/calculation/vehicles', 'POST', request);
}

// Search Emission Factors API
export interface SearchEmissionFactorsRequest {
  query?: string;
  activity_id?: string;
  data_version?: string;
  category?: string;
  sector?: string;
  source?: string;
  region?: string;
  year?: number;
  page?: number;
  results_per_page?: number;
}

export interface SearchEmissionFactorsResponse {
  results: EmissionFactor[];
  total_count: number;
  current_page: number;
  last_page: number;
}

export async function searchEmissionFactors(request: SearchEmissionFactorsRequest): Promise<SearchEmissionFactorsResponse> {
  // Convert request to query params
  const params = new URLSearchParams();
  Object.entries(request).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, value.toString());
    }
  });

  return climatiqRequest<SearchEmissionFactorsResponse>(`/search/emission_factors?${params.toString()}`, 'GET');
}

// Export all types and functions
export {
  CLIMATIQ_API_URL,
  climatiqRequest,
}; 