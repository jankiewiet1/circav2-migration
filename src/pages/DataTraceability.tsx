import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Calendar,
  FileText,
  Database,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  BarChart3,
  Calculator,
  RefreshCw,
  Settings,
  Brain,
  Zap,
  AlertTriangle,
  Play,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Bot,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { assistantCalculator } from '@/services/assistantEmissionCalculator';
import { hybridEmissionCalculator } from '@/services/hybridEmissionCalculator';
import { unifiedCalculationService, UnifiedCalculationEntry, CalculationSummary } from '@/services/unifiedCalculationService';
import { extractCalculationSource, extractEmissionFactorInfo, extractCalculationMetadata } from '@/utils/sourceExtractor';
import { getStandardCategoryName } from '@/utils/ghgCategoryMapper';

interface RawDataEntry {
  id: string;
  date: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  scope: number;
  match_status: string;
  created_at: string;
  notes?: string;
}

interface CalculatedDataEntry extends UnifiedCalculationEntry {}

interface DataSummary {
  total_raw_records: number;
  total_calculated: number;
  last_calculation_run: string;
  active_factor_version: string;
  pending_calculation: number;
  calculation_coverage: number;
  rag_calculations: number;
  assistant_calculations: number;
}

export default function DataTraceability() {
  const { company } = useCompany();
  const navigate = useNavigate();

  // Data states
  const [rawData, setRawData] = useState<RawDataEntry[]>([]);
  const [calculatedData, setCalculatedData] = useState<CalculatedDataEntry[]>([]);
  const [dataSummary, setDataSummary] = useState<DataSummary>({
    total_raw_records: 0,
    total_calculated: 0,
    last_calculation_run: '',
    active_factor_version: 'v2024.1',
    pending_calculation: 0,
    calculation_coverage: 0,
    rag_calculations: 0,
    assistant_calculations: 0
  });

  // UI states
  const [activeDataView, setActiveDataView] = useState<"raw" | "calculated">("raw");
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationProgress, setCalculationProgress] = useState({ current: 0, total: 0 });
  const [currentProcessingEntry, setCurrentProcessingEntry] = useState<string>('');

  // Filter and sorting states
  const [searchTerm, setSearchTerm] = useState("");
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: ""
  });
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Calculation controls
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [recalculateAll, setRecalculateAll] = useState(false);
  const [preferRag, setPreferRag] = useState(true);

  useEffect(() => {
    if (company) {
      fetchAllData();
    }
  }, [company]);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchRawData(),
        fetchCalculatedData(),
        fetchDataSummary()
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRawData = async () => {
    if (!company) return;

    // Fetch entries with calculations from unified table to determine correct match status
    const { data, error } = await supabase
      .from('emission_entries')
      .select(`
        *,
        emission_calc(
          id,
          calculation_method,
          total_emissions,
          calculated_at
        )
      `)
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedData: RawDataEntry[] = data.map(item => {
      // Determine correct match status based on unified emission_calc table
      const hasCalculation = item.emission_calc && item.emission_calc.length > 0;
      const correctMatchStatus = hasCalculation ? 'matched' : 'unmatched';
      
      return {
        id: item.id,
        date: item.date,
        category: getStandardCategoryName(item.category),
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        scope: item.scope,
        match_status: correctMatchStatus, // Use calculated status instead of stored status
        created_at: item.created_at,
        notes: item.notes
      };
    });

    setRawData(formattedData);
    console.log('✅ Raw data fetched with correct match status:', {
      total: formattedData.length,
      matched: formattedData.filter(d => d.match_status === 'matched').length,
      unmatched: formattedData.filter(d => d.match_status === 'unmatched').length
    });
  };

  const fetchCalculatedData = async () => {
    if (!company) return;

    try {
      const response = await unifiedCalculationService.fetchAllCalculations(company.id);
      if (response.success) {
        // Map the response data to include all necessary fields with better source information
        const mappedData = response.data.map(calc => {
          // Use the new source extraction utility
          const properSource = extractCalculationSource(calc);
          const { factor: emissionFactor, unit: emissionFactorUnit } = extractEmissionFactorInfo(calc);
          const metadata = extractCalculationMetadata(calc);

          return {
            id: calc.id,
            entry_id: calc.entry_id,
            category: getStandardCategoryName(calc.category || calc.emission_entries?.category || 'Unknown'),
            description: calc.emission_entries?.description || 'No description',
            quantity: calc.emission_entries?.quantity || 0,
            unit: calc.emission_entries?.unit || '',
            scope: calc.scope || calc.emission_entries?.scope || 1,
            total_emissions: calc.total_emissions || 0,
            emissions_unit: 'kg CO₂e', // Standardize unit
            emission_factor: emissionFactor,
            emission_factor_unit: emissionFactorUnit,
            confidence: metadata.confidence,
            source: properSource, // Use the extracted source
            calculated_at: calc.calculated_at,
            calculation_method: calc.calculation_method, // This will be 'RAG' or 'OPENAI'
            similarity_score: metadata.similarity_score || calc.similarity_score,
            processing_time_ms: metadata.processing_time_ms || calc.processing_time_ms,
            raw_input: metadata.raw_input || calc.raw_input,
            matched_factor_id: metadata.matched_factor_id || calc.matched_factor_id
          };
        });
        
        setCalculatedData(mappedData);
        console.log('✅ Calculated data fetched and mapped with proper sources:', {
          total: mappedData.length,
          rag: mappedData.filter(d => d.calculation_method === 'RAG').length,
          openai: mappedData.filter(d => d.calculation_method === 'OPENAI').length,
          sources: [...new Set(mappedData.map(d => d.source))]
        });
      } else {
        console.error('Error fetching calculated data:', response.error);
        setCalculatedData([]);
      }
    } catch (error) {
      console.error('Error fetching calculated data:', error);
      // Fallback to empty array
      setCalculatedData([]);
    }
  };

  const fetchDataSummary = async () => {
    if (!company) return;

    try {
      // Get raw data count
      const { count: rawCount } = await supabase
        .from('emission_entries')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id);

      // Get entries that actually have calculations in the unified table
      const { data: entriesWithCalcs } = await supabase
        .from('emission_entries')
        .select(`
          id,
          emission_calc!inner(id)
        `)
        .eq('company_id', company.id);

      // Calculate pending based on actual calculations vs total entries
      const totalRaw = rawCount || 0;
      const calculatedCount = entriesWithCalcs?.length || 0;
      const pendingCount = totalRaw - calculatedCount;

      // Get unified calculation summary
      const calculationSummary = await unifiedCalculationService.getCalculationSummary(company.id);

      const coverage = totalRaw > 0 ? (calculatedCount / totalRaw) * 100 : 0;

      setDataSummary({
        total_raw_records: totalRaw,
        total_calculated: calculationSummary.total_calculations,
        last_calculation_run: calculationSummary.last_calculation ? new Date(calculationSummary.last_calculation).toLocaleDateString() : 'Never',
        active_factor_version: 'v2024.1',
        pending_calculation: pendingCount,
        calculation_coverage: coverage,
        rag_calculations: calculationSummary.rag_calculations,
        assistant_calculations: calculationSummary.assistant_calculations
      });

      console.log('📊 Data Summary Updated:', {
        totalRaw,
        calculatedCount,
        pendingCount,
        coverage: coverage.toFixed(1) + '%'
      });
    } catch (error) {
      console.error('Error fetching data summary:', error);
    }
  };

  const runCalculations = async (selectedOnly = false) => {
    if (!company) return;

    setIsCalculating(true);
    setCalculationProgress({ current: 0, total: 0 });
    setCurrentProcessingEntry('');
    
    try {
      // Get entries to process
      let entriesToProcess = rawData;
      if (selectedOnly && selectedEntries.length > 0) {
        entriesToProcess = rawData.filter(entry => selectedEntries.includes(entry.id));
      }

      if (!recalculateAll) {
        // Only process unmatched entries
        entriesToProcess = entriesToProcess.filter(entry => entry.match_status === 'unmatched');
      }
        
      if (entriesToProcess.length === 0) {
        toast.info("No entries found for calculation");
        return;
      }

      setCalculationProgress({ current: 0, total: entriesToProcess.length });
        
      console.log(`🚀 Starting unified calculation for ${entriesToProcess.length} entries`);

      // Convert raw entries to EmissionEntry format
      const entries = entriesToProcess.map(entry => ({
        id: entry.id,
        company_id: company.id,
        date: entry.date,
        category: entry.category,
        description: entry.description,
        quantity: entry.quantity,
        unit: entry.unit,
        scope: entry.scope,
        match_status: entry.match_status,
        notes: entry.notes
      }));

      // Use unified calculation service with progress callback
      const result = await unifiedCalculationService.calculateBatchEntries(
        entries,
        (completed, total) => {
          setCalculationProgress({ current: completed, total });
          if (completed < total && entries[completed]) {
            setCurrentProcessingEntry(entries[completed].description);
          }
        }
      );

      setCalculationProgress({ current: entriesToProcess.length, total: entriesToProcess.length });

      if (result.total_entries === 0) {
        toast.info("No entries found for calculation");
      } else {
        const ragSuccessful = result.rag_calculations;
        const openaiSuccessful = result.openai_calculations;
        const failed = result.failed_calculations;

        toast.success(
          `✨ Calculated emissions for ${result.successful_calculations} of ${result.total_entries} entries`
        );

        if (ragSuccessful > 0) {
          toast.success(`🤖 RAG: ${ragSuccessful} calculations`);
        }
        if (openaiSuccessful > 0) {
          toast.success(`🧠 OpenAI: ${openaiSuccessful} calculations`);
        }
        if (failed > 0) {
          toast.warning(`❌ Failed: ${failed} entries`);
        }

        console.log(`📊 Unified Calculation Summary:`, result);
        
        if (result.errors && result.errors.length > 0) {
          console.warn(`⚠️ Calculation errors:`, result.errors);
        }
      }

      // After batch completes, refresh all data to show updated match status
      await Promise.all([
        fetchRawData(),
        fetchCalculatedData(),
        fetchDataSummary()
      ]);
      
      setCurrentProcessingEntry('');
      setSelectedEntries([]);
      
      // Show results
      if (result.successful_calculations > 0) {
        toast.success(
          `✅ Successfully calculated ${result.successful_calculations} out of ${result.total_entries} entries!\n` +
          `• RAG calculations: ${result.rag_calculations}\n` +
          `• OpenAI calculations: ${result.openai_calculations}\n` +
          `• Processing time: ${(result.processing_time_ms / 1000).toFixed(1)}s`
        );
      } else {
        toast.error(`❌ No calculations were successful. Check the errors for details.`);
      }
      
      if (result.errors.length > 0) {
        console.error('Calculation errors:', result.errors);
        toast.warning(`⚠️ ${result.errors.length} entries failed calculation. Check console for details.`);
      }

    } catch (error) {
      console.error("Error running calculations:", error);
      toast.error(`Calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCalculating(false);
      setCalculationProgress({ current: 0, total: 0 });
      setCurrentProcessingEntry('');
    }
  };

  // Test RAG system
  const testRagSystem = async () => {
    if (!company) return;

    try {
      const result = await unifiedCalculationService.testCalculation(company.id);
      
      if (result.success) {
        toast.success(`🎉 ${result.message}`);
      } else {
        toast.error(`❌ ${result.message}`);
      }
    } catch (error) {
      toast.error(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Delete entry function
  const deleteEntry = async (entryId: string) => {
    if (!company) {
      toast.error("No company context available");
      return;
    }

    try {
      // First delete any calculations for this entry from the unified table
      const { error: calcError } = await supabase
        .from('emission_calc')
        .delete()
        .eq('entry_id', entryId);

      if (calcError) {
        console.warn("Error deleting calculations:", calcError);
      }

      // Then delete the entry itself
      const { error: entryError } = await supabase
        .from('emission_entries')
        .delete()
        .eq('id', entryId)
        .eq('company_id', company.id);

      if (entryError) {
        throw entryError;
      }

      toast.success("Entry deleted successfully");
      
      // Remove from selected entries if it was selected
      setSelectedEntries(prev => prev.filter(id => id !== entryId));
      
      // Refresh data
      await fetchAllData();

    } catch (error) {
      console.error("Error deleting entry:", error);
      toast.error(`Failed to delete entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const exportData = () => {
    const dataToExport = activeDataView === 'raw' ? rawData : calculatedData;
    const csv = convertToCSV(dataToExport);
    downloadCSV(csv, `${activeDataView}_data_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`${activeDataView} data exported successfully`);
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        }).join(',')
      )
    ].join('\n');
    
    return csvContent;
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sorting function
  const sortData = (data: any[], sortBy: string, sortOrder: "asc" | "desc") => {
    return [...data].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle date sorting
      if (sortBy === 'date' || sortBy === 'calculated_at' || sortBy === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      // Handle numeric sorting
      if (sortBy === 'quantity' || sortBy === 'total_emissions' || sortBy === 'scope') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      }

      // Handle string sorting
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  };

  // Filter data based on current filters
  const filteredRawData = rawData.filter(entry => {
    const matchesSearch = !searchTerm || 
      entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesScope = scopeFilter === "all" || entry.scope.toString() === scopeFilter;
    const matchesStatus = statusFilter === "all" || entry.match_status === statusFilter;
    
    const matchesDateRange = (!dateRange.start || entry.date >= dateRange.start) &&
                         (!dateRange.end || entry.date <= dateRange.end);
      
    return matchesSearch && matchesScope && matchesStatus && matchesDateRange;
  });

  const filteredCalculatedData = calculatedData.filter(entry => {
    const matchesSearch = !searchTerm || 
      entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.source.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesScope = scopeFilter === "all" || entry.scope.toString() === scopeFilter;
    const matchesMethod = methodFilter === "all" || entry.calculation_method === methodFilter;
    
    const entryDate = new Date(entry.calculated_at).toISOString().split('T')[0];
    const matchesDateRange = (!dateRange.start || entryDate >= dateRange.start) &&
                            (!dateRange.end || entryDate <= dateRange.end);
      
    return matchesSearch && matchesScope && matchesMethod && matchesDateRange;
  });

  // Sort data
  const sortedRawData = sortData(filteredRawData, sortBy, sortOrder);
  const sortedCalculatedData = sortData(filteredCalculatedData, sortBy, sortOrder);

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6 max-w-screen-2xl">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Data Traceability & Calculations</h1>
            <p className="text-gray-600 mt-2">
              Manage your emission data and run calculations with AI-powered precision
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => navigate('/data-upload')}
              className="border-gray-200"
            >
              <Database className="w-4 h-4 mr-2" />
              Upload Data
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Raw Records</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dataSummary.total_raw_records}</div>
              <p className="text-xs text-muted-foreground">
                Uploaded emission entries
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calculated</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dataSummary.total_calculated}</div>
              <p className="text-xs text-muted-foreground">
                {dataSummary.calculation_coverage.toFixed(1)}% coverage
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Calculation Run</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dataSummary.last_calculation_run}</div>
              <p className="text-xs text-muted-foreground">
                Using {dataSummary.active_factor_version}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Calculation</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dataSummary.pending_calculation}</div>
              <p className="text-xs text-muted-foreground">
                Entries awaiting calculation
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Calculation Panel - Always Visible */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-blue-600" />
              <span>Calculation Panel</span>
              <Badge variant="outline" className="bg-blue-100 text-blue-700">
                OpenAI Assistant
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Scope</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={recalculateAll}
                    onChange={(e) => setRecalculateAll(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Include already calculated</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Selected Entries</label>
                <div className="text-sm text-gray-600">
                  {selectedEntries.length} entries selected
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                onClick={() => runCalculations(false)}
                disabled={isCalculating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isCalculating ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Run Calculations
              </Button>

              {selectedEntries.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => runCalculations(true)}
                  disabled={isCalculating}
                >
                  Calculate Selected ({selectedEntries.length})
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => setSelectedEntries([])}
                disabled={selectedEntries.length === 0}
              >
                Clear Selection
              </Button>
            </div>

            {/* Progress Bar */}
            {isCalculating && calculationProgress.total > 0 && (
              <div className="space-y-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-blue-700">
                    Processing via Edge Function...
                  </span>
                  <span className="text-blue-600">
                    {calculationProgress.current} / {calculationProgress.total}
                  </span>
                </div>
                
                <div className="w-full bg-blue-100 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ 
                      width: `${calculationProgress.total > 0 ? (calculationProgress.current / calculationProgress.total) * 100 : 0}%` 
                    }}
                  />
                </div>
                
                {currentProcessingEntry && (
                  <div className="text-xs text-blue-600 truncate">
                    Current: {currentProcessingEntry}
                  </div>
                )}
                
                <div className="text-xs text-blue-500">
                  {calculationProgress.total > 0 
                    ? `${Math.round((calculationProgress.current / calculationProgress.total) * 100)}% complete`
                    : 'Initializing...'
                  }
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Tabs value={activeDataView} onValueChange={(value) => setActiveDataView(value as "raw" | "calculated")}>
                  <TabsList>
                    <TabsTrigger value="raw">Raw Data</TabsTrigger>
                    <TabsTrigger value="calculated">Calculated Data</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={exportData}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm" onClick={fetchAllData} disabled={isLoading}>
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={scopeFilter} onValueChange={setScopeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scopes</SelectItem>
                  <SelectItem value="1">Scope 1</SelectItem>
                  <SelectItem value="2">Scope 2</SelectItem>
                  <SelectItem value="3">Scope 3</SelectItem>
                </SelectContent>
              </Select>

              {activeDataView === 'raw' && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="unmatched">Unmatched</SelectItem>
                    <SelectItem value="matched">Matched</SelectItem>
                    <SelectItem value="calculated">Calculated</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="RAG">RAG</SelectItem>
                  <SelectItem value="ASSISTANT">Assistant</SelectItem>
                  <SelectItem value="climatiq">Climatiq</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="description">Description</SelectItem>
                  <SelectItem value="quantity">Quantity</SelectItem>
                  <SelectItem value="scope">Scope</SelectItem>
                  {activeDataView === 'calculated' && (
                    <SelectItem value="total_emissions">Emissions</SelectItem>
                  )}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="flex items-center space-x-1"
              >
                {sortOrder === 'asc' ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
                <span>{sortOrder === 'asc' ? 'Ascending' : 'Descending'}</span>
              </Button>

              <div className="flex space-x-2">
                <Input
                  type="date"
                  placeholder="Start date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
                <Input
                  type="date"
                  placeholder="End date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {activeDataView === 'raw' ? (
              // Raw Data Table
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  Showing {sortedRawData.length} of {rawData.length} raw entries
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEntries(sortedRawData.map(entry => entry.id));
                              } else {
                                setSelectedEntries([]);
                              }
                            }}
                            checked={selectedEntries.length === sortedRawData.length && sortedRawData.length > 0}
                          />
                        </th>
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Category</th>
                        <th className="text-left p-2">Description</th>
                        <th className="text-left p-2">Quantity</th>
                        <th className="text-left p-2">Unit</th>
                        <th className="text-left p-2">Scope</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRawData.map((entry) => (
                        <tr key={entry.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            <input
                              type="checkbox"
                              checked={selectedEntries.includes(entry.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedEntries(prev => [...prev, entry.id]);
                                } else {
                                  setSelectedEntries(prev => prev.filter(id => id !== entry.id));
                                }
                              }}
                            />
                          </td>
                          <td className="p-2">{new Date(entry.date).toLocaleDateString()}</td>
                          <td className="p-2">{entry.category}</td>
                          <td className="p-2">{entry.description}</td>
                          <td className="p-2">{entry.quantity}</td>
                          <td className="p-2">{entry.unit}</td>
                          <td className="p-2">
                            <Badge variant="outline">Scope {entry.scope}</Badge>
                          </td>
                          <td className="p-2">
                            <Badge 
                              variant={entry.match_status === 'matched' ? 'default' : 
                                      entry.match_status === 'calculated' ? 'default' : 'secondary'}
                            >
                              {entry.match_status}
                            </Badge>
                          </td>
                          <td className="p-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
                                  deleteEntry(entry.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              // Calculated Data Table
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  Showing {sortedCalculatedData.length} of {calculatedData.length} calculated entries
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Category</th>
                        <th className="text-left p-2">Description</th>
                        <th className="text-left p-2">Quantity</th>
                        <th className="text-left p-2">Scope</th>
                        <th className="text-left p-2">Emissions</th>
                        <th className="text-left p-2">Factor</th>
                        <th className="text-left p-2">Method</th>
                        <th className="text-left p-2">Confidence</th>
                        <th className="text-left p-2">Calculated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedCalculatedData.map((entry) => (
                        <tr key={entry.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">{new Date(entry.emission_entries?.date || entry.calculated_at).toLocaleDateString()}</td>
                          <td className="p-2">{entry.category}</td>
                          <td className="p-2">{entry.description}</td>
                          <td className="p-2">{entry.quantity} {entry.unit}</td>
                          <td className="p-2">
                            <Badge variant="outline">Scope {entry.scope}</Badge>
                          </td>
                          <td className="p-2 font-medium">
                            {entry.total_emissions.toFixed(2)} {entry.emissions_unit}
                          </td>
                          <td className="p-2 text-sm">
                            {entry.emission_factor} {entry.emission_factor_unit}
                            {entry.source && (
                              <div className="text-xs text-gray-500 mt-1">
                                Source: {entry.source}
                              </div>
                            )}
                          </td>
                          <td className="p-2">
                            <Badge 
                              variant={entry.calculation_method === 'RAG' ? 'default' : entry.calculation_method === 'OPENAI' ? 'secondary' : 'outline'}
                              className={entry.calculation_method === 'RAG' ? 'bg-blue-100 text-blue-800' : entry.calculation_method === 'OPENAI' ? 'bg-green-100 text-green-800' : ''}
                            >
                              {entry.calculation_method === 'RAG' ? (
                                <><Bot className="h-3 w-3 mr-1" />RAG</>
                              ) : entry.calculation_method === 'OPENAI' ? (
                                <><Brain className="h-3 w-3 mr-1" />OpenAI</>
                              ) : (
                                <><Zap className="h-3 w-3 mr-1" />Other</>
                              )}
                            </Badge>
                          </td>
                          <td className="p-2">
                            {entry.calculation_method === 'RAG' && entry.confidence && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                {(entry.confidence * 100).toFixed(1)}%
                              </Badge>
                            )}
                            {entry.calculation_method === 'OPENAI' && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                {(entry.confidence * 100).toFixed(0)}%
                              </Badge>
                            )}
                            {!entry.confidence && (
                              <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700">
                                N/A
                              </Badge>
                            )}
                          </td>
                          <td className="p-2 text-sm text-gray-500">
                            {new Date(entry.calculated_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
} 