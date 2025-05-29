import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

interface EmissionCalculation {
  entry_id: number;
  total_emissions: number;
}

interface EmissionEntry {
  id: string;
  category: string;
  quantity: number;
  unit: string;
  scope: number;
  date: string;
  emission_calc_openai: EmissionCalculation[];
}

interface EmissionEntryWithCalculation {
  id: string;
  category: string;
  quantity: number;
  unit: string;
  scope: number;
  date: string;
  emission_calc_openai: EmissionCalculation[];
}

interface MonthlyEntry {
  created_at: string;
  emission_calc_openai: EmissionCalculation[];
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

export function useDashboardSummary() {
  const { company } = useCompany();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!company?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch entries with calculations
      const { data: entriesWithCalcs, error: entriesError } = await supabase
        .from('emission_entries')
        .select(`
          id,
          category,
          quantity,
          unit,
          scope,
          date,
          emission_calc_openai!inner(entry_id,total_emissions)
        `)
        .eq('company_id', company.id);

      if (entriesError) throw entriesError;

      const processedEntries: EmissionEntryWithCalculation[] = (entriesWithCalcs || []).map(entry => ({
        ...entry,
        emission_calc_openai: ensureArray(entry.emission_calc_openai),
      }));

      const totalEmissions = processedEntries.reduce(
        (sum, entry) => sum + (entry.emission_calc_openai[0]?.total_emissions || 0),
        0
      );

      const scope1 = processedEntries
        .filter(entry => entry.scope === 1)
        .reduce((sum, entry) => {
          const emissions = entry.emission_calc_openai[0]?.total_emissions || 0;
          return sum + emissions;
        }, 0);

      // Count entries without calculations
      const { count: entriesWithoutCalcs, error: countError } = await supabase
        .from('emission_entries')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .is('emission_calc_openai.total_emissions', null);

      if (countError) throw countError;

      // Fetch scope 2 emissions
      const { data: scope2Entries, error: scope2Error } = await supabase
        .from('emission_entries')
        .select(`
          id,
          category,
          quantity,
          unit,
          scope,
          date,
          emission_calc_openai(entry_id,total_emissions)
        `)
        .eq('company_id', company.id)
        .eq('scope', 2);

      if (scope2Error) throw scope2Error;

      const processedScope2: EmissionEntryWithCalculation[] = (scope2Entries || []).map(entry => ({
        ...entry,
        emission_calc_openai: ensureArray(entry.emission_calc_openai),
      }));

      const scope2 = processedScope2
        .reduce((sum, e) => sum + (e.emission_calc_openai[0]?.total_emissions || 0), 0);

      // Fetch scope 3 emissions
      const { data: scope3Entries, error: scope3Error } = await supabase
        .from('emission_entries')
        .select(`
          id,
          category,
          quantity,
          unit,
          scope,
          date,
          emission_calc_openai(entry_id,total_emissions)
        `)
        .eq('company_id', company.id)
        .eq('scope', 3);

      if (scope3Error) throw scope3Error;

      const processedScope3: EmissionEntryWithCalculation[] = (scope3Entries || []).map(entry => ({
        ...entry,
        emission_calc_openai: ensureArray(entry.emission_calc_openai),
      }));

      const scope3 = processedScope3.reduce((sum, entry) => {
        const emissions = entry.emission_calc_openai[0]?.total_emissions || 0;
        return sum + emissions;
      }, 0);

      // Get total entries count
      const { count: totalCount, error: totalError } = await supabase
        .from('emission_entries')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', company.id);

      if (totalError) throw totalError;

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
          emission_calc_openai(entry_id,total_emissions)
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const formattedRecentEntries = recentEntries?.map(entry => ({
        id: entry.id,
        category: entry.category,
        description: entry.description,
        quantity: entry.quantity,
        unit: entry.unit,
        created_at: entry.created_at,
        emission_calc_openai: ensureArray(entry.emission_calc_openai),
      })) || [];

      // Generate summary data
      const scopeCounts = [
        { scope: 1, count: 1, emissions: scope1 },
        { scope: 2, count: 1, emissions: scope2 },
        { scope: 3, count: 1, emissions: scope3 },
      ];

      // Fetch monthly trends (last 12 months)
      const { data: monthlyData, error: monthlyError } = await supabase
        .from('emission_entries')
        .select(`
          created_at,
          emission_calc_openai(entry_id,total_emissions)
        `)
        .eq('company_id', company.id)
        .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

      if (monthlyError) throw monthlyError;

      const monthlyEntries = (monthlyData || []).map((entry: any) => ({
        ...entry,
        emission_calc_openai: ensureArray(entry.emission_calc_openai),
      })) as MonthlyEntry[];

      const monthly_trends = monthlyEntries.reduce((acc, entry) => {
        const month = new Date(entry.created_at).toISOString().slice(0, 7);
        const emissions = entry.emission_calc_openai[0]?.total_emissions || 0;
        acc[month] = (acc[month] || 0) + emissions;
        return acc;
      }, {} as Record<string, number>);

      // Calculate coverage
      const coverage = processedEntries.length > 0
        ? ((processedEntries.length - (entriesWithoutCalcs || 0)) / processedEntries.length) * 100
        : 0;

      setSummary({
        total_emissions: totalEmissions,
        scope_breakdown: scopeCounts,
        monthly_trends: Object.entries(monthly_trends).map(([month, emissions]) => ({
          month,
          emissions,
        })),
        coverage,
        unmatched_entries: entriesWithoutCalcs || 0,
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
  }, [company?.id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return { summary, loading, error, refetch: fetchDashboardData };
}
