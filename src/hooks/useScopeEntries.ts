import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

// Define the unified calculation structure from emission_calc table
interface EmissionCalculation {
  id: string;
  entry_id: string;
  calculation_method: string;
  total_emissions: number;
  scope: number;
  category: string | null;
  region: string | null;
  source: string | null;
  confidence: number | null;
  calculated_at: string;
  co2_emissions: number | null;
  ch4_emissions: number | null;
  n2o_emissions: number | null;
  emissions_factor_id: string | null;
  emission_factor_id: string | null;
  year_used: number | null;
  activity_data: any;
  request_params: any;
}

// Define the emission entry with unified calculation structure
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
  emission_calc: EmissionCalculation[] | null; // Updated to use unified table
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
      // Fetch entries with unified calculations from emission_calc table
      const { data, error: fetchError } = await supabase
        .from('emission_entries')
        .select(`
          *,
          emission_calc(*)
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