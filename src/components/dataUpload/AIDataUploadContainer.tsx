import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Database, FileText, MessageSquare } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { FileUploader } from './FileUploader';
import { DataPreviewTable } from './DataPreviewTable';
import { FieldMappingPanel } from './FieldMappingPanel';
import { ChatAssistant } from './ChatAssistant';
import { UploadedFileMetadata, AIDataExtractionResponse } from "@/types/dataEntry";
import { DataEntryService } from "@/services/dataEntryService";
import { AIDataProcessingService } from "@/services/aiDataProcessingService";

/**
 * Container component for the AI-powered data upload functionality
 */
export const AIDataUploadContainer: React.FC = () => {
  const { company } = useCompany();
  const [activeTab, setActiveTab] = useState<string>('upload');
  const [uploadMode, setUploadMode] = useState<'file' | 'api' | 'email'>('file');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileMetadata[]>([]);
  const [extractionResponse, setExtractionResponse] = useState<AIDataExtractionResponse | null>(null);
  const [processingFile, setProcessingFile] = useState<boolean>(false);
  const [showChat, setShowChat] = useState<boolean>(false);
  const [userCorrectedMappings, setUserCorrectedMappings] = useState<Record<string, string>>({});

  /**
   * Handle file upload
   */
  const handleFileUpload = async (files: File[]) => {
    if (!company) {
      toast.error("No company context available");
      return;
    }

    setProcessingFile(true);
    
    try {
      // Process each file
      for (const file of files) {
        console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`);
        
        // Validate file type before upload
        const validTypes = ['text/csv', 'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        
        if (!validTypes.includes(file.type) && 
            !['csv', 'pdf', 'xlsx'].includes(fileExtension || '')) {
          toast.error(`File type not supported: ${file.type || fileExtension}`);
          continue;
        }
        
        // 1. Upload file to storage
        console.log(`Uploading file to Supabase: ${file.name}`);
        const { success, url } = await DataEntryService.uploadFile(file, company.id);
        
        if (!success || !url) {
          console.error('File upload failed:', file.name);
          toast.error(`Failed to upload file: ${file.name}`);
          continue;
        }
        
        console.log(`File uploaded successfully: ${url}`);
        toast.success(`File uploaded successfully. Processing data...`);
        
        // Create metadata from the successful upload
        const metadata: UploadedFileMetadata = {
          filename: file.name,
          file_type: file.type,
          uploaded_at: new Date().toISOString(),
          file_size: file.size,
          preview_url: url,
          status: 'uploading'
        };
        
        // Add to uploaded files list
        setUploadedFiles(prev => [...prev, metadata]);
        
        // 2. Extract data based on file type
        let extractionResult: AIDataExtractionResponse;
        
        try {
          // Show processing toast with loading state
          const processingToastId = toast.loading(`Extracting data from ${file.name}...`);
          
          if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
            console.log('Processing CSV file...');
            extractionResult = await AIDataProcessingService.extractFromCsv(file);
          } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            console.log('Processing PDF file...');
            try {
              // Call edge function with better error handling
              extractionResult = await AIDataProcessingService.extractFromPdf(url);
              console.log('PDF extraction result:', JSON.stringify(extractionResult).substring(0, 200) + '...');
              
              // For PDFs, if we have extracted data but no mappings, create default mappings
              if (extractionResult.success && 
                  extractionResult.extracted_data?.length > 0 && 
                  (!extractionResult.mappings || extractionResult.mappings.length === 0)) {
                
                console.log('Creating default mappings for PDF data');
                
                // Get all keys from the first data object
                const keys = Object.keys(extractionResult.extracted_data[0] || {});
                
                // Create simple 1:1 mappings for each field
                extractionResult.mappings = keys.map(key => ({
                  original_header: key,
                  mapped_field: key as any,
                  confidence: 1,
                  suggestions: []
                }));
                
                console.log('Created mappings:', extractionResult.mappings);
              }
              
            } catch (pdfError) {
              console.error('PDF extraction error:', pdfError);
              toast.error(`Error processing PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`);
              
              // Create a minimal extraction result to show the error
              extractionResult = {
                success: false,
                message: `Error processing PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`,
                mappings: [],
                extracted_data: [{
                  source_type: 'pdf',
                  activity_description: `Failed to process: ${file.name}`,
                  status: 'error',
                  ai_processed: true,
                  ai_confidence: 0
                }],
                confidence_score: 0,
                unmapped_fields: [],
                ambiguous_fields: [],
                requires_user_review: true
              };
            }
          } else if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                    file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            console.log('Processing Excel file...');
            extractionResult = await AIDataProcessingService.extractFromExcel(url);
          } else {
            console.error('Unsupported file type after validation:', file.type);
            throw new Error(`Unsupported file type: ${file.type}`);
          }
          
          // Update the toast based on success/failure
          toast.dismiss(processingToastId);
          if (extractionResult.success) {
            toast.success(`Successfully extracted data from ${file.name}`);
          } else {
            toast.error(`Failed to extract data from ${file.name}: ${extractionResult.message}`);
          }
          
          console.log('Extraction result:', extractionResult);
          
          // Update file status in uploaded files
          setUploadedFiles(prev => 
            prev.map(item => 
              item.filename === file.name 
                ? {...item, status: extractionResult.success ? 'ready' : 'error'} 
                : item
            )
          );
          
          // Display extracted data in console for debugging
          if (extractionResult.extracted_data?.length > 0) {
            console.log('Extracted data fields:', Object.keys(extractionResult.extracted_data[0]));
            console.log('First data entry:', extractionResult.extracted_data[0]);
          }
          
          // 3. Set extraction response and move to preview tab
          setExtractionResponse(extractionResult);
          
          if (extractionResult.requires_user_review) {
            // If user review required, show preview tab
            setActiveTab('preview');
            
            if (extractionResult.ambiguous_fields?.length > 0) {
              // If there are ambiguous fields, open chat assistant for help
              setShowChat(true);
            }
          } else {
            // Otherwise, directly save the data
            const transformedData = AIDataProcessingService.transformExtractedData(
              extractionResult.extracted_data,
              extractionResult.mappings,
              company.id
            );
            
            // Save each entry
            let successCount = 0;
            // Use createDataEntries to save all entries at once
            const { success, count } = await DataEntryService.createDataEntries(transformedData);
            if (success) {
              successCount = count;
            }
            
            toast.success(`Successfully processed ${successCount} entries from ${file.name}`);
          }
        } catch (extractionError) {
          console.error('Error during data extraction:', extractionError);
          toast.error(`Data extraction failed: ${extractionError instanceof Error ? extractionError.message : 'Unknown error'}`);
          
          // Update file status to error
          setUploadedFiles(prev => 
            prev.map(item => 
              item.filename === file.name 
                ? {...item, status: 'error'} 
                : item
            )
          );
        }
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process file');
    } finally {
      setProcessingFile(false);
    }
  };

  /**
   * Handle field mapping corrections
   */
  const handleFieldMappingCorrection = (originalField: string, correctedField: string) => {
    setUserCorrectedMappings(prev => ({
      ...prev,
      [originalField]: correctedField
    }));
  };

  /**
   * Apply user corrections and save data
   */
  const applyCorrectionsAndSave = async () => {
    if (!company || !extractionResponse) return;
    
    try {
      // Apply user corrections to mappings
      const correctedMappings = AIDataProcessingService.applyUserCorrections(
        extractionResponse.mappings,
        Object.entries(userCorrectedMappings).map(([originalHeader, correctedField]) => ({
          originalHeader,
          correctedField: correctedField as any
        }))
      );
      
      // Transform data with corrected mappings
      const transformedData = AIDataProcessingService.transformExtractedData(
        extractionResponse.extracted_data,
        correctedMappings,
        company.id
      );
      
      // Save all entries at once using createDataEntries
      const { success, count } = await DataEntryService.createDataEntries(transformedData);
      
      if (success) {
        toast.success(`Successfully saved ${count} entries`);
        
        // Reset state
        setExtractionResponse(null);
        setUserCorrectedMappings({});
        setActiveTab('upload');
      } else {
        throw new Error("Failed to save entries");
      }
    } catch (error) {
      console.error('Error saving data:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save data');
    }
  };

  /**
   * Cancel the current processing
   */
  const handleCancel = () => {
    setExtractionResponse(null);
    setUserCorrectedMappings({});
    setActiveTab('upload');
  };

  return (
    <div className="relative">
      {/* Chat Assistant Button */}
      <div className="absolute top-0 right-0 z-10">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          onClick={() => setShowChat(!showChat)}
        >
          <MessageSquare className="w-4 h-4" />
          {showChat ? 'Hide' : 'Get AI Help'}
        </Button>
      </div>
      
      {/* Main Container */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className={`${showChat ? 'md:col-span-3' : 'md:col-span-4'}`}>
          <Tabs defaultValue="upload" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="upload" disabled={processingFile}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Data
              </TabsTrigger>
              <TabsTrigger value="preview" disabled={!extractionResponse}>
                <FileText className="w-4 h-4 mr-2" />
                Preview & Validate
              </TabsTrigger>
              <TabsTrigger value="history">
                <Database className="w-4 h-4 mr-2" />
                Upload History
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload">
              <div className="space-y-6">
                {/* Upload Mode Selection */}
                <div className="flex space-x-4 mb-6">
                  <Button
                    onClick={() => setUploadMode('file')}
                    variant={uploadMode === 'file' ? 'default' : 'outline'}
                    className="px-5"
                  >
                    Upload Files
                  </Button>
                  <Button
                    onClick={() => setUploadMode('api')}
                    variant={uploadMode === 'api' ? 'default' : 'outline'}
                    className="px-5"
                  >
                    Connect API/ERP
                  </Button>
                  <Button
                    onClick={() => setUploadMode('email')}
                    variant={uploadMode === 'email' ? 'default' : 'outline'}
                    className="px-5"
                  >
                    Email Forwarding
                  </Button>
                </div>
                
                {/* File Uploader */}
                {uploadMode === 'file' && (
                  <FileUploader 
                    onFilesSelected={handleFileUpload} 
                    isProcessing={processingFile}
                    acceptedFileTypes=".csv,.xlsx,.pdf,.jpg,.png"
                  />
                )}
                
                {/* API Connection (placeholder) */}
                {uploadMode === 'api' && (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <h3 className="text-lg font-medium mb-4">Connect to API or ERP System</h3>
                    <p className="text-gray-500 mb-6">This feature is coming soon. Please use file upload for now.</p>
                  </div>
                )}
                
                {/* Email Forwarding (placeholder) */}
                {uploadMode === 'email' && (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <h3 className="text-lg font-medium mb-4">Email Forwarding Setup</h3>
                    <p className="text-gray-500 mb-6">This feature is coming soon. Please use file upload for now.</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="preview">
              {extractionResponse && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Data Preview</h3>
                    <div className="flex space-x-3">
                      <Button variant="outline" onClick={handleCancel}>
                        Cancel
                      </Button>
                      <Button onClick={applyCorrectionsAndSave}>
                        Save Data
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-4 gap-6">
                    {/* Data Preview Table */}
                    <div className="md:col-span-3">
                      <DataPreviewTable 
                        data={extractionResponse.extracted_data} 
                        mappings={extractionResponse.mappings}
                      />
                      
                      {/* Display raw data for debugging if no mappings */}
                      {(!extractionResponse.mappings || extractionResponse.mappings.length === 0) && 
                       extractionResponse.extracted_data && 
                       extractionResponse.extracted_data.length > 0 && (
                        <div className="mt-4 p-4 border rounded bg-gray-50">
                          <h4 className="text-md font-medium mb-2">Raw Extracted Data</h4>
                          <pre className="text-xs overflow-auto max-h-96">
                            {JSON.stringify(extractionResponse.extracted_data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                    
                    {/* Field Mapping Panel */}
                    <div className="md:col-span-1">
                      {extractionResponse.mappings && extractionResponse.mappings.length > 0 ? (
                        <FieldMappingPanel 
                          mappings={extractionResponse.mappings}
                          onMappingChange={handleFieldMappingCorrection}
                          userCorrectedMappings={userCorrectedMappings}
                        />
                      ) : (
                        <div className="p-4 border rounded">
                          <h4 className="text-md font-medium">Successfully extracted data from {uploadedFiles[0]?.filename}</h4>
                          <p className="text-sm text-gray-500 mt-2">
                            This file type doesn't require field mapping. Click "Save Data" to continue.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="history">
              <div className="text-center py-12">
                <h3 className="text-lg font-medium mb-4">Upload History</h3>
                <p className="text-gray-500">
                  View history of your data uploads and their processing status.
                </p>
                {/* This would be implemented with a DataGrid or similar */}
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Chat Assistant */}
        {showChat && (
          <div className="md:col-span-1">
            <ChatAssistant 
              extractionResponse={extractionResponse} 
              onSuggestMapping={handleFieldMappingCorrection}
            />
          </div>
        )}
      </div>
    </div>
  );
}; 