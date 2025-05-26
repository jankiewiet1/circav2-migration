// Fix import, but it already uses useEmissionEntries, confirm usage is correct
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { fetchCompanyPreferences } from '@/services/companyPreferencesService';
import { useEmissionEntries } from '@/hooks/useScope1Emissions';

interface EmissionCalculationStatusProps {
  companyId: string;
  scope: 1 | 2 | 3;
}

export const EmissionCalculationStatus = ({ companyId, scope }: EmissionCalculationStatusProps) => {
  const [calculationStatus, setCalculationStatus] = useState<{
    total: number;
    calculated: number;
    preferredSource: string;
  }>({
    total: 0,
    calculated: 0,
    preferredSource: 'DEFRA',
  });

  // useEmissionEntries with scope from props
  const { entries: emissions, isLoading } = useEmissionEntries(companyId, scope);

  useEffect(() => {
    const checkCalculationStatus = async () => {
      if (!companyId) return;

      try {
        const { data: preferences } = await fetchCompanyPreferences(companyId);
        const preferredSource = preferences?.preferred_emission_source || 'DEFRA';

        const totalCount = emissions.length;

        // Filter count of emissions that have non-null emissions value
        const calculatedCount = emissions.filter(e => e.emissions !== null && e.emissions !== undefined).length;

        setCalculationStatus({
          total: totalCount || 0,
          calculated: calculatedCount || 0,
          preferredSource,
        });
      } catch (error) {
        console.error('Error checking calculation status:', error);
      }
    };

    if (!isLoading) {
      checkCalculationStatus();
    }
  }, [companyId, emissions, isLoading]);

  const needsRecalculation = calculationStatus.total > 0 && calculationStatus.calculated < calculationStatus.total;

  if (calculationStatus.total === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      {needsRecalculation ? (
        <Alert variant="default" className="bg-yellow-50 text-yellow-800 border-yellow-200">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>
            {calculationStatus.calculated} of {calculationStatus.total} emission records have been calculated using{' '}
            <Badge variant="outline">{calculationStatus.preferredSource}</Badge> emission factors.
            Use the "Recalculate" button to update all records.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="default" className="bg-green-50 text-green-800 border-green-200">
          <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
          <AlertDescription>
            All {calculationStatus.total} emission records have been calculated using{' '}
            <Badge variant="outline" className="bg-green-100 text-green-800">{calculationStatus.preferredSource}</Badge> emission factors.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
