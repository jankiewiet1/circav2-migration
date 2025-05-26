import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

// Get the base type for an emission entry from generated types
type EmissionEntryBase = Database['public']['Tables']['emission_entries']['Row'];

// Manually define the expected structure for the calculation part
// Based on the columns used in the working SQL query (get_dashboard_data)
interface EmissionCalculationPart {
  id: string; 
  entry_id: string;
  total_emissions: number | null;
  // Add climatiq factor information
  climatiq_factor_name?: string | null;
  climatiq_source?: string | null;
  climatiq_year?: number | null;
  climatiq_category?: string | null;
  climatiq_region?: string | null;
  climatiq_activity_id?: string | null;
  // Add calculation details
  category?: string | null;
  unit?: string | null;
  quantity?: number | null;
  date?: string | null; 
  co2_factor?: number | null;
  ch4_factor?: number | null;
  n2o_factor?: number | null;
  co2_emissions?: number | null;
  ch4_emissions?: number | null;
  n2o_emissions?: number | null;
  source?: string | null;
  calculated_at?: string | null;
  emissions_unit?: string | null; // The unit for emissions (usually tCO2e)
}

// Combine the base entry type with the expected calculation structure
// Supabase joins typically return the joined table as an array (even for one-to-one)
export interface EmissionEntryWithCalculation {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  scope: number;
  date: string;
  created_at: string;
  match_status?: string | null;
  notes?: string | null;
  emission_calc_climatiq: EmissionCalculationPart[] | null; // Expecting an array from Supabase join
}

export const useScopeEntries = (scope: 1 | 2 | 3) => {
  const { company } = useCompany();
  const [entries, setEntries] = useState<EmissionEntryWithCalculation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    console.log(`[useScopeEntries] Fetching data for Scope ${scope}, Company: ${company?.id}`);
    if (!company?.id) {
      console.log(`[useScopeEntries] No company ID, returning empty.`);
      setLoading(false);
      setEntries([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('emission_entries')
        .select(`
          *,
          emission_calc_climatiq!inner(*)
        `)
        .eq('company_id', company.id)
        .eq('scope', scope)
        .order('date', { ascending: false });

      if (fetchError) {
        console.error(`[useScopeEntries] Error fetching Scope ${scope} entries:`, fetchError);
        throw new Error(fetchError.message || `Failed to fetch Scope ${scope} entries`);
      }

      console.log(`[useScopeEntries] Fetched Scope ${scope} entries:`, data?.length);
      setEntries((data as unknown as EmissionEntryWithCalculation[]) || []);

    } catch (err: any) {
      console.error(`[useScopeEntries] Catch block error for Scope ${scope}:`, err);
      setError(err.message || 'An unexpected error occurred');
      toast.error(`Failed to load Scope ${scope} data`, {
        description: err.message,
      });
      setEntries([]);
    } finally {
      console.log(`[useScopeEntries] Fetch finished for Scope ${scope}. Loading: false.`);
      setLoading(false);
    }
  }, [company?.id, scope]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { entries, loading, error, refetch: fetchData };
};