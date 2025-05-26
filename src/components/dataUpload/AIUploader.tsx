import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { 
  Upload, 
  FileText, 
  Download, 
  Check, 
  AlertCircle, 
  Sparkles,
  RefreshCw,
  ArrowRight,
  Eye,
  X,
  Loader2,
  Zap,
  Info
} from 'lucide-react';
import { DataEntryService } from '@/services/dataEntryService';
import { AIDataProcessingService } from '@/services/aiDataProcessingService';
import { EnhancedAIDataProcessingService } from '@/services/enhancedAIDataProcessingService';
import { AIDataExtractionResponse } from '@/types/dataEntry';

interface AIUploaderProps {
  onUploadComplete?: () => void;
}

interface UploadResults {
  processedRows: number;
  totalRows: number;
  validationErrors: string[];
  failedRows: Array<{
    rowNumber: number;
    rowData: any;
    error: string;
  }>;
}

export const AIUploader: React.FC<AIUploaderProps> = ({ onUploadComplete }) => {
  const { company } = useCompany();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResults | null>(null);
  const [extractionData, setExtractionData] = useState<AIDataExtractionResponse | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [enhancedService] = useState(() => new EnhancedAIDataProcessingService());
  const [processingInfo, setProcessingInfo] = useState<{method: string; available: boolean; description: string} | null>(null);

  // Get processing info on component mount
  useEffect(() => {
    const info = enhancedService.getProcessingInfo();
    setProcessingInfo(info);
  }, [enhancedService]);

  // Select file
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validExtensions = ['.pdf', '.xlsx', '.xls', '.csv', '.jpg', '.jpeg', '.png'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!validExtensions.includes(fileExtension)) {
        toast.error('Please select a valid file type (PDF, Excel, CSV, or Image)');
        return;
      }
      
      // Check file size (max 20MB)
      if (file.size > 20 * 1024 * 1024) {
        toast.error('File size must be less than 20MB');
        return;
      }
      
      setSelectedFile(file);
      setUploadSuccess(false);
      setUploadResults(null);
      setExtractionData(null);
      setShowPreview(false);
    }
  };

  // Process file with AI
  const processFile = async () => {
    if (!selectedFile || !company) {
      toast.error('Please select a file and ensure company context is available');
      return;
    }

    setIsProcessing(true);
    
    try {
      // 1. Upload file to storage
      toast.loading('Uploading file to storage...', { id: 'processing' });
      
      const { success, url, error } = await DataEntryService.uploadFileToStorage(selectedFile, company.id);
      
      if (!success || !url) {
        throw new Error(error || 'Failed to upload file');
      }

      console.log('File uploaded to storage:', url);

      // 2. Process file with enhanced AI based on type
      toast.loading('Processing file with enhanced AI...', { id: 'processing' });
      
      let extractionResult: AIDataExtractionResponse;
      
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'csv') {
        extractionResult = await AIDataProcessingService.extractFromCsv(selectedFile);
      } else if (['xlsx', 'xls'].includes(fileExtension || '')) {
        extractionResult = await AIDataProcessingService.extractFromExcel(url);
      } else if (fileExtension === 'pdf') {
        // Use enhanced service for PDFs (Textract + GPT-4)
        extractionResult = await enhancedService.extractFromPDF(url);
      } else if (['jpg', 'jpeg', 'png'].includes(fileExtension || '')) {
        // For images, we'll use the PDF processing endpoint since it can handle images too
        extractionResult = await AIDataProcessingService.extractFromPdf(url);
      } else {
        throw new Error(`Unsupported file type: ${fileExtension}`);
      }

      console.log('AI extraction result:', extractionResult);
      
      toast.dismiss('processing');
      
      if (extractionResult.success && extractionResult.extracted_data) {
        setExtractionData(extractionResult);
        setShowPreview(true);
        toast.success(`Successfully extracted ${extractionResult.extracted_data?.length || 0} entries from ${selectedFile.name}`);
      } else {
        throw new Error(extractionResult.message || 'AI processing failed');
      }
      
    } catch (error) {
      console.error('Error processing file:', error);
      toast.dismiss('processing');
      toast.error(error instanceof Error ? error.message : 'Failed to process file');
    } finally {
      setIsProcessing(false);
    }
  };

  // Upload processed data
  const uploadData = async () => {
    if (!extractionData || !company) {
      toast.error('No processed data available');
      return;
    }

    setIsUploading(true);
    
    try {
      // Transform the extracted data to the proper format
      const transformedData = AIDataProcessingService.transformExtractedData(
        extractionData.extracted_data,
        extractionData.mappings,
        company.id
      );

      console.log('Transformed data for upload:', transformedData);

      // Save all entries
      const { success, count, error } = await DataEntryService.createDataEntries(transformedData);
      
      if (success) {
        const totalExtracted = extractionData.extracted_data?.length || 0;
        const failedRows = transformedData.length - count;
        
        setUploadResults({
          processedRows: count,
          totalRows: totalExtracted,
          validationErrors: extractionData.unmapped_fields || [],
          failedRows: [] // We could add more detailed error tracking here
        });
        
        if (count === totalExtracted) {
          toast.success(`Successfully uploaded all ${count} records!`);
        } else if (count > 0) {
          toast.warning(`Uploaded ${count} out of ${totalExtracted} records. ${failedRows} rows had issues.`);
        } else {
          toast.error('Upload failed - no records were processed.');
        }
        
        setUploadSuccess(true);
        setShowPreview(false);
        
        // Call completion callback
        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        throw new Error(error || 'Failed to save data entries');
      }
    } catch (error) {
      console.error('Error uploading data:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Start new upload
  const startNewUpload = () => {
    setSelectedFile(null);
    setExtractionData(null);
    setUploadResults(null);
    setUploadSuccess(false);
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Download template
  const downloadTemplate = () => {
    const csvContent = `date,activity_description,quantity,unit,ghg_category,supplier_vendor
2024-01-15,"Electricity consumption - Office",2450.5,kWh,"Scope 2","Green Energy Corp"
2024-01-20,"Natural gas heating",150.2,m³,"Scope 1","Gas Utility Inc"
2024-02-05,"Business flight - NYC to LA",2500,km,"Scope 3","Airline Corp"`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai_upload_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Template downloaded! Use this format for reference.');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          AI-Powered Data Upload
          {processingInfo && (
            <Badge variant={processingInfo.method.includes('Textract') ? 'default' : 'secondary'} className="ml-2">
              {processingInfo.method.includes('Textract') ? (
                <>
                  <Zap className="h-3 w-3 mr-1" />
                  Enhanced
                </>
              ) : (
                'Standard'
              )}
            </Badge>
          )}
        </CardTitle>
        {processingInfo && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Info className="h-4 w-4" />
            <span>{processingInfo.description}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {!uploadSuccess ? (
          <>
            {/* File Selection */}
            {!selectedFile && !showPreview && (
              <div className="space-y-4">
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png"
                    className="hidden"
                    disabled={isProcessing || isUploading}
                  />
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    Upload your file for AI processing
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Supported: PDF, Excel, CSV, Images (max 20MB)
                  </p>
                  <Button variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50">
                    Select File
                  </Button>
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    {processingInfo?.method.includes('Textract') 
                      ? 'Enhanced AI with AWS Textract for superior PDF text and table extraction'
                      : 'AI will automatically extract carbon accounting data from your file'
                    }
                  </p>
                  <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </div>
            )}

            {/* File Selected */}
            {selectedFile && !showPreview && (
              <div className="space-y-4">
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertTitle>File Ready for Processing</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-2">
                      <p><strong>File:</strong> {selectedFile.name}</p>
                      <p><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      <p><strong>Type:</strong> {selectedFile.type || 'Unknown'}</p>
                      {selectedFile.name.endsWith('.pdf') && processingInfo?.method.includes('Textract') && (
                        <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 rounded">
                          <Zap className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-blue-700">
                            This PDF will be processed with AWS Textract for enhanced accuracy
                          </span>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Button 
                    onClick={processFile}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing with AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Process with {processingInfo?.method.includes('Textract') ? 'Enhanced' : 'Standard'} AI
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={startNewUpload}
                    disabled={isProcessing}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Preview */}
            {showPreview && extractionData && (
              <div className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <Eye className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800">Data Extraction Preview</AlertTitle>
                  <AlertDescription className="text-blue-700">
                    <div className="mt-2 space-y-2">
                      <p><strong>Extracted Entries:</strong> {extractionData.extracted_data?.length || 0}</p>
                      <p><strong>Confidence Score:</strong> {(extractionData.confidence_score * 100).toFixed(1)}%</p>
                      {processingInfo?.method.includes('Textract') && (
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-blue-600" />
                          <span>Processed with AWS Textract + GPT-4</span>
                        </div>
                      )}
                      {extractionData.requires_user_review && (
                        <p className="text-amber-600"><strong>Note:</strong> Some entries may need review</p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>

                {/* Preview table */}
                <div className="max-h-96 overflow-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Date</th>
                        <th className="px-3 py-2 text-left">Description</th>
                        <th className="px-3 py-2 text-left">Quantity</th>
                        <th className="px-3 py-2 text-left">Unit</th>
                        <th className="px-3 py-2 text-left">Category</th>
                        <th className="px-3 py-2 text-left">Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extractionData.extracted_data?.slice(0, 10).map((entry, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-3 py-2">{entry.date}</td>
                          <td className="px-3 py-2">{entry.activity_description}</td>
                          <td className="px-3 py-2">{entry.quantity}</td>
                          <td className="px-3 py-2">{entry.unit}</td>
                          <td className="px-3 py-2">
                            <Badge variant="outline">{entry.ghg_category}</Badge>
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={
                              (entry.ai_confidence || 0) > 0.8 ? 'default' : 
                              (entry.ai_confidence || 0) > 0.6 ? 'secondary' : 'destructive'
                            }>
                              {((entry.ai_confidence || 0) * 100).toFixed(0)}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(extractionData.extracted_data?.length || 0) > 10 && (
                    <div className="p-3 text-center text-gray-500 border-t">
                      ... and {(extractionData.extracted_data?.length || 0) - 10} more entries
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={uploadData}
                    disabled={isUploading}
                    className="flex-1"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Upload {extractionData.extracted_data?.length || 0} Entries
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowPreview(false)}
                    disabled={isUploading}
                  >
                    Back
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Success message */
          <div className="space-y-4">
            <Alert className={uploadResults?.processedRows === uploadResults?.totalRows ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}>
              <Check className={`h-4 w-4 ${uploadResults?.processedRows === uploadResults?.totalRows ? "text-green-600" : "text-yellow-600"}`} />
              <AlertTitle className={uploadResults?.processedRows === uploadResults?.totalRows ? "text-green-800" : "text-yellow-800"}>
                Upload {uploadResults?.processedRows === uploadResults?.totalRows ? "Completed Successfully!" : "Partially Completed"}
              </AlertTitle>
              <AlertDescription className={uploadResults?.processedRows === uploadResults?.totalRows ? "text-green-700" : "text-yellow-700"}>
                {uploadResults && (
                  <div className="mt-2">
                    <p><strong>Processed:</strong> {uploadResults.processedRows} out of {uploadResults.totalRows} entries</p>
                    {uploadResults.processedRows !== uploadResults.totalRows && (
                      <p><strong>Failed:</strong> {uploadResults.totalRows - uploadResults.processedRows} entries</p>
                    )}
                    {processingInfo?.method.includes('Textract') && (
                      <div className="flex items-center gap-2 mt-2">
                        <Zap className="h-4 w-4" />
                        <span>Enhanced processing with AWS Textract</span>
                      </div>
                    )}
                  </div>
                )}
              </AlertDescription>
            </Alert>

            {/* Validation errors summary */}
            {uploadResults?.validationErrors && uploadResults.validationErrors.length > 0 && (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Validation Notes</AlertTitle>
                <AlertDescription className="text-amber-700">
                  <ul className="mt-2 space-y-1">
                    {uploadResults.validationErrors.slice(0, 5).map((error, index) => (
                      <li key={index} className="text-sm">• {error}</li>
                    ))}
                    {uploadResults.validationErrors.length > 5 && (
                      <li className="text-sm">• ... and {uploadResults.validationErrors.length - 5} more</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Button onClick={startNewUpload} className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              Upload Another File
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 