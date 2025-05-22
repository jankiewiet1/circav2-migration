import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { createCarbonDataAgent } from '@/agents/data-recognition';
import { Check, AlertCircle, Upload, FileText, RefreshCw } from 'lucide-react';

interface AgentUploadProps {
  companyId: string;
  onDataExtracted?: (data: any) => void;
}

export function AgentUpload({ companyId, onDataExtracted }: AgentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<any>(null);
  
  // Create agent instance
  const agent = createCarbonDataAgent();
  
  // Enable debug mode with query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const debugMode = params.get('debug') === 'true';
    if (debugMode) {
      console.log('Debug mode enabled');
    }
  }, []);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
      setDebug(null);
    }
  };
  
  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    
    setIsProcessing(true);
    setProgress(10);
    setError(null);
    setDebug(null);
    
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress((prevProgress) => {
          const newProgress = prevProgress + 5;
          return newProgress > 85 ? 85 : newProgress;
        });
      }, 1000);
      
      console.log(`Processing ${file.name} for company ${companyId}`);
      
      // Process the file using our agent
      const processResult = await agent.processFile(file, companyId);
      
      // Debug info
      setDebug(processResult);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      console.log('Process result:', processResult);
      
      if (processResult.success) {
        setResult(processResult);
        if (onDataExtracted) {
          onDataExtracted(processResult);
        }
      } else {
        setError(processResult.message || 'Error processing file');
      }
    } catch (err) {
      console.error('Error in handleUpload:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleCorrection = async () => {
    if (!result) return;
    
    setIsProcessing(true);
    setProgress(50);
    setError(null);
    
    try {
      console.log('Correcting data:', result.data);
      const correctionResult = await agent.correctData(result.data);
      
      console.log('Correction result:', correctionResult);
      
      if (correctionResult.success) {
        setResult({
          ...result,
          data: correctionResult.data,
          requires_review: false
        });
        
        if (onDataExtracted) {
          onDataExtracted({
            ...result,
            data: correctionResult.data,
            requires_review: false
          });
        }
      } else {
        setError(correctionResult.message || 'Error correcting data');
      }
    } catch (err) {
      console.error('Error in handleCorrection:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };
  
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>AI-Powered Data Extraction</CardTitle>
        <CardDescription>
          Upload a file to extract carbon accounting data using our AI agent
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-center w-full">
            <label 
              htmlFor="file-upload" 
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-2 text-gray-500" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  PDF, Excel, CSV or image files
                </p>
              </div>
              <input 
                id="file-upload" 
                type="file" 
                className="hidden" 
                onChange={handleFileChange}
                accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png"
                disabled={isProcessing}
              />
            </label>
          </div>
          
          {file && (
            <div className="flex items-center space-x-2 text-sm">
              <FileText className="w-4 h-4" />
              <span className="text-gray-700">{file.name}</span>
            </div>
          )}
          
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-center text-gray-500">
                {progress < 100 ? 'Processing your file...' : 'Processing complete!'}
              </p>
            </div>
          )}
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {result && result.success && (
            <Alert className={result.requires_review ? 'bg-yellow-50' : 'bg-green-50'}>
              {result.requires_review ? (
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              ) : (
                <Check className="h-4 w-4 text-green-600" />
              )}
              <AlertTitle>
                {result.requires_review ? 'Review Required' : 'Data Extracted'}
              </AlertTitle>
              <AlertDescription>
                {result.requires_review 
                  ? `The AI has extracted the data, but ${result.missing_fields?.length} fields need review.`
                  : 'Data has been successfully extracted and validated.'}
              </AlertDescription>
            </Alert>
          )}
          
          {result && result.success && result.data && (
            <div className="mt-4 p-2 bg-gray-50 rounded border text-sm">
              <div className="font-medium mb-1">Extracted Data Preview:</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(result.data).slice(0, 6).map(([key, value]) => (
                  <div key={key} className="truncate">
                    <span className="font-medium">{key}:</span> {String(value || 'N/A')}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {debug && debug.warnings && debug.warnings.length > 0 && (
            <div className="mt-2 text-xs text-amber-600">
              <div>Warnings:</div>
              <ul className="list-disc pl-4">
                {debug.warnings.map((warning: string, i: number) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          onClick={handleUpload}
          disabled={!file || isProcessing}
          className="w-full"
        >
          {isProcessing ? 'Processing...' : 'Process with AI'}
        </Button>
        
        {result && result.success && result.requires_review && (
          <Button
            onClick={handleCorrection}
            disabled={isProcessing}
            variant="outline"
            className="ml-2"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Correct Data
          </Button>
        )}
      </CardFooter>
    </Card>
  );
} 