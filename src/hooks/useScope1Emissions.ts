
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EmissionEntryData {
  id: string;
  company_id: string;
  upload_session_id?: string | null;
  date: string;
  year: number;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  emission_factor?: number | null;
  emission_factor_id?: number | null;
  scope: number;
  emissions?: number | null;
  co2_emissions?: number | null;
  ch4_emissions?: number | null;
  n2o_emissions?: number | null;
  match_status?: string | null;
  created_at: string;
  updated_at: string;
  embedding?: string;
  notes?: string;
}

interface Filters {
  dateRange?: string;
  year?: number;
  category?: string;
  scope?: number;
  unit?: string;
  matchStatus?: string;
}

export const useEmissionEntries = (companyId: string, scopeFilter?: number) => {
  const [isLoading, setIsLoading] = useState(false);
  const [entries, setEntries] = useState<EmissionEntryData[]>([]);

  const fetchEntries = async (filters?: Filters) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('emission_entries')
        .select('*')
        .eq('company_id', companyId);

      if (scopeFilter) {
        query = query.eq('scope', scopeFilter);
      }

      if (filters) {
        // Use year filter if specified, otherwise use dateRange
        if (filters.year) {
          const yearExists = await checkYearColumnExists();
          
          if (yearExists) {
            query = query.eq('year', filters.year);
          } else {
            // Fallback to filtering by date range for the entire year
            const startDate = new Date(filters.year, 0, 1); 
            const endDate = new Date(filters.year + 1, 0, 0);
            query = query
              .gte('date', startDate.toISOString().split('T')[0])
              .lte('date', endDate.toISOString().split('T')[0]);
          }
        } else if (filters.dateRange && filters.dateRange !== 'all') {
          const today = new Date();
          let startDate = new Date();

          switch (filters.dateRange) {
            case 'last3months':
              startDate.setMonth(today.getMonth() -3);
              break;
            case 'last6months':
              startDate.setMonth(today.getMonth() -6);
              break;
            case 'last12months':
              startDate.setFullYear(today.getFullYear() -1);
              break;
            case 'thisYear':
              startDate = new Date(today.getFullYear(), 0, 1);
              break;
            case 'lastYear':
              startDate = new Date(today.getFullYear() - 1, 0, 1);
              break;
          }

          query = query.gte('date', startDate.toISOString().split('T')[0]);
        }

        if (filters.category && filters.category !== 'all') {
          query = query.eq('category', filters.category);
        }

        if (filters.unit && filters.unit !== 'all') {
          query = query.eq('unit', filters.unit);
        }
        
        // Add filter by match_status if provided
        if (filters.matchStatus && filters.matchStatus !== 'all') {
          query = query.eq('match_status', filters.matchStatus);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // Convert to EmissionEntryData format
      const entriesData: EmissionEntryData[] = data ? data.map(entry => ({
        ...entry,
        emission_factor: null, // Default values for missing properties
        emissions: null
      })) : [];

      setEntries(entriesData);
      return { data: entriesData, error: null };
    } catch (error: any) {
      console.error('Error fetching emission entries:', error);
      toast.error('Failed to load emission data');
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to check if year column exists
  const checkYearColumnExists = async () => {
    try {
      const { data: yearData } = await supabase
        .from('emission_entries')
        .select('year')
        .limit(1);
      
      return yearData && yearData.length > 0 && yearData[0].year !== undefined;
    } catch (error) {
      console.error('Error checking year column:', error);
      return false;
    }
  };

  return {
    entries,
    isLoading,
    fetchEntries,
  };
};
