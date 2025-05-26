import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useCompany } from '@/contexts/CompanyContext';
import { checkEmissionFactorStatus, runEmissionDiagnostics } from '@/services/emissionService';

export const EmissionFactorStatus = () => {
  const { company } = useCompany();
  const [status, setStatus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [preferredSource, setPreferredSource] = useState('DEFRA');

  useEffect(() => {
    const loadStatus = async () => {
      if (!company?.id) return;
      setLoading(true);
      try {
        const result = await checkEmissionFactorStatus(company.id);
        if (result.error) throw result.error;
        setStatus(result.data || []);
        setPreferredSource(result.preferredSource || 'DEFRA');
      } catch (error) {
        console.error('Error loading emission factor status:', error);
        toast.error('Failed to load emission factor status');
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
  }, [company?.id]);

  const runDiagnostics = async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const diagnostics = await runEmissionDiagnostics(company.id);
      if (diagnostics.missingCalculations && diagnostics.missingCalculations > 0) {
        toast.warning(`Found ${diagnostics.missingCalculations} category/unit combinations without ${preferredSource} emission factors`, { duration: 5000 });
      } else if (status.length === 0) {
        toast.info('No emission data found to analyze', { duration: 5000 });
      } else {
        toast.success('All categories have proper emission factors available', { duration: 5000 });
      }
    } catch (error) {
      console.error('Error running diagnostics:', error);
      toast.error('Failed to run emission factor diagnostics');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (hasSource: boolean, source: string) => {
    if (hasSource) {
      return <Badge variant="outline" className="bg-green-100 text-green-800">Available</Badge>;
    }
    if (preferredSource === source) {
      return <Badge variant="outline" className="bg-red-100 text-red-800">Missing</Badge>;
    }
    return <Badge variant="outline" className="bg-gray-100 text-gray-500">N/A</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Emission Factor Status</CardTitle>
            <CardDescription>
              Availability of emission factors for your categories and units
            </CardDescription>
          </div>
          {status.length > 0 && (
            <Button variant="outline" size="sm" onClick={runDiagnostics} disabled={loading}>
              <Info className="mr-2 h-4 w-4" />
              Run Diagnostics
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">Loading status...</div>
        ) : status.length > 0 ? (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 px-4">Category</th>
                    <th className="py-2 px-4">Unit</th>
                    <th className="py-2 px-4">DEFRA</th>
                    <th className="py-2 px-4">EPA</th>
                    <th className="py-2 px-4">IPCC</th>
                    <th className="py-2 px-4">GHG Protocol</th>
                    <th className="py-2 px-4">ADEME</th>
                  </tr>
                </thead>
                <tbody>
                  {status.map((stat, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="py-2 px-4">{stat.category}</td>
                      <td className="py-2 px-4">{stat.unit}</td>
                      <td className="py-2 px-4">{getStatusBadge(stat.availableSources.find(s => s.source === 'DEFRA')?.hasData ?? false, 'DEFRA')}</td>
                      <td className="py-2 px-4">{getStatusBadge(stat.availableSources.find(s => s.source === 'EPA')?.hasData ?? false, 'EPA')}</td>
                      <td className="py-2 px-4">{getStatusBadge(stat.availableSources.find(s => s.source === 'IPCC')?.hasData ?? false, 'IPCC')}</td>
                      <td className="py-2 px-4">{getStatusBadge(stat.availableSources.find(s => s.source === 'GHG Protocol')?.hasData ?? false, 'GHG Protocol')}</td>
                      <td className="py-2 px-4">{getStatusBadge(stat.availableSources.find(s => s.source === 'ADEME')?.hasData ?? false, 'ADEME')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">No emission data available</div>
        )}
      </CardContent>
    </Card>
  );
};
