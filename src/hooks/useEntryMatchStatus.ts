import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { unifiedCalculationService } from '@/services/unifiedCalculationService';

interface MatchStatusCounts {
  matched: number;
  unmatched: number;
  total: number;
}

export function useEntryMatchStatus(companyId: string | undefined) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<MatchStatusCounts>({
    matched: 0,
    unmatched: 0,
    total: 0
  });

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    const fetchMatchStatus = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get total emission entries count
        const { data: entriesData, error: entriesError } = await supabase
          .from('emission_entries')
          .select('id')
          .eq('company_id', companyId);

        if (entriesError) {
          throw entriesError;
        }

        const total = entriesData?.length || 0;

        // Get unified calculations (RAG + Assistant) 
        const calculations = await unifiedCalculationService.fetchAllCalculations(companyId);
        
        // Count unique entry_ids that have calculations
        const uniqueCalculatedEntries = new Set(
          calculations.map(calc => calc.entry_id).filter(Boolean)
        );
        const matched = uniqueCalculatedEntries.size;
        const unmatched = Math.max(0, total - matched);

        console.log('📊 Match status calculation (unified):', {
          total,
          matched,
          unmatched,
          totalCalculations: calculations.length,
          ragCalculations: calculations.filter(c => c.calculation_method === 'RAG').length,
          openaiCalculations: calculations.filter(c => c.calculation_method === 'OPENAI').length,
          uniqueEntries: uniqueCalculatedEntries.size
        });

        setCounts({
          matched,
          unmatched,
          total
        });

      } catch (err: any) {
        console.error("Error fetching match status:", err);
        setError(err.message || "Failed to load match status data");
      } finally {
        setLoading(false);
      }
    };

    fetchMatchStatus();
  }, [companyId]);

  return { counts, loading, error };
} 