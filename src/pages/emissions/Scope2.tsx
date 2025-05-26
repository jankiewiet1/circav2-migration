import React from 'react';
import { MainLayout } from "@/components/MainLayout";
import { Scope2Dashboard } from '@/components/emissions/Scope2Dashboard';
import { useCompany } from "@/contexts/CompanyContext";
import { useScopeEntries } from "@/hooks/useScopeEntries";
import { EmissionCalculationStatus } from '@/components/emissions/EmissionCalculationStatus';

export default function Scope2() {
  const { company } = useCompany();
  const { entries, loading, error, refetch } = useScopeEntries(2);
  
  return (
    <MainLayout>
      <div className="p-6 space-y-6">
          <div>
          <h1 className="text-2xl font-bold mb-2">Scope 2 Emissions</h1>
          <p className="text-gray-600 mb-6">
            Indirect emissions from purchased electricity, steam, heating, and cooling consumed by your company.
          </p>
        </div>
        
        {company && (
          <EmissionCalculationStatus 
            companyId={company.id} 
            scope={2} 
          />
        )}
        
        <Scope2Dashboard 
          entries={entries}
          loading={loading}
          error={error || ''}
          refetch={refetch}
        />
      </div>
    </MainLayout>
  );
}
