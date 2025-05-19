import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { EmissionsOverviewDashboard } from '@/components/emissions/EmissionsOverviewDashboard';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';

export default function Overview() {
  const { company } = useCompany();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!company?.id) return;

    const fetchEmissions = async () => {
      try {
        setLoading(true);
        // Fetch emission entries with their calculations
        const { data: emissionsData, error: emissionsError } = await supabase
          .from('emission_entries')
          .select(`
            *,
            emission_calc_climatiq(*)
          `)
          .eq('company_id', company.id)
          .order('date', { ascending: false })
          .limit(100);

        if (emissionsError) throw emissionsError;
        setEntries(emissionsData || []);
      } catch (err: any) {
        console.error('Error loading emissions data:', err);
        setError(err.message || 'Failed to load emissions data');
      } finally {
        setLoading(false);
      }
    };

    fetchEmissions();
  }, [company?.id]);

  const refetch = async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const { data: emissionsData, error: emissionsError } = await supabase
        .from('emission_entries')
        .select(`
          *,
          emission_calc_climatiq(*)
        `)
        .eq('company_id', company.id)
        .order('date', { ascending: false })
        .limit(100);

      if (emissionsError) throw emissionsError;
      setEntries(emissionsData || []);
    } catch (err: any) {
      console.error('Error refreshing emissions data:', err);
      setError(err.message || 'Failed to refresh emissions data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <EmissionsOverviewDashboard 
        entries={entries} 
        loading={loading} 
        error={error} 
        refetch={refetch} 
      />
    </MainLayout>
  );
}
