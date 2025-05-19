
export interface ChartDataPoint {
  name: string;
  value: number;
}

export interface EmissionData {
  id: string;
  fuel_type: string;
  source: string;
  amount: number;
  unit: string;
  emissions_co2e?: number;
  date: string;
  emission_factor_source?: string;
  scope_description?: string;
  reporting_boundary?: string;
  reporting_period?: string;
  activity_data?: string;
  uncertainty_notes?: string;
  trend_notes?: string;
  progress_toward_target?: string;
  additional_notes?: string;
  events_affecting_data?: string;
}
