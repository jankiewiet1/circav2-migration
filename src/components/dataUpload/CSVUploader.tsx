import React, { useState, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, X, AlertCircle, Check, Table, Download, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Papa from "papaparse";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";

interface CSVUploaderProps {
  onUploadComplete?: () => void;
}

type CSVRow = Record<string, any>;

export const CSVUploader: React.FC<CSVUploaderProps> = ({ onUploadComplete }) => {
  const { company } = useCompany();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  // Template download content
  const csvTemplateContent = `date,category,description,quantity,unit,scope,notes
2023-01-15,Electricity,Office electricity consumption,1000,kWh,2,Monthly electricity bill for headquarters
2023-01-20,Natural Gas,Building heating system,500,m3,1,Winter heating for production facility
2023-01-25,Business Travel,Flight from London to New York,5000,km,3,Executive team quarterly meeting
2023-02-05,Purchased Goods,Steel raw materials,2500,kg,3,Manufacturing inputs for Q1
2023-02-10,Company Vehicles,Diesel fuel for delivery trucks,350,liters,1,Fleet operations
2023-02-15,Waste Disposal,General waste to landfill,120,kg,3,Office and facility waste`;

  // Required fields for emission_entries
  const requiredFields = ["date", "category", "description", "quantity", "unit", "scope"];
  
  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setCsvFile(file);
    setValidationErrors([]);
    setParsedData([]);
    setHeaders([]);
    setUploadSuccess(false);
    
    if (file) {
      parseCSV(file);
    }
  };
  
  // Reset the file input
  const handleClearFile = () => {
    setCsvFile(null);
    setParsedData([]);
    setHeaders([]);
    setValidationErrors([]);
    setUploadSuccess(false);
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
        
        // Check for required headers
        const missingHeaders = requiredFields.filter(field => !parsedHeaders.includes(field));
        if (missingHeaders.length > 0) {
          setValidationErrors([`Missing required columns: ${missingHeaders.join(', ')}`]);
          return;
        }
        
        // Process and validate rows
        const rows = results.data as CSVRow[];
        const errors: string[] = [];
        const validatedRows: CSVRow[] = [];
        
        rows.forEach((row, index) => {
          // Check for missing required values
          const missingValues = requiredFields.filter(
            field => !row[field] || row[field].toString().trim() === ''
          );
          
          if (missingValues.length > 0) {
            errors.push(`Row ${index + 2}: Missing required values for ${missingValues.join(', ')}`);
            return;
          }
          
          // Validate date format
          const dateValue = new Date(row.date);
          if (isNaN(dateValue.getTime())) {
            errors.push(`Row ${index + 2}: Invalid date format - should be YYYY-MM-DD`);
            return;
          }
          
          // Validate numeric fields
          const quantity = parseFloat(row.quantity);
          if (isNaN(quantity) || quantity <= 0) {
            errors.push(`Row ${index + 2}: Quantity must be a positive number`);
            return;
          }
          
          // Validate scope
          const scope = parseInt(row.scope, 10);
          if (![1, 2, 3].includes(scope)) {
            errors.push(`Row ${index + 2}: Scope must be 1, 2, or 3`);
            return;
          }
          
          // Add validated row
          validatedRows.push({
            ...row,
            date: dateValue.toISOString().split('T')[0],
            quantity: quantity,
            scope: scope
          });
        });
        
        setValidationErrors(errors);
        setParsedData(validatedRows);
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
    if (file && file.type === 'text/csv') {
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
    a.download = 'emission_entries_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Upload data to Supabase
  const uploadData = async () => {
    if (!company) {
      toast.error('No company context available');
      return;
    }
    
    if (validationErrors.length > 0) {
      toast.error('Please fix validation errors before uploading');
      return;
    }
    
    if (parsedData.length === 0) {
      toast.error('No valid data to upload');
      return;
    }
    
    setIsUploading(true);
    try {
      // Prepare data for emission_entries
      const emissionEntries = parsedData.map(row => ({
        company_id: company.id,
        date: row.date,
        category: row.category,
        description: row.description,
        quantity: parseFloat(row.quantity),
        unit: row.unit,
        scope: parseInt(row.scope, 10),
        notes: row.notes || null
      }));
      
      // Insert data to emission_entries
      const { error } = await supabase
        .from('emission_entries')
        .upsert(emissionEntries, {
          onConflict: 'company_id,date,category,unit,scope'
        });
      
      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }
      
      toast.success(`Successfully uploaded ${emissionEntries.length} records`);
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
  
  return (
    <Card className="border shadow-sm">
      <CardContent className="pt-6 space-y-6">
        {/* File upload area */}
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
              <p className="text-sm text-gray-500">
                File should include: date, category, description, quantity, unit, scope
              </p>
            </>
          )}
        </div>
        
        {/* Template download button */}
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
              onClick={(e) => {
                e.stopPropagation();
                handleClearFile();
              }}
            >
              <X className="h-4 w-4 mr-1" />
              Clear File
            </Button>
          )}
        </div>
        
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
        
        {/* Data preview */}
        {parsedData.length > 0 && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-base font-medium">Data Preview</h3>
              <span className="text-sm text-gray-500">
                {parsedData.length} rows
              </span>
            </div>
            
            <div className="border rounded-md overflow-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {headers.map((header) => (
                      <th
                        key={header}
                        className={`px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                          requiredFields.includes(header) ? 'font-bold' : ''
                        }`}
                      >
                        {header}
                        {requiredFields.includes(header) && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {parsedData.slice(0, 10).map((row, rowIndex) => (
                    <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {headers.map((header) => (
                        <td key={`${rowIndex}-${header}`} className="px-3 py-2 text-sm">
                          {row[header] || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {parsedData.length > 10 && (
                    <tr>
                      <td 
                        colSpan={headers.length} 
                        className="px-3 py-2 text-sm text-gray-500 text-center"
                      >
                        {parsedData.length - 10} more rows not shown
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Upload button */}
        {parsedData.length > 0 && !uploadSuccess && (
          <div className="flex justify-end">
            <Button
              onClick={uploadData}
              disabled={isUploading || validationErrors.length > 0}
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
        )}
        
        {/* Success message */}
        {uploadSuccess && (
          <Alert className="bg-green-50 border-green-200">
            <Check className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Upload Successful</AlertTitle>
            <AlertDescription className="text-green-700">
              {parsedData.length} records have been uploaded successfully.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}; 