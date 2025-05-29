import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import EmissionsOverviewDashboard from '@/components/emissions/EmissionsOverviewDashboard';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';

export default function Overview() {
  const { company } = useCompany();

  return (
    <MainLayout>
      <div className="space-y-6">
        <EmissionsOverviewDashboard 
          scope={1} 
          title="Scope 1 Emissions Overview" 
        />
        <EmissionsOverviewDashboard 
          scope={2} 
          title="Scope 2 Emissions Overview" 
        />
        <EmissionsOverviewDashboard 
          scope={3} 
          title="Scope 3 Emissions Overview" 
        />
      </div>
    </MainLayout>
  );
}
