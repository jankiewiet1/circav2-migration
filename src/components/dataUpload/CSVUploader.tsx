import React, { useState, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, X, AlertCircle, Check, Table, Download, Loader2, ArrowRight, Eye } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Papa from "papaparse";
import { useCompany } from "@/contexts/CompanyContext";
import { DataEntryService, ColumnMapping } from "@/services/dataEntryService";

interface CSVUploaderProps {
  onUploadComplete?: () => void;
}

type CSVRow = Record<string, any>;

// Smart column mapping that handles various naming conventions
const createIntelligentMapping = (headers: string[]): { mapping: ColumnMapping; unmapped: string[] } => {
  const headerLower = headers.map(h => h.toLowerCase().trim());
  
  const findColumn = (patterns: string[]): number => {
    for (const pattern of patterns) {
      const index = headerLower.findIndex(h => 
        h.includes(pattern) || 
        h.replace(/[^a-z0-9]/g, '').includes(pattern.replace(/[^a-z0-9]/g, ''))
      );
      if (index !== -1) return index;
    }
    return -1;
  };

  const mapping: ColumnMapping = {
    activity_description: '',
    quantity: '',
    unit: '',
    ghg_category: '',
    activity_date: '',
    notes: ''
  };

  // Find activity description
  const activityIndex = findColumn(['activity', 'description', 'activitydescription', 'desc']);
  if (activityIndex !== -1) mapping.activity_description = activityIndex.toString();

  // Find quantity
  const quantityIndex = findColumn(['quantity', 'amount', 'qty', 'value']);
  if (quantityIndex !== -1) mapping.quantity = quantityIndex.toString();

  // Find unit
  const unitIndex = findColumn(['unit', 'units', 'uom', 'measurement']);
  if (unitIndex !== -1) mapping.unit = unitIndex.toString();

  // Find GHG category/scope
  const scopeIndex = findColumn(['ghg', 'scope', 'category', 'ghgcategory', 'emission']);
  if (scopeIndex !== -1) mapping.ghg_category = scopeIndex.toString();

  // Find date
  const dateIndex = findColumn(['date', 'activitydate', 'activity_date', 'time']);
  if (dateIndex !== -1) mapping.activity_date = dateIndex.toString();

  // Find notes
  const notesIndex = findColumn(['notes', 'note', 'comments', 'comment', 'remarks']);
  if (notesIndex !== -1) mapping.notes = notesIndex.toString();

  // Find supplier/vendor (optional)
  const supplierIndex = findColumn(['supplier', 'vendor', 'suppliervector', 'company']);
  if (supplierIndex !== -1) mapping.supplier_vendor = supplierIndex.toString();

  // Find cost (optional)
  const costIndex = findColumn(['cost', 'price', 'amount', 'expense']);
  if (costIndex !== -1 && costIndex !== quantityIndex) mapping.cost = costIndex.toString();

  // Find currency (optional)
  const currencyIndex = findColumn(['currency', 'curr', 'money']);
  if (currencyIndex !== -1) mapping.currency = currencyIndex.toString();

  // Check for unmapped required columns
  const requiredFields = ['activity_description', 'quantity', 'unit', 'ghg_category', 'activity_date'];
  const unmapped = requiredFields.filter(field => !mapping[field as keyof ColumnMapping]);

  return { mapping, unmapped };
};

// Convert scope values to proper format
const normalizeGHGCategory = (value: string): string => {
  const normalized = value.toString().toLowerCase().trim();
  
  // Handle various scope formats
  if (['1', 'scope 1', 'scope1', 'scope_1', 'direct', 'direct emissions'].includes(normalized)) {
    return 'scope1';
  }
  if (['2', 'scope 2', 'scope2', 'scope_2', 'indirect', 'electricity'].includes(normalized)) {
    return 'scope2';
  }
  if (['3', 'scope 3', 'scope3', 'scope_3', 'other', 'other indirect', 'supply chain'].includes(normalized)) {
    return 'scope3';
  }
  
  // If already in correct format
  if (['scope1', 'scope2', 'scope3'].includes(normalized)) {
    return normalized;
  }
  
  return 'scope2'; // Default fallback
};

export const CSVUploader: React.FC<CSVUploaderProps> = ({ onUploadComplete }) => {
  const { company } = useCompany();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [unmappedColumns, setUnmappedColumns] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadResults, setUploadResults] = useState<{
    processedRows: number;
    totalRows: number;
    validationErrors: string[];
    failedRows: Array<{ rowNumber: number; rowData: string[]; error: string }>;
  } | null>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'confirm'>('upload');
  
  // Template download content
  const csvTemplateContent = `Date,Activity Description,Quantity,Unit,GHG Category,Supplier/Vendor,Cost (Optional),Currency,Notes
2025-01-15,Electricity consumption,2500,kWh,Scope 2,Green Energy Co.,420.50,EUR,Monthly office electricity
2025-01-20,Natural gas heating,1200,m3,Scope 1,City Gas Ltd.,890.25,EUR,Winter heating system
2025-01-25,Business travel flight,3500,km,Scope 3,Airlines Inc.,650.00,USD,Executive meeting travel
2025-02-01,Purchased materials,450,kg,Scope 3,Steel Corp,1250.75,EUR,Raw materials for production
2025-02-05,Company vehicle fuel,180,liters,Scope 1,Fuel Station,195.40,EUR,Fleet diesel consumption`;

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    resetState();
    setCsvFile(file);
    
    if (file) {
      parseCSV(file);
    }
  };
  
  // Reset all state
  const resetState = () => {
    setValidationErrors([]);
    setParsedData([]);
    setHeaders([]);
    setColumnMapping(null);
    setUnmappedColumns([]);
    setUploadSuccess(false);
    setUploadResults(null);
    setCurrentStep('upload');
  };
  
  // Reset the file input
  const handleClearFile = () => {
    setCsvFile(null);
    resetState();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Parse the CSV file
  const parseCSV = useCallback((file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Check if there's data to process
        if (results.data.length === 0) {
          setValidationErrors(['The CSV file appears to be empty.']);
          return;
        }
        
        // Get headers
        const parsedHeaders = results.meta.fields || [];
        setHeaders(parsedHeaders);
        
        // Create intelligent mapping
        const { mapping, unmapped } = createIntelligentMapping(parsedHeaders);
        setColumnMapping(mapping);
        setUnmappedColumns(unmapped);
        
        // Store parsed data
        const rows = results.data as CSVRow[];
        setParsedData(rows);
        
        // Move to preview step
        setCurrentStep('preview');
        
        if (unmapped.length > 0) {
          setValidationErrors([`Could not automatically map these required columns: ${unmapped.join(', ')}. Please check your CSV headers.`]);
        }
      },
      error: (error) => {
        setValidationErrors([`Error parsing CSV: ${error.message}`]);
      }
    });
  }, []);
  
  // Handle file drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      resetState();
      setCsvFile(file);
      parseCSV(file);
    } else {
      toast.error('Please drop a valid CSV file');
    }
  };
  
  // Download CSV template
  const downloadTemplate = () => {
    const blob = new Blob([csvTemplateContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'carbon_data_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Template downloaded! Use this format for best results.');
  };

  // Download failed rows as CSV
  const downloadFailedRows = () => {
    if (!uploadResults?.failedRows || uploadResults.failedRows.length === 0) {
      toast.error('No failed rows to download');
      return;
    }

    // Create CSV content with failed rows
    const csvContent = [
      // Header row
      headers.join(','),
      // Failed rows data
      ...uploadResults.failedRows.map(failedRow => 
        failedRow.rowData.map(cell => `"${cell}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `failed_rows_${csvFile?.name || 'data'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Failed rows downloaded! Fix the errors and re-upload.');
  };

  // Validate data before upload
  const validateData = (): { valid: boolean; errors: string[] } => {
    if (!columnMapping) return { valid: false, errors: ['No column mapping available'] };
    if (unmappedColumns.length > 0) return { valid: false, errors: [`Missing required columns: ${unmappedColumns.join(', ')}`] };
    
    const errors: string[] = [];
    const validRows: any[] = [];

    parsedData.forEach((row, index) => {
      const rowNum = index + 2; // Account for header

      // Check activity description
      const activityDesc = row[headers[parseInt(columnMapping.activity_description)]];
      if (!activityDesc || activityDesc.trim() === '') {
        errors.push(`Row ${rowNum}: Missing activity description`);
        return;
      }

      // Check quantity
      const quantity = parseFloat(row[headers[parseInt(columnMapping.quantity)]]);
      if (isNaN(quantity) || quantity <= 0) {
        errors.push(`Row ${rowNum}: Invalid quantity - must be a positive number`);
        return;
      }

      // Check unit
      const unit = row[headers[parseInt(columnMapping.unit)]];
      if (!unit || unit.trim() === '') {
        errors.push(`Row ${rowNum}: Missing unit`);
        return;
      }

      // Check date - support multiple formats
      const dateValue = row[headers[parseInt(columnMapping.activity_date)]];
      if (!dateValue || dateValue.trim() === '') {
        errors.push(`Row ${rowNum}: Missing date`);
        return;
      }
      
      // Try to parse various date formats
      let parsedDate: Date | null = null;
      const dateStr = dateValue.toString().trim();
      
      // Try different date formats
      const dateFormats = [
        dateStr, // Original format
        dateStr.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/, '$3-$1-$2'), // MM/DD/YYYY to YYYY-MM-DD
        dateStr.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/, '$3-$2-$1'), // DD/MM/YYYY to YYYY-DD-MM
        dateStr.replace(/(\d{1,2})-(\d{1,2})-(\d{4})/, '$3-$1-$2'), // MM-DD-YYYY to YYYY-MM-DD
        dateStr.replace(/(\d{1,2})-(\d{1,2})-(\d{4})/, '$3-$2-$1'), // DD-MM-YYYY to YYYY-DD-MM
      ];
      
      for (const format of dateFormats) {
        const testDate = new Date(format);
        if (!isNaN(testDate.getTime()) && testDate.getFullYear() > 1900) {
          parsedDate = testDate;
          break;
        }
      }
      
      if (!parsedDate) {
        errors.push(`Row ${rowNum}: Invalid date format. Supported formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY`);
        return;
      }

      // Check for future dates
      const today = new Date();
      today.setHours(23, 59, 59, 999); // Set to end of today
      if (parsedDate > today) {
        errors.push(`Row ${rowNum}: Date cannot be in the future. Found: ${parsedDate.toISOString().split('T')[0]}`);
        return;
      }

      // Check GHG category/scope
      const ghgCategory = row[headers[parseInt(columnMapping.ghg_category)]];
      if (!ghgCategory || ghgCategory.trim() === '') {
        errors.push(`Row ${rowNum}: Missing GHG category/scope`);
        return;
      }

      validRows.push(row);
    });

    return { valid: errors.length === 0, errors };
  };

  // Move to confirmation step
  const proceedToConfirm = () => {
    const validation = validateData();
    
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }
    
    setValidationErrors([]);
    setCurrentStep('confirm');
  };
  
  // Upload data to Supabase
  const uploadData = async () => {
    if (!company) {
      toast.error('No company context available');
      return;
    }
    
    if (!csvFile || !columnMapping) {
      toast.error('Missing file or mapping information');
      return;
    }
    
    setIsUploading(true);
    try {
      // Convert CSV file to base64
      const fileContent = await DataEntryService.fileToBase64(csvFile);
      
      // Call the file-upload edge function
      const result = await DataEntryService.uploadFile({
        file_content: fileContent,
        file_name: csvFile.name,
        column_mapping: columnMapping,
        has_header_row: true
      });
      
      const processedRows = result.processed_rows || 0;
      const totalRows = result.total_rows || 0;
      const failedRows = result.failed_rows || [];
      
      setUploadResults({
        processedRows,
        totalRows,
        validationErrors: result.validation_errors || [],
        failedRows
      });
      
      // Show appropriate success/warning message
      if (processedRows === totalRows) {
        toast.success(`Successfully uploaded all ${processedRows} records!`);
      } else if (processedRows > 0) {
        toast.warning(`Uploaded ${processedRows} out of ${totalRows} records. ${totalRows - processedRows} rows had errors - see details below.`);
      } else {
        toast.error(`Upload failed - no records were processed. Please check the error details below.`);
      }
      
      setUploadSuccess(true);
      
      // Call the callback if provided
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      console.error('Error uploading data:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Render step indicator
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-4 mb-6">
      <div className={`flex items-center ${currentStep === 'upload' ? 'text-blue-600' : 'text-green-600'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          currentStep === 'upload' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
        }`}>
          {currentStep === 'upload' ? '1' : <Check className="w-4 h-4" />}
        </div>
        <span className="ml-2 font-medium">Upload & Map</span>
      </div>
      
      <ArrowRight className="w-4 h-4 text-gray-400" />
      
      <div className={`flex items-center ${
        currentStep === 'preview' ? 'text-blue-600' : 
        currentStep === 'confirm' ? 'text-green-600' : 'text-gray-400'
      }`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          currentStep === 'preview' ? 'bg-blue-600 text-white' : 
          currentStep === 'confirm' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
        }`}>
          {currentStep === 'confirm' ? <Check className="w-4 h-4" /> : '2'}
        </div>
        <span className="ml-2 font-medium">Preview</span>
      </div>
      
      <ArrowRight className="w-4 h-4 text-gray-400" />
      
      <div className={`flex items-center ${currentStep === 'confirm' ? 'text-blue-600' : 'text-gray-400'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          currentStep === 'confirm' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
        }`}>
          3
        </div>
        <span className="ml-2 font-medium">Confirm & Upload</span>
      </div>
    </div>
  );
  
  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Table className="mr-2 h-5 w-5" />
          CSV Data Upload
        </CardTitle>
        {currentStep !== 'upload' && renderStepIndicator()}
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Step 1: File Upload */}
        {currentStep === 'upload' && (
          <>
            <div 
              className={`border-2 border-dashed rounded-lg p-8 transition-all cursor-pointer flex flex-col items-center justify-center
                ${csvFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv"
                onChange={handleFileSelect}
              />
              
              {csvFile ? (
                <>
                  <div className="flex items-center mb-2">
                    <Check className="h-6 w-6 text-green-500 mr-2" />
                    <span className="font-medium">{csvFile.name}</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {parsedData.length} rows • {(csvFile.size / 1024).toFixed(1)} KB
                  </p>
                </>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-gray-400 mb-3" />
                  <p className="text-base font-medium mb-1">
                    Drag and drop your CSV file, or click to browse
                  </p>
                  <p className="text-sm text-gray-500 mb-2">
                    Supports various column names - we'll auto-map them for you!
                  </p>
                  <p className="text-xs text-gray-400">
                    Required: Date, Activity Description, Quantity, Unit, GHG Category/Scope
                  </p>
                </>
              )}
            </div>
            
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-200 hover:border-blue-300 hover:bg-blue-50"
                onClick={downloadTemplate}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              
              {csvFile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFile}
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear File
                </Button>
              )}
            </div>
          </>
        )}

        {/* Step 2: Preview */}
        {currentStep === 'preview' && (
          <>
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Data Preview</h3>
              
              {unmappedColumns.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Missing Required Columns</AlertTitle>
                  <AlertDescription>
                    Could not automatically map these required columns: {unmappedColumns.join(', ')}. 
                    Please check your CSV headers and try again.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Data Preview */}
            {parsedData.length > 0 && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-base font-medium">Preview of {parsedData.length} rows</h4>
                  <span className="text-sm text-gray-500">
                    Showing first 5 rows
                  </span>
                </div>
                
                <div className="border rounded-md overflow-auto max-h-96">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {headers.map((header, index) => (
                          <th
                            key={header}
                            className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {parsedData.slice(0, 5).map((row, rowIndex) => (
                        <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          {headers.map((header) => (
                            <td key={`${rowIndex}-${header}`} className="px-3 py-2 text-sm">
                              {row[header] || ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('upload')}>
                Back to Upload
              </Button>
              <Button 
                onClick={proceedToConfirm}
                disabled={unmappedColumns.length > 0}
              >
                <Eye className="mr-2 h-4 w-4" />
                Preview & Validate
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Confirm & Upload */}
        {currentStep === 'confirm' && (
          <>
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Ready to Upload</h3>
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-800">
                    {parsedData.length} rows validated and ready for upload
                  </span>
                </div>
                <p className="text-green-700 text-sm mt-1">
                  Data will be processed and saved to your carbon accounting database.
                </p>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('preview')}>
                Back to Preview
              </Button>
              <Button 
                onClick={uploadData}
                disabled={isUploading}
                className="min-w-[120px]"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload Data'
                )}
              </Button>
            </div>
          </>
        )}
        
        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Validation Errors</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4 space-y-1 mt-2">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Success message */}
        {uploadSuccess && uploadResults && (
          <div className="space-y-4">
            {/* Summary */}
            <Alert className={uploadResults.processedRows === uploadResults.totalRows ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}>
              <Check className={`h-4 w-4 ${uploadResults.processedRows === uploadResults.totalRows ? "text-green-600" : "text-yellow-600"}`} />
              <AlertTitle className={uploadResults.processedRows === uploadResults.totalRows ? "text-green-800" : "text-yellow-800"}>
                Upload {uploadResults.processedRows === uploadResults.totalRows ? "Completed Successfully!" : "Partially Completed"}
              </AlertTitle>
              <AlertDescription className={uploadResults.processedRows === uploadResults.totalRows ? "text-green-700" : "text-yellow-700"}>
                <div className="space-y-2">
                  <p>
                    <strong>{uploadResults.processedRows}</strong> out of <strong>{uploadResults.totalRows}</strong> records 
                    have been uploaded successfully to your carbon accounting database.
                  </p>
                  {uploadResults.failedRows.length > 0 && (
                    <p>
                      <strong>{uploadResults.failedRows.length}</strong> rows failed validation and were not uploaded.
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>

            {/* Failed rows details and download */}
            {uploadResults.failedRows.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Failed Rows Details</AlertTitle>
                <AlertDescription>
                  <div className="space-y-3">
                    <p>The following rows could not be processed:</p>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {uploadResults.failedRows.slice(0, 10).map((failedRow, index) => (
                        <div key={index} className="text-sm bg-red-50 p-2 rounded border">
                          <span className="font-medium">Row {failedRow.rowNumber}:</span> {failedRow.error}
                        </div>
                      ))}
                      {uploadResults.failedRows.length > 10 && (
                        <p className="text-sm italic">... and {uploadResults.failedRows.length - 10} more rows</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadFailedRows}
                      className="mt-3"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Failed Rows for Manual Correction
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Validation errors summary */}
            {uploadResults.validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Validation Errors Summary</AlertTitle>
                <AlertDescription>
                  <div className="max-h-32 overflow-y-auto">
                    <ul className="list-disc pl-4 space-y-1 mt-2">
                      {uploadResults.validationErrors.slice(0, 5).map((error, index) => (
                        <li key={index} className="text-sm">{error}</li>
                      ))}
                      {uploadResults.validationErrors.length > 5 && (
                        <li className="text-sm italic">... and {uploadResults.validationErrors.length - 5} more errors</li>
                      )}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* New upload button */}
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  handleClearFile();
                  setUploadSuccess(false);
                  setUploadResults(null);
                }}
              >
                Start New Upload
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 