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
  FileText,
  PlusCircle,
} from "lucide-react";
import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { calculateDynamicEmissions } from "@/services/emissionService";
import { AIUploader } from "@/components/dataUpload/AIUploader";
import { DataEntryService } from "@/services/dataEntryService";
import { CSVUploader } from "@/components/dataUpload/CSVUploader";
import { ManualEntryForm } from "@/components/dataUpload/ManualEntryForm";

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
  request_params: any;
}

export default function DataUpload() {
  const { company } = useCompany();

  const [activeTab, setActiveTab] = useState<string>("csv");
  const [calculationTab, setCalculationTab] = useState<boolean>(false);
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
      "Try our new AI-powered data upload! Select the 'AI Upload' tab.",
      { duration: 6000 }
    );
    
    // Debug: check database tables
    if (company) {
      checkDatabaseTables();
    }
  }, [company]);
  
  // Debug function to check if tables exist
  const checkDatabaseTables = async () => {
    try {
      // Check emission_entries table
      console.log("Checking emission_entries table...");
      const { data: emissionEntries, error: emissionError } = await supabase
        .from('emission_entries')
        .select('*')
        .limit(1);
      
      if (emissionError) {
        console.error("Error accessing emission_entries:", emissionError);
      } else {
        console.log("Emission entries table exists, returned:", emissionEntries);
        
        // Get table structure - removing the problematic RPC call
        console.log("Table structure check skipped - function not available");
      }
      
      // Check company access
      if (company) {
        console.log("Checking company access...");
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', company.id)
          .single();
          
        if (companyError) {
          console.error("Error accessing company:", companyError);
        } else {
          console.log("Successfully accessed company:", companyData);
        }
      }
    } catch (error) {
      console.error("Database check error:", error);
    }
  };

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

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6 max-w-screen-2xl">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Data Upload</h1>
            <p className="text-gray-500 mt-1">
              Upload and manage your emission data
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setCalculationTab(!calculationTab)}
            className="border-gray-200"
          >
            <Calculator className="w-4 h-4 mr-2" />
            {calculationTab ? "Back to Upload" : "View Calculations"}
          </Button>
        </div>

        {!calculationTab ? (
          <>
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-4 bg-gray-100 p-1 w-full justify-start">
                <TabsTrigger value="manual" className="data-[state=active]:bg-white flex-1">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Manual Entry
                </TabsTrigger>
                <TabsTrigger value="csv" className="data-[state=active]:bg-white flex-1">
                  <Upload className="mr-2 h-4 w-4" />
                  CSV Upload
                </TabsTrigger>
                <TabsTrigger value="ai" className="data-[state=active]:bg-white flex-1">
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI Upload
                </TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-medium">Manual Data Entry</h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={recalculateEmissions}
                      disabled={isCalculating}
                      className="text-emerald-600 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50"
                    >
                      {isCalculating ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Calculator className="mr-2 h-4 w-4" />
                      )}
                      Recalculate Emissions
                    </Button>
                  </div>
                  <ManualEntryForm onEntryCreated={recalculateEmissions} />
                </div>
              </TabsContent>

              <TabsContent value="csv" className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-medium">CSV Data Upload</h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={recalculateEmissions}
                      disabled={isCalculating}
                      className="text-emerald-600 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50"
                    >
                      {isCalculating ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Calculator className="mr-2 h-4 w-4" />
                      )}
                      Recalculate Emissions
                    </Button>
                  </div>
                  <CSVUploader onUploadComplete={recalculateEmissions} />
                </div>
              </TabsContent>

              <TabsContent value="ai" className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium">AI-Powered Data Upload</h2>
                </div>
                <AIUploader onUploadComplete={recalculateEmissions} />
              </TabsContent>
            </Tabs>
          </>
        ) : (
          // Calculation details section
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-medium">Emission Calculation Results</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCalculationDetails}
                disabled={isLoadingDetails}
                className="text-emerald-600 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50"
              >
                {isLoadingDetails ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh Data
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
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
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

