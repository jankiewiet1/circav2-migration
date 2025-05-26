
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CompanyPreferences {
  id?: string;
  company_id: string;
  preferred_currency?: string;
  fiscal_year_start_month?: string;
  reporting_frequency?: string;
  language?: string;
  timezone?: string;
  emission_unit?: string;
  preferred_emission_source?: string;
  default_view?: string;
}

export const getCompanyPreferences = async (companyId: string): Promise<CompanyPreferences | null> => {
  try {
    const { data, error } = await supabase
      .from('company_preferences')
      .select('*')
      .eq('company_id', companyId)
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Error fetching company preferences:', error);
    toast.error('Failed to load company preferences');
    return null;
  }
};

export const updateCompanyPreferences = async (preferences: CompanyPreferences): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('company_preferences')
      .upsert({
        ...preferences,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
    toast.success('Company preferences updated successfully');
    return true;
  } catch (error: any) {
    console.error('Error updating company preferences:', error);
    toast.error('Failed to update company preferences');
    return false;
  }
};
