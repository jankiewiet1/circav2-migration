import React from 'react';
import { MainLayout } from "@/components/MainLayout";
import { Scope3Dashboard } from '@/components/emissions/Scope3Dashboard';
import { useCompany } from "@/contexts/CompanyContext";
import { useScopeEntries } from "@/hooks/useScopeEntries";
import { EmissionCalculationStatus } from '@/components/emissions/EmissionCalculationStatus';

export default function Scope3() {
  const { company } = useCompany();
  const { entries, loading, error, refetch } = useScopeEntries(3);
  
  return (
    <MainLayout>
      <div className="p-6 space-y-6">
          <div>
          <h1 className="text-2xl font-bold mb-2">Scope 3 Emissions</h1>
          <p className="text-gray-600 mb-6">
            Other indirect emissions from your company's value chain, including both upstream and downstream activities.
          </p>
        </div>
        
        {company && (
          <EmissionCalculationStatus 
            companyId={company.id} 
            scope={3} 
          />
        )}
        
        <Scope3Dashboard 
          entries={entries}
          loading={loading}
          error={error || ''}
          refetch={refetch}
        />
      </div>
    </MainLayout>
  );
}
