
export interface EmissionsData {
  scope: string;
  value: number;
  unit: string;
  date: string;
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

export interface ChartDataPoint {
  name: string;
  value: number;
}

// User and Profile interfaces
export interface Profile {
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  email?: string;
  job_title?: string;
  department?: string;
}

export interface UserWithProfile {
  id: string;
  email: string;
  profile?: Profile;
}

export type User = UserWithProfile;

// Company and related interfaces
export interface Company {
  id: string;
  name: string;
  industry: string;
  country: string;
  city: string;
  postal_code: string;
  contact_name: string;
  contact_email: string;
  contact_title: string;
  phone_number?: string;
  kvk_number?: string;
  vat_number?: string;
  billing_address?: string;
  billing_email?: string;
  bank_name?: string;
  iban?: string;
  setup_completed: boolean;
  created_at: string;
  updated_at: string;
  // Company preferences
  preferred_currency?: string;
  fiscal_year_start_month?: string;
  reporting_frequency?: string;
  language?: string;
  timezone?: string;
  emission_unit?: string;
  default_view?: string;
}

export interface CompanyFormValues {
  name: string;
  industry: string;
  country?: string;
  kvk_number?: string;
  vat_number?: string;
  iban?: string;
  bank_name?: string;
  billing_email?: string;
  phone_number?: string;
  billing_address?: string;
  postal_code?: string;
  city?: string;
  contact_name?: string;
  contact_title?: string;
  contact_email?: string;
}

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface CompanyMember {
  id: string;
  user_id: string;
  role: UserRole;
  company_id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}
