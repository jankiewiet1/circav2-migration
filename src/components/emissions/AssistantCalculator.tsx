import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Calculator, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { assistantCalculator, EmissionCalculatorUtils } from '@/services/assistantEmissionCalculator';
import { useAuth } from '@/contexts/AuthContext';

interface CalculationStatus {
  total_entries: number;
  calculated_entries: number;
  pending_entries: number;
  completion_percentage: number;
}

interface EmissionsSummary {
  scope1: number;
  scope2: number;
  scope3: number;
  total: number;
}

interface EmissionEntry {
  id: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
}

export const AssistantCalculator: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationStatus, setCalculationStatus] = useState<CalculationStatus | null>(null);
  const [emissionsSummary, setEmissionsSummary] = useState<EmissionsSummary | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentEntry, setCurrentEntry] = useState<EmissionEntry | null>(null);
  const [lastCalculationResults, setLastCalculationResults] = useState<any>(null);

  // Load initial status
  useEffect(() => {
    if (user?.profile?.company_id) {
      loadCalculationStatus();
      loadEmissionsSummary();
    }
  }, [user?.profile?.company_id]);

  const loadCalculationStatus = async () => {
    if (!user?.profile?.company_id) return;
    
    try {
      const status = await EmissionCalculatorUtils.getCalculationStatus(user.profile.company_id);
      setCalculationStatus(status);
    } catch (error) {
      console.error('Failed to load calculation status:', error);
    }
  };

  const loadEmissionsSummary = async () => {
    if (!user?.profile?.company_id) return;
    
    try {
      const summary = await EmissionCalculatorUtils.getEmissionsSummary(user.profile.company_id);
      setEmissionsSummary(summary);
    } catch (error) {
      console.error('Failed to load emissions summary:', error);
    }
  };

  const handleCalculateEmissions = async () => {
    if (!user?.profile?.company_id) {
      toast({
        title: "Error",
        description: "No company ID found. Please ensure you're logged in.",
        variant: "destructive"
      });
      return;
    }

    setIsCalculating(true);
    setProgress(0);
    setCurrentEntry(null);

    try {
      toast({
        title: "🚀 Starting Calculations",
        description: "Using OpenAI Assistant to calculate emissions for all entries...",
      });

      const results = await assistantCalculator.processCompanyEmissions(
        user.profile.company_id,
        (completed, total, entry) => {
          const progressPercent = Math.round((completed / total) * 100);
          setProgress(progressPercent);
          
          if (entry) {
            setCurrentEntry({
              id: entry.id,
              description: entry.description,
              category: entry.category,
              quantity: entry.quantity,
              unit: entry.unit
            });
          }
        }
      );

      setLastCalculationResults(results);

      // Reload status and summary
      await loadCalculationStatus();
      await loadEmissionsSummary();

      toast({
        title: "✅ Calculations Complete!",
        description: `Successfully calculated emissions for ${results.successful_calculations} entries. Total: ${(results.total_scope1_emissions + results.total_scope2_emissions + results.total_scope3_emissions).toFixed(2)} kg CO2e`,
      });

    } catch (error) {
      console.error('Calculation failed:', error);
      toast({
        title: "❌ Calculation Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsCalculating(false);
      setProgress(0);
      setCurrentEntry(null);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            OpenAI Assistant Emission Calculator
          </CardTitle>
          <CardDescription>
            Calculate emissions for all your entries using GPT-4 with carbon accounting expertise.
            This replaces the Climatiq API with more accurate, source-referenced calculations.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Calculation Status */}
      {calculationStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Calculation Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {calculationStatus.total_entries}
                </div>
                <div className="text-sm text-gray-600">Total Entries</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {calculationStatus.calculated_entries}
                </div>
                <div className="text-sm text-gray-600">Calculated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {calculationStatus.pending_entries}
                </div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {calculationStatus.completion_percentage}%
                </div>
                <div className="text-sm text-gray-600">Complete</div>
              </div>
            </div>
            
            <Progress value={calculationStatus.completion_percentage} className="mb-2" />
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {calculationStatus.calculated_entries} of {calculationStatus.total_entries} entries calculated
              </span>
              {calculationStatus.completion_percentage === 100 && (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Complete
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emissions Summary */}
      {emissionsSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Emissions Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-xl font-bold text-red-600">
                  {formatNumber(emissionsSummary.scope1)}
                </div>
                <div className="text-sm text-gray-600">Scope 1 (kg CO2e)</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-xl font-bold text-yellow-600">
                  {formatNumber(emissionsSummary.scope2)}
                </div>
                <div className="text-sm text-gray-600">Scope 2 (kg CO2e)</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold text-blue-600">
                  {formatNumber(emissionsSummary.scope3)}
                </div>
                <div className="text-sm text-gray-600">Scope 3 (kg CO2e)</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-xl font-bold text-gray-800">
                  {formatNumber(emissionsSummary.total)}
                </div>
                <div className="text-sm text-gray-600">Total (kg CO2e)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calculation Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Run Calculations</CardTitle>
          <CardDescription>
            Calculate emissions for all uncalculated entries using the OpenAI Assistant
          </CardDescription>
        </CardHeader>
        <CardContent>
          {calculationStatus?.pending_entries === 0 ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                All entries have been calculated! No pending calculations.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <Button
                onClick={handleCalculateEmissions}
                disabled={isCalculating}
                className="w-full"
                size="lg"
              >
                {isCalculating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Calculating... ({progress}%)
                  </>
                ) : (
                  <>
                    <Calculator className="mr-2 h-4 w-4" />
                    Calculate Emissions ({calculationStatus?.pending_entries || 0} entries)
                  </>
                )}
              </Button>

              {isCalculating && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  {currentEntry && (
                    <div className="text-sm text-gray-600 text-center">
                      Processing: {currentEntry.description} ({currentEntry.quantity} {currentEntry.unit})
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last Calculation Results */}
      {lastCalculationResults && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Last Calculation Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {lastCalculationResults.successful_calculations}
                </div>
                <div className="text-sm text-gray-600">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">
                  {lastCalculationResults.failed_calculations}
                </div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {Math.round(lastCalculationResults.processing_time_ms / 1000)}s
                </div>
                <div className="text-sm text-gray-600">Processing Time</div>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="font-semibold text-red-600">
                  {formatNumber(lastCalculationResults.total_scope1_emissions)} kg CO2e
                </div>
                <div className="text-xs text-gray-600">Scope 1</div>
              </div>
              <div>
                <div className="font-semibold text-yellow-600">
                  {formatNumber(lastCalculationResults.total_scope2_emissions)} kg CO2e
                </div>
                <div className="text-xs text-gray-600">Scope 2</div>
              </div>
              <div>
                <div className="font-semibold text-blue-600">
                  {formatNumber(lastCalculationResults.total_scope3_emissions)} kg CO2e
                </div>
                <div className="text-xs text-gray-600">Scope 3</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>How it works:</strong> The OpenAI Assistant uses GPT-4 with a comprehensive carbon accounting knowledge base 
          to find appropriate emission factors, classify scopes, and calculate total emissions. Each calculation includes 
          source references and confidence scores for audit trails.
        </AlertDescription>
      </Alert>
    </div>
  );
}; 