import { useEffect, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { EmissionCalculationStatus } from '@/components/EmissionCalculationStatus';
import { useScopeEntries } from '@/hooks/useScopeEntries';
import { Scope3Dashboard } from '@/components/emissions/Scope3Dashboard';

export default function Scope3Page() {
  const supabase = useSupabaseClient();
  const [company, setCompany] = useState(null);
  const { entries, loading, error, refetch } = useScopeEntries(3);

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
      <h1 className="text-2xl font-bold">Scope 3 Emissions</h1>
      <p className="text-gray-600">
        Other indirect emissions from your company's value chain, including both upstream and downstream activities.
      </p>
      
      {company && (
        <EmissionCalculationStatus 
          companyId={company.id} 
          scope="scope3" 
        />
      )}

      <Scope3Dashboard 
        entries={entries} 
        loading={loading} 
        error={error}
        refetch={refetch}
      />
    </div>
  );
} 