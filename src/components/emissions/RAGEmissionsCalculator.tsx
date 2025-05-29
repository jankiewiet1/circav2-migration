import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Calculator, Zap, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ragEmissionsService, type RAGCalculationResult } from '@/services/ragEmissionsService'

interface RAGEmissionsCalculatorProps {
  companyId: string
  onCalculationComplete?: (result: RAGCalculationResult) => void
}

export const RAGEmissionsCalculator: React.FC<RAGEmissionsCalculatorProps> = ({
  companyId,
  onCalculationComplete
}) => {
  const [input, setInput] = useState('')
  const [isCalculating, setIsCalculating] = useState(false)
  const [result, setResult] = useState<RAGCalculationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const handleCalculate = async () => {
    if (!input.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter an activity description to calculate emissions.",
        variant: "destructive"
      })
      return
    }

    setIsCalculating(true)
    setError(null)
    setResult(null)

    try {
      const calculationResult = await ragEmissionsService.calculateEmissions({
        raw_input: input.trim(),
        company_id: companyId
      })

      setResult(calculationResult)
      onCalculationComplete?.(calculationResult)

      toast({
        title: "Calculation Complete",
        description: `Emissions calculated: ${calculationResult.calculation.total_emissions.toFixed(2)} ${calculationResult.calculation.emissions_unit}`,
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      toast({
        title: "Calculation Failed",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsCalculating(false)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800'
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getScopeColor = (scope: number | null) => {
    switch (scope) {
      case 1: return 'bg-blue-100 text-blue-800'
      case 2: return 'bg-purple-100 text-purple-800'
      case 3: return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            RAG Emissions Calculator
          </CardTitle>
          <CardDescription>
            Describe your activity in natural language and get instant emissions calculations using AI-powered matching.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="activity-input">Activity Description</Label>
            <Textarea
              id="activity-input"
              placeholder="e.g., 'I filled up my car with 50 liters of petrol' or 'Office electricity consumption 1200 kWh this month'"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          
          <Button 
            onClick={handleCalculate} 
            disabled={isCalculating || !input.trim()}
            className="w-full"
          >
            {isCalculating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Calculator className="mr-2 h-4 w-4" />
                Calculate Emissions
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results Section */}
      {result && (
        <div className="space-y-4">
          {/* Main Result */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Calculation Result
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Parsed Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Parsed Activity</Label>
                  <p className="text-sm">{result.parsed_data.description}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Category</Label>
                  <p className="text-sm">{result.parsed_data.category}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Quantity</Label>
                  <p className="text-sm">{result.parsed_data.quantity} {result.parsed_data.unit}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Confidence</Label>
                  <Badge className={getConfidenceColor(result.parsed_data.confidence)}>
                    {(result.parsed_data.confidence * 100).toFixed(1)}%
                  </Badge>
                </div>
              </div>

              {/* Emissions Result */}
              <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-900">
                    {result.calculation.total_emissions.toFixed(2)}
                  </div>
                  <div className="text-lg text-blue-700">
                    {result.calculation.emissions_unit}
                  </div>
                  {result.calculation.scope && (
                    <Badge className={`mt-2 ${getScopeColor(result.calculation.scope)}`}>
                      Scope {result.calculation.scope}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Breakdown */}
              {(result.calculation.breakdown.co2 || result.calculation.breakdown.ch4 || result.calculation.breakdown.n2o) && (
                <div className="grid grid-cols-3 gap-4">
                  {result.calculation.breakdown.co2 && (
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <div className="font-semibold">{result.calculation.breakdown.co2.toFixed(3)}</div>
                      <div className="text-sm text-gray-600">CO₂</div>
                    </div>
                  )}
                  {result.calculation.breakdown.ch4 && (
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <div className="font-semibold">{result.calculation.breakdown.ch4.toFixed(3)}</div>
                      <div className="text-sm text-gray-600">CH₄</div>
                    </div>
                  )}
                  {result.calculation.breakdown.n2o && (
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <div className="font-semibold">{result.calculation.breakdown.n2o.toFixed(3)}</div>
                      <div className="text-sm text-gray-600">N₂O</div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Matched Factor Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Emission Factor Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Factor Description</Label>
                  <p className="text-sm">{result.matched_factor.description}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Source</Label>
                  <p className="text-sm">{result.matched_factor.source}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Emission Factor</Label>
                  <p className="text-sm">
                    {result.calculation.emission_factor} {result.calculation.emission_factor_unit}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Match Similarity</Label>
                  <Badge className={getConfidenceColor(result.matched_factor.similarity)}>
                    {(result.matched_factor.similarity * 100).toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alternative Matches */}
          {result.alternative_matches && result.alternative_matches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Alternative Matches</CardTitle>
                <CardDescription>
                  Other emission factors that could potentially match your activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.alternative_matches.map((match, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{match.description}</p>
                        <p className="text-xs text-gray-600">{match.source}</p>
                      </div>
                      <Badge className={getConfidenceColor(match.similarity)}>
                        {(match.similarity * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Processing Info */}
          <div className="text-center text-sm text-gray-500">
            Processed in {result.processing_time_ms}ms • Overall confidence: {(result.calculation.confidence * 100).toFixed(1)}%
          </div>
        </div>
      )}
    </div>
  )
}

export default RAGEmissionsCalculator 