import React, { useState, useCallback, useEffect } from "react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Upload,
  Check,
  AlertTriangle,
  Calculator,
  RefreshCw,
  Info,
  Sparkles,
} from "lucide-react";
import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { calculateDynamicEmissions } from "@/services/emissionService";
import { AIDataUploadContainer } from "@/components/dataUpload/AIDataUploadContainer";
import { DataEntryService } from "@/services/dataEntryService";

type EmissionEntry = {
  date: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  scope: number;
  notes?: string;
};

interface EmissionEntryInsert {
  company_id: string;
  date: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  scope: number;
  notes?: string | null;
}

const requiredFields = [
  "date",
  "category",
  "description",
  "quantity",
  "unit",
  "scope",
];

// New types for calculation results
interface CalculationResult {
  entry_id: string;
  category: string;
  emissions: number;
  emissions_unit: string;
  source: string;
  success: boolean;
}

interface CalculationDetails {
  id: string;
  entry_id: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  total_emissions: number;
  emissions_unit: string;
  climatiq_activity_id: string;
  climatiq_factor_name: string;
  climatiq_source: string;
  climatiq_region: string;
  climatiq_year: number;
  calculated_at: string;
  request_params: {
    emission_factor: {
      activity_id: string;
      data_version: string;
    };
    parameters: Record<string, any>;
  };
}

export default function DataUpload() {
  const { company } = useCompany();

  const [mode, setMode] = useState<"csv" | "manual">("csv");
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [uiMode, setUiMode] = useState<"classic" | "ai">("classic");

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRows, setCsvRows] = useState<EmissionEntry[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);

  const [manualEntry, setManualEntry] = useState<Partial<EmissionEntry>>({});
  const [manualEntryErrors, setManualEntryErrors] = useState<string[]>([]);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // New state for calculation results
  const [calculationResults, setCalculationResults] = useState<CalculationResult[]>([]);
  const [calculationDetails, setCalculationDetails] = useState<CalculationDetails[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // New state for data entry stats
  const [dataEntryStats, setDataEntryStats] = useState({
    total: 0,
    processed: 0,
    validated: 0,
    error: 0
  });

  // Show a toast about the AI mode when component mounts
  useEffect(() => {
    toast.info(
      "Try our new AI-powered data upload! Click the 'AI-Powered' button in the top right.",
      { duration: 6000 }
    );
  }, []);

  const parseCsv = useCallback(
    async (file: File) => {
      setValidationErrors([]);
      setCsvRows([]);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rawData = results.data as Record<string, any>[];
          const parsedRows: EmissionEntry[] = [];
          const errors: string[] = [];

          for (let idx = 0; idx < rawData.length; idx++) {
            const row = rawData[idx];
            const missingFields = requiredFields.filter(
              (f) =>
                !(f in row) ||
                row[f] === null ||
                row[f] === undefined ||
                row[f].toString().trim() === ""
            );

            if (missingFields.length > 0) {
              errors.push(
                `Row ${idx + 2}: Missing required field(s): ${missingFields.join(
                  ", "
                )}`
              );
              continue;
            }

            const dateValue = new Date(row.date);
            if (isNaN(dateValue.getTime())) {
              errors.push(`Row ${idx + 2}: Invalid date format`);
              continue;
            }

            const quantityNum = parseFloat(row.quantity);
            if (isNaN(quantityNum) || quantityNum < 0) {
              errors.push(`Row ${idx + 2}: Quantity must be a positive number`);
              continue;
            }

            const scopeNum = parseInt(row.scope, 10);
            if (![1, 2, 3].includes(scopeNum)) {
              errors.push(`Row ${idx + 2}: Scope must be 1, 2, or 3`);
              continue;
            }

            const entry: EmissionEntry = {
              date: dateValue.toISOString().split("T")[0],
              category: row.category.toString().trim(),
              description: row.description.toString().trim(),
              quantity: quantityNum,
              unit: row.unit.toString().trim(),
              scope: scopeNum,
              notes: row.notes ? row.notes.toString().trim() : undefined,
            };

            parsedRows.push(entry);
          }

          setValidationErrors(errors);
          setCsvRows(parsedRows);
        },
        error: (error) => {
          setValidationErrors([`Error parsing CSV file: ${error.message}`]);
        },
      });
    },
    []
  );

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setCsvFile(file);
    if (file) {
      parseCsv(file);
    } else {
      setCsvRows([]);
      setValidationErrors([]);
    }
  };

  const uploadCsvData = async () => {
    if (!company) {
      toast.error("No company context available");
      return;
    }
    if (validationErrors.length > 0) {
      toast.error("Fix validation errors before uploading");
      return;
    }
    if (csvRows.length === 0) {
      toast.error("No valid rows to upload");
      return;
    }

    setIsUploadingCsv(true);
    try {
      const rowsToUpsert: EmissionEntryInsert[] = csvRows.map((row) => ({
        company_id: company.id,
        date: row.date,
        category: row.category,
        description: row.description,
        quantity: row.quantity,
        unit: row.unit,
        scope: row.scope,
        notes: row.notes ?? null,
      }));

      // Insert data
      const { error } = await supabase
        .from("emission_entries")
        .upsert(rowsToUpsert, {
          onConflict: "company_id,date,category,unit,scope",
        });

      if (error) {
        toast.error(`Upload failed: ${error.message}`);
      } else {
        toast.success(`Uploaded ${rowsToUpsert.length} records successfully`);
        setCsvFile(null);
        setCsvRows([]);
        
        // Start calculation
        try {
          toast.info("Starting emission calculations...");
          const result = await calculateDynamicEmissions(company.id);
          
          if (!result.success) {
            throw new Error(result.message);
          }
          
          if (result.calculated === 0) {
            toast.info("No entries needed calculation");
          } else {
            toast.success(`Calculated emissions for ${result.calculated} entries`);
            setCalculationResults(result.results || []);
            setActiveTab("calculations");
            fetchCalculationDetails();
          }
        } catch (calculationError) {
          console.error("Error calculating emissions:", calculationError);
          
          if (calculationError instanceof Error) {
            toast.error(`Upload successful, but calculation error: ${calculationError.message}`);
          } else {
            toast.error("Upload successful, but calculation error occurred");
          }
        }
      }
    } catch (error) {
      toast.error(
        `Unexpected error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setIsUploadingCsv(false);
    }
  };

  // Load calculation details
  useEffect(() => {
    if (activeTab === "calculations" && company) {
      fetchCalculationDetails();
    }
  }, [activeTab, company]);

  // Fetch calculation details
  const fetchCalculationDetails = async () => {
    if (!company) return;
    
    setIsLoadingDetails(true);
    try {
      const { data, error } = await supabase
        .from('emission_calc_climatiq')
        .select(`
          id,
          entry_id,
          total_emissions,
          emissions_unit,
          climatiq_activity_id,
          climatiq_factor_name,
          climatiq_source,
          climatiq_region,
          climatiq_year,
          calculated_at,
          request_params,
          emission_entries(category, description, quantity, unit)
        `)
        .eq('company_id', company.id)
        .order('calculated_at', { ascending: false })
        .limit(20);
        
      if (error) throw error;
      
      // Format the data for display
      const formattedDetails = data.map(item => ({
        id: item.id,
        entry_id: item.entry_id,
        category: item.emission_entries?.category || 'Unknown',
        description: item.emission_entries?.description || 'No description',
        quantity: item.emission_entries?.quantity || 0,
        unit: item.emission_entries?.unit || '',
        total_emissions: item.total_emissions,
        emissions_unit: item.emissions_unit,
        climatiq_activity_id: item.climatiq_activity_id,
        climatiq_factor_name: item.climatiq_factor_name,
        climatiq_source: item.climatiq_source,
        climatiq_region: item.climatiq_region,
        climatiq_year: item.climatiq_year,
        calculated_at: new Date(item.calculated_at).toLocaleString(),
        request_params: item.request_params
      }));
      
      setCalculationDetails(formattedDetails);
    } catch (error) {
      console.error("Error fetching calculation details:", error);
      toast.error("Failed to load calculation details");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Recalculate emissions
  const recalculateEmissions = async () => {
    if (!company) {
      toast.error("No company context available");
      return;
    }
    
    setIsCalculating(true);
    try {
      // Use the service function instead of direct edge function call
      const result = await calculateDynamicEmissions(company.id);
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      if (result.calculated === 0) {
        toast.info("No entries needed recalculation");
      } else {
        toast.success(`Recalculated emissions for ${result.calculated} entries`);
        setCalculationResults(result.results || []);
      }
      
      fetchCalculationDetails();
      
    } catch (error) {
      console.error("Error recalculating emissions:", error);
      
      // Show error message
      if (error instanceof Error) {
        toast.error(`Failed to recalculate emissions: ${error.message}`);
      } else {
        toast.error("Failed to recalculate emissions: Unknown error");
      }
    } finally {
      setIsCalculating(false);
    }
  };

  // Get data entry stats
  useEffect(() => {
    if (company && activeTab === 'calculations') {
      fetchDataEntryStats();
    }
  }, [company, activeTab]);
  
  const fetchDataEntryStats = async () => {
    if (!company) return;
    
    try {
      // Get stats for new data_entry table
      const { data, count } = await DataEntryService.getDataEntries(company.id);
      
      if (data) {
        // Count entries by status
        const processed = data.filter(entry => entry.status === 'processed').length;
        const validated = data.filter(entry => entry.status === 'validated').length;
        const error = data.filter(entry => entry.status === 'error').length;
        
        setDataEntryStats({
          total: count,
          processed,
          validated,
          error
        });
      }
    } catch (error) {
      console.error('Error fetching data entry stats:', error);
    }
  };
  
  // Migrate data from emission_entries to data_entry
  const migrateToDataEntry = async () => {
    if (!company) return;
    
    try {
      const result = await DataEntryService.migrateEmissionEntries(company.id);
      
      if (result.success) {
        toast.success(`Successfully migrated ${result.count} entries`);
        fetchDataEntryStats();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error migrating data:', error);
      toast.error('Failed to migrate data');
    }
  };

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold">Emission Data Management</h1>
          
          {/* UI Mode Toggle */}
          <div className="flex items-center space-x-2">
            <Button
              variant={uiMode === "classic" ? "default" : "outline"}
              onClick={() => setUiMode("classic")}
              className="px-3 h-9"
            >
              Classic Mode
            </Button>
            <Button
              variant={uiMode === "ai" ? "default" : "outline"}
              onClick={() => setUiMode("ai")}
              className="px-3 h-9 flex items-center space-x-1"
            >
              <Sparkles className="h-4 w-4 mr-1" />
              <span>AI-Powered</span>
            </Button>
          </div>
        </div>
        
        {uiMode === "classic" ? (
          // Original UI
          <Tabs defaultValue="upload" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="upload">Data Upload</TabsTrigger>
              <TabsTrigger value="calculations">Calculation Details</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload">
              <div className="flex space-x-4 mb-6">
                <Button
                  onClick={() => setMode("csv")}
                  variant={mode === "csv" ? "default" : "outline"}
                  className="px-5"
                >
                  Upload CSV
                </Button>
                <Button
                  onClick={() => setMode("manual")}
                  variant={mode === "manual" ? "default" : "outline"}
                  className="px-5"
                >
                  Add Manual Entry
                </Button>
              </div>

              {/* AI-powered mode callout */}
              <div className="mb-6 rounded border border-green-400 bg-green-50 p-4 text-sm text-green-700 flex items-start space-x-3">
                <Sparkles className="shrink-0 mt-1 h-6 w-6" />
                <div>
                  <p className="mb-2 font-semibold">New AI-Powered Upload Available!</p>
                  <p>Our new AI assistant can automatically extract data from PDFs and more complex formats.</p>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-green-700 font-semibold underline"
                    onClick={() => setUiMode("ai")}
                  >
                    Try AI-Powered Upload
                  </Button>
                </div>
              </div>

              {mode === "csv" && (
                <section>
                  <div
                    {...{
                      onDragOver: (e) => e.preventDefault(),
                      onDrop: (e: React.DragEvent<HTMLDivElement>) => {
                        e.preventDefault();
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          parseCsv(e.dataTransfer.files[0]);
                          setCsvFile(e.dataTransfer.files[0]);
                        }
                      },
                    }}
                    className={`border-2 border-dashed rounded-lg p-12 mb-6 cursor-pointer text-center transition-colors ${
                      csvFile
                            ? "border-green-600 bg-green-50"
                            : "border-gray-300 hover:border-green-500"
                    }`}
                  >
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleCsvFileChange}
                      id="csv-file-upload"
                    />
                    <label htmlFor="csv-file-upload" className="cursor-pointer">
                      <Upload className="mx-auto mb-4 text-gray-500" size={48} />
                      <p className="text-gray-700 text-lg font-medium">
                        {csvFile
                          ? csvFile.name
                          : "Drag and drop your CSV file here, or click to browse"}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Supported format: .csv
                      </p>
                    </label>
                  </div>

                  {validationErrors.length > 0 && (
                    <div className="mb-6 rounded border border-red-400 bg-red-50 p-4 text-sm text-red-700 flex items-start space-x-3">
                      <AlertTriangle className="shrink-0 mt-1 h-6 w-6" />
                      <div>
                        <p className="mb-2 font-semibold">Validation Errors:</p>
                        <ul className="ml-6 list-disc max-h-40 overflow-y-auto">
                          {validationErrors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {csvRows.length > 0 && (
                    <div className="mb-6 max-h-96 overflow-y-auto rounded border border-gray-300 shadow-sm">
                      <table className="w-full text-sm table-fixed border-collapse">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr className="border-b border-gray-200">
                            <th className="p-3 text-left">Status</th>
                            <th className="p-3 text-left">Date</th>
                            <th className="p-3 text-left">Category</th>
                            <th className="p-3 text-left">Description</th>
                            <th className="p-3 text-right">Quantity</th>
                            <th className="p-3 text-left">Unit</th>
                            <th className="p-3 text-right">Scope</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvRows.map((row, idx) => (
                            <tr
                              key={idx}
                                  className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                            >
                              <td className="p-3">
                                    <Check className="text-green-600" aria-label="New" />
                              </td>
                              <td className="p-3">{row.date}</td>
                              <td className="p-3">{row.category}</td>
                              <td className="p-3">{row.description}</td>
                              <td className="p-3 text-right">{row.quantity}</td>
                              <td className="p-3">{row.unit}</td>
                              <td className="p-3 text-right">{row.scope}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="p-2 text-xs text-gray-500">
                            Showing {csvRows.length} rows
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={uploadCsvData}
                    disabled={
                      isUploadingCsv ||
                      csvRows.length === 0 ||
                      validationErrors.length > 0
                    }
                        className="w-full py-3"
                  >
                    {isUploadingCsv ? "Uploading..." : "Upload CSV Data"}
                  </Button>

                  <div className="mt-6 text-sm text-gray-700">
                    <a
                      href="/templates/emissions_template.csv"
                      download
                          className="text-green-600 underline hover:text-green-700"
                    >
                      Download emissions CSV template
                    </a>
                  </div>
                  
                  {/* Recalculate button */}
                  <div className="mt-8 border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4">Calculate Emissions</h3>
                    <Button 
                      onClick={recalculateEmissions} 
                      disabled={isCalculating}
                      className="flex items-center"
                      variant="outline"
                    >
                      {isCalculating ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Calculating...
                        </>
                      ) : (
                        <>
                          <Calculator className="mr-2 h-4 w-4" />
                          Recalculate Emissions
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      Recalculates emission values for entries using the Climatiq API.
                    </p>
                  </div>
                </section>
              )}
            </TabsContent>
            
            <TabsContent value="calculations">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Recent Emission Calculations</CardTitle>
                  <Button 
                    onClick={fetchCalculationDetails} 
                    variant="outline" 
                    size="sm"
                    disabled={isLoadingDetails}
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${isLoadingDetails ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent>
                  {isLoadingDetails ? (
                    <div className="text-center py-8">Loading calculation details...</div>
                  ) : calculationDetails.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Info className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>No calculation details found.</p>
                      <Button 
                        onClick={recalculateEmissions} 
                        className="mt-4"
                        variant="outline"
                      >
                        Calculate Emissions Now
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-6">
                        <h3 className="text-sm font-medium mb-2">Calculation Summary</h3>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-blue-50 p-4 rounded-md text-center">
                            <p className="text-sm text-gray-500">Total Entries</p>
                            <p className="text-2xl font-bold mt-1">{calculationDetails.length}</p>
                          </div>
                          <div className="bg-green-50 p-4 rounded-md text-center">
                            <p className="text-sm text-gray-500">Successful</p>
                            <p className="text-2xl font-bold mt-1 text-green-600">
                              {calculationDetails.filter(d => d.total_emissions > 0).length}
                            </p>
                          </div>
                          <div className="bg-orange-50 p-4 rounded-md text-center">
                            <p className="text-sm text-gray-500">Latest Calculation</p>
                            <p className="text-lg font-bold mt-1">
                              {calculationDetails.length > 0 
                                ? new Date(calculationDetails[0].calculated_at).toLocaleDateString() 
                                : '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <Accordion type="single" collapsible>
                        {calculationDetails.map((detail, index) => (
                          <AccordionItem key={detail.id} value={detail.id}>
                            <AccordionTrigger className="hover:bg-gray-50 px-3">
                              <div className="flex flex-1 items-center justify-between pr-2">
                                <div className="flex items-center">
                                  <div className="mr-4 w-6 text-center">
                                    {index + 1}.
                                  </div>
                                  <div className="text-left">
                                    <div className="font-medium">{detail.description}</div>
                                    <div className="text-sm text-gray-500">
                                      {detail.category} · {detail.quantity} {detail.unit}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium">
                                    {detail.total_emissions} {detail.emissions_unit}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(detail.calculated_at).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="bg-gray-50 px-4 py-3">
                              <div className="text-xs">
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                  <div>
                                    <span className="font-medium">Activity ID:</span>{" "}
                                    {detail.climatiq_activity_id}
                                  </div>
                                  <div>
                                    <span className="font-medium">Source:</span>{" "}
                                    {detail.climatiq_source}
                                  </div>
                                  <div>
                                    <span className="font-medium">Factor:</span>{" "}
                                    {detail.climatiq_factor_name}
                                  </div>
                                  <div>
                                    <span className="font-medium">Region:</span>{" "}
                                    {detail.climatiq_region || "Global"}
                                  </div>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* New Data Entry Stats */}
              {dataEntryStats.total > 0 && (
                <Card className="mt-6">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>New Data Entry Format</CardTitle>
                    <Badge variant="outline" className="bg-green-50">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI-Ready
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-gray-50 p-4 rounded-md text-center">
                        <p className="text-sm text-gray-500">Total Entries</p>
                        <p className="text-2xl font-bold mt-1">{dataEntryStats.total}</p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-md text-center">
                        <p className="text-sm text-gray-500">Processed</p>
                        <p className="text-2xl font-bold mt-1 text-blue-600">{dataEntryStats.processed}</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-md text-center">
                        <p className="text-sm text-gray-500">Validated</p>
                        <p className="text-2xl font-bold mt-1 text-green-600">{dataEntryStats.validated}</p>
                      </div>
                      <div className="bg-red-50 p-4 rounded-md text-center">
                        <p className="text-sm text-gray-500">Errors</p>
                        <p className="text-2xl font-bold mt-1 text-red-600">{dataEntryStats.error}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-between">
                      <Button
                        variant="outline"
                        onClick={migrateToDataEntry}
                        className="flex items-center"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Migrate Legacy Data
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => setUiMode("ai")}
                        className="flex items-center"
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Switch to AI-Powered Interface
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          // AI-Powered UI
          <AIDataUploadContainer />
        )}
      </div>
    </MainLayout>
  );
}

