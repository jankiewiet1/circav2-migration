import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Bot, 
  Sparkles, 
  ArrowRight, 
  CheckCircle, 
  Zap,
  Target,
  Database,
  Clock,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface CalculationResult {
  success: boolean;
  total_emissions: number;
  emissions_unit: string;
  emission_factor: number;
  emission_factor_unit: string;
  confidence_score: number;
  similarity_score: number;
  source: string;
  matched_activity: string;
  processing_time_ms: number;
  quantity: number;
  unit: string;
}

const DEMO_EXAMPLES = [
  "I need to calculate emissions for 100 liters of diesel fuel for company vehicles",
  "Natural gas consumption 1000 m3 for office heating",
  "Electricity consumption 500 kWh for our office building",
  "Business flight from Amsterdam to London, 2 passengers",
  "50 liters of petrol EURO 95 in Netherlands"
];

export default function RAGEmissionsDemo() {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleExampleClick = (example: string) => {
    setInput(example);
    setResult(null);
    setShowResult(false);
  };

  const handleCalculate = async () => {
    if (!input.trim()) {
      toast.error('Please enter an emission calculation request');
      return;
    }

    setIsCalculating(true);
    setResult(null);
    setShowResult(false);

    try {
      // Call the RAG emissions calculator Edge Function directly (without company_id for demo)
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-emissions-calculator`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw_input: input,
          demo_mode: true // Special flag for demo calculations
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setResult(data);
        setShowResult(true);
        toast.success('🎉 Calculation completed successfully!');
      } else {
        throw new Error(data.error || 'Calculation failed');
      }
    } catch (error) {
      console.error('Calculation error:', error);
      toast.error('Failed to calculate emissions. Please try again.');
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <section id="ai-calculator" className="py-16 bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Badge className="bg-blue-100 text-blue-700 px-4 py-2 text-sm font-medium">
              <Sparkles className="w-4 h-4 mr-2" />
              AI-Powered Emissions Calculator
            </Badge>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Try Our <span className="text-blue-600">Smart Calculator</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Experience the power of AI-driven emissions calculations. Just describe your activity in natural language, 
            and our RAG system will find the perfect emission factor from our database of 45,000+ factors.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Input Section */}
          <Card className="border-2 border-blue-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <Bot className="w-6 h-6 mr-2 text-blue-600" />
                Describe Your Emission Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quick Examples */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 block">
                  Quick Examples (click to try):
                </label>
                <div className="grid gap-2">
                  {DEMO_EXAMPLES.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => handleExampleClick(example)}
                      className="text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Field */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Or describe your own activity:
                </label>
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="e.g., I need to calculate emissions for 100 liters of diesel fuel for company vehicles"
                  className="min-h-[100px] text-base"
                />
              </div>

              {/* Calculate Button */}
              <Button
                onClick={handleCalculate}
                disabled={isCalculating || !input.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-medium"
              >
                {isCalculating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Calculate Emissions
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>

              {/* Features */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="flex items-center text-sm text-gray-600">
                  <Database className="w-4 h-4 mr-2 text-green-600" />
                  45,000+ Factors
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Zap className="w-4 h-4 mr-2 text-yellow-600" />
                  Instant Results
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Target className="w-4 h-4 mr-2 text-blue-600" />
                  High Accuracy
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                  IPCC Compliant
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card className={`border-2 transition-all duration-500 ${showResult ? 'border-green-200 shadow-lg' : 'border-gray-200'}`}>
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <TrendingUp className="w-6 h-6 mr-2 text-green-600" />
                Calculation Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!showResult && !isCalculating && (
                <div className="text-center py-12 text-gray-500">
                  <Bot className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">Enter an activity above to see AI-powered results</p>
                  <p className="text-sm mt-2">Our RAG system will analyze your input and find the best emission factor</p>
                </div>
              )}

              {isCalculating && (
                <div className="text-center py-12">
                  <Loader2 className="w-16 h-16 mx-auto mb-4 text-blue-600 animate-spin" />
                  <p className="text-lg font-medium">AI is analyzing your request...</p>
                  <p className="text-sm text-gray-600 mt-2">Searching through 45,000+ emission factors</p>
                </div>
              )}

              {showResult && result && (
                <div className="space-y-6">
                  {/* Main Result */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-700 mb-2">
                        {result.total_emissions.toFixed(2)} {result.emissions_unit}
                      </div>
                      <p className="text-green-600 font-medium">Total Emissions</p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="text-lg font-bold text-blue-700">
                        {(result.similarity_score * 100).toFixed(1)}%
                      </div>
                      <p className="text-blue-600 text-sm">Match Confidence</p>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="text-lg font-bold text-purple-700">
                        {result.processing_time_ms}ms
                      </div>
                      <p className="text-purple-600 text-sm">Processing Time</p>
                    </div>
                  </div>

                  {/* Factor Details */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-600">Emission Factor:</span>
                      <span className="font-medium">{result.emission_factor} {result.emission_factor_unit}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-600">Source:</span>
                      <Badge variant="outline" className="bg-gray-50">
                        {result.source}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-600">Matched Activity:</span>
                      <span className="font-medium text-sm text-right max-w-[200px]">
                        {result.matched_activity}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">Quantity:</span>
                      <span className="font-medium">{result.quantity} {result.unit}</span>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-700 mb-3">
                      Impressed? Get access to the full platform with batch processing, reporting, and more!
                    </p>
                    <Button className="bg-green-600 hover:bg-green-700 text-white" asChild>
                      <a href="/auth/register">
                        Start Free Trial
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </a>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            This is just a preview. The full platform includes batch processing, detailed reporting, 
            audit trails, and integration with your existing systems.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="bg-green-600 hover:bg-green-700 text-white px-8" asChild>
              <a href="/auth/register">
                Get Full Access
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
            <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-50 px-8" asChild>
              <a href="#how-it-works">
                Learn More
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
} 