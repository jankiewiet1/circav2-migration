import { useEffect, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { EmissionCalculationStatus } from '@/components/EmissionCalculationStatus';
import { useScopeEntries } from '@/hooks/useScopeEntries';
import { Scope1Dashboard } from '@/components/emissions/Scope1Dashboard';

export default function Scope1Page() {
  const supabase = useSupabaseClient();
  const [company, setCompany] = useState(null);
  const { entries, loading, error, refetch } = useScopeEntries(1);

  useEffect(() => {
    async function getActiveCompany() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: company } = await supabase
          .from('companies')
          .select('*')
          .single();
        setCompany(company);
      }
    }
    getActiveCompany();
  }, [supabase]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-2xl font-bold">Scope 1 Emissions</h1>
      <p className="text-gray-600">
        Direct emissions from sources directly controlled by your company, such as company-owned facilities and vehicles.
      </p>
      
      {company && (
        <EmissionCalculationStatus 
          companyId={company.id} 
          scope="scope1" 
        />
      )}

      <Scope1Dashboard 
        entries={entries} 
        loading={loading} 
        error={error}
        refetch={refetch}
      />
    </div>
  );
} 