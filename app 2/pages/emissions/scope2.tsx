import { useEffect, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { EmissionCalculationStatus } from '@/components/EmissionCalculationStatus';
import { useScopeEntries } from '@/hooks/useScopeEntries';
import { Scope2Dashboard } from '@/components/emissions/Scope2Dashboard';

export default function Scope2Page() {
  const supabase = useSupabaseClient();
  const [company, setCompany] = useState(null);
  const { entries, loading, error, refetch } = useScopeEntries(2);

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
      <h1 className="text-2xl font-bold">Scope 2 Emissions</h1>
      <p className="text-gray-600">
        Indirect emissions from purchased electricity, steam, heating, and cooling consumed by your company.
      </p>
      
      {company && (
        <EmissionCalculationStatus 
          companyId={company.id} 
          scope="scope2" 
        />
      )}

      <Scope2Dashboard 
        entries={entries} 
        loading={loading} 
        error={error}
        refetch={refetch}
      />
    </div>
  );
} 