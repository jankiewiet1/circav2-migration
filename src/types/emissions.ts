/**
 * Emission source types
 */
export enum EmissionSource {
  ELECTRICITY = 'electricity',
  TRANSPORT = 'transport',
  FUEL = 'fuel',
  WASTE = 'waste',
  WATER = 'water',
  OTHER = 'other'
}

/**
 * Emission scope categories
 */
export enum Scope {
  SCOPE_1 = 1,
  SCOPE_2 = 2,
  SCOPE_3 = 3
}

/**
 * Emission data interface
 */
export interface EmissionData {
  id: string;
  co2e: number;
  co2e_unit: string;
  source: EmissionSource;
  category: string;
  calculatedAt: Date;
  scope: Scope;
  activityData?: {
    value: number;
    unit: string;
  };
}

/**
 * Emission summary aggregated by scope
 */
export interface EmissionSummary {
  scope1: number;
  scope2: number;
  scope3: number;
  total: number;
  unit: string;
}

/**
 * Emission breakdown by period and scope
 */
export interface EmissionBreakdown {
  period: string;
  scope1: number;
  scope2: number;
  scope3: number;
  total: number;
} 