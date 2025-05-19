import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface EmissionFactorDetailsProps {
  calculation: {
    climatiq_factor_name?: string | null;
    climatiq_source?: string | null;
    climatiq_year?: number | null;
    climatiq_category?: string | null;
    climatiq_region?: string | null;
    climatiq_activity_id?: string | null;
    calculated_at?: string | null;
    emissions_unit?: string | null;
  } | null;
}

export function EmissionFactorDetails({ calculation }: EmissionFactorDetailsProps) {
  if (!calculation) {
    return <div className="text-muted-foreground text-sm py-2">No emission factor information available</div>;
  }
  
  return (
    <div className="text-sm space-y-2 pt-2 pb-1">
      <div className="flex flex-wrap gap-2">
        {calculation.climatiq_factor_name && (
          <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
            {calculation.climatiq_factor_name}
          </Badge>
        )}
        
        {calculation.climatiq_source && (
          <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
            Source: {calculation.climatiq_source}
          </Badge>
        )}
        
        {calculation.climatiq_year && (
          <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700">
            Year: {calculation.climatiq_year}
          </Badge>
        )}
        
        {calculation.climatiq_region && (
          <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
            Region: {calculation.climatiq_region}
          </Badge>
        )}
        
        {calculation.emissions_unit && (
          <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-700">
            Unit: {calculation.emissions_unit}
          </Badge>
        )}
      </div>
      
      {calculation.climatiq_activity_id && (
        <div className="text-xs text-muted-foreground mt-1">
          Activity ID: {calculation.climatiq_activity_id}
        </div>
      )}
      
      {calculation.calculated_at && (
        <div className="text-xs text-muted-foreground">
          Last calculated: {new Date(calculation.calculated_at).toLocaleString()}
        </div>
      )}
    </div>
  );
} 