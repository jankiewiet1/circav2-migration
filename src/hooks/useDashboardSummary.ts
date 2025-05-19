import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EmissionCalculation {
  entry_id: string;
  total_emissions: number;
}

interface EmissionEntry {
  id: string;
  scope: number;
  created_at: string;
  emission_calc_climatiq: EmissionCalculation[];
}

interface MonthlyEntry {
  created_at: string;
  emission_calc_climatiq: EmissionCalculation[];
}

interface DashboardSummary {
  total_emissions: number;
  scope_breakdown: {
    scope: number;
    emissions: number;
  }[];
  monthly_trends: {
    month: string;
    emissions: number;
  }[];
  coverage: number;
  unmatched_entries: number;
  recent_activities: unknown[];
}

function ensureArray<T>(value: T | T[]): T[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

export function useDashboardSummary(companyId: string | null) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: entriesData, error } = await supabase
        .from('emission_entries')
        .select(`
          id,
          scope,
          emission_calc_climatiq!inner(entry_id,total_emissions)
        `)
        .eq('company_id', companyId)
        .order('id', { ascending: false });

      if (error) throw error;

      // Total number of entries with calculations
      const entriesWithCalculations = entriesData.map(entry => ({
        id: entry.id,
        scope: entry.scope,
        emission_calc_climatiq: ensureArray(entry.emission_calc_climatiq),
      }));

      // Sum of all emissions
      const totalEmissions = entriesWithCalculations.reduce(
        (sum, entry) => sum + (entry.emission_calc_climatiq[0]?.total_emissions || 0),
        0
      );

      // Count entries by scope
      const scopeCountMap = entriesWithCalculations.reduce((acc, entry) => {
        const emissions = entry.emission_calc_climatiq[0]?.total_emissions || 0;
        if (emissions > 0) {
          acc[entry.scope || 'unknown'] = (acc[entry.scope || 'unknown'] || 0) + 1;
        }
        return acc;
      }, {});

      // Get entries without calculations
      const { count: emptyEntriesCount } = await supabase
        .from('emission_entries')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .is('emission_calc_climatiq.total_emissions', null);

      // Get the most recent entries
      const { data: recentEntries } = await supabase
        .from('emission_entries')
        .select(`
          id,
          category,
          description,
          quantity,
          unit,
          created_at,
          emission_calc_climatiq(entry_id,total_emissions)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(5);

      const formattedRecentEntries = recentEntries?.map(entry => ({
        id: entry.id,
        category: entry.category,
        description: entry.description,
        quantity: entry.quantity,
        unit: entry.unit,
        created_at: entry.created_at,
        emission_calc_climatiq: ensureArray(entry.emission_calc_climatiq),
      })) || [];

      // Generate summary data
      const scopeCounts = Object.entries(scopeCountMap).map(([scope, count]) => ({
        scope,
        count: count as number,
        emissions: entriesWithCalculations
          .filter(e => e.scope === scope)
          .reduce((sum, e) => sum + (e.emission_calc_climatiq[0]?.total_emissions || 0), 0),
      }));

      // Fetch monthly trends (last 12 months)
      const { data: monthlyData, error: monthlyError } = await supabase
        .from('emission_entries')
        .select(`
          created_at,
          emission_calc_climatiq(entry_id,total_emissions)
        `)
        .eq('company_id', companyId)
        .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

      if (monthlyError) throw monthlyError;

      const monthlyEntries = (monthlyData || []).map((entry: any) => ({
        ...entry,
        emission_calc_climatiq: ensureArray(entry.emission_calc_climatiq),
      })) as MonthlyEntry[];

      const monthly_trends = monthlyEntries.reduce((acc, entry) => {
        const month = new Date(entry.created_at).toISOString().slice(0, 7);
        const emissions = entry.emission_calc_climatiq[0]?.total_emissions || 0;
        acc[month] = (acc[month] || 0) + emissions;
        return acc;
      }, {} as Record<string, number>);

      // Calculate coverage
      const coverage = entriesWithCalculations.length > 0
        ? ((entriesWithCalculations.length - (emptyEntriesCount || 0)) / entriesWithCalculations.length) * 100
        : 0;

      setSummary({
        total_emissions: totalEmissions,
        scope_breakdown: scopeCounts,
        monthly_trends: Object.entries(monthly_trends).map(([month, emissions]) => ({
          month,
          emissions,
        })),
        coverage,
        unmatched_entries: emptyEntriesCount || 0,
        recent_activities: formattedRecentEntries,
      });
      setLoading(false);
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError('Failed to load dashboard data');
      if (Array.isArray(summary) && summary.length === 0) {
        setSummary(null);
      }
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return { summary, loading, error, refetch: fetchDashboardData };
}
