
// User roles
export type UserRole = 'admin' | 'editor' | 'viewer';

// Company form values
export interface CompanyFormValues {
  id?: string;
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
  preferred_currency?: string;
  fiscal_year_start_month?: string;
  reporting_frequency?: string;
  language?: string;
  timezone?: string;
  setup_completed?: boolean;
}

// Company member
export interface CompanyMember {
  id: string;
  user_id: string;
  company_id: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  email?: string;
  joinedAt?: string;
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

// Company interface
export interface Company {
  id: string;
  name: string;
  industry: string;
  country?: string;
  city?: string;
  postal_code?: string;
  contact_name?: string;
  contact_email?: string;
  contact_title?: string;
  phone_number?: string;
  kvk_number?: string;
  vat_number?: string;
  billing_address?: string;
  billing_email?: string;
  bank_name?: string;
  iban?: string;
  setup_completed?: boolean;
  created_at?: string;
  updated_at?: string;
  preferred_currency?: string;
  fiscal_year_start_month?: string;
  reporting_frequency?: string;
  language?: string;
  timezone?: string;
  emission_unit?: string;
  default_view?: string;
}

// Emissions data for charts
export interface EmissionsData {
  scope: string;
  value: number;
  unit: string;
  date: string;
}

// Dashboard summary
export interface DashboardSummary {
  total_emissions?: number;
  monthly_trends?: any[];
  emissions_by_scope?: any[];
}
