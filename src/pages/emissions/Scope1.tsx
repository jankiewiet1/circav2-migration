import React from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Scope1Dashboard } from '@/components/emissions/Scope1Dashboard';
import { useCompany } from '@/contexts/CompanyContext';
import { EmissionCalculationStatus } from '@/components/emissions/EmissionCalculationStatus';
import { useScopeEntries, EmissionEntryWithCalculation } from '@/hooks/useScopeEntries';

export default function Scope1() {
  const { company } = useCompany();
  const { entries, loading, error, refetch } = useScopeEntries(1);

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Scope 1 Emissions</h1>
          <p className="text-gray-600 mb-6">
            Direct emissions from sources directly controlled by your company, such as company-owned facilities and vehicles.
          </p>
        </div>
        
        {company && (
          <EmissionCalculationStatus 
            companyId={company.id} 
            scope={1} 
          />
        )}
        
        <Scope1Dashboard 
          entries={entries}
          loading={loading}
          error={error || ''}
          refetch={refetch}
        />
      </div>
    </MainLayout>
  );
}
