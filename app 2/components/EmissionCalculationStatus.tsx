import React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { calculateEmissions, getEmissionStatus } from '@/lib/api/emissions';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

interface EmissionStatusProps {
  companyId: string;
  scope: string;
}

export function EmissionCalculationStatus({ companyId, scope }: EmissionStatusProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCalculating, setIsCalculating] = useState(false);

  // Query for emission status
  const { data: status, isLoading: isStatusLoading } = useQuery({
    queryKey: ['emissionStatus', companyId, scope],
    queryFn: () => getEmissionStatus(companyId, scope),
  });

  // Mutation for recalculation
  const { mutate: recalculate } = useMutation({
    mutationFn: () => calculateEmissions(companyId, scope),
    onMutate: () => {
      setIsCalculating(true);
    },
    onSuccess: (data) => {
      toast({
        title: 'Emissions Recalculated',
        description: `Successfully processed ${data.data.total_entries} entries.`,
      });
      // Refresh the status
      queryClient.invalidateQueries({
        queryKey: ['emissionStatus', companyId, scope]
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Calculation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsCalculating(false);
    },
  });

  if (isStatusLoading) {
    return <div>Loading calculation status...</div>;
  }

  const { total_entries = 0, matched = 0, unmatched = 0 } = status || {};

  return (
    <div className="rounded-lg border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Emission Calculation Status</h2>
        <div className="space-x-2">
          <Button 
            variant="outline" 
            onClick={() => queryClient.invalidateQueries(['emissionStatus', companyId, scope])}
            disabled={isCalculating || isStatusLoading}
          >
            {isStatusLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking</>
            ) : (
              'Check Status'
            )}
          </Button>
          <Button 
            variant="default"
            onClick={() => recalculate()}
            disabled={isCalculating || isStatusLoading}
          >
            {isCalculating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Calculating...</>
            ) : (
              'Recalculate Emissions'
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-md bg-gray-50">
          <div className="text-sm text-gray-500">Total Entries</div>
          <div className="text-2xl font-bold">{total_entries}</div>
        </div>
        <div className="p-4 rounded-md bg-green-50">
          <div className="text-sm text-gray-500">Matched</div>
          <div className="text-2xl font-bold text-green-600">{matched}</div>
        </div>
        <div className="p-4 rounded-md bg-orange-50">
          <div className="text-sm text-gray-500">Unmatched</div>
          <div className="text-2xl font-bold text-orange-600">{unmatched}</div>
        </div>
      </div>

      {unmatched > 0 && (
        <div className="bg-orange-50 p-4 rounded-md">
          <p className="text-sm text-orange-700">
            ⚠️ {unmatched} entries could not be matched with emission factors. 
            Please check your data and emission factor mappings.
          </p>
        </div>
      )}

      {status?.error && (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-sm text-red-700">
            ❌ {status.error}
          </p>
        </div>
      )}
    </div>
  );
} 