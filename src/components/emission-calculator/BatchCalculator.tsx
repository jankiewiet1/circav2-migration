import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ClimatiqEmissionService } from '@/services/emissionService';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function BatchCalculator() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    processed: number;
    succeeded: number;
    failed: number;
    details: Array<{ entryId: string; success: boolean; message?: string }>;
  } | null>(null);
  const { company } = useCompany();

  /**
   * Process all unmatched emission entries
   */
  const handleProcessUnmatchedEntries = async () => {
    if (!company?.id) {
      toast.error('Company information is required');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await ClimatiqEmissionService.calculateFromEmissionEntries(company.id);
      setResults(result);
      
      if (result.processed === 0) {
        toast.info('No unmatched emission entries found to process');
      } else if (result.failed === 0) {
        toast.success(`Successfully calculated emissions for all ${result.processed} entries`);
      } else if (result.succeeded === 0) {
        toast.error(`Failed to calculate emissions for all ${result.processed} entries`);
      } else {
        toast.success(`Calculated emissions for ${result.succeeded} out of ${result.processed} entries`);
      }
    } catch (error: any) {
      console.error('Error processing unmatched entries:', error);
      toast.error(error.message || 'Failed to process entries');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset results to start a new calculation
   */
  const handleReset = () => {
    setResults(null);
  };

  /**
   * Format success rate percentage
   */
  const successRate = results?.processed 
    ? Math.round((results.succeeded / results.processed) * 100) 
    : 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Batch Calculate Emissions</CardTitle>
        <CardDescription>
          Process your emission entries using the Climatiq API based on your preferred data source
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!results ? (
          <div className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">Information</AlertTitle>
              <AlertDescription className="text-blue-700">
                This tool will process all unmatched emission entries and calculate their emissions using the Climatiq API.
                The calculation will use your preferred emission data source from company preferences.
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={handleProcessUnmatchedEntries} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Process All Unmatched Entries'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium">Processing Results</h3>
              <Button variant="ghost" onClick={handleReset} size="sm">
                Start New Calculation
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold">{results.processed}</div>
                <div className="text-sm text-gray-500">Total Entries</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{results.succeeded}</div>
                <div className="text-sm text-gray-500">Succeeded</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                <div className="text-sm text-gray-500">Failed</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm mb-1">
                <span>Success Rate</span>
                <span className="font-medium">{successRate}%</span>
              </div>
              <Progress value={successRate} className="h-2" />
            </div>
            
            {results.details.length > 0 && (
              <Accordion type="single" collapsible className="mt-4">
                <AccordionItem value="details">
                  <AccordionTrigger>Detailed Results</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 mt-2">
                      {results.details.map((detail) => (
                        <div 
                          key={detail.entryId} 
                          className={`p-2 rounded-md flex items-center justify-between ${
                            detail.success ? 'bg-green-50' : 'bg-red-50'
                          }`}
                        >
                          <div className="flex items-center">
                            {detail.success ? (
                              <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600 mr-2" />
                            )}
                            <span className="text-sm truncate max-w-[240px]">
                              {detail.entryId}
                            </span>
                          </div>
                          
                          {detail.success ? (
                            <Badge variant="outline" className="border-green-200 text-green-600">
                              Success
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              Failed
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 