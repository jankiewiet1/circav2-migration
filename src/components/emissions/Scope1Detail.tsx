import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DownloadIcon, UploadIcon, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { CalculationStatus } from './CalculationStatus';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmissionFactorDetails } from "./EmissionFactorDetails";

interface Calculation {
  id: string;
  total_emissions: number;
  climatiq_factor_name?: string;
  climatiq_source?: string;
  climatiq_year?: number;
  climatiq_category?: string;
  climatiq_region?: string;
  climatiq_activity_id?: string;
  calculated_at?: string;
  emissions_unit?: string;
}

interface EmissionEntry {
  id: string;
  category: string;
  date: string;
  description: string;
  quantity: number;
  unit: string;
  scope: number;
  created_at: string;
  notes?: string;
  match_status?: string;
  emission_calc_openai: Calculation[];
}

interface Scope1DetailProps {
  entries: EmissionEntry[];
  loading: boolean;
  error: string;
  refetch: () => Promise<void>;
}

// Helper to format scope text
const formatScope = (scopeValue: string | number): string => {
  if (typeof scopeValue === 'string') {
    if (scopeValue.startsWith('scope_')) {
      return `Scope ${scopeValue.replace('scope_', '')}`;
    }
    return scopeValue;
  }
  return `Scope ${scopeValue}`;
};

export function Scope1Detail({ entries, loading, error, refetch }: Scope1DetailProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const toggleRowExpansion = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const exportToCSV = () => {
    if (!entries || entries.length === 0) return;

    const headers = ['Date', 'Category', 'Description', 'Quantity', 'Unit', 'Total Emissions (tCO₂e)', 'Match Status', 'Notes', 'Factor Name', 'Source', 'Region', 'Year'];
    const rows = entries.map(e => {
      const calculation = e.emission_calc_openai && e.emission_calc_openai.length > 0 ? e.emission_calc_openai[0] : null;
      const calcEmissions = calculation?.total_emissions ?? 0;
      return [
        `"${e.date}"`, 
        `"${e.category}"`, 
        `"${e.description || ''}"`, 
        e.quantity,
        `"${e.unit}"`, 
        calcEmissions.toFixed(4),
        `"${e.match_status || 'N/A'}"`, 
        `"${e.notes || ''}"`,
        `"${calculation?.climatiq_factor_name || 'N/A'}"`,
        `"${calculation?.climatiq_source || 'N/A'}"`,
        `"${calculation?.climatiq_region || 'N/A'}"`,
        calculation?.climatiq_year || 'N/A'
      ].join(','); 
    });

    const csvContent = [
      headers.join(','),
      ...rows 
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `scope1_emissions_detail_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Scope 1 Emissions</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open('/templates/scope1_template.csv', '_blank')}>
            <DownloadIcon className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={loading || entries.length === 0}>
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button size="sm">
            <UploadIcon className="h-4 w-4 mr-2" />
            Upload Data
          </Button>
        </div>
      </div>

      <CalculationStatus />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Loading emissions data...</div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p>No Scope 1 emission data available. Upload your first data set to get started.</p>
            <Button className="mt-4">Upload Data</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Scope 1 Emissions Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Emissions (tCO₂e)</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => {
                    const calculation = entry.emission_calc_openai && entry.emission_calc_openai.length > 0 
                      ? entry.emission_calc_openai[0] 
                      : null;
                    
                    return (
                      <React.Fragment key={entry.id}>
                        <TableRow className={expandedRow === entry.id ? "bg-muted/50" : ""}>
                          <TableCell>{format(new Date(entry.date), 'yyyy-MM-dd')}</TableCell>
                          <TableCell>{entry.category}</TableCell>
                          <TableCell className="max-w-xs truncate" title={entry.description || ''}>{entry.description}</TableCell>
                          <TableCell className="text-right">{entry.quantity}</TableCell>
                          <TableCell>{entry.unit}</TableCell>
                          <TableCell className="text-right font-medium">
                            {calculation ? calculation.total_emissions.toFixed(4) : '-'}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => toggleRowExpansion(entry.id)}
                              className="h-8 w-8 p-0"
                            >
                              {expandedRow === entry.id ? 
                                <ChevronUp className="h-4 w-4" /> : 
                                <ChevronDown className="h-4 w-4" />
                              }
                            </Button>
                          </TableCell>
                        </TableRow>
                        {expandedRow === entry.id && (
                          <TableRow className="bg-muted/50">
                            <TableCell colSpan={7} className="p-4">
                              <div className="text-sm space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="font-medium mb-1">Entry Details</h4>
                                    <div className="space-y-1 text-muted-foreground">
                                      <p><span className="font-medium mr-2">Scope:</span>{formatScope(entry.scope)}</p>
                                      <p><span className="font-medium mr-2">Created:</span>{entry.created_at ? format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm') : 'Unknown'}</p>
                                      <p><span className="font-medium mr-2">ID:</span>{entry.id}</p>
                                      {entry.notes && (
                                        <p><span className="font-medium mr-2">Notes:</span>{entry.notes}</p>
                                      )}
                                      {entry.match_status && (
                                        <p><span className="font-medium mr-2">Match Status:</span>{entry.match_status}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-1">Emission Factor Information</h4>
                                    <EmissionFactorDetails calculation={calculation} />
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
