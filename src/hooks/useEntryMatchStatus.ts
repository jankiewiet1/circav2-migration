import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
        // First, get all emission entries
        const { data: entriesData, error: entriesError } = await supabase
          .from('emission_entries')
          .select('id, match_status')
          .eq('company_id', companyId);

        if (entriesError) {
          throw entriesError;
        }

        if (!entriesData) {
          setCounts({ matched: 0, unmatched: 0, total: 0 });
          return;
        }

        // Count matched vs unmatched
        const total = entriesData.length;
        const matched = entriesData.filter(entry => entry.match_status === 'matched').length;
        const unmatched = total - matched;

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