
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const fetchCompanyPreferences = async (companyId: string) => {
  try {
    const { data, error } = await supabase
      .from('company_preferences')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error("Error fetching company preferences:", error);
    return { data: null, error };
  }
};

export const updateCompanyPreferences = async (companyId: string, preferences: {
  preferred_currency?: string;
  fiscal_year_start_month?: string;
  reporting_frequency?: string;
  language?: string;
  timezone?: string;
  preferred_emission_source?: string;
  emission_unit?: string;
}) => {
  try {
    const { data: existingPrefs } = await supabase
      .from('company_preferences')
      .select('id')
      .eq('company_id', companyId)
      .maybeSingle();
    
    let error;
    
    if (existingPrefs) {
      const result = await supabase
        .from('company_preferences')
        .update({
          ...preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('company_id', companyId);
      
      error = result.error;
    } else {
      const result = await supabase
        .from('company_preferences')
        .insert({
          company_id: companyId,
          ...preferences,
          updated_at: new Date().toISOString(),
        });
      
      error = result.error;
    }

    if (error) throw error;
    
    // Trigger recalculation when emission source changes
    if (preferences.preferred_emission_source || preferences.emission_unit) {
      await recalculateCompanyEmissions(companyId);
      toast.success("Emission factors updated. Recalculating emissions...");
    } else {
      toast.success("Preferences updated successfully");
    }
    
    return { error: null };
  } catch (error: any) {
    console.error("Error updating company preferences:", error);
    toast.error("Failed to update preferences");
    return { error };
  }
};

export const recalculateCompanyEmissions = async (companyId: string) => {
  try {
    // Use a direct SQL update instead of RPC since the RPC might not exist yet
    const { error } = await supabase
      .from('emission_entries')
      .update({ match_status: null })
      .eq('company_id', companyId);
    
    if (error) throw error;
    
    toast.success("Emissions will be recalculated on next view");
    return { error: null };
  } catch (error: any) {
    console.error("Error recalculating emissions:", error);
    toast.error("Failed to recalculate emissions");
    return { error };
  }
};
