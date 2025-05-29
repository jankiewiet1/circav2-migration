import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { Bot, Brain, Zap, Target, AlertTriangle } from 'lucide-react';

interface RAGTestResult {
  success: boolean;
  method_used: 'RAG' | 'ASSISTANT' | 'FAILED';
  calculation_id?: string;
  parsed_data?: {
    category: string;
    subcategory?: string;
    fuel_type?: string;
    quantity: number;
    unit: string;
    description: string;
    confidence: number;
  };
  matched_factor?: {
    id: string;
    description: string;
    source: string;
    similarity: number;
  };
  calculation?: {
    quantity: number;
    unit: string;
    emission_factor: number;
    emission_factor_unit: string;
    total_emissions: number;
    emissions_unit: string;
    confidence: number;
    scope?: number;
  };
  processing_time_ms?: number;
  alternative_matches?: any[];
  fallback_reason?: string;
  error?: string;
}

export function RAGTestComponent() {
  const { company } = useCompany();
  const [testInput, setTestInput] = useState("I need to know the factor for fuel usage EURO 95, 100 liters in the Netherlands based on DEFRA");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RAGTestResult | null>(null);

  const testRAGSystem = async () => {
    if (!company || !testInput.trim()) {
      toast.error("Please enter a test input");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      console.log('🧪 Testing RAG system with input:', testInput);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-emissions-calculator`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw_input: testInput,
          company_id: company.id
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ RAG test result:', data);

      setResult({
        success: data.success,
        method_used: 'RAG',
        calculation_id: data.calculation_id,
        parsed_data: data.parsed_data,
        matched_factor: data.matched_factor,
        calculation: data.calculation,
        processing_time_ms: data.processing_time_ms,
        alternative_matches: data.alternative_matches
      });

      if (data.success) {
        toast.success(`🎉 RAG calculation successful! ${data.calculation?.total_emissions?.toFixed(2)} ${data.calculation?.emissions_unit}`);
      } else {
        toast.error(`❌ RAG calculation failed: ${data.error}`);
      }

    } catch (error) {
      console.error('❌ RAG test error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setResult({
        success: false,
        method_used: 'FAILED',
        error: errorMessage
      });

      toast.error(`Test failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const presetInputs = [
    "I need to know the factor for fuel usage EURO 95, 100 liters in the Netherlands based on DEFRA",
    "50 liters of petrol EURO 95 in Netherlands",
    "Natural gas consumption 1000 m3 for heating",
    "Electricity consumption 500 kWh office building",
    "Diesel fuel 75 liters for company vehicles"
  ];

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-600" />
          RAG Emissions Calculator Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Test Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Test Input:</label>
          <Input
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="Enter emission calculation request..."
            className="w-full"
          />
        </div>

        {/* Preset Inputs */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Quick Test Examples:</label>
          <div className="flex flex-wrap gap-2">
            {presetInputs.map((preset, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setTestInput(preset)}
                className="text-xs"
              >
                Example {index + 1}
              </Button>
            ))}
          </div>
        </div>

        {/* Test Button */}
        <Button 
          onClick={testRAGSystem} 
          disabled={isLoading || !testInput.trim()}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Target className="h-4 w-4 mr-2 animate-spin" />
              Testing RAG System...
            </>
          ) : (
            <>
              <Bot className="h-4 w-4 mr-2" />
              Test RAG System
            </>
          )}
        </Button>

        {/* Results */}
        {result && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Test Results</h3>
              <Badge 
                variant={result.success ? "default" : "destructive"}
                className={result.success ? "bg-green-100 text-green-800" : ""}
              >
                {result.method_used === 'RAG' ? (
                  <><Bot className="h-3 w-3 mr-1" />RAG</>
                ) : result.method_used === 'ASSISTANT' ? (
                  <><Brain className="h-3 w-3 mr-1" />Assistant</>
                ) : (
                  <><AlertTriangle className="h-3 w-3 mr-1" />Failed</>
                )}
              </Badge>
            </div>

            {result.success && result.calculation && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Parsed Data */}
                {result.parsed_data && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Parsed Input:</h4>
                    <div className="text-sm space-y-1">
                      <div><strong>Category:</strong> {result.parsed_data.category}</div>
                      <div><strong>Quantity:</strong> {result.parsed_data.quantity} {result.parsed_data.unit}</div>
                      <div><strong>Description:</strong> {result.parsed_data.description}</div>
                      <div><strong>Confidence:</strong> {(result.parsed_data.confidence * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                )}

                {/* Matched Factor */}
                {result.matched_factor && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Matched Factor:</h4>
                    <div className="text-sm space-y-1">
                      <div><strong>Source:</strong> {result.matched_factor.source}</div>
                      <div><strong>Similarity:</strong> {(result.matched_factor.similarity * 100).toFixed(1)}%</div>
                      <div><strong>Description:</strong> {result.matched_factor.description}</div>
                    </div>
                  </div>
                )}

                {/* Calculation Results */}
                <div className="space-y-2 md:col-span-2">
                  <h4 className="font-medium text-sm">Calculation:</h4>
                  <div className="text-sm space-y-1">
                    <div><strong>Emission Factor:</strong> {result.calculation.emission_factor} {result.calculation.emission_factor_unit}</div>
                    <div><strong>Total Emissions:</strong> {result.calculation.total_emissions.toFixed(2)} {result.calculation.emissions_unit}</div>
                    <div><strong>Overall Confidence:</strong> {(result.calculation.confidence * 100).toFixed(1)}%</div>
                    {result.processing_time_ms && (
                      <div><strong>Processing Time:</strong> {result.processing_time_ms}ms</div>
                    )}
                  </div>
                </div>

                {/* Alternative Matches */}
                {result.alternative_matches && result.alternative_matches.length > 0 && (
                  <div className="space-y-2 md:col-span-2">
                    <h4 className="font-medium text-sm">Alternative Matches:</h4>
                    <div className="text-xs space-y-1">
                      {result.alternative_matches.map((match, index) => (
                        <div key={index} className="p-2 bg-white rounded border">
                          <div><strong>Source:</strong> {match.source}</div>
                          <div><strong>Similarity:</strong> {(match.similarity * 100).toFixed(1)}%</div>
                          <div><strong>Description:</strong> {match.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!result.success && result.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                <strong>Error:</strong> {result.error}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 